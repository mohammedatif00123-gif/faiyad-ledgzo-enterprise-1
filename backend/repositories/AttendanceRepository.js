const Attendance = require('../models/Attendance');

class AttendanceRepository {
  async findOne(query) {
    return await Attendance.findOne(query);
  }

  async create(data) {
    return await Attendance.create(data);
  }

  async updateById(id, data) {
    return await Attendance.findByIdAndUpdate(id, data, { returnDocument: 'after' });
  }

  async find(query = {}) {
    return await Attendance.find(query)
      .populate('user', 'firstName lastName companyEmail profileImage role department designation timezone')
      .sort({ attendanceDate: -1 });
  }

  async findWithPagination(query = {}, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const data = await Attendance.find(query)
      .populate('user', 'firstName lastName companyEmail profileImage role department designation timezone')
      .sort({ attendanceDate: -1 })
      .skip(skip)
      .limit(limit);
    const total = await Attendance.countDocuments(query);
    return { data, total };
  }

  async addEvent(attendanceId, eventType, note = '') {
    return await Attendance.findByIdAndUpdate(
      attendanceId,
      {
        $push: {
          events: { type: eventType, timestamp: new Date(), note }
        }
      },
      { returnDocument: 'after' }
    );
  }
}

module.exports = new AttendanceRepository();
