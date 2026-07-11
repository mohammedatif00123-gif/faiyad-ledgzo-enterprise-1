const BaseRepository = require('./BaseRepository');
const User = require('../models/User');

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  async findByCompanyEmail(companyEmail) {
    return await this.model.findOne({ companyEmail: companyEmail.toLowerCase() }).select('+password');
  }

  async incrementLoginAttempts(userId) {
    return await this.model.findByIdAndUpdate(
      userId,
      { $inc: { loginAttempts: 1 } },
      { new: true }
    );
  }

  async resetLoginAttempts(userId) {
    return await this.model.findByIdAndUpdate(
      userId,
      { $set: { loginAttempts: 0 } },
      { new: true }
    );
  }

  async updateOnlineStatus(userId, socketId, isOnline) {
    return await this.model.findByIdAndUpdate(
      userId,
      { $set: { socketId, isOnline } },
      { new: true }
    );
  }
}

module.exports = new UserRepository();
