const mongoose = require('mongoose');

const attendanceEventSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Start Work', 'Break Start', 'Break End', 'End Work', 'Manual Edit', 'Status Change'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  note: {
    type: String
  }
});

const attendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  attendanceDate: {
    type: String, // Stored as YYYY-MM-DD in company timezone
    required: true
  },
  startWork: {
    type: Date
  },
  endWork: {
    type: Date
  },
  workingHours: {
    type: Number, // In minutes, calculated
    default: 0
  },
  totalBreakTime: {
    type: Number, // In minutes, calculated
    default: 0
  },
  overtimeHours: {
    type: Number, // In minutes, calculated
    default: 0
  },
  lateMinutes: {
    type: Number, // In minutes, calculated
    default: 0
  },
  earlyCheckoutMinutes: {
    type: Number, // In minutes, calculated
    default: 0
  },
  attendanceStatus: {
    type: String,
    enum: ['Working', 'Present', 'Absent', 'Late', 'Half Day', 'Holiday', 'Leave', 'Weekend'],
    default: 'Absent'
  },
  events: [attendanceEventSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Compound index to ensure 1 attendance record per user per day
attendanceSchema.index({ user: 1, attendanceDate: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
