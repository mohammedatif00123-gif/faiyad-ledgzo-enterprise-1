const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { ROLES, STATUSES } = require('../constants');

const userSchema = new mongoose.Schema(
  {
    employeeCode: {
      type: String,
      unique: true
    },
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    companyEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    personalEmail: {
      type: String,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      select: false // Never expose in JSON
    },
    phone: String,
    department: String,
    designation: String,
    profileImage: String,
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.EMPLOYEE
    },
    status: {
      type: String,
      enum: Object.values(STATUSES),
      default: STATUSES.ACTIVE
    },
    lastLogin: Date,
    isVerified: {
      type: Boolean,
      default: false
    },
    joiningDate: Date,
    mustChangePassword: {
      type: Boolean,
      default: true
    },
    isFirstLogin: {
      type: Boolean,
      default: true
    },
    isOnline: {
      type: Boolean,
      default: false
    },
    presenceStatus: {
      type: String, 
      enum: ['online', 'offline', 'away', 'in-break', 'in-meeting', 'busy'],
      default: 'offline'
    },
    awayReason: String,
    awaySince: Date,
    awayDuration: Number,
    socketId: String,
    loginAttempts: {
      type: Number,
      default: 0
    },
    passwordChangedAt: Date,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    deletedAt: Date,
    workSchedule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkSchedule'
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Middleware to hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to match password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
