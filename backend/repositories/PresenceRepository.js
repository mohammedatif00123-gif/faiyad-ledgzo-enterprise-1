const Presence = require('../models/Presence');

class PresenceRepository {
  async getPresence(userId) {
    let presence = await Presence.findOne({ user: userId });
    if (!presence) {
      presence = await Presence.create({ user: userId, status: 'Offline' });
    }
    return presence;
  }

  async updatePresence(userId, status, additionalData = {}) {
    const updateData = { status, lastSeen: new Date(), ...additionalData };
    return await Presence.findOneAndUpdate(
      { user: userId },
      updateData,
      { returnDocument: 'after', upsert: true }
    );
  }

  async getAllPresence(query = {}) {
    return await Presence.find(query).populate('user', 'firstName lastName companyEmail profileImage role department designation timezone');
  }

  async getCounts() {
    const stats = await Presence.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    const formattedStats = {
      Online: 0,
      Working: 0,
      'On Break': 0,
      'In Meeting': 0,
      'In Call': 0,
      Away: 0,
      Offline: 0
    };
    stats.forEach(stat => {
      if (formattedStats[stat._id] !== undefined) {
        formattedStats[stat._id] = stat.count;
      }
    });
    return formattedStats;
  }
}

module.exports = new PresenceRepository();
