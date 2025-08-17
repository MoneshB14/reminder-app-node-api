import Reminder from '../models/Reminder.js';

class CalendarService {
  // Get events for a date range with advanced filtering
  async getEventsInDateRange(startDate, endDate, options = {}) {
    try {
      const {
        category,
        priority,
        status = ['pending', 'sent', 'snoozed'],
        includeCompleted = false,
        isEventCompleted,
        sortBy = 'date',
        sortOrder = 'asc'
      } = options;

      const filter = {
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };

      if (category) {
        filter.category = Array.isArray(category) ? { $in: category } : category;
      }

      if (priority) {
        filter.priority = Array.isArray(priority) ? { $in: priority } : priority;
      }

      if (includeCompleted) {
        filter.status = { $in: [...status, 'completed'] };
      } else {
        filter.status = { $in: status };
      }

      if (isEventCompleted !== undefined) {
        filter.isEventCompleted = isEventCompleted;
      }

      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      if (sortBy !== 'time') {
        sort.time = 1; // Secondary sort by time
      }

      return await Reminder.find(filter)
        .sort(sort)
        .populate('parentReminderId', 'eventName');
    } catch (error) {
      console.error('Error getting events in date range:', error);
      throw error;
    }
  }

  // Get events grouped by date
  async getEventsGroupedByDate(startDate, endDate, options = {}) {
    try {
      const events = await this.getEventsInDateRange(startDate, endDate, options);
      
      const groupedEvents = events.reduce((acc, event) => {
        const dateKey = event.date.toISOString().split('T')[0];
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(event);
        return acc;
      }, {});

      return groupedEvents;
    } catch (error) {
      console.error('Error grouping events by date:', error);
      throw error;
    }
  }

  // Generate calendar grid for a month
  async generateMonthCalendarGrid(year, month) {
    try {
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0);

      // Include days from previous and next month for complete calendar view
      const calendarStart = new Date(startOfMonth);
      calendarStart.setDate(calendarStart.getDate() - startOfMonth.getDay());
      
      const calendarEnd = new Date(endOfMonth);
      calendarEnd.setDate(calendarEnd.getDate() + (6 - endOfMonth.getDay()));

      const events = await this.getEventsInDateRange(calendarStart, calendarEnd);
      const eventsByDate = await this.getEventsGroupedByDate(calendarStart, calendarEnd);

      const calendarGrid = [];
      const currentDate = new Date(calendarStart);
      
      while (currentDate <= calendarEnd) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayEvents = eventsByDate[dateStr] || [];
        
        calendarGrid.push({
          date: new Date(currentDate),
          dateString: dateStr,
          events: dayEvents,
          eventCount: dayEvents.length,
          isCurrentMonth: currentDate.getMonth() === (month - 1),
          isToday: dateStr === new Date().toISOString().split('T')[0],
          hasEvents: dayEvents.length > 0,
          hasHighPriority: dayEvents.some(event => event.priority === 'high'),
          hasOverdue: dayEvents.some(event => event.isOverdue),
          hasCompletedEvents: dayEvents.some(event => event.isEventCompleted),
          hasPendingEvents: dayEvents.some(event => !event.isEventCompleted)
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return {
        grid: calendarGrid,
        totalEvents: events.length,
        dateRange: {
          start: calendarStart,
          end: calendarEnd
        }
      };
    } catch (error) {
      console.error('Error generating month calendar grid:', error);
      throw error;
    }
  }

  // Generate weekly calendar grid
  async generateWeekCalendarGrid(startDate) {
    try {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start from Sunday
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const events = await this.getEventsInDateRange(weekStart, weekEnd);
      const eventsByDate = await this.getEventsGroupedByDate(weekStart, weekEnd);

      const weekGrid = [];
      const currentDate = new Date(weekStart);
      
      for (let i = 0; i < 7; i++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayEvents = eventsByDate[dateStr] || [];
        
        weekGrid.push({
          date: new Date(currentDate),
          dateString: dateStr,
          dayName: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
          dayShort: currentDate.toLocaleDateString('en-US', { weekday: 'short' }),
          events: dayEvents,
          eventCount: dayEvents.length,
          isToday: dateStr === new Date().toISOString().split('T')[0],
          hasEvents: dayEvents.length > 0,
          hasHighPriority: dayEvents.some(event => event.priority === 'high'),
          hasOverdue: dayEvents.some(event => event.isOverdue),
          hasCompletedEvents: dayEvents.some(event => event.isEventCompleted),
          hasPendingEvents: dayEvents.some(event => !event.isEventCompleted)
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return {
        grid: weekGrid,
        totalEvents: events.length,
        dateRange: {
          start: weekStart,
          end: weekEnd
        }
      };
    } catch (error) {
      console.error('Error generating week calendar grid:', error);
      throw error;
    }
  }

  // Get calendar statistics
  async getCalendarStatistics(startDate, endDate) {
    try {
      const events = await this.getEventsInDateRange(startDate, endDate, {
        includeCompleted: true,
        status: ['pending', 'sent', 'snoozed', 'completed', 'cancelled']
      });

      const stats = {
        total: events.length,
        pending: events.filter(e => e.status === 'pending').length,
        sent: events.filter(e => e.status === 'sent').length,
        completed: events.filter(e => e.status === 'completed').length,
        snoozed: events.filter(e => e.status === 'snoozed').length,
        cancelled: events.filter(e => e.status === 'cancelled').length,
        overdue: events.filter(e => e.isOverdue).length,
        highPriority: events.filter(e => e.priority === 'high').length,
        recurring: events.filter(e => e.isRecurring).length,
        completedEvents: events.filter(e => e.isEventCompleted).length,
        pendingEvents: events.filter(e => !e.isEventCompleted).length
      };

      // Category breakdown
      const categoryBreakdown = events.reduce((acc, event) => {
        acc[event.category] = (acc[event.category] || 0) + 1;
        return acc;
      }, {});

      // Priority breakdown
      const priorityBreakdown = events.reduce((acc, event) => {
        acc[event.priority] = (acc[event.priority] || 0) + 1;
        return acc;
      }, {});

      return {
        ...stats,
        categoryBreakdown,
        priorityBreakdown,
        dateRange: { start: startDate, end: endDate }
      };
    } catch (error) {
      console.error('Error getting calendar statistics:', error);
      throw error;
    }
  }

  // Get events for today
  async getTodayEvents() {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      return await this.getEventsInDateRange(startOfDay, endOfDay);
    } catch (error) {
      console.error('Error getting today events:', error);
      throw error;
    }
  }

  // Get this week's events
  async getThisWeekEvents() {
    try {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      return await this.getEventsInDateRange(startOfWeek, endOfWeek);
    } catch (error) {
      console.error('Error getting this week events:', error);
      throw error;
    }
  }

  // Get this month's events
  async getThisMonthEvents() {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      return await this.getEventsInDateRange(startOfMonth, endOfMonth);
    } catch (error) {
      console.error('Error getting this month events:', error);
      throw error;
    }
  }

  // Search events by text
  async searchEvents(searchTerm, options = {}) {
    try {
      const {
        startDate,
        endDate,
        category,
        priority,
        status = ['pending', 'sent', 'snoozed'],
        limit = 50
      } = options;

      const filter = {
        $or: [
          { eventName: { $regex: searchTerm, $options: 'i' } },
          { notes: { $regex: searchTerm, $options: 'i' } }
        ]
      };

      if (startDate && endDate) {
        filter.date = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      if (category) {
        filter.category = Array.isArray(category) ? { $in: category } : category;
      }

      if (priority) {
        filter.priority = Array.isArray(priority) ? { $in: priority } : priority;
      }

      filter.status = { $in: status };

      return await Reminder.find(filter)
        .sort({ date: 1, time: 1 })
        .limit(limit)
        .populate('parentReminderId', 'eventName');
    } catch (error) {
      console.error('Error searching events:', error);
      throw error;
    }
  }
}

export default new CalendarService();
