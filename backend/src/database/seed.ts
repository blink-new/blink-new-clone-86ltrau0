import { initializeDatabase, getDatabase } from './init';
import { promisify } from 'util';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function seedDatabase(): Promise<void> {
  console.log('🌱 Starting database seeding...');

  try {
    await initializeDatabase();
    const db = getDatabase();
    const run = promisify(db.run.bind(db));
    const get = promisify(db.get.bind(db));

    // Check if data already exists
    const existingUser = await get('SELECT id FROM users LIMIT 1');
    if (existingUser) {
      console.log('📦 Database already contains data, skipping seed');
      return;
    }

    // Create demo users
    const demoUsers = [
      {
        id: uuidv4(),
        email: 'demo@blink.new',
        password: 'demo123456',
        displayName: 'Demo User',
        plan: 'pro',
        credits: 100
      },
      {
        id: uuidv4(),
        email: 'admin@blink.new',
        password: 'admin123456',
        displayName: 'Admin User',
        plan: 'max',
        credits: 500
      }
    ];

    console.log('👥 Creating demo users...');
    for (const user of demoUsers) {
      const passwordHash = await bcrypt.hash(user.password, 12);
      
      await run(
        `INSERT INTO users (id, email, password_hash, display_name, plan, credits, is_active, email_verified)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [user.id, user.email, passwordHash, user.displayName, user.plan, user.credits, 1, 1]
      );

      console.log(`✅ Created user: ${user.email} (${user.plan})`);
    }

    // Create demo projects
    const demoProjects = [
      {
        id: uuidv4(),
        userId: demoUsers[0].id,
        name: 'Todo App',
        description: 'A simple React todo application with add, delete, and complete functionality',
        techStack: 'react',
        status: 'completed',
        visibility: 'public',
        codeContent: `# Todo App

A simple React todo application built with TypeScript and Tailwind CSS.

## Features
- Add new todos
- Mark todos as complete
- Delete todos
- Filter by status

## Tech Stack
- React 18
- TypeScript
- Tailwind CSS
- Vite

## Getting Started
\`\`\`bash
npm install
npm run dev
\`\`\``,
        previewUrl: 'https://demo-todo.blink.new'
      },
      {
        id: uuidv4(),
        userId: demoUsers[0].id,
        name: 'Landing Page',
        description: 'Modern landing page for a SaaS product with hero section, features, and pricing',
        techStack: 'react',
        status: 'completed',
        visibility: 'public',
        codeContent: `# SaaS Landing Page

A modern, responsive landing page built with React and Tailwind CSS.

## Sections
- Hero with CTA
- Features showcase
- Pricing table
- Testimonials
- Footer

## Design
- Clean, modern design
- Responsive layout
- Smooth animations
- Optimized performance`,
        previewUrl: 'https://demo-landing.blink.new'
      },
      {
        id: uuidv4(),
        userId: demoUsers[1].id,
        name: 'Dashboard UI',
        description: 'Admin dashboard with charts, tables, and analytics',
        techStack: 'react',
        status: 'draft',
        visibility: 'private',
        codeContent: `# Admin Dashboard

Comprehensive admin dashboard with data visualization and management tools.

## Features
- Analytics charts
- Data tables
- User management
- Settings panel
- Dark/light mode

## Components
- Sidebar navigation
- Header with search
- Chart widgets
- Data grids
- Modal dialogs`
      }
    ];

    console.log('📁 Creating demo projects...');
    for (const project of demoProjects) {
      await run(
        `INSERT INTO projects (id, user_id, name, description, tech_stack, status, visibility, code_content, preview_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          project.id,
          project.userId,
          project.name,
          project.description,
          project.techStack,
          project.status,
          project.visibility,
          project.codeContent,
          project.previewUrl || null
        ]
      );

      console.log(`✅ Created project: ${project.name}`);
    }

    // Create demo AI generations
    const demoGenerations = [
      {
        id: uuidv4(),
        userId: demoUsers[0].id,
        projectId: demoProjects[0].id,
        prompt: 'Create a React todo app with TypeScript',
        model: 'gpt-4',
        generatedCode: 'Generated React todo app code...',
        tokensUsed: 1500,
        cost: 0.045,
        status: 'completed'
      },
      {
        id: uuidv4(),
        userId: demoUsers[0].id,
        projectId: demoProjects[1].id,
        prompt: 'Build a modern SaaS landing page',
        model: 'claude-3-sonnet',
        generatedCode: 'Generated landing page code...',
        tokensUsed: 2000,
        cost: 0.030,
        status: 'completed'
      }
    ];

    console.log('🤖 Creating demo AI generations...');
    for (const generation of demoGenerations) {
      await run(
        `INSERT INTO ai_generations (id, user_id, project_id, prompt, model, generated_code, tokens_used, cost, status, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          generation.id,
          generation.userId,
          generation.projectId,
          generation.prompt,
          generation.model,
          generation.generatedCode,
          generation.tokensUsed,
          generation.cost,
          generation.status
        ]
      );

      console.log(`✅ Created AI generation: ${generation.prompt.substring(0, 50)}...`);
    }

    // Create demo payment transactions
    const demoTransactions = [
      {
        id: uuidv4(),
        userId: demoUsers[0].id,
        amount: 50.00,
        currency: 'usd',
        status: 'completed',
        plan: 'pro',
        creditsAdded: 250
      },
      {
        id: uuidv4(),
        userId: demoUsers[1].id,
        amount: 100.00,
        currency: 'usd',
        status: 'completed',
        plan: 'max',
        creditsAdded: 500
      }
    ];

    console.log('💳 Creating demo transactions...');
    for (const transaction of demoTransactions) {
      await run(
        `INSERT INTO payment_transactions (id, user_id, amount, currency, status, plan, credits_added)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          transaction.id,
          transaction.userId,
          transaction.amount,
          transaction.currency,
          transaction.status,
          transaction.plan,
          transaction.creditsAdded
        ]
      );

      console.log(`✅ Created transaction: $${transaction.amount} (${transaction.plan})`);
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Demo Accounts:');
    console.log('Email: demo@blink.new | Password: demo123456 (Pro Plan)');
    console.log('Email: admin@blink.new | Password: admin123456 (Max Plan)');
    console.log('\n🚀 You can now start the server and test with these accounts!');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Seeding error:', error);
      process.exit(1);
    });
}

export { seedDatabase };