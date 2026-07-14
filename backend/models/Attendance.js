const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: { type: Date, default: Date.now },
  checkIn: { type: Date },
  checkOut: { type: Date },
  status: { 
    type: String, 
    enum: ['present', 'absent', 'late', 'half-day', 'on-leave', 'holiday'],
    default: 'absent'
  },
  lateMinutes: { type: Number, default: 0 },
  workHours: { type: Number, default: 0 },
  overtime: { type: Number, default: 0 },
  awayEvents: [{
    reason: String,
    startTime: Date,
    endTime: Date,
    duration: Number
  }],
  breaks: [{
    type: { type: String, enum: ['lunch', 'short-break-1', 'short-break-2'] },
    start: { type: Date },
    end: { type: Date },
    durationMinutes: { type: Number, default: 0 }
  }],
  deviceInfo: {
    browser: String,
    os: String,
    ipAddress: String
  },
  notes: String,
  isManual: { type: Boolean, default: false }
}, { timestamps: true });

// Ensure one record per employee per day
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
