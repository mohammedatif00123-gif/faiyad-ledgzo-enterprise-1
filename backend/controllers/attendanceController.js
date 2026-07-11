const AttendanceService = require('../services/AttendanceService');
const { sendResponse } = require('../utils/apiResponse');

exports.startWork = async (req, res, next) => {
  try {
    const attendance = await AttendanceService.startWork(req.user.id);
    sendResponse(res, 200, 'Work started successfully', attendance);
  } catch (error) {
    next(error);
  }
};

exports.endWork = async (req, res, next) => {
  try {
    const attendance = await AttendanceService.endWork(req.user.id);
    sendResponse(res, 200, 'Work ended successfully', attendance);
  } catch (error) {
    next(error);
  }
};

exports.breakStart = async (req, res, next) => {
  try {
    const attendance = await AttendanceService.breakStart(req.user.id);
    sendResponse(res, 200, 'Break started successfully', attendance);
  } catch (error) {
    next(error);
  }
};

exports.breakEnd = async (req, res, next) => {
  try {
    const attendance = await AttendanceService.breakEnd(req.user.id);
    sendResponse(res, 200, 'Break ended successfully', attendance);
  } catch (error) {
    next(error);
  }
};

exports.getMyToday = async (req, res, next) => {
  try {
    const attendance = await AttendanceService.getMyToday(req.user.id);
    sendResponse(res, 200, 'Today attendance fetched', attendance);
  } catch (error) {
    next(error);
  }
};

exports.getMyHistory = async (req, res, next) => {
  try {
    const history = await AttendanceService.getHistory(req.user.id, req.query);
    sendResponse(res, 200, 'History fetched successfully', history);
  } catch (error) {
    next(error);
  }
};

// Admin
exports.getAllAttendance = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const data = await AttendanceService.getAllAttendance(req.query, page, limit);
    sendResponse(res, 200, 'All attendance fetched', data);
  } catch (error) {
    next(error);
  }
};
