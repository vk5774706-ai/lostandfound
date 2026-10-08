import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import itemsRoutes from './routes/items.js';
import claimsRoutes from './routes/claims.js';
import messagesRoutes from './routes/messages.js';
import resolvedRoutes from './routes/resolved.js';
import { isSupabaseConfigured } from './config/supabase.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Setup Socket.io for real-time chat and claim events
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.set('io', io);

// Middleware
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    supabaseConfigured: isSupabaseConfigured,
    mode: isSupabaseConfigured ? 'supabase_cloud_postgresql' : 'local_memory_fallback',
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/claims', claimsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/resolved', resolvedRoutes);

// Socket.io Connection Logic
io.on('connection', (socket) => {
  console.log('⚡ Socket client connected:', socket.id);

  // User joins their personal room for notifications
  socket.on('join_user', (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
    }
  });

  // User joins a claim room for live chat
  socket.on('join_claim', (claimId) => {
    if (claimId) {
      socket.join(`claim_${claimId}`);
    }
  });

  // Leave claim room
  socket.on('leave_claim', (claimId) => {
    if (claimId) {
      socket.leave(`claim_${claimId}`);
    }
  });

  socket.on('disconnect', () => {
    // Client disconnected
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.url}` });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Lost & Found MERN/PERN Backend Server running on http://localhost:${PORT}`);
  console.log(`📡 Database mode: ${isSupabaseConfigured ? 'Supabase Cloud PostgreSQL' : 'Local Fallback'}`);
});

export { app, server, io };
