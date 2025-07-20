import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../database/init';
import { promisify } from 'util';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  projectId?: string;
  isAlive?: boolean;
}

interface WebSocketMessage {
  type: string;
  payload: any;
  projectId?: string;
}

const clients = new Map<string, Set<AuthenticatedWebSocket>>();
const projectClients = new Map<string, Set<AuthenticatedWebSocket>>();

export function setupWebSocket(wss: WebSocketServer): void {
  wss.on('connection', async (ws: AuthenticatedWebSocket, req) => {
    console.log('📡 New WebSocket connection');
    
    ws.isAlive = true;
    
    // Handle authentication
    ws.on('message', async (data) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'auth':
            await handleAuthentication(ws, message.payload);
            break;
            
          case 'join_project':
            await handleJoinProject(ws, message.payload);
            break;
            
          case 'leave_project':
            await handleLeaveProject(ws, message.payload);
            break;
            
          case 'project_update':
            await handleProjectUpdate(ws, message);
            break;
            
          case 'code_change':
            await handleCodeChange(ws, message);
            break;
            
          case 'cursor_position':
            await handleCursorPosition(ws, message);
            break;
            
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
            
          default:
            console.log(`Unknown message type: ${message.type}`);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ 
          type: 'error', 
          payload: { message: 'Invalid message format' } 
        }));
      }
    });

    // Handle connection close
    ws.on('close', () => {
      console.log('📡 WebSocket connection closed');
      cleanupConnection(ws);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      cleanupConnection(ws);
    });

    // Heartbeat
    ws.on('pong', () => {
      ws.isAlive = true;
    });
  });

  // Heartbeat interval
  const interval = setInterval(() => {
    wss.clients.forEach((ws: AuthenticatedWebSocket) => {
      if (ws.isAlive === false) {
        cleanupConnection(ws);
        return ws.terminate();
      }
      
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000); // 30 seconds

  wss.on('close', () => {
    clearInterval(interval);
  });
}

async function handleAuthentication(ws: AuthenticatedWebSocket, payload: any): Promise<void> {
  try {
    const { token } = payload;
    
    if (!token) {
      ws.send(JSON.stringify({ 
        type: 'auth_error', 
        payload: { message: 'Token required' } 
      }));
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    
    // Verify user exists
    const db = getDatabase();
    const get = promisify(db.get.bind(db));
    
    const user = await get(
      'SELECT id, email, display_name FROM users WHERE id = ? AND is_active = 1',
      [decoded.userId]
    );

    if (!user) {
      ws.send(JSON.stringify({ 
        type: 'auth_error', 
        payload: { message: 'Invalid token or user not found' } 
      }));
      return;
    }

    ws.userId = user.id;
    
    // Add to clients map
    if (!clients.has(user.id)) {
      clients.set(user.id, new Set());
    }
    clients.get(user.id)!.add(ws);

    ws.send(JSON.stringify({ 
      type: 'auth_success', 
      payload: { 
        userId: user.id,
        email: user.email,
        displayName: user.display_name
      } 
    }));

    console.log(`✅ User ${user.email} authenticated via WebSocket`);
  } catch (error) {
    console.error('Authentication error:', error);
    ws.send(JSON.stringify({ 
      type: 'auth_error', 
      payload: { message: 'Authentication failed' } 
    }));
  }
}

async function handleJoinProject(ws: AuthenticatedWebSocket, payload: any): Promise<void> {
  if (!ws.userId) {
    ws.send(JSON.stringify({ 
      type: 'error', 
      payload: { message: 'Authentication required' } 
    }));
    return;
  }

  const { projectId } = payload;
  
  if (!projectId) {
    ws.send(JSON.stringify({ 
      type: 'error', 
      payload: { message: 'Project ID required' } 
    }));
    return;
  }

  try {
    // Verify user has access to project
    const db = getDatabase();
    const get = promisify(db.get.bind(db));
    
    const project = await get(
      `SELECT id, name FROM projects 
       WHERE id = ? AND (user_id = ? OR visibility = 'public')`,
      [projectId, ws.userId]
    );

    if (!project) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        payload: { message: 'Project not found or access denied' } 
      }));
      return;
    }

    ws.projectId = projectId;
    
    // Add to project clients map
    if (!projectClients.has(projectId)) {
      projectClients.set(projectId, new Set());
    }
    projectClients.get(projectId)!.add(ws);

    // Notify other clients in the project
    broadcastToProject(projectId, {
      type: 'user_joined',
      payload: {
        userId: ws.userId,
        projectId
      }
    }, ws);

    ws.send(JSON.stringify({ 
      type: 'project_joined', 
      payload: { 
        projectId,
        projectName: project.name
      } 
    }));

    console.log(`👥 User ${ws.userId} joined project ${projectId}`);
  } catch (error) {
    console.error('Join project error:', error);
    ws.send(JSON.stringify({ 
      type: 'error', 
      payload: { message: 'Failed to join project' } 
    }));
  }
}

async function handleLeaveProject(ws: AuthenticatedWebSocket, payload: any): Promise<void> {
  const { projectId } = payload;
  
  if (ws.projectId && projectClients.has(ws.projectId)) {
    projectClients.get(ws.projectId)!.delete(ws);
    
    // Notify other clients
    broadcastToProject(ws.projectId, {
      type: 'user_left',
      payload: {
        userId: ws.userId,
        projectId: ws.projectId
      }
    }, ws);
  }

  ws.projectId = undefined;
  
  ws.send(JSON.stringify({ 
    type: 'project_left', 
    payload: { projectId } 
  }));
}

async function handleProjectUpdate(ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void> {
  if (!ws.userId || !ws.projectId) {
    return;
  }

  // Broadcast update to other clients in the project
  broadcastToProject(ws.projectId, {
    type: 'project_updated',
    payload: {
      ...message.payload,
      userId: ws.userId,
      timestamp: Date.now()
    }
  }, ws);
}

async function handleCodeChange(ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void> {
  if (!ws.userId || !ws.projectId) {
    return;
  }

  // Broadcast code change to other clients in the project
  broadcastToProject(ws.projectId, {
    type: 'code_changed',
    payload: {
      ...message.payload,
      userId: ws.userId,
      timestamp: Date.now()
    }
  }, ws);
}

async function handleCursorPosition(ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void> {
  if (!ws.userId || !ws.projectId) {
    return;
  }

  // Broadcast cursor position to other clients in the project
  broadcastToProject(ws.projectId, {
    type: 'cursor_moved',
    payload: {
      ...message.payload,
      userId: ws.userId,
      timestamp: Date.now()
    }
  }, ws);
}

function broadcastToProject(projectId: string, message: any, excludeWs?: AuthenticatedWebSocket): void {
  const projectWs = projectClients.get(projectId);
  if (!projectWs) return;

  const messageStr = JSON.stringify(message);
  
  projectWs.forEach((ws) => {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  });
}

function broadcastToUser(userId: string, message: any): void {
  const userWs = clients.get(userId);
  if (!userWs) return;

  const messageStr = JSON.stringify(message);
  
  userWs.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  });
}

function cleanupConnection(ws: AuthenticatedWebSocket): void {
  // Remove from clients map
  if (ws.userId && clients.has(ws.userId)) {
    clients.get(ws.userId)!.delete(ws);
    if (clients.get(ws.userId)!.size === 0) {
      clients.delete(ws.userId);
    }
  }

  // Remove from project clients map
  if (ws.projectId && projectClients.has(ws.projectId)) {
    projectClients.get(ws.projectId)!.delete(ws);
    if (projectClients.get(ws.projectId)!.size === 0) {
      projectClients.delete(ws.projectId);
    }

    // Notify other clients in the project
    broadcastToProject(ws.projectId, {
      type: 'user_left',
      payload: {
        userId: ws.userId,
        projectId: ws.projectId
      }
    }, ws);
  }
}

// Export functions for external use
export { broadcastToUser, broadcastToProject };