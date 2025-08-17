import Reminder from '../models/Reminder.js';
import reminderService from '../services/reminderService.js';

class CalendarController {
  // Get events for calendar view (month, week, day)
  async getCalendarEvents(req, res) {
    try {
      const {
        startDate,
        endDate,
        view = 'month', // month, week, day
        category,
        priority,
        status = 'pending,sent,snoozed', // default to active reminders
        isEventCompleted
      } = req.query;

      // Build date filter
      const dateFilter = {};
      if (startDate && endDate) {
        dateFilter.date = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      } else {
        // Default to current month if no dates provided
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        dateFilter.date = {
          $gte: startOfMonth,
          $lte: endOfMonth
        };
      }

      // Build additional filters
      const filter = { ...dateFilter };
      
      if (category) {
        filter.category = category;
      }
      
      if (priority) {
        filter.priority = priority;
      }
      
      if (status) {
        const statusArray = status.split(',').map(s => s.trim());
        filter.status = { $in: statusArray };
      }

      if (isEventCompleted !== undefined) {
        filter.isEventCompleted = isEventCompleted === 'true';
      }

      // Get events and sort by date and time
      const events = await Reminder.find(filter)
        .sort({ date: 1, time: 1 })
        .populate('parentReminderId', 'eventName');

      // Format events for calendar display
      const formattedEvents = events.map(event => ({
        id: event._id,
        title: event.eventName,
        date: event.date,
        time: event.time,
        fullDateTime: event.fullDateTime,
        category: event.category,
        priority: event.priority,
        status: event.status,
        notes: event.notes,
        isRecurring: event.isRecurring,
        isOverdue: event.isOverdue,
        recipientEmail: event.recipientEmail,
        snoozeCount: event.snoozeCount,
        snoozedUntil: event.snoozedUntil,
        notificationSent: event.notificationSent,
        isEventCompleted: event.isEventCompleted,
        eventCompletedAt: event.eventCompletedAt,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt
      }));

      // Group events by date for easier calendar rendering
      const eventsByDate = formattedEvents.reduce((acc, event) => {
        const dateKey = event.date.toISOString().split('T')[0];
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(event);
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          events: formattedEvents,
          eventsByDate,
          totalEvents: formattedEvents.length,
          view,
          dateRange: {
            start: dateFilter.date.$gte,
            end: dateFilter.date.$lte
          }
        }
      });
    } catch (error) {
      console.error('Error getting calendar events:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving calendar events',
        error: error.message
      });
    }
  }

  // Get events for a specific date
  async getEventsByDate(req, res) {
    try {
      const { date } = req.params;
      const { category, priority, status } = req.query;

      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

      const filter = {
        date: {
          $gte: startOfDay,
          $lt: endOfDay
        }
      };

      if (category) filter.category = category;
      if (priority) filter.priority = priority;
      if (status) filter.status = status;

      const events = await Reminder.find(filter)
        .sort({ time: 1 })
        .populate('parentReminderId', 'eventName');

      res.json({
        success: true,
        data: events,
        date: targetDate,
        count: events.length
      });
    } catch (error) {
      console.error('Error getting events by date:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving events for date',
        error: error.message
      });
    }
  }

  // Get current month's calendar view
  async getCurrentMonthCalendar(req, res) {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Include some days from previous and next month for complete calendar view
      const calendarStart = new Date(startOfMonth);
      calendarStart.setDate(calendarStart.getDate() - startOfMonth.getDay());
      
      const calendarEnd = new Date(endOfMonth);
      calendarEnd.setDate(calendarEnd.getDate() + (6 - endOfMonth.getDay()));

      const events = await Reminder.find({
        date: {
          $gte: calendarStart,
          $lte: calendarEnd
        },
        status: { $in: ['pending', 'sent', 'snoozed'] }
      })
      .sort({ date: 1, time: 1 })
      .populate('parentReminderId', 'eventName');

      // Create calendar grid
      const calendarGrid = [];
      const currentDate = new Date(calendarStart);
      
      while (currentDate <= calendarEnd) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayEvents = events.filter(event => 
          event.date.toISOString().split('T')[0] === dateStr
        );
        
        calendarGrid.push({
          date: new Date(currentDate),
          dateString: dateStr,
          events: dayEvents,
          eventCount: dayEvents.length,
          isCurrentMonth: currentDate.getMonth() === now.getMonth(),
          isToday: dateStr === now.toISOString().split('T')[0]
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      res.json({
        success: true,
        data: {
          calendar: calendarGrid,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          totalEvents: events.length,
          dateRange: {
            start: calendarStart,
            end: calendarEnd
          }
        }
      });
    } catch (error) {
      console.error('Error getting current month calendar:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving current month calendar',
        error: error.message
      });
    }
  }

  // Get calendar for specific month/year
  async getMonthCalendar(req, res) {
    try {
      const { year, month } = req.params;
      const targetYear = parseInt(year);
      const targetMonth = parseInt(month) - 1; // JavaScript months are 0-based

      if (isNaN(targetYear) || isNaN(targetMonth) || targetMonth < 0 || targetMonth > 11) {
        return res.status(400).json({
          success: false,
          message: 'Invalid year or month provided'
        });
      }

      const startOfMonth = new Date(targetYear, targetMonth, 1);
      const endOfMonth = new Date(targetYear, targetMonth + 1, 0);

      // Include some days from previous and next month for complete calendar view
      const calendarStart = new Date(startOfMonth);
      calendarStart.setDate(calendarStart.getDate() - startOfMonth.getDay());
      
      const calendarEnd = new Date(endOfMonth);
      calendarEnd.setDate(calendarEnd.getDate() + (6 - endOfMonth.getDay()));

      const events = await Reminder.find({
        date: {
          $gte: calendarStart,
          $lte: calendarEnd
        },
        status: { $in: ['pending', 'sent', 'snoozed'] }
      })
      .sort({ date: 1, time: 1 })
      .populate('parentReminderId', 'eventName');

      // Create calendar grid
      const calendarGrid = [];
      const currentDate = new Date(calendarStart);
      
      while (currentDate <= calendarEnd) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayEvents = events.filter(event => 
          event.date.toISOString().split('T')[0] === dateStr
        );
        
        calendarGrid.push({
          date: new Date(currentDate),
          dateString: dateStr,
          events: dayEvents,
          eventCount: dayEvents.length,
          isCurrentMonth: currentDate.getMonth() === targetMonth,
          isToday: dateStr === new Date().toISOString().split('T')[0]
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      res.json({
        success: true,
        data: {
          calendar: calendarGrid,
          month: targetMonth + 1,
          year: targetYear,
          totalEvents: events.length,
          dateRange: {
            start: calendarStart,
            end: calendarEnd
          }
        }
      });
    } catch (error) {
      console.error('Error getting month calendar:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving month calendar',
        error: error.message
      });
    }
  }

  // Get weekly calendar view
  async getWeeklyCalendar(req, res) {
    try {
      const { startDate } = req.query;
      
      let weekStart;
      if (startDate) {
        weekStart = new Date(startDate);
        // Adjust to start of week (Sunday)
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      } else {
        // Default to current week
        const now = new Date();
        weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
      }

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const events = await Reminder.find({
        date: {
          $gte: weekStart,
          $lte: weekEnd
        },
        status: { $in: ['pending', 'sent', 'snoozed'] }
      })
      .sort({ date: 1, time: 1 })
      .populate('parentReminderId', 'eventName');

      // Create weekly grid
      const weeklyGrid = [];
      const currentDate = new Date(weekStart);
      
      for (let i = 0; i < 7; i++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayEvents = events.filter(event => 
          event.date.toISOString().split('T')[0] === dateStr
        );
        
        weeklyGrid.push({
          date: new Date(currentDate),
          dateString: dateStr,
          dayName: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
          events: dayEvents,
          eventCount: dayEvents.length,
          isToday: dateStr === new Date().toISOString().split('T')[0]
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      res.json({
        success: true,
        data: {
          week: weeklyGrid,
          totalEvents: events.length,
          dateRange: {
            start: weekStart,
            end: weekEnd
          }
        }
      });
    } catch (error) {
      console.error('Error getting weekly calendar:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving weekly calendar',
        error: error.message
      });
    }
  }

  // Get calendar summary/statistics
  async getCalendarSummary(req, res) {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Get statistics
      const todayEvents = await Reminder.countDocuments({
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        },
        status: { $in: ['pending', 'sent', 'snoozed'] }
      });

      const weekEvents = await Reminder.countDocuments({
        date: {
          $gte: startOfWeek,
          $lte: endOfWeek
        },
        status: { $in: ['pending', 'sent', 'snoozed'] }
      });

      const monthEvents = await Reminder.countDocuments({
        date: {
          $gte: startOfMonth,
          $lte: endOfMonth
        },
        status: { $in: ['pending', 'sent', 'snoozed'] }
      });

      const overdueEvents = await reminderService.getOverdueReminders();

      res.json({
        success: true,
        data: {
          today: todayEvents,
          thisWeek: weekEvents,
          thisMonth: monthEvents,
          overdue: overdueEvents.length,
          summary: {
            date: today,
            weekRange: { start: startOfWeek, end: endOfWeek },
            monthRange: { start: startOfMonth, end: endOfMonth }
          }
        }
      });
    } catch (error) {
      console.error('Error getting calendar summary:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving calendar summary',
        error: error.message
      });
    }
  }
}

export default new CalendarController();
