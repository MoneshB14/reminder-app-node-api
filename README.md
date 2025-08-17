# Reminder App

A comprehensive reminder application built with Node.js, Express, and MongoDB that sends email notifications at scheduled times.

## Features

- ✅ Create reminders with event name, date, time, and notes
- ✅ Email notifications using Nodemailer (Gmail SMTP)
- ✅ Recurring reminders (daily, weekly, monthly)
- ✅ Categories and priority levels
- ✅ Snooze functionality
- ✅ Background job scheduling with node-cron
- ✅ RESTful API with comprehensive endpoints
- ✅ MongoDB integration with Mongoose
- ✅ Input validation and error handling
- ✅ Clean folder structure

## Quick Start

1. **Clone and Install**
   ```bash
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   The `.env` file is already configured with your credentials.

3. **Start the Application**
   ```bash
   npm start
   # or for development with auto-reload
   npm run dev
   ```

4. **Access the API**
   - API Base: http://localhost:3000
   - Documentation: http://localhost:3000/api/docs
   - Health Check: http://localhost:3000/health

## API Endpoints

### Core Reminder Operations
- `POST /api/reminders` - Create a new reminder
- `GET /api/reminders` - Get all reminders (with filtering/pagination)
- `GET /api/reminders/:id` - Get reminder by ID
- `PUT /api/reminders/:id` - Update reminder
- `DELETE /api/reminders/:id` - Delete reminder

### Special Endpoints
- `GET /api/reminders/upcoming` - Get upcoming reminders
- `GET /api/reminders/completed` - Get completed reminders
- `GET /api/reminders/overdue` - Get overdue reminders
- `GET /api/reminders/statistics` - Get reminder statistics
- `POST /api/reminders/:id/snooze` - Snooze reminder
- `POST /api/reminders/:id/complete` - Mark as completed

## Example Usage

### Create a Simple Reminder
```bash
curl -X POST http://localhost:3000/api/reminders \
-H "Content-Type: application/json" \
-d '{
  "eventName": "Doctor Appointment",
  "date": "2024-12-25",
  "time": "14:30",
  "recipientEmail": "venkateshwaramotors.trl@gmail.com",
  "notes": "Annual checkup",
  "category": "health",
  "priority": "high"
}'
```

### Create a Recurring Reminder
```bash
curl -X POST http://localhost:3000/api/reminders \
-H "Content-Type: application/json" \
-d '{
  "eventName": "Daily Standup",
  "date": "2024-12-25",
  "time": "09:00",
  "recipientEmail": "venkateshwaramotors.trl@gmail.com",
  "category": "work",
  "priority": "medium",
  "isRecurring": true,
  "recurringType": "daily",
  "recurringEndDate": "2024-12-31"
}'
```

## Postman Collection

Import `postman_collection.json` into Postman for easy API testing. The collection includes:
- All API endpoints
- Example requests
- Environment variables
- Comprehensive test scenarios

## Project Structure

```
reminder-app/
├── config/
│   └── database.js          # MongoDB connection
├── controllers/
│   └── reminderController.js # API controllers
├── middleware/
│   └── validation.js        # Input validation
├── models/
│   └── Reminder.js          # Mongoose schema
├── routes/
│   └── reminderRoutes.js    # API routes
├── services/
│   ├── emailService.js      # Email notifications
│   └── reminderService.js   # Background scheduling
├── server.js                # Express server setup
├── package.json             # Dependencies
├── env.example              # Environment template
└── postman_collection.json  # API testing
```

## Features in Detail

### 🔄 Recurring Reminders
- Support for daily, weekly, and monthly recurrence
- Automatic generation of reminder instances
- Optional end dates for recurring series

### 🏷️ Categories & Priorities
- Categories: work, personal, health, education, finance, social, other
- Priorities: low, medium, high
- Color-coded email notifications

### ⏰ Snooze Functionality
- Postpone reminders for specified minutes
- Maximum 5 snoozes per reminder
- Automatic status management

### 📧 Email Notifications
- Rich HTML email templates
- Gmail SMTP integration
- Priority and category indicators
- Mobile-friendly design

### 📊 Analytics & Monitoring
- Reminder statistics and distributions
- Overdue reminder tracking
- Health check endpoints
- Comprehensive logging

## Scheduling System

The app uses `node-cron` to:
- Check for pending reminders every minute
- Process snoozed reminders
- Generate recurring reminder instances
- Handle email notifications automatically

## Error Handling

- Comprehensive input validation
- Graceful error responses
- Database connection monitoring
- Email service health checks

## Development

```bash
# Install dependencies
npm install

# Start development server with auto-reload
npm run dev

# Check health
curl http://localhost:3000/health
```

## Configuration

Key environment variables:
- `MONGODB_URI` - MongoDB connection string
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD` - Email config
- `PORT` - Server port (default: 3000)

## License

MIT License - feel free to use this project for your own applications!
