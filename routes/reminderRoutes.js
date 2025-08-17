import express from 'express';
import reminderController from '../controllers/reminderController.js';
import { createReminderValidation, updateReminderValidation, snoozeValidation } from '../middleware/validation.js';

const router = express.Router();

// Create a new reminder
router.post('/', createReminderValidation, reminderController.createReminder);

// Get all reminders with filtering and pagination
router.get('/', reminderController.getAllReminders);

// Get upcoming reminders
router.get('/upcoming', reminderController.getUpcomingReminders);

// Get completed reminders
router.get('/completed', reminderController.getCompletedReminders);

// Get completed events (events that actually happened)
router.get('/events/completed', reminderController.getCompletedEvents);

// Get pending events (events not yet completed)
router.get('/events/pending', reminderController.getPendingEvents);

// Get overdue reminders
router.get('/overdue', reminderController.getOverdueReminders);

// Get statistics
router.get('/statistics', reminderController.getStatistics);

// Get dashboard overview
router.get('/dashboard/overview', reminderController.getDashboardOverview);

// Get reminders by category
router.get('/category/:category', reminderController.getRemindersByCategory);

// Get reminder by ID
router.get('/:id', reminderController.getReminderById);

// Update reminder
router.put('/:id', updateReminderValidation, reminderController.updateReminder);

// Delete reminder
router.delete('/:id', reminderController.deleteReminder);

// Snooze reminder
router.post('/:id/snooze', snoozeValidation, reminderController.snoozeReminder);

// Mark reminder as completed
router.post('/:id/complete', reminderController.markAsCompleted);

// Mark event as completed (separate from reminder completion)
router.post('/:id/event/complete', reminderController.markEventAsCompleted);

// Mark event as not completed
router.post('/:id/event/uncomplete', reminderController.markEventAsNotCompleted);

// Recurring reminder management
router.post('/:id/regenerate-instances', reminderController.regenerateRecurringInstances);
router.get('/:id/instances', reminderController.getRecurringInstances);
router.delete('/:id/instances', reminderController.deleteRecurringInstances);

export default router;
