const Leave = require('../models/Leave');
const LeaveBalance = require('../models/LeaveBalance');

// @desc    Apply for leave
// @route   POST /api/leaves/apply
// @access  Private (Employee)
exports.applyLeave = async (req, res) => {
  try {
    const { type, fromDate, toDate, totalDays, reason } = req.body;

    const leave = await Leave.create({
      employeeId: req.user._id,
      type,
      fromDate,
      toDate,
      totalDays,
      reason
    });

    res.status(201).json({ success: true, data: leave });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get my leaves
// @route   GET /api/leaves/my-leaves
// @access  Private (Employee)
exports.getMyLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({ employeeId: req.user._id }).sort({ appliedOn: -1 });
    res.status(200).json({ success: true, data: leaves });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get all pending leaves (Admin)
// @route   GET /api/admin/leaves/pending
// @access  Private (Admin)
exports.getPendingLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({ status: 'pending' }).populate('employeeId', 'firstName lastName profileImage');
    res.status(200).json({ success: true, data: leaves });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Approve/Reject Leave (Admin)
// @route   PUT /api/admin/leaves/:id/status
// @access  Private (Admin)
exports.updateLeaveStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const leave = await Leave.findById(req.params.id);

    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });

    leave.status = status;
    if (status === 'rejected') leave.rejectionReason = rejectionReason;
    if (status === 'approved') {
      leave.approvedBy = req.user._id;
      leave.approvedOn = new Date();

      // Deduct balance
      const currentYear = new Date().getFullYear();
      const balance = await LeaveBalance.findOne({ employeeId: leave.employeeId, year: currentYear });
      if (balance) {
        balance.used[leave.type] += leave.totalDays;
        await balance.save();
      }
    }

    await leave.save();
    res.status(200).json({ success: true, data: leave });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
