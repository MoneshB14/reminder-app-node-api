import { body } from 'express-validator';

export const createReminderValidation = [
  body('eventName')
    .trim()
    .notEmpty()
    .withMessage('Event name is required')
    .isLength({ max: 200 })
    .withMessage('Event name cannot exceed 200 characters'),

  body('date')
    .isISO8601()
    .withMessage('Please provide a valid date in ISO format')
    .custom((value) => {
      const inputDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (inputDate < today) {
        throw new Error('Date cannot be in the past');
      }
      return true;
    }),

  body('time')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time must be in HH:MM format (24-hour)'),

  body('recipientEmail')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),

  body('category')
    .optional()
    .isIn(['work', 'personal', 'health', 'education', 'finance', 'social', 'other'])
    .withMessage('Invalid category'),

  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),

  body('isRecurring')
    .optional()
    .isBoolean()
    .withMessage('isRecurring must be a boolean'),

  body('recurringType')
    .if(body('isRecurring').equals(true))
    .isIn(['daily', 'weekly', 'monthly'])
    .withMessage('Recurring type must be daily, weekly, or monthly'),

  body('recurringEndDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid recurring end date')
];

export const updateReminderValidation = [
  body('eventName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Event name cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Event name cannot exceed 200 characters'),

  body('date')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date in ISO format'),

  body('time')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time must be in HH:MM format (24-hour)'),

  body('recipientEmail')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),

  body('category')
    .optional()
    .isIn(['work', 'personal', 'health', 'education', 'finance', 'social', 'other'])
    .withMessage('Invalid category'),

  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),

  body('status')
    .optional()
    .isIn(['pending', 'sent', 'completed', 'snoozed', 'cancelled'])
    .withMessage('Invalid status')
];

export const snoozeValidation = [
  body('minutes')
    .optional()
    .isInt({ min: 1, max: 1440 })
    .withMessage('Snooze minutes must be between 1 and 1440 (24 hours)')
];