const mongoose = require('mongoose');

const workScheduleSchema = new mongoose.Schema({
  shiftName: {
    type: String,
    required: true,
    enum: ['General', 'Flexible', 'Remote', 'Night', 'Rotational']
  },
  workStart: {
    type: String, // e.g. "09:00"
    required: true,
  },
  workEnd: {
    type: String, // e.g. "18:00"
    required: true,
  },
  breakDuration: {
    type: Number, // in minutes, e.g. 60
    required: true,
  },
  weeklyOffDays: [{
    type: Number, // 0 = Sunday, 1 = Monday... 6 = Saturday
  }],
  gracePeriod: {
    type: Number, // minutes allowed to be late, e.g. 15
    default: 15
  },
  overtimeAfter: {
    type: Number, // minutes after workEnd when overtime starts, e.g. 30
    default: 30
  }
}, { timestamps: true });

module.exports = mongoose.model('WorkSchedule', workScheduleSchema);
