import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { getDatabase } from '../database/init';
import { promisify } from 'util';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken, AuthenticatedRequest, requireCredits } from '../middleware/auth';
import { aiRateLimiterMiddleware } from '../middleware/rateLimiter';

const router = express.Router();

// Initialize AI clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Validation schemas
const generateCodeSchema = Joi.object({
  prompt: Joi.string().min(10).max(2000).required(),
  techStack: Joi.string().valid('react', 'vue', 'angular', 'vanilla', 'next', 'nuxt').default('react'),
  model: Joi.string().valid('gpt-4', 'gpt-3.5-turbo', 'claude-3-sonnet', 'claude-3-haiku').default('gpt-4'),
  projectId: Joi.string().uuid().optional(),
  includeFiles: Joi.boolean().default(true),
  complexity: Joi.string().valid('simple', 'medium', 'complex').default('medium')
});

const chatSchema = Joi.object({
  message: Joi.string().min(1).max(1000).required(),
  projectId: Joi.string().uuid().optional(),
  conversationId: Joi.string().uuid().optional()
});

// Generate code from prompt
router.post('/generate', 
  authenticateToken, 
  requireCredits(1), 
  aiRateLimiterMiddleware, 
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { error, value } = generateCodeSchema.validate(req.body);
    if (error) {
      throw createError(error.details[0].message, 400);
    }

    const { prompt, techStack, model, projectId, includeFiles, complexity } = value;
    const db = getDatabase();
    const run = promisify(db.run.bind(db));

    // Create generation record
    const generationId = uuidv4();
    await run(
      `INSERT INTO ai_generations (id, user_id, project_id, prompt, model, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [generationId, req.user!.id, projectId, prompt, model, 'pending']
    );

    try {
      // Generate code based on model
      let generatedCode: string;
      let tokensUsed = 0;

      if (model.startsWith('gpt')) {
        const result = await generateWithOpenAI(prompt, techStack, model, complexity);
        generatedCode = result.code;
        tokensUsed = result.tokensUsed;
      } else if (model.startsWith('claude')) {
        const result = await generateWithClaude(prompt, techStack, model, complexity);
        generatedCode = result.code;
        tokensUsed = result.tokensUsed;
      } else {
        throw createError('Unsupported model', 400);
      }

      // Calculate cost (simplified pricing)
      const cost = calculateCost(model, tokensUsed);

      // Update generation record
      await run(
        `UPDATE ai_generations 
         SET generated_code = ?, tokens_used = ?, cost = ?, status = ?, completed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [generatedCode, tokensUsed, cost, 'completed', generationId]
      );

      // Deduct credits
      await run(
        'UPDATE users SET credits = credits - 1 WHERE id = ?',
        [req.user!.id]
      );

      // Parse generated code into files if requested
      let files: any[] = [];
      if (includeFiles) {
        files = parseCodeIntoFiles(generatedCode, techStack);
      }

      res.json({
        generationId,
        code: generatedCode,
        files,
        tokensUsed,
        cost,
        model,
        techStack
      });

    } catch (error: any) {
      // Update generation record with error
      await run(
        `UPDATE ai_generations 
         SET status = ?, error_message = ?, completed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        ['error', error.message, generationId]
      );

      throw createError(`Code generation failed: ${error.message}`, 500);
    }
  })
);

// Chat with AI about project
router.post('/chat', 
  authenticateToken, 
  requireCredits(1), 
  aiRateLimiterMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { error, value } = chatSchema.validate(req.body);
    if (error) {
      throw createError(error.details[0].message, 400);
    }

    const { message, projectId, conversationId } = value;

    try {
      // Get project context if provided
      let projectContext = '';
      if (projectId) {
        const db = getDatabase();
        const get = promisify(db.get.bind(db));
        
        const project = await get(
          'SELECT name, description, tech_stack, code_content FROM projects WHERE id = ? AND user_id = ?',
          [projectId, req.user!.id]
        );

        if (project) {
          projectContext = `
Project: ${project.name}
Description: ${project.description}
Tech Stack: ${project.tech_stack}
Current Code: ${project.code_content?.substring(0, 1000) || 'No code yet'}
          `;
        }
      }

      // Generate response using OpenAI
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert software developer and coding assistant. Help users with their coding questions and provide practical solutions.
            
${projectContext ? `Context about the user's project:\n${projectContext}` : ''}`
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      });

      const response = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

      // Deduct credits
      const db = getDatabase();
      const run = promisify(db.run.bind(db));
      await run(
        'UPDATE users SET credits = credits - 1 WHERE id = ?',
        [req.user!.id]
      );

      res.json({
        response,
        conversationId: conversationId || uuidv4(),
        tokensUsed: completion.usage?.total_tokens || 0
      });

    } catch (error: any) {
      throw createError(`Chat failed: ${error.message}`, 500);
    }
  })
);

// Get generation history
router.get('/generations', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const db = getDatabase();
  const all = promisify(db.all.bind(db));

  const { page = 1, limit = 10, projectId } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let query = `
    SELECT id, project_id, prompt, model, status, tokens_used, cost, created_at, completed_at
    FROM ai_generations 
    WHERE user_id = ?
  `;
  const params: any[] = [req.user!.id];

  if (projectId) {
    query += ' AND project_id = ?';
    params.push(projectId);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), offset);

  const generations = await all(query, params);

  res.json({
    generations: generations.map(gen => ({
      id: gen.id,
      projectId: gen.project_id,
      prompt: gen.prompt,
      model: gen.model,
      status: gen.status,
      tokensUsed: gen.tokens_used,
      cost: gen.cost,
      createdAt: gen.created_at,
      completedAt: gen.completed_at
    })),
    pagination: {
      page: Number(page),
      limit: Number(limit)
    }
  });
}));

// Helper functions
async function generateWithOpenAI(prompt: string, techStack: string, model: string, complexity: string) {
  const systemPrompt = createSystemPrompt(techStack, complexity);
  
  const completion = await openai.chat.completions.create({
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    max_tokens: getMaxTokens(complexity),
    temperature: 0.7
  });

  return {
    code: completion.choices[0]?.message?.content || '',
    tokensUsed: completion.usage?.total_tokens || 0
  };
}

async function generateWithClaude(prompt: string, techStack: string, model: string, complexity: string) {
  const systemPrompt = createSystemPrompt(techStack, complexity);
  
  const message = await anthropic.messages.create({
    model: model,
    max_tokens: getMaxTokens(complexity),
    messages: [
      { role: 'user', content: `${systemPrompt}\n\n${prompt}` }
    ]
  });

  const content = message.content[0];
  return {
    code: content.type === 'text' ? content.text : '',
    tokensUsed: message.usage.input_tokens + message.usage.output_tokens
  };
}

function createSystemPrompt(techStack: string, complexity: string): string {
  return `You are an expert ${techStack} developer. Generate clean, production-ready code based on the user's requirements.

Tech Stack: ${techStack}
Complexity Level: ${complexity}

Guidelines:
- Write modern, clean, and well-structured code
- Include proper error handling
- Add helpful comments
- Follow best practices for ${techStack}
- Make the code responsive and accessible
- Include necessary imports and dependencies
${complexity === 'complex' ? '- Implement advanced features and optimizations' : ''}
${complexity === 'simple' ? '- Keep the implementation straightforward and minimal' : ''}

Provide complete, working code that can be directly used in a project.`;
}

function getMaxTokens(complexity: string): number {
  switch (complexity) {
    case 'simple': return 1500;
    case 'medium': return 3000;
    case 'complex': return 4000;
    default: return 3000;
  }
}

function calculateCost(model: string, tokensUsed: number): number {
  // Simplified cost calculation (in USD)
  const rates = {
    'gpt-4': 0.03 / 1000,
    'gpt-3.5-turbo': 0.002 / 1000,
    'claude-3-sonnet': 0.015 / 1000,
    'claude-3-haiku': 0.0025 / 1000
  };

  const rate = rates[model as keyof typeof rates] || 0.01 / 1000;
  return tokensUsed * rate;
}

function parseCodeIntoFiles(code: string, techStack: string): any[] {
  // Simple code parsing - in production, you'd want more sophisticated parsing
  const files: any[] = [];

  // Extract different file types based on code blocks
  const codeBlocks = code.match(/```(\w+)?\n([\s\S]*?)```/g) || [];
  
  codeBlocks.forEach((block, index) => {
    const match = block.match(/```(\w+)?\n([\s\S]*?)```/);
    if (match) {
      const language = match[1] || 'text';
      const content = match[2].trim();
      
      let fileName = `file${index + 1}`;
      let fileType = language;

      // Determine file name and type based on content and language
      if (language === 'jsx' || language === 'tsx') {
        fileName = `Component${index + 1}.${language}`;
        fileType = 'component';
      } else if (language === 'css') {
        fileName = `styles${index + 1}.css`;
        fileType = 'stylesheet';
      } else if (language === 'json') {
        fileName = content.includes('"name"') ? 'package.json' : `config${index + 1}.json`;
        fileType = 'config';
      } else if (language === 'html') {
        fileName = 'index.html';
        fileType = 'markup';
      }

      files.push({
        id: uuidv4(),
        path: fileName,
        content,
        type: fileType,
        language,
        size: content.length
      });
    }
  });

  return files;
}

export default router;