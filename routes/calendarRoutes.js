import express from 'express';
import calendarController from '../controllers/calendarController.js';

const router = express.Router();

// Get calendar events with filtering options
// Query params: startDate, endDate, view, category, priority, status
router.get('/events', calendarController.getCalendarEvents);

// Get events for a specific date
// URL param: date (YYYY-MM-DD format)
// Query params: category, priority, status
router.get('/events/date/:date', calendarController.getEventsByDate);

// Get current month calendar view
router.get('/month/current', calendarController.getCurrentMonthCalendar);

// Get calendar for specific month/year
// URL params: year (YYYY), month (1-12)
router.get('/month/:year/:month', calendarController.getMonthCalendar);

// Get weekly calendar view
// Query param: startDate (optional, defaults to current week)
router.get('/week', calendarController.getWeeklyCalendar);

// Get calendar summary/statistics
router.get('/summary', calendarController.getCalendarSummary);

export default router;
