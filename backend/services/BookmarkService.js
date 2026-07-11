const BookmarkRepository = require('../repositories/BookmarkRepository');

class BookmarkService {
  async addBookmark(userId, messageId, note) {
    return await BookmarkRepository.addBookmark(userId, messageId, note);
  }

  async removeBookmark(userId, messageId) {
    return await BookmarkRepository.removeBookmark(userId, messageId);
  }

  async getMyBookmarks(userId) {
    return await BookmarkRepository.getBookmarksByUser(userId);
  }
}

module.exports = new BookmarkService();
