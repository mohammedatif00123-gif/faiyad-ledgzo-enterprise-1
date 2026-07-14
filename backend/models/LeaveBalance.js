const mongoose = require('mongoose');

const leaveBalanceSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  year: { type: Number, default: new Date().getFullYear() },
  balances: {
    annual: { type: Number, default: 20 },
    sick: { type: Number, default: 10 },
    casual: { type: Number, default: 5 },
    emergency: { type: Number, default: 3 },
    unpaid: { type: Number, default: 0 }
  },
  used: {
    annual: { type: Number, default: 0 },
    sick: { type: Number, default: 0 },
    casual: { type: Number, default: 0 },
    emergency: { type: Number, default: 0 },
    unpaid: { type: Number, default: 0 }
  },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

leaveBalanceSchema.index({ employeeId: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('LeaveBalance', leaveBalanceSchema);
