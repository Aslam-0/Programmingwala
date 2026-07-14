import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import { connectDB } from './config/db.js';
import { seedDatabase } from './config/seed.js';
import authRoutes from './routes/auth.js';
import publicRoutes from './routes/public.js';
import portalRoutes from './routes/portal.js';
import adminRoutes from './routes/admin.js';
import meetingsRoutes from './routes/meetings.js';
import admissionPaymentRoutes from './routes/admissionPayment.js';
import razorpayRoutes from './routes/razorpay.js';
import lmsRoutes from './routes/lms.js';
import paymentRoutes from './routes/payment.js';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Resolve static paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/meetings', meetingsRoutes);
app.use('/api/admission-payment', admissionPaymentRoutes);
app.use('/api/razorpay', razorpayRoutes);
app.use('/api/lms', lmsRoutes);
app.use('/api', paymentRoutes);

// Serve Frontend static assets if built, otherwise serve API welcome message
const frontendDistPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(path.join(frontendDistPath, 'index.html'))) {
  app.use(express.static(frontendDistPath));
  
  app.get('*', (req, res, next) => {
    // Avoid intercepting API routes or uploads
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  // Root Route fallback
  app.get('/', (req, res) => {
    res.json({
      message: 'Welcome to Pranidha International School Kindergarten API Server!',
      version: '1.0.0',
      mode: process.env.NODE_ENV || 'development'
    });
  });
}

// Fallback Route Handler (404)
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'Resource API endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Pranidha School backend running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  
  // Connect to Database & Seed asynchronously
  try {
    await connectDB();
    await seedDatabase();
  } catch (err) {
    console.error('Error during database initialization:', err);
  }
});
