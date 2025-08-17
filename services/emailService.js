import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD
      }
    });
  }

  async sendReminderEmail(reminder) {
    try {
      const emailContent = this.generateEmailContent(reminder);
      
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: reminder.recipientEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${reminder.recipientEmail}:`, result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }
  }

  generateEmailContent(reminder) {
    const priorityEmoji = {
      high: '🔴',
      medium: '🟡',
      low: '🟢'
    };

    const categoryEmoji = {
      work: '💼',
      personal: '👤',
      health: '🏥',
      education: '📚',
      finance: '💰',
      social: '👥',
      other: '📋'
    };

    const subject = `${priorityEmoji[reminder.priority]} Reminder: ${reminder.eventName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .reminder-details { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .priority { padding: 5px 10px; border-radius: 3px; color: white; display: inline-block; }
          .priority.high { background-color: #f44336; }
          .priority.medium { background-color: #ff9800; }
          .priority.low { background-color: #4CAF50; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Reminder Notification</h1>
          </div>
          <div class="content">
            <div class="reminder-details">
              <h2>${categoryEmoji[reminder.category]} ${reminder.eventName}</h2>
              <p><strong>📅 Date:</strong> ${new Date(reminder.date).toLocaleDateString()}</p>
              <p><strong>🕐 Time:</strong> ${reminder.time}</p>
              <p><strong>📂 Category:</strong> ${reminder.category.charAt(0).toUpperCase() + reminder.category.slice(1)}</p>
              <p><strong>🔸 Priority:</strong> <span class="priority ${reminder.priority}">${reminder.priority.toUpperCase()}</span></p>
              ${reminder.notes ? `<p><strong>📝 Notes:</strong> ${reminder.notes}</p>` : ''}
              ${reminder.isRecurring ? `<p><strong>🔄 Recurring:</strong> ${reminder.recurringType}</p>` : ''}
            </div>
            <p>This is your scheduled reminder. Don't forget to take action!</p>
          </div>
          <div class="footer">
            <p>Sent by Reminder App | If you need to snooze this reminder, please use the app.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Reminder: ${reminder.eventName}

Date: ${new Date(reminder.date).toLocaleDateString()}
Time: ${reminder.time}
Category: ${reminder.category}
Priority: ${reminder.priority}
${reminder.notes ? `Notes: ${reminder.notes}` : ''}
${reminder.isRecurring ? `Recurring: ${reminder.recurringType}` : ''}

This is your scheduled reminder. Don't forget to take action!
    `;

    return { subject, html, text };
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('Email service connection verified');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}

export default new EmailService();
