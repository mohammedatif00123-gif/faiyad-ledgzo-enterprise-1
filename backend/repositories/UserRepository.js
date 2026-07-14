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
      { returnDocument: 'after' }
    );
  }

  async resetLoginAttempts(userId) {
    return await this.model.findByIdAndUpdate(
      userId,
      { $set: { loginAttempts: 0 } },
      { returnDocument: 'after' }
    );
  }

  async updateOnlineStatus(userId, socketId, isOnline) {
    return await this.model.findByIdAndUpdate(
      userId,
      { $set: { socketId, isOnline } },
      { returnDocument: 'after' }
    );
  }
}

module.exports = new UserRepository();
