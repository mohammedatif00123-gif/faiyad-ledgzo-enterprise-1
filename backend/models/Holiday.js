const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  type: {
    type: String,
    enum: ['Public', 'Company', 'Optional'],
    default: 'Company'
  },
  description: {
    type: String
  },
  location: {
    type: String,
    default: 'Global' // Support for regional holidays
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('Holiday', holidaySchema);
