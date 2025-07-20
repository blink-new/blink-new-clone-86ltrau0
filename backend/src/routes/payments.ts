import express from 'express';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import { getDatabase } from '../database/init';
import { promisify } from 'util';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20'
});

// Validation schemas
const createCheckoutSchema = Joi.object({
  plan: Joi.string().valid('starter', 'pro', 'max').required(),
  successUrl: Joi.string().uri().required(),
  cancelUrl: Joi.string().uri().required()
});

// Plan configurations
const PLANS = {
  starter: {
    name: 'Starter Plan',
    price: 2000, // $20.00 in cents
    credits: 100,
    features: ['Private projects', 'Custom domains', 'Download code', 'Remove Blink badge']
  },
  pro: {
    name: 'Pro Plan',
    price: 5000, // $50.00 in cents
    credits: 250,
    features: ['All Starter features', 'Advanced AI models', 'Priority support']
  },
  max: {
    name: 'Max Plan',
    price: 10000, // $100.00 in cents
    credits: 500,
    features: ['All Pro features', 'Early access to beta features']
  }
};

// Create checkout session
router.post('/checkout', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { error, value } = createCheckoutSchema.validate(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const { plan, successUrl, cancelUrl } = value;
  const planConfig = PLANS[plan as keyof typeof PLANS];

  if (!planConfig) {
    throw createError('Invalid plan selected', 400);
  }

  try {
    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: planConfig.name,
              description: `${planConfig.credits} credits + ${planConfig.features.join(', ')}`
            },
            unit_amount: planConfig.price
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: req.user!.email,
      metadata: {
        userId: req.user!.id,
        plan: plan,
        credits: planConfig.credits.toString()
      }
    });

    // Create pending transaction record
    const db = getDatabase();
    const run = promisify(db.run.bind(db));

    const transactionId = uuidv4();
    await run(
      `INSERT INTO payment_transactions (id, user_id, stripe_payment_id, amount, plan, credits_added, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        transactionId,
        req.user!.id,
        session.id,
        planConfig.price / 100, // Convert to dollars
        plan,
        planConfig.credits,
        'pending'
      ]
    );

    res.json({
      sessionId: session.id,
      url: session.url,
      transactionId
    });

  } catch (error: any) {
    throw createError(`Payment session creation failed: ${error.message}`, 500);
  }
}));

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw createError('Webhook secret not configured', 500);
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error.message);
    throw createError('Invalid webhook signature', 400);
  }

  const db = getDatabase();
  const get = promisify(db.get.bind(db));
  const run = promisify(db.run.bind(db));

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Find the transaction
      const transaction = await get(
        'SELECT * FROM payment_transactions WHERE stripe_payment_id = ?',
        [session.id]
      );

      if (transaction) {
        // Update transaction status
        await run(
          'UPDATE payment_transactions SET status = ? WHERE id = ?',
          ['completed', transaction.id]
        );

        // Add credits to user account
        await run(
          'UPDATE users SET credits = credits + ?, plan = ? WHERE id = ?',
          [transaction.credits_added, transaction.plan, transaction.user_id]
        );

        console.log(`✅ Payment completed for user ${transaction.user_id}: +${transaction.credits_added} credits`);
      }
      break;
    }

    case 'checkout.session.expired': {
      const expiredSession = event.data.object as Stripe.Checkout.Session;
      
      await run(
        'UPDATE payment_transactions SET status = ? WHERE stripe_payment_id = ?',
        ['expired', expiredSession.id]
      );
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
}));

// Get payment history
router.get('/history', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const db = getDatabase();
  const all = promisify(db.all.bind(db));

  const { page = 1, limit = 10 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const transactions = await all(
    `SELECT id, amount, currency, status, plan, credits_added, created_at
     FROM payment_transactions 
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [req.user!.id, Number(limit), offset]
  );

  // Get total count
  const countResult = await all(
    'SELECT COUNT(*) as total FROM payment_transactions WHERE user_id = ?',
    [req.user!.id]
  );
  const total = countResult[0]?.total || 0;

  res.json({
    transactions: transactions.map(tx => ({
      id: tx.id,
      amount: tx.amount,
      currency: tx.currency,
      status: tx.status,
      plan: tx.plan,
      creditsAdded: tx.credits_added,
      createdAt: tx.created_at
    })),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit))
    }
  });
}));

// Get available plans
router.get('/plans', asyncHandler(async (req, res) => {
  const plans = Object.entries(PLANS).map(([key, config]) => ({
    id: key,
    name: config.name,
    price: config.price / 100, // Convert to dollars
    credits: config.credits,
    features: config.features
  }));

  res.json({ plans });
}));

// Get current subscription status
router.get('/subscription', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const db = getDatabase();
  const get = promisify(db.get.bind(db));

  const user = await get(
    'SELECT plan, credits FROM users WHERE id = ?',
    [req.user!.id]
  );

  if (!user) {
    throw createError('User not found', 404);
  }

  // Get latest successful payment
  const latestPayment = await get(
    `SELECT created_at, plan, amount FROM payment_transactions 
     WHERE user_id = ? AND status = 'completed'
     ORDER BY created_at DESC LIMIT 1`,
    [req.user!.id]
  );

  res.json({
    currentPlan: user.plan,
    credits: user.credits,
    lastPayment: latestPayment ? {
      date: latestPayment.created_at,
      plan: latestPayment.plan,
      amount: latestPayment.amount
    } : null
  });
}));

// Add credits manually (for admin use or testing)
router.post('/credits', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { credits, reason } = req.body;

  if (!credits || credits <= 0) {
    throw createError('Invalid credit amount', 400);
  }

  // In production, you'd want admin authentication here
  const db = getDatabase();
  const run = promisify(db.run.bind(db));

  // Add credits to user
  await run(
    'UPDATE users SET credits = credits + ? WHERE id = ?',
    [credits, req.user!.id]
  );

  // Create transaction record
  const transactionId = uuidv4();
  await run(
    `INSERT INTO payment_transactions (id, user_id, amount, status, plan, credits_added)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [transactionId, req.user!.id, 0, 'completed', 'manual', credits]
  );

  res.json({
    message: 'Credits added successfully',
    creditsAdded: credits,
    reason: reason || 'Manual credit addition'
  });
}));

export default router;