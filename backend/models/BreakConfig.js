const mongoose = require('mongoose');

const breakConfigSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId },
  workHours: {
    start: { type: String, default: '09:00' },
    end: { type: String, default: '18:00' },
    gracePeriod: { type: Number, default: 15 }
  },
  lunchBreak: {
    enabled: { type: Boolean, default: true },
    startTime: { type: String, default: '13:00' },
    endTime: { type: String, default: '14:00' },
    durationMinutes: { type: Number, default: 60 }
  },
  shortBreaks: [{
    name: { type: String, default: 'Short Break 1' },
    enabled: { type: Boolean, default: true },
    startTime: { type: String, default: '11:00' },
    endTime: { type: String, default: '11:15' },
    durationMinutes: { type: Number, default: 15 }
  }, {
    name: { type: String, default: 'Short Break 2' },
    enabled: { type: Boolean, default: true },
    startTime: { type: String, default: '16:00' },
    endTime: { type: String, default: '16:15' },
    durationMinutes: { type: Number, default: 15 }
  }],
  allowFlexibleBreaks: { type: Boolean, default: false },
  autoMarkAbsent: { type: Boolean, default: true },
  halfDayThreshold: { type: Number, default: 4 },
  overtimeEnabled: { type: Boolean, default: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('BreakConfig', breakConfigSchema);
