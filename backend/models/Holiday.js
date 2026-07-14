const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  name: { type: String, required: true },
  date: { type: Date, required: true },
  type: { type: String, enum: ['public', 'company', 'optional'], default: 'public' },
  description: String,
  year: { type: Number, required: true },
  isRecurring: { type: Boolean, default: false }
}, { timestamps: true });

holidaySchema.index({ date: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Holiday', holidaySchema);
