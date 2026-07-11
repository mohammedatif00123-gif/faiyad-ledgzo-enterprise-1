const mongoose = require('mongoose');

const attendanceSettingsSchema = new mongoose.Schema({
  companyTimezone: {
    type: String,
    default: 'UTC', // e.g., 'Asia/Kolkata', 'America/New_York'
  },
  lateThreshold: {
    type: Number, // minutes after start time
    default: 15
  },
  halfDayThreshold: {
    type: Number, // Minimum working hours for a half day
    default: 4
  },
  overtimeThreshold: {
    type: Number, // Minimum extra minutes to count as overtime
    default: 30
  },
  maxBreakDuration: {
    type: Number, // Maximum allowed break in minutes
    default: 60
  },
  autoCheckoutTime: {
    type: String, // Time to automatically check out users who forgot (e.g. "23:59")
    default: '23:59'
  }
}, { timestamps: true });

module.exports = mongoose.model('AttendanceSettings', attendanceSettingsSchema);
