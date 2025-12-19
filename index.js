import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/mongodb.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import aiConfigRoutes from './routes/aiConfig.js';
import documentsRoutes from './routes/documents.js';
import competencyRoutes from './routes/competency.js';
import logsRoutes from './routes/logs.js';
import apiKeysRoutes from './routes/apiKeys.js';
import fineTuningRoutes from './routes/fineTuning.js';
import playgroundRoutes from './routes/playground.js';
import { combinedAuth } from './middleware/apiKeyAuth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Leadership Systems API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/keys', apiKeysRoutes);
app.use('/api/ai-config', combinedAuth, aiConfigRoutes);
app.use('/api/documents', combinedAuth, documentsRoutes);
app.use('/api/competency', combinedAuth, competencyRoutes);
app.use('/api/logs', combinedAuth, logsRoutes);
app.use('/api/fine-tuning', combinedAuth, fineTuningRoutes);
app.use('/api/playground', playgroundRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`✅ Leadership Systems API server running on port ${PORT}`);
      console.log(`✅ MongoDB connected successfully`);
      console.log(`✅ Health check: http://localhost:${PORT}/health`);
      console.log(`\n📚 API Endpoints:`);
      console.log(`   - POST   /api/auth/login - Login and get JWT token`);
      console.log(`   - GET    /api/auth/me - Get current user`);
      console.log(`   - GET    /api/users - List all users (Admin only)`);
      console.log(`   - POST   /api/users - Create new user (Admin only)`);
      console.log(`   - POST   /api/ai-config - Save AI configuration`);
      console.log(`   - POST   /api/documents/upload - Upload PDF/DOC with text extraction`);
      console.log(`   - POST   /api/fine-tuning/start - Start fine-tuning job`);
      console.log(`   - GET    /api/fine-tuning/jobs - List fine-tuning jobs`);
      console.log(`   - POST   /api/competency/generate - Generate competency with AI`);
      console.log(`   - GET    /api/logs - View AI generation logs`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
