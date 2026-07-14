const Attendance = require('../models/Attendance');
const BreakConfig = require('../models/BreakConfig');
const User = require('../models/User');

// @desc    Check-in
// @route   POST /api/attendance/check-in
// @access  Private (Employee)
exports.checkIn = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({ employeeId: req.user._id, date: { $gte: today } });

    if (attendance && attendance.checkIn) {
      return res.status(400).json({ success: false, message: 'Already checked in today' });
    }

    // Default work hours start 09:00
    const checkInTime = new Date();
    const config = await BreakConfig.findOne();
    const startStr = config?.workHours?.start || '09:00';
    const gracePeriod = config?.workHours?.gracePeriod || 15;
    
    const [startHour, startMin] = startStr.split(':').map(Number);
    const expectedStart = new Date(today);
    expectedStart.setHours(startHour, startMin + gracePeriod, 0, 0);

    let status = 'present';
    let lateMinutes = 0;
    
    if (checkInTime > expectedStart) {
      status = 'late';
      const exactStart = new Date(today);
      exactStart.setHours(startHour, startMin, 0, 0);
      lateMinutes = Math.floor((checkInTime - exactStart) / 60000);
    }

    if (!attendance) {
      attendance = new Attendance({
        employeeId: req.user._id,
        date: today,
        checkIn: checkInTime,
        status,
        lateMinutes
      });
    } else {
      attendance.checkIn = checkInTime;
      attendance.status = status;
      attendance.lateMinutes = lateMinutes;
    }

    await attendance.save();

    // Update user status
    await User.findByIdAndUpdate(req.user._id, { presenceStatus: 'online' });

    res.status(200).json({ success: true, data: attendance });
  } catch (error) {
    console.error('CheckIn Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Check-out
// @route   POST /api/attendance/check-out
// @access  Private (Employee)
exports.checkOut = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({ employeeId: req.user._id, date: { $gte: today } });

    if (!attendance || !attendance.checkIn) {
      return res.status(400).json({ success: false, message: 'No check-in found for today' });
    }

    if (attendance.checkOut) {
      return res.status(400).json({ success: false, message: 'Already checked out today' });
    }

    const checkOutTime = new Date();
    attendance.checkOut = checkOutTime;

    // Calculate total work hours (excluding breaks roughly, or just total difference for now)
    const totalMs = checkOutTime - attendance.checkIn;
    let totalMinutes = Math.floor(totalMs / 60000);

    // Deduct break durations
    const breakMinutes = attendance.breaks.reduce((total, b) => total + b.durationMinutes, 0);
    totalMinutes -= breakMinutes;

    attendance.workHours = (totalMinutes / 60).toFixed(2);
    
    // Check overtime
    const config = await BreakConfig.findOne();
    const endStr = config?.workHours?.end || '18:00';
    const [endHour, endMin] = endStr.split(':').map(Number);
    const expectedEnd = new Date(today);
    expectedEnd.setHours(endHour, endMin, 0, 0);

    if (checkOutTime > expectedEnd) {
      attendance.overtime = ((checkOutTime - expectedEnd) / (1000 * 60 * 60)).toFixed(2);
    }

    await attendance.save();

    await User.findByIdAndUpdate(req.user._id, { presenceStatus: 'offline' });

    res.status(200).json({ success: true, data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get Today's Attendance
// @route   GET /api/attendance/today
// @access  Private (Employee)
exports.getTodayAttendance = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const attendance = await Attendance.findOne({ employeeId: req.user._id, date: { $gte: today } });
    res.status(200).json({ success: true, data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get All Attendances (Admin)
// @route   GET /api/admin/attendance/all
// @access  Private (Admin)
exports.getAllAttendance = async (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    date.setHours(0, 0, 0, 0);
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);

    const attendances = await Attendance.find({ date: { $gte: date, $lt: nextDay } }).populate('employeeId', 'firstName lastName profileImage presenceStatus');
    res.status(200).json({ success: true, data: attendances });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get My Attendance History
// @route   GET /api/attendance/history
// @access  Private (Employee)
exports.getMyHistory = async (req, res) => {
  try {
    const { month, year } = req.query; // 1-indexed month
    const m = month ? parseInt(month) : new Date().getMonth() + 1;
    const y = year ? parseInt(year) : new Date().getFullYear();

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59);

    const attendances = await Attendance.find({
      employeeId: req.user._id,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    res.status(200).json({ success: true, data: attendances });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get Employees on Leave Today
// @route   GET /api/attendance/on-leave-today
// @access  Private (Employee)
exports.getOnLeaveToday = async (req, res) => {
  try {
    const Leave = require('../models/Leave');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const leaves = await Leave.find({
      status: { $regex: /^approved$/i },
      fromDate: { $lte: endOfDay },
      toDate: { $gte: today }
    }).populate('employeeId', 'firstName lastName avatar department');
    
    // Format the response to just send the employee details and leave type
    const onLeave = leaves.map(leave => ({
      _id: leave.employeeId?._id,
      name: `${leave.employeeId?.firstName} ${leave.employeeId?.lastName}`,
      department: leave.employeeId?.department,
      avatar: leave.employeeId?.avatar,
      leaveType: leave.type
    })).filter(emp => emp._id);

    res.status(200).json({ success: true, data: onLeave });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
