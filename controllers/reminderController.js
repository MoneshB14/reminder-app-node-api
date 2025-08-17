import { validationResult } from 'express-validator';
import Reminder from '../models/Reminder.js';
import reminderService from '../services/reminderService.js';

class ReminderController {
  // Create a new reminder
  async createReminder(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const reminder = new Reminder(req.body);
      await reminder.save();

      // If it's a recurring reminder, generate all instances immediately
      let recurringResult = null;
      if (reminder.isRecurring && reminder.recurringEndDate) {
        try {
          recurringResult = await reminderService.generateAllRecurringInstances(reminder);
          console.log(`Generated ${recurringResult.total} recurring instances for: ${reminder.eventName}`);
        } catch (error) {
          console.error('Error generating recurring instances:', error);
          // Don't fail the main creation, just log the error
        }
      }

      res.status(201).json({
        success: true,
        message: 'Reminder created successfully',
        data: reminder,
        ...(recurringResult && { 
          recurring: {
            instancesCreated: recurringResult.total,
            message: `Created ${recurringResult.total} recurring instances until ${reminder.recurringEndDate}`
          }
        })
      });
    } catch (error) {
      console.error('Error creating reminder:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating reminder',
        error: error.message
      });
    }
  }

  // Get all reminders with filtering and pagination
  async getAllReminders(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        category,
        priority,
        isRecurring,
        sortBy = 'date',
        sortOrder = 'asc'
      } = req.query;

      const filter = {};
      if (status) filter.status = status;
      if (category) filter.category = category;
      if (priority) filter.priority = priority;
      if (isRecurring !== undefined) filter.isRecurring = isRecurring === 'true';

      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const reminders = await Reminder.find(filter)
        .sort(sort)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('parentReminderId', 'eventName');

      const total = await Reminder.countDocuments(filter);

      res.json({
        success: true,
        data: reminders,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error getting reminders:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving reminders',
        error: error.message
      });
    }
  }

  // Get reminder by ID
  async getReminderById(req, res) {
    try {
      const reminder = await Reminder.findById(req.params.id)
        .populate('parentReminderId', 'eventName');

      if (!reminder) {
        return res.status(404).json({
          success: false,
          message: 'Reminder not found'
        });
      }

      res.json({
        success: true,
        data: reminder
      });
    } catch (error) {
      console.error('Error getting reminder:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving reminder',
        error: error.message
      });
    }
  }

  // Update reminder
  async updateReminder(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation errors',
          errors: errors.array()
        });
      }

      const reminder = await Reminder.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );

      if (!reminder) {
        return res.status(404).json({
          success: false,
          message: 'Reminder not found'
        });
      }

      res.json({
        success: true,
        message: 'Reminder updated successfully',
        data: reminder
      });
    } catch (error) {
      console.error('Error updating reminder:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating reminder',
        error: error.message
      });
    }
  }

  // Delete reminder
  async deleteReminder(req, res) {
    try {
      const reminder = await Reminder.findByIdAndDelete(req.params.id);

      if (!reminder) {
        return res.status(404).json({
          success: false,
          message: 'Reminder not found'
        });
      }

      res.json({
        success: true,
        message: 'Reminder deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting reminder:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting reminder',
        error: error.message
      });
    }
  }

  // Get upcoming reminders
  async getUpcomingReminders(req, res) {
    try {
      const { limit = 10 } = req.query;
      const reminders = await reminderService.getUpcomingReminders(parseInt(limit));

      res.json({
        success: true,
        data: reminders,
        count: reminders.length
      });
    } catch (error) {
      console.error('Error getting upcoming reminders:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving upcoming reminders',
        error: error.message
      });
    }
  }

  // Get completed reminders
  async getCompletedReminders(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;

      const reminders = await Reminder.find({ status: 'completed' })
        .sort({ updatedAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Reminder.countDocuments({ status: 'completed' });

      res.json({
        success: true,
        data: reminders,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error getting completed reminders:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving completed reminders',
        error: error.message
      });
    }
  }

  // Get overdue reminders
  async getOverdueReminders(req, res) {
    try {
      const reminders = await reminderService.getOverdueReminders();

      res.json({
        success: true,
        data: reminders,
        count: reminders.length
      });
    } catch (error) {
      console.error('Error getting overdue reminders:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving overdue reminders',
        error: error.message
      });
    }
  }

  // Snooze reminder
  async snoozeReminder(req, res) {
    try {
      const { id } = req.params;
      const { minutes = 15 } = req.body;

      const reminder = await reminderService.snoozeReminder(id, minutes);

      res.json({
        success: true,
        message: `Reminder snoozed for ${minutes} minutes`,
        data: reminder
      });
    } catch (error) {
      console.error('Error snoozing reminder:', error);
      res.status(500).json({
        success: false,
        message: 'Error snoozing reminder',
        error: error.message
      });
    }
  }

  // Mark reminder as completed
  async markAsCompleted(req, res) {
    try {
      const { id } = req.params;
      const reminder = await reminderService.markAsCompleted(id);

      res.json({
        success: true,
        message: 'Reminder marked as completed',
        data: reminder
      });
    } catch (error) {
      console.error('Error marking reminder as completed:', error);
      res.status(500).json({
        success: false,
        message: 'Error marking reminder as completed',
        error: error.message
      });
    }
  }

  // Mark event as completed (separate from reminder completion)
  async markEventAsCompleted(req, res) {
    try {
      const { id } = req.params;
      const reminder = await reminderService.markEventAsCompleted(id);

      res.json({
        success: true,
        message: 'Event marked as completed',
        data: reminder
      });
    } catch (error) {
      console.error('Error marking event as completed:', error);
      res.status(500).json({
        success: false,
        message: 'Error marking event as completed',
        error: error.message
      });
    }
  }

  // Mark event as not completed
  async markEventAsNotCompleted(req, res) {
    try {
      const { id } = req.params;
      const reminder = await reminderService.markEventAsNotCompleted(id);

      res.json({
        success: true,
        message: 'Event marked as not completed',
        data: reminder
      });
    } catch (error) {
      console.error('Error marking event as not completed:', error);
      res.status(500).json({
        success: false,
        message: 'Error marking event as not completed',
        error: error.message
      });
    }
  }

  // Get completed events (events that actually happened)
  async getCompletedEvents(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;

      const events = await Reminder.find({ isEventCompleted: true })
        .sort({ eventCompletedAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('parentReminderId', 'eventName');

      const total = await Reminder.countDocuments({ isEventCompleted: true });

      res.json({
        success: true,
        data: events,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error getting completed events:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving completed events',
        error: error.message
      });
    }
  }

  // Get pending events (events not yet completed)
  async getPendingEvents(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;

      const events = await Reminder.find({ isEventCompleted: false })
        .sort({ date: 1, time: 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('parentReminderId', 'eventName');

      const total = await Reminder.countDocuments({ isEventCompleted: false });

      res.json({
        success: true,
        data: events,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error getting pending events:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving pending events',
        error: error.message
      });
    }
  }

  // Get reminders by category
  async getRemindersByCategory(req, res) {
    try {
      const { category } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const reminders = await Reminder.find({ category })
        .sort({ date: 1, time: 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Reminder.countDocuments({ category });

      res.json({
        success: true,
        data: reminders,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error getting reminders by category:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving reminders by category',
        error: error.message
      });
    }
  }

  // Get statistics
  async getStatistics(req, res) {
    try {
      const totalReminders = await Reminder.countDocuments();
      const pendingReminders = await Reminder.countDocuments({ status: 'pending' });
      const completedReminders = await Reminder.countDocuments({ status: 'completed' });
      const overdueReminders = await reminderService.getOverdueReminders();
      const completedEvents = await Reminder.countDocuments({ isEventCompleted: true });
      const pendingEvents = await Reminder.countDocuments({ isEventCompleted: false });
      
      const categoryStats = await Reminder.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      const priorityStats = await Reminder.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      res.json({
        success: true,
        data: {
          total: totalReminders,
          pending: pendingReminders,
          completed: completedReminders,
          overdue: overdueReminders.length,
          completedEvents: completedEvents,
          pendingEvents: pendingEvents,
          categoryDistribution: categoryStats,
          priorityDistribution: priorityStats
        }
      });
    } catch (error) {
      console.error('Error getting statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving statistics',
        error: error.message
      });
    }
  }

  // Get dashboard overview counts
  async getDashboardOverview(req, res) {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      
      // Start of current week (Sunday)
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      
      // End of current week (Saturday)
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      // Active reminders (pending, sent, snoozed)
      const activeReminders = await Reminder.countDocuments({
        status: { $in: ['pending', 'sent', 'snoozed'] }
      });

      // Events completed today
      const completedToday = await Reminder.countDocuments({
        isEventCompleted: true,
        eventCompletedAt: {
          $gte: today,
          $lt: tomorrow
        }
      });

      // Overdue reminders
      const overdueReminders = await reminderService.getOverdueReminders();
      const overdueCount = overdueReminders.length;

      // This week's events
      const thisWeekEvents = await Reminder.countDocuments({
        date: {
          $gte: startOfWeek,
          $lte: endOfWeek
        },
        status: { $in: ['pending', 'sent', 'snoozed', 'completed'] }
      });

      // Today's events
      const todayEvents = await Reminder.countDocuments({
        date: {
          $gte: today,
          $lt: tomorrow
        },
        status: { $in: ['pending', 'sent', 'snoozed', 'completed'] }
      });

      // Upcoming events (next 7 days)
      const next7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const upcomingEvents = await Reminder.countDocuments({
        date: {
          $gte: today,
          $lte: next7Days
        },
        status: { $in: ['pending', 'sent', 'snoozed'] }
      });

      // High priority events today
      const highPriorityToday = await Reminder.countDocuments({
        date: {
          $gte: today,
          $lt: tomorrow
        },
        priority: 'high',
        status: { $in: ['pending', 'sent', 'snoozed'] }
      });

      // Snoozed reminders
      const snoozedReminders = await Reminder.countDocuments({
        status: 'snoozed'
      });

      res.json({
        success: true,
        data: {
          activeReminders,
          completedToday,
          overdueCount,
          thisWeekEvents,
          todayEvents,
          upcomingEvents,
          highPriorityToday,
          snoozedReminders,
          dateInfo: {
            today: today.toISOString().split('T')[0],
            weekStart: startOfWeek.toISOString().split('T')[0],
            weekEnd: endOfWeek.toISOString().split('T')[0]
          }
        }
      });
    } catch (error) {
      console.error('Error getting dashboard overview:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving dashboard overview',
        error: error.message
      });
    }
  }

  // Regenerate recurring instances for a parent reminder
  async regenerateRecurringInstances(req, res) {
    try {
      const { id } = req.params;
      const result = await reminderService.regenerateRecurringInstances(id);

      res.json({
        success: true,
        message: 'Recurring instances regenerated successfully',
        data: result
      });
    } catch (error) {
      console.error('Error regenerating recurring instances:', error);
      res.status(500).json({
        success: false,
        message: 'Error regenerating recurring instances',
        error: error.message
      });
    }
  }

  // Get all instances of a recurring reminder
  async getRecurringInstances(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 50, includeParent = false } = req.query;

      // First check if the reminder exists and is recurring
      const parentReminder = await Reminder.findById(id);
      if (!parentReminder) {
        return res.status(404).json({
          success: false,
          message: 'Reminder not found'
        });
      }

      if (!parentReminder.isRecurring) {
        return res.status(400).json({
          success: false,
          message: 'Reminder is not recurring'
        });
      }

      const filter = { parentReminderId: id };
      
      const instances = await Reminder.find(filter)
        .sort({ date: 1, time: 1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Reminder.countDocuments(filter);

      let responseData = {
        parent: includeParent === 'true' ? parentReminder : null,
        instances,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      };

      res.json({
        success: true,
        data: responseData
      });
    } catch (error) {
      console.error('Error getting recurring instances:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving recurring instances',
        error: error.message
      });
    }
  }

  // Delete all instances of a recurring reminder
  async deleteRecurringInstances(req, res) {
    try {
      const { id } = req.params;
      
      // Check if parent reminder exists
      const parentReminder = await Reminder.findById(id);
      if (!parentReminder) {
        return res.status(404).json({
          success: false,
          message: 'Parent reminder not found'
        });
      }

      if (!parentReminder.isRecurring) {
        return res.status(400).json({
          success: false,
          message: 'Reminder is not recurring'
        });
      }

      // Delete all instances
      const deleteResult = await Reminder.deleteMany({ parentReminderId: id });

      res.json({
        success: true,
        message: 'All recurring instances deleted successfully',
        data: {
          deletedCount: deleteResult.deletedCount
        }
      });
    } catch (error) {
      console.error('Error deleting recurring instances:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting recurring instances',
        error: error.message
      });
    }
  }
}

export default new ReminderController();
