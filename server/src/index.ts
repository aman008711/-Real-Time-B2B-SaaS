import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { env } from './config/env';
import router from './routes';
import { connectDatabase } from './config/db';
import { cleanApiResponse } from './middleware/clean-response.middleware';

const app = express();
const PORT = env.PORT;

// Enable CORS
app.use(cors({
  origin: env.CLIENT_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parse JSON request bodies
app.use(express.json());

// Secure and sanitize all outbound JSON payloads
app.use(cleanApiResponse);

// Application API routes
app.use('/api', router);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fallback for undefined routes
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Not Found: ${req.method} ${req.url}` });
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Start connection and server listener
async function startServer() {
  await connectDatabase();
  app.listen(PORT, () => {
    console.log(`[Server] Express server running on port ${PORT}`);
    console.log(`[Server] Health check: http://localhost:${PORT}/health`);
  });
}

startServer();
