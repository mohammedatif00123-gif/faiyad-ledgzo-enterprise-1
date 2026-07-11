const AttendanceRepository = require('../repositories/AttendanceRepository');
const PresenceService = require('./PresenceService');
const WorkSchedule = require('../models/WorkSchedule');
const AttendanceSettings = require('../models/AttendanceSettings');
const User = require('../models/User');

class AttendanceService {
  /**
   * Helper to format date in company timezone to YYYY-MM-DD
   */
  getTodayDateString(timezone = 'UTC') {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }

  async startWork(userId) {
    const user = await User.findById(userId).populate('workSchedule');
    const settings = await AttendanceSettings.findOne() || { companyTimezone: 'UTC', lateThreshold: 15 };
    const tz = user.timezone || settings.companyTimezone;
    const today = this.getTodayDateString(tz);

    let attendance = await AttendanceRepository.findOne({ user: userId, attendanceDate: today });

    if (attendance && attendance.startWork) {
      throw new Error('Work session already started for today.');
    }

    if (!attendance) {
      attendance = await AttendanceRepository.create({
        user: userId,
        attendanceDate: today,
        startWork: new Date(),
        attendanceStatus: 'Working',
        events: [{ type: 'Start Work', timestamp: new Date() }]
      });
    } else {
      attendance.startWork = new Date();
      attendance.attendanceStatus = 'Working';
      await attendance.save();
      await AttendanceRepository.addEvent(attendance._id, 'Start Work');
    }

    // Calculate Late Minutes if workSchedule exists
    if (user.workSchedule && user.workSchedule.workStart) {
      // Logic for late calculation based on workStart time and gracePeriod
      // simplified for this architectural demo:
      const now = new Date();
      const [startHour, startMinute] = user.workSchedule.workStart.split(':').map(Number);
      
      // Create a Date object for the expected start time in local TZ
      const expectedStart = new Date(now.toLocaleString('en-US', { timeZone: tz }));
      expectedStart.setHours(startHour, startMinute, 0, 0);

      const actualStart = new Date(now.toLocaleString('en-US', { timeZone: tz }));
      
      const diffMinutes = Math.floor((actualStart - expectedStart) / 60000);
      if (diffMinutes > (user.workSchedule.gracePeriod || settings.lateThreshold)) {
        attendance.lateMinutes = diffMinutes;
        attendance.attendanceStatus = 'Late';
        await attendance.save();
      }
    }

    // Update Presence
    await PresenceService.setStatus(userId, 'Working');

    return attendance;
  }

  async breakStart(userId) {
    const user = await User.findById(userId);
    const settings = await AttendanceSettings.findOne() || { companyTimezone: 'UTC' };
    const tz = user.timezone || settings.companyTimezone;
    const today = this.getTodayDateString(tz);

    let attendance = await AttendanceRepository.findOne({ user: userId, attendanceDate: today });
    if (!attendance || !attendance.startWork) {
      throw new Error('Must start work before taking a break.');
    }
    
    // Check if already on break
    const lastEvent = attendance.events[attendance.events.length - 1];
    if (lastEvent && lastEvent.type === 'Break Start') {
      throw new Error('Already on break.');
    }

    await AttendanceRepository.addEvent(attendance._id, 'Break Start');
    await PresenceService.setStatus(userId, 'On Break');

    return attendance;
  }

  async breakEnd(userId) {
    const user = await User.findById(userId);
    const settings = await AttendanceSettings.findOne() || { companyTimezone: 'UTC' };
    const tz = user.timezone || settings.companyTimezone;
    const today = this.getTodayDateString(tz);

    let attendance = await AttendanceRepository.findOne({ user: userId, attendanceDate: today });
    if (!attendance || !attendance.startWork) {
      throw new Error('No active work session.');
    }

    const lastEvent = attendance.events[attendance.events.length - 1];
    if (!lastEvent || lastEvent.type !== 'Break Start') {
      throw new Error('Not currently on a break.');
    }

    const breakDurationMinutes = Math.floor((new Date() - lastEvent.timestamp) / 60000);
    attendance.totalBreakTime += breakDurationMinutes;
    await attendance.save();

    await AttendanceRepository.addEvent(attendance._id, 'Break End');
    await PresenceService.setStatus(userId, 'Working');

    return attendance;
  }

  async endWork(userId) {
    const user = await User.findById(userId).populate('workSchedule');
    const settings = await AttendanceSettings.findOne() || { companyTimezone: 'UTC' };
    const tz = user.timezone || settings.companyTimezone;
    const today = this.getTodayDateString(tz);

    let attendance = await AttendanceRepository.findOne({ user: userId, attendanceDate: today });
    if (!attendance || !attendance.startWork) {
      throw new Error('No active work session to end.');
    }
    if (attendance.endWork) {
      throw new Error('Work session already ended.');
    }

    // Auto-end break if still on break
    const lastEvent = attendance.events[attendance.events.length - 1];
    if (lastEvent && lastEvent.type === 'Break Start') {
      const breakDurationMinutes = Math.floor((new Date() - lastEvent.timestamp) / 60000);
      attendance.totalBreakTime += breakDurationMinutes;
      await AttendanceRepository.addEvent(attendance._id, 'Break End', 'Auto-ended by End Work');
    }

    attendance.endWork = new Date();
    
    // Calculate total working hours
    const totalMinutes = Math.floor((attendance.endWork - attendance.startWork) / 60000);
    attendance.workingHours = Math.max(0, totalMinutes - attendance.totalBreakTime);
    
    if (attendance.attendanceStatus !== 'Late') {
      attendance.attendanceStatus = 'Present';
    }

    // Overtime calculation
    if (user.workSchedule && user.workSchedule.workEnd) {
      const now = new Date();
      const [endHour, endMinute] = user.workSchedule.workEnd.split(':').map(Number);
      
      const expectedEnd = new Date(now.toLocaleString('en-US', { timeZone: tz }));
      expectedEnd.setHours(endHour, endMinute, 0, 0);

      const actualEnd = new Date(now.toLocaleString('en-US', { timeZone: tz }));
      const diffMinutes = Math.floor((actualEnd - expectedEnd) / 60000);
      
      const otThreshold = user.workSchedule.overtimeAfter || settings.overtimeThreshold || 30;
      if (diffMinutes > otThreshold) {
        attendance.overtimeHours = diffMinutes;
      } else if (diffMinutes < 0) {
        attendance.earlyCheckoutMinutes = Math.abs(diffMinutes);
      }
    }

    await attendance.save();
    await AttendanceRepository.addEvent(attendance._id, 'End Work');
    await PresenceService.setStatus(userId, 'Online');

    return attendance;
  }

  async getMyToday(userId) {
    const user = await User.findById(userId);
    const settings = await AttendanceSettings.findOne() || { companyTimezone: 'UTC' };
    const tz = user.timezone || settings.companyTimezone;
    const today = this.getTodayDateString(tz);
    return await AttendanceRepository.findOne({ user: userId, attendanceDate: today });
  }

  async getHistory(userId, query) {
    return await AttendanceRepository.find({ user: userId, ...query });
  }

  async getAllAttendance(query, page, limit) {
    return await AttendanceRepository.findWithPagination(query, page, limit);
  }
}

module.exports = new AttendanceService();
