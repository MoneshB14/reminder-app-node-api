import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import reminderRoutes from './routes/reminderRoutes.js';
import calendarRoutes from './routes/calendarRoutes.js';
import reminderService from './services/reminderService.js';
import emailService from './services/emailService.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/reminders', reminderRoutes);
app.use('/api/calendar', calendarRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const emailConnectionOk = await emailService.testConnection();
    
    res.json({
      success: true,
      message: 'Server is healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        email: emailConnectionOk ? 'connected' : 'error',
        scheduler: 'running'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Reminder App API is running',
    version: '1.0.0',
    endpoints: {
      reminders: '/api/reminders',
      calendar: '/api/calendar',
      health: '/health',
      docs: '/api/docs'
    }
  });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    message: 'Reminder App API Documentation',
    version: '1.0.0',
    endpoints: [
      {
        method: 'POST',
        path: '/api/reminders',
        description: 'Create a new reminder',
        body: {
          eventName: 'string (required)',
          date: 'ISO date string (required)',
          time: 'HH:MM format (required)',
          recipientEmail: 'email (required)',
          notes: 'string (optional)',
          category: 'work|personal|health|education|finance|social|other (optional)',
          priority: 'low|medium|high (optional)',
          isRecurring: 'boolean (optional)',
          recurringType: 'daily|weekly|monthly (required if isRecurring=true)',
          recurringEndDate: 'ISO date string (optional)'
        }
      },
      {
        method: 'GET',
        path: '/api/reminders',
        description: 'Get all reminders with filtering and pagination',
        query: 'page, limit, status, category, priority, isRecurring, sortBy, sortOrder'
      },
      {
        method: 'GET',
        path: '/api/reminders/upcoming',
        description: 'Get upcoming reminders',
        query: 'limit'
      },
      {
        method: 'GET',
        path: '/api/reminders/completed',
        description: 'Get completed reminders',
        query: 'page, limit'
      },
      {
        method: 'GET',
        path: '/api/reminders/overdue',
        description: 'Get overdue reminders'
      },
      {
        method: 'GET',
        path: '/api/reminders/statistics',
        description: 'Get reminder statistics'
      },
      {
        method: 'GET',
        path: '/api/reminders/category/:category',
        description: 'Get reminders by category',
        query: 'page, limit'
      },
      {
        method: 'GET',
        path: '/api/reminders/:id',
        description: 'Get reminder by ID'
      },
      {
        method: 'PUT',
        path: '/api/reminders/:id',
        description: 'Update reminder'
      },
      {
        method: 'DELETE',
        path: '/api/reminders/:id',
        description: 'Delete reminder'
      },
      {
        method: 'POST',
        path: '/api/reminders/:id/snooze',
        description: 'Snooze reminder',
        body: { minutes: 'number (default: 15)' }
      },
      {
        method: 'POST',
        path: '/api/reminders/:id/complete',
        description: 'Mark reminder as completed'
      },
      // Calendar API endpoints
      {
        method: 'GET',
        path: '/api/calendar/events',
        description: 'Get calendar events with filtering',
        query: 'startDate, endDate, view, category, priority, status'
      },
      {
        method: 'GET',
        path: '/api/calendar/events/date/:date',
        description: 'Get events for a specific date (YYYY-MM-DD)',
        query: 'category, priority, status'
      },
      {
        method: 'GET',
        path: '/api/calendar/month/current',
        description: 'Get current month calendar view'
      },
      {
        method: 'GET',
        path: '/api/calendar/month/:year/:month',
        description: 'Get calendar for specific month/year'
      },
      {
        method: 'GET',
        path: '/api/calendar/week',
        description: 'Get weekly calendar view',
        query: 'startDate (optional, defaults to current week)'
      },
      {
        method: 'GET',
        path: '/api/calendar/summary',
        description: 'Get calendar summary/statistics'
      }
    ]
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Test email service
    const emailOk = await emailService.testConnection();
    if (!emailOk) {
      console.warn('Warning: Email service connection failed, but continuing...');
    }
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📧 Email service: ${emailOk ? 'Connected' : 'Error'}`);
      console.log(`⏰ Reminder scheduler: Active`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT. Graceful shutdown...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM. Graceful shutdown...');
  process.exit(0);
});

startServer();

export default app;
