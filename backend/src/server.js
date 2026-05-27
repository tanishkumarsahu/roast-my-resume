import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './routes/api.js';

// Resolve __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables relative to directory to prevent process.cwd() mismatch issues
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 4000;

// Enable Production-ready Dynamic CORS Whitelisting
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow non-browser requests (like curl, backend health checks, etc.)
    if (!origin) return callback(null, true);

    // In development or if origin matches allowedOrigins, allow it
    if (
      process.env.NODE_ENV !== 'production' || 
      allowedOrigins.includes(origin) || 
      allowedOrigins.some(allowed => origin.startsWith(allowed))
    ) {
      return callback(null, true);
    }

    // Automatically allow any Vercel deployment branch / preview / production domain
    if (origin.endsWith('.vercel.app') || /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Standard JSON body parsing
app.use(express.json());
// Form URL encoded parsing
app.use(express.urlencoded({ extended: true }));

// Register routes
app.use('/api', apiRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Global 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// Global Production Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("Unhandled Global Error:", err);
  
  const status = err.status || 500;
  const message = err.message || 'An unexpected production error occurred. Please try again.';
  
  res.status(status).json({
    error: message,
    code: 'INTERNAL_SERVER_ERROR'
  });
});

// Start the Express server
const server = app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🔥 RoastMyResume Express server is running!`);
  console.log(`🚀 Port: ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`==================================================`);
});

server.on('error', (err) => {
  console.error("SERVER RUNTIME ERROR:", err);
});
