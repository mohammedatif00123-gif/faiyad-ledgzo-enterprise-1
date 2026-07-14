const BaseRepository = require('./BaseRepository');
const Bookmark = require('../models/Bookmark');

class BookmarkRepository extends BaseRepository {
  constructor() {
    super(Bookmark);
  }

  async addBookmark(userId, messageId, note) {
    return await this.model.findOneAndUpdate(
      { user: userId, message: messageId },
      { note },
      { returnDocument: 'after', upsert: true }
    );
  }

  async removeBookmark(userId, messageId) {
    return await this.model.findOneAndDelete({ user: userId, message: messageId });
  }

  async getBookmarksByUser(userId) {
    return await this.model.find({ user: userId }).populate({
      path: 'message',
      populate: { path: 'sender', select: 'firstName lastName avatar' }
    });
  }
}

module.exports = new BookmarkRepository();
