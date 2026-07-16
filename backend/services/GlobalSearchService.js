const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

class GlobalSearchService {
  async search(query, userId) {
    if (!query || query.trim().length < 2) return { users: [], messages: [], conversations: [] };
    
    const regex = new RegExp(query, 'i');

    // Search Users (exclude self if needed, but keeping simple for global search)
    const users = await User.find({
      role: { $ne: 'Admin' },
      $or: [
        { firstName: regex },
        { lastName: regex },
        { companyEmail: regex }
      ]
    }).select('firstName lastName companyEmail avatar role').limit(5);

    // Search Messages in user's conversations
    // Optimization: First find conversations user is in, then search messages
    const ConversationMember = require('../models/ConversationMember');
    const userConversations = await ConversationMember.find({ user: userId }).select('conversation');
    const conversationIds = userConversations.map(c => c.conversation);

    const messages = await Message.find({
      conversation: { $in: conversationIds },
      content: regex,
      isDeleted: false
    })
    .populate('sender', 'firstName lastName avatar')
    .populate('conversation', 'name type')
    .sort({ createdAt: -1 })
    .limit(5);

    // Search Conversations (Channels matching name)
    const conversations = await Conversation.find({
      _id: { $in: conversationIds },
      type: 'channel',
      name: regex
    }).limit(5);

    return { users, messages, conversations };
  }
}

module.exports = new GlobalSearchService();
