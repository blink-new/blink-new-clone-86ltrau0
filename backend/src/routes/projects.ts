import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { getDatabase } from '../database/init';
import { promisify } from 'util';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// Validation schemas
const createProjectSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  techStack: Joi.string().valid('react', 'vue', 'angular', 'vanilla', 'next', 'nuxt').default('react'),
  visibility: Joi.string().valid('private', 'public').default('private')
});

const updateProjectSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional(),
  visibility: Joi.string().valid('private', 'public').optional(),
  status: Joi.string().valid('draft', 'building', 'completed', 'error').optional()
});

// Get all projects for user
router.get('/', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const db = getDatabase();
  const all = promisify(db.all.bind(db));

  const { page = 1, limit = 10, status, visibility } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let query = `
    SELECT id, name, description, tech_stack, status, visibility, 
           preview_url, created_at, updated_at
    FROM projects 
    WHERE user_id = ?
  `;
  const params: any[] = [req.user!.id];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  if (visibility) {
    query += ' AND visibility = ?';
    params.push(visibility);
  }

  query += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), offset);

  const projects = await all(query, params);

  // Get total count
  let countQuery = 'SELECT COUNT(*) as total FROM projects WHERE user_id = ?';
  const countParams: any[] = [req.user!.id];

  if (status) {
    countQuery += ' AND status = ?';
    countParams.push(status);
  }

  if (visibility) {
    countQuery += ' AND visibility = ?';
    countParams.push(visibility);
  }

  const countResult = await all(countQuery, countParams);
  const total = countResult[0]?.total || 0;

  res.json({
    projects: projects.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      techStack: project.tech_stack,
      status: project.status,
      visibility: project.visibility,
      previewUrl: project.preview_url,
      createdAt: project.created_at,
      updatedAt: project.updated_at
    })),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit))
    }
  });
}));

// Get single project
router.get('/:id', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const db = getDatabase();
  const get = promisify(db.get.bind(db));
  const all = promisify(db.all.bind(db));

  const project = await get(
    `SELECT * FROM projects 
     WHERE id = ? AND (user_id = ? OR visibility = 'public')`,
    [req.params.id, req.user!.id]
  );

  if (!project) {
    throw createError('Project not found', 404);
  }

  // Get project files
  const files = await all(
    'SELECT id, file_path, file_type, size, updated_at FROM project_files WHERE project_id = ?',
    [project.id]
  );

  res.json({
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      techStack: project.tech_stack,
      status: project.status,
      visibility: project.visibility,
      codeContent: project.code_content,
      previewUrl: project.preview_url,
      downloadUrl: project.download_url,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      files: files.map(file => ({
        id: file.id,
        path: file.file_path,
        type: file.file_type,
        size: file.size,
        updatedAt: file.updated_at
      }))
    }
  });
}));

// Create new project
router.post('/', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { error, value } = createProjectSchema.validate(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const { name, description, techStack, visibility } = value;
  const db = getDatabase();
  const run = promisify(db.run.bind(db));

  const projectId = uuidv4();
  await run(
    `INSERT INTO projects (id, user_id, name, description, tech_stack, visibility, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [projectId, req.user!.id, name, description, techStack, visibility, 'draft']
  );

  res.status(201).json({
    message: 'Project created successfully',
    project: {
      id: projectId,
      name,
      description,
      techStack,
      visibility,
      status: 'draft'
    }
  });
}));

// Update project
router.put('/:id', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { error, value } = updateProjectSchema.validate(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const db = getDatabase();
  const get = promisify(db.get.bind(db));
  const run = promisify(db.run.bind(db));

  // Check if project exists and user owns it
  const project = await get(
    'SELECT id FROM projects WHERE id = ? AND user_id = ?',
    [req.params.id, req.user!.id]
  );

  if (!project) {
    throw createError('Project not found or access denied', 404);
  }

  // Build update query dynamically
  const updates: string[] = [];
  const params: any[] = [];

  Object.entries(value).forEach(([key, val]) => {
    if (val !== undefined) {
      updates.push(`${key} = ?`);
      params.push(val);
    }
  });

  if (updates.length === 0) {
    throw createError('No valid fields to update', 400);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(req.params.id);

  await run(
    `UPDATE projects SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  res.json({ message: 'Project updated successfully' });
}));

// Delete project
router.delete('/:id', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const db = getDatabase();
  const get = promisify(db.get.bind(db));
  const run = promisify(db.run.bind(db));

  // Check if project exists and user owns it
  const project = await get(
    'SELECT id FROM projects WHERE id = ? AND user_id = ?',
    [req.params.id, req.user!.id]
  );

  if (!project) {
    throw createError('Project not found or access denied', 404);
  }

  // Delete project (cascade will handle related records)
  await run('DELETE FROM projects WHERE id = ?', [req.params.id]);

  res.json({ message: 'Project deleted successfully' });
}));

// Update project code
router.put('/:id/code', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { codeContent, files } = req.body;

  if (!codeContent && !files) {
    throw createError('Code content or files required', 400);
  }

  const db = getDatabase();
  const get = promisify(db.get.bind(db));
  const run = promisify(db.run.bind(db));

  // Check if project exists and user owns it
  const project = await get(
    'SELECT id FROM projects WHERE id = ? AND user_id = ?',
    [req.params.id, req.user!.id]
  );

  if (!project) {
    throw createError('Project not found or access denied', 404);
  }

  // Update project code content
  if (codeContent) {
    await run(
      'UPDATE projects SET code_content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [codeContent, req.params.id]
    );
  }

  // Update individual files
  if (files && Array.isArray(files)) {
    for (const file of files) {
      const fileId = uuidv4();
      await run(
        `INSERT OR REPLACE INTO project_files 
         (id, project_id, file_path, file_content, file_type, size)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          fileId,
          req.params.id,
          file.path,
          file.content,
          file.type || 'text',
          file.content?.length || 0
        ]
      );
    }
  }

  res.json({ message: 'Project code updated successfully' });
}));

// Download project as ZIP
router.get('/:id/download', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const db = getDatabase();
  const get = promisify(db.get.bind(db));
  const all = promisify(db.all.bind(db));

  // Check if project exists and user has access
  const project = await get(
    `SELECT * FROM projects 
     WHERE id = ? AND (user_id = ? OR visibility = 'public')`,
    [req.params.id, req.user!.id]
  );

  if (!project) {
    throw createError('Project not found or access denied', 404);
  }

  // Get project files
  const files = await all(
    'SELECT file_path, file_content FROM project_files WHERE project_id = ?',
    [project.id]
  );

  // Create ZIP archive
  const archive = archiver('zip', { zlib: { level: 9 } });
  
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${project.name}.zip"`);

  archive.pipe(res);

  // Add main code content if available
  if (project.code_content) {
    archive.append(project.code_content, { name: 'README.md' });
  }

  // Add individual files
  files.forEach(file => {
    if (file.file_content) {
      archive.append(file.file_content, { name: file.file_path });
    }
  });

  // Add package.json for the project
  const packageJson = {
    name: project.name.toLowerCase().replace(/\s+/g, '-'),
    version: '1.0.0',
    description: project.description || '',
    main: 'index.js',
    scripts: {
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview'
    },
    dependencies: getDefaultDependencies(project.tech_stack)
  };

  archive.append(JSON.stringify(packageJson, null, 2), { name: 'package.json' });

  await archive.finalize();
}));

// Helper function to get default dependencies based on tech stack
function getDefaultDependencies(techStack: string) {
  const baseDependencies = {
    react: {
      'react': '^18.2.0',
      'react-dom': '^18.2.0',
      'vite': '^5.0.0',
      '@vitejs/plugin-react': '^4.2.0',
      'typescript': '^5.0.0',
      '@types/react': '^18.2.0',
      '@types/react-dom': '^18.2.0'
    },
    vue: {
      'vue': '^3.3.0',
      'vite': '^5.0.0',
      '@vitejs/plugin-vue': '^4.5.0',
      'typescript': '^5.0.0'
    },
    vanilla: {
      'vite': '^5.0.0',
      'typescript': '^5.0.0'
    }
  };

  return baseDependencies[techStack as keyof typeof baseDependencies] || baseDependencies.react;
}

export default router;