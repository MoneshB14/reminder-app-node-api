import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema({
  eventName: {
    type: String,
    required: [true, 'Event name is required'],
    trim: true,
    maxlength: [200, 'Event name cannot exceed 200 characters']
  },
  
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  
  time: {
    type: String,
    required: [true, 'Time is required'],
    validate: {
      validator: function(v) {
        // Validate time format HH:MM (24-hour format)
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: 'Time must be in HH:MM format (24-hour)'
    }
  },
  
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  
  // Email for notification
  recipientEmail: {
    type: String,
    required: [true, 'Recipient email is required'],
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Please provide a valid email address'
    }
  },
  
  // Recurring reminder settings
  isRecurring: {
    type: Boolean,
    default: false
  },
  
  recurringType: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: function() {
      return this.isRecurring;
    }
  },
  
  recurringEndDate: {
    type: Date,
    validate: {
      validator: function(v) {
        if (this.isRecurring && v) {
          return v > this.date;
        }
        return true;
      },
      message: 'Recurring end date must be after the start date'
    }
  },
  
  // Categories and priority
  category: {
    type: String,
    enum: ['work', 'personal', 'health', 'education', 'finance', 'social', 'other'],
    default: 'other'
  },
  
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'sent', 'completed', 'snoozed', 'cancelled'],
    default: 'pending'
  },
  
  // Event completion tracking (separate from reminder status)
  isEventCompleted: {
    type: Boolean,
    default: false
  },
  
  eventCompletedAt: {
    type: Date
  },
  
  // Snooze functionality
  snoozedUntil: {
    type: Date,
    validate: {
      validator: function(v) {
        if (v) {
          return v > new Date();
        }
        return true;
      },
      message: 'Snooze time must be in the future'
    }
  },
  
  snoozeCount: {
    type: Number,
    default: 0,
    max: [5, 'Maximum 5 snoozes allowed per reminder']
  },
  
  // Notification tracking
  notificationSent: {
    type: Boolean,
    default: false
  },
  
  notificationSentAt: {
    type: Date
  },
  
  // For tracking recurring reminder instances
  parentReminderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reminder'
  },
  
  isParentReminder: {
    type: Boolean,
    default: false
  },
  
  // Metadata
  createdBy: {
    type: String,
    default: 'system'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for checking if reminder is overdue
reminderSchema.virtual('isOverdue').get(function() {
  if (this.status === 'completed' || this.status === 'cancelled' || this.isEventCompleted) {
    return false;
  }
  
  const now = new Date();
  const reminderDateTime = new Date(this.date);
  const [hours, minutes] = this.time.split(':');
  reminderDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  if (this.status === 'snoozed' && this.snoozedUntil) {
    return now > this.snoozedUntil;
  }
  
  return now > reminderDateTime;
});

// Virtual for getting full datetime
reminderSchema.virtual('fullDateTime').get(function() {
  const reminderDate = new Date(this.date);
  const [hours, minutes] = this.time.split(':');
  reminderDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  return reminderDate;
});

// Index for efficient querying
reminderSchema.index({ date: 1, time: 1 });
reminderSchema.index({ status: 1 });
reminderSchema.index({ category: 1 });
reminderSchema.index({ priority: 1 });
reminderSchema.index({ isRecurring: 1 });
reminderSchema.index({ snoozedUntil: 1 });
reminderSchema.index({ isEventCompleted: 1 });

// Pre-save middleware to set isParentReminder
reminderSchema.pre('save', function(next) {
  if (this.isRecurring && !this.parentReminderId) {
    this.isParentReminder = true;
  }
  next();
});

const Reminder = mongoose.model('Reminder', reminderSchema);

export default Reminder;
