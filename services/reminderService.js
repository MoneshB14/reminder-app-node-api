import cron from 'node-cron';
import Reminder from '../models/Reminder.js';
import emailService from './emailService.js';

class ReminderService {
  constructor() {
    this.activeJobs = new Map();
    this.initializeScheduler();
  }

  initializeScheduler() {
    // Check for pending reminders every minute
    cron.schedule('* * * * *', async () => {
      await this.checkPendingReminders();
    });

    // Check for snoozed reminders every minute
    cron.schedule('* * * * *', async () => {
      await this.checkSnoozedReminders();
    }); 

    // Generate recurring reminders daily at midnight
    cron.schedule('0 0 * * *', async () => {
      await this.generateRecurringReminders();
    });

    console.log('Reminder scheduler initialized');
  }

  async checkPendingReminders() {
    try {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const pendingReminders = await Reminder.find({
        status: 'pending',
        date: {
          $gte: today,
          $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        },
        time: currentTime,
        notificationSent: false
      });

      for (const reminder of pendingReminders) {
        await this.sendReminder(reminder);
      }
    } catch (error) {
      console.error('Error checking pending reminders:', error);
    }
  }

  async checkSnoozedReminders() {
    try {
      const now = new Date();
      
      const snoozedReminders = await Reminder.find({
        status: 'snoozed',
        snoozedUntil: { $lte: now }
      });

      for (const reminder of snoozedReminders) {
        reminder.status = 'pending';
        reminder.snoozedUntil = undefined;
        await reminder.save();
        
        await this.sendReminder(reminder);
      }
    } catch (error) {
      console.error('Error checking snoozed reminders:', error);
    }
  }

  async sendReminder(reminder) {
    try {
      const emailResult = await emailService.sendReminderEmail(reminder);
      
      if (emailResult.success) {
        reminder.status = 'sent';
        reminder.notificationSent = true;
        reminder.notificationSentAt = new Date();
        await reminder.save();
        
        console.log(`Reminder sent successfully: ${reminder.eventName}`);
      } else {
        console.error(`Failed to send reminder: ${reminder.eventName}`, emailResult.error);
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
    }
  }

  async generateRecurringReminders() {
    try {
      const recurringReminders = await Reminder.find({
        isRecurring: true,
        isParentReminder: true,
        status: { $ne: 'cancelled' }
      });

      for (const parentReminder of recurringReminders) {
        await this.createRecurringInstance(parentReminder);
      }
    } catch (error) {
      console.error('Error generating recurring reminders:', error);
    }
  }

  async createRecurringInstance(parentReminder) {
    try {
      const now = new Date();
      let nextDate = new Date(parentReminder.date);

      // Calculate next occurrence based on recurring type
      switch (parentReminder.recurringType) {
        case 'daily':
          nextDate.setDate(nextDate.getDate() + 1);
          break;
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
      }

      // Check if we should still create instances
      if (parentReminder.recurringEndDate && nextDate > parentReminder.recurringEndDate) {
        return;
      }

      // Check if instance already exists for this date
      const existingInstance = await Reminder.findOne({
        parentReminderId: parentReminder._id,
        date: {
          $gte: new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate()),
          $lt: new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate() + 1)
        }
      });

      if (!existingInstance && nextDate >= now) {
        const instanceData = {
          eventName: parentReminder.eventName,
          date: nextDate,
          time: parentReminder.time,
          notes: parentReminder.notes,
          recipientEmail: parentReminder.recipientEmail,
          category: parentReminder.category,
          priority: parentReminder.priority,
          parentReminderId: parentReminder._id,
          isRecurring: false,
          isParentReminder: false,
          createdBy: 'recurring-system'
        };

        await Reminder.create(instanceData);
        console.log(`Created recurring instance for: ${parentReminder.eventName} on ${nextDate.toDateString()}`);
      }
    } catch (error) {
      console.error('Error creating recurring instance:', error);
    }
  }

  // Generate ALL recurring instances from start date to end date (OPTIMIZED)
  async generateAllRecurringInstances(parentReminder) {
    try {
      if (!parentReminder.isRecurring || !parentReminder.recurringEndDate) {
        return { created: 0, skipped: 0 };
      }

      const startDate = new Date(parentReminder.date);
      const endDate = new Date(parentReminder.recurringEndDate);
      
      // Get all existing instances in one query
      const existingInstances = await Reminder.find({
        parentReminderId: parentReminder._id
      }, { date: 1 });
      
      const existingDates = new Set(
        existingInstances.map(instance => 
          instance.date.toISOString().split('T')[0]
        )
      );

      const instances = [];
      let currentDate = new Date(startDate);

      // Pre-calculate all dates to avoid DB calls in loop
      const datesToCreate = [];
      while (currentDate <= endDate) {
        if (currentDate.getTime() !== startDate.getTime()) {
          const dateStr = currentDate.toISOString().split('T')[0];
          if (!existingDates.has(dateStr)) {
            datesToCreate.push(new Date(currentDate));
          }
        }
        
        // Calculate next occurrence
        switch (parentReminder.recurringType) {
          case 'daily':
            currentDate.setDate(currentDate.getDate() + 1);
            break;
          case 'weekly':
            currentDate.setDate(currentDate.getDate() + 7);
            break;
          case 'monthly':
            currentDate.setMonth(currentDate.getMonth() + 1);
            break;
        }
      }

      // Bulk create all instances
      if (datesToCreate.length > 0) {
        const instancesData = datesToCreate.map(date => ({
          eventName: parentReminder.eventName,
          date,
          time: parentReminder.time,
          notes: parentReminder.notes,
          recipientEmail: parentReminder.recipientEmail,
          category: parentReminder.category,
          priority: parentReminder.priority,
          parentReminderId: parentReminder._id,
          isRecurring: false,
          isParentReminder: false,
          createdBy: 'recurring-system'
        }));

        await Reminder.insertMany(instancesData, { ordered: false });
        console.log(`Bulk created ${instancesData.length} recurring instances for: ${parentReminder.eventName}`);
      }

      return { 
        created: datesToCreate.length, 
        skipped: existingInstances.length,
        total: datesToCreate.length 
      };
    } catch (error) {
      console.error('Error generating all recurring instances:', error);
      throw error;
    }
  }

  // Regenerate missing recurring instances for a parent reminder
  async regenerateRecurringInstances(parentReminderId) {
    try {
      const parentReminder = await Reminder.findById(parentReminderId);
      
      if (!parentReminder) {
        throw new Error('Parent reminder not found');
      }

      if (!parentReminder.isRecurring || !parentReminder.isParentReminder) {
        throw new Error('Reminder is not a recurring parent reminder');
      }

      const result = await this.generateAllRecurringInstances(parentReminder);
      console.log(`Regenerated recurring instances for ${parentReminder.eventName}:`, result);
      
      return result;
    } catch (error) {
      console.error('Error regenerating recurring instances:', error);
      throw error;
    }
  }

  async snoozeReminder(reminderId, snoozeMinutes = 15) {
    try {
      const reminder = await Reminder.findById(reminderId);
      
      if (!reminder) {
        throw new Error('Reminder not found');
      }

      if (reminder.snoozeCount >= 5) {
        throw new Error('Maximum snooze limit reached');
      }

      const snoozeUntil = new Date();
      snoozeUntil.setMinutes(snoozeUntil.getMinutes() + snoozeMinutes);

      reminder.status = 'snoozed';
      reminder.snoozedUntil = snoozeUntil;
      reminder.snoozeCount += 1;
      reminder.notificationSent = false;

      await reminder.save();
      
      console.log(`Reminder snoozed for ${snoozeMinutes} minutes: ${reminder.eventName}`);
      return reminder;
    } catch (error) {
      console.error('Error snoozing reminder:', error);
      throw error;
    }
  }

  async markAsCompleted(reminderId) {
    try {
      const reminder = await Reminder.findById(reminderId);
      
      if (!reminder) {
        throw new Error('Reminder not found');
      }

      reminder.status = 'completed';
      await reminder.save();
      
      console.log(`Reminder marked as completed: ${reminder.eventName}`);
      return reminder;
    } catch (error) {
      console.error('Error marking reminder as completed:', error);
      throw error;
    }
  }

  async markEventAsCompleted(reminderId) {
    try {
      const reminder = await Reminder.findById(reminderId);
      
      if (!reminder) {
        throw new Error('Reminder not found');
      }

      reminder.isEventCompleted = true;
      reminder.eventCompletedAt = new Date();
      await reminder.save();
      
      console.log(`Event marked as completed: ${reminder.eventName}`);
      return reminder;
    } catch (error) {
      console.error('Error marking event as completed:', error);
      throw error;
    }
  }

  async markEventAsNotCompleted(reminderId) {
    try {
      const reminder = await Reminder.findById(reminderId);
      
      if (!reminder) {
        throw new Error('Reminder not found');
      }

      reminder.isEventCompleted = false;
      reminder.eventCompletedAt = undefined;
      await reminder.save();
      
      console.log(`Event marked as not completed: ${reminder.eventName}`);
      return reminder;
    } catch (error) {
      console.error('Error marking event as not completed:', error);
      throw error;
    }
  }

  async getUpcomingReminders(limit = 10) {
    try {
      const now = new Date();
      
      return await Reminder.find({
        $or: [
          { status: 'pending' },
          { status: 'snoozed' }
        ],
        $or: [
          { date: { $gte: now } },
          { 
            date: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
            time: { $gte: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}` }
          }
        ]
      })
      .sort({ date: 1, time: 1 })
      .limit(limit);
    } catch (error) {
      console.error('Error getting upcoming reminders:', error);
      throw error;
    }
  }

  async getOverdueReminders() {
    try {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      return await Reminder.find({
        $and: [
          { status: { $in: ['pending', 'sent'] } },
          {
            $or: [
              { date: { $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } },
              {
                date: { $eq: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
                time: { $lt: currentTime }
              }
            ]
          }
        ]
      })
      .sort({ date: -1, time: -1 });
    } catch (error) {
      console.error('Error getting overdue reminders:', error);
      throw error;
    }
  }
}

export default new ReminderService();
