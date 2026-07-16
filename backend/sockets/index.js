const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const UserRepository = require('../repositories/UserRepository');
const ChatService = require('../services/ChatService');
const MessageService = require('../services/MessageService');
const PresenceService = require('../services/PresenceService');
const CallService = require('../services/CallService');
const ReadReceipt = require('../models/ReadReceipt');
const { extractAuthToken } = require('../utils/authToken');

let ioInstance = null;

const initSocket = (server) => {
  const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173']
    .filter(Boolean);

  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      methods: ['GET', 'POST'],
      credentials: true
    }
  });
  ioInstance = io;

  io.use((socket, next) => {
    try {
      const token = extractAuthToken({
        headers: socket.handshake.headers,
        auth: socket.handshake.auth,
        query: socket.handshake.query,
        cookies: socket.request?.cookies || {},
        cookieHeader: socket.handshake.headers.cookie,
      });

      if (!token) return next(new Error('Authentication error'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User Connected: ${socket.user.id} with socket: ${socket.id}`);
    
    // Check if user is checked in
    const Attendance = require('../models/Attendance');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    
    const att = await Attendance.findOne({ 
      employeeId: socket.user.id, 
      date: { $gte: today, $lte: endOfDay } 
    });

    const isCheckedIn = att && !att.checkOut;

    // Set user as online in DB and PresenceService ONLY if they are checked in
    await UserRepository.updateOnlineStatus(socket.user.id, socket.id, true);
    
    const User = require('../models/User');
    const PresenceService = require('../services/PresenceService');
    
    if (isCheckedIn) {
      await PresenceService.setStatus(socket.user.id, 'Online', io);
      await User.findByIdAndUpdate(socket.user.id, { presenceStatus: 'online' });
      io.emit('user_status_changed', { userId: socket.user.id, presenceStatus: 'online' });
    } else {
      // Just keep them offline in presence to others, though socket is connected
      await PresenceService.setStatus(socket.user.id, 'Offline', null);
      await User.findByIdAndUpdate(socket.user.id, { presenceStatus: 'offline' });
      // We don't need to broadcast offline if they were already offline, but it's safe to do so
    }

    // Join user's personal room for direct notifications
    socket.join(`user_${socket.user.id}`);

    // Auto-join all conversation rooms the user is a member of
    try {
      const conversations = await ChatService.getMyConversations(socket.user.id);
      conversations.forEach(conv => {
        socket.join(`room_${conv._id}`);
      });
      console.log(`User ${socket.user.id} auto-joined ${conversations.length} conversation rooms.`);
    } catch (err) {
      console.error('Error auto-joining rooms:', err);
    }

    // --- Chat Events ---
    socket.on('joinRoom', (roomId) => {
      socket.join(`room_${roomId}`);
    });

    socket.on('leaveRoom', (roomId) => {
      socket.leave(`room_${roomId}`);
    });

    socket.on('sendMessage', async (data) => {
      try {
        const message = await MessageService.saveMessage({
          ...data,
          senderId: socket.user.id
        });
        
        // Emit to the conversation room
        io.to(`room_${data.conversationId}`).emit('newMessage', message);

        // Also emit to individual members in case they haven't joined the room yet
        const ConversationMember = require('../models/ConversationMember');
        const members = await ConversationMember.find({ conversation: data.conversationId });
        members.forEach(member => {
           if (member.user.toString() !== socket.user.id) {
             io.to(`user_${member.user.toString()}`).emit('newMessage', message);
           }
        });

      } catch (err) {
        console.error('Socket sendMessage error:', err);
        socket.emit('error', 'Error sending message');
      }
    });

    socket.on('typing', ({ conversationId, isTyping }) => {
      socket.to(`room_${conversationId}`).emit('userTyping', {
        conversationId,
        userId: socket.user.id,
        isTyping
      });
    });

    socket.on('markAsRead', async ({ conversationId, messageId }) => {
      try {
        await ReadReceipt.findOneAndUpdate(
          { conversation: conversationId, user: socket.user.id },
          { lastReadMessage: messageId, unreadCount: 0 },
          { upsert: true }
        );
        
        // If messageId is provided, just update that one. But actually, we should mark all unread as read.
        if (messageId) {
          await MessageService.updateDeliveryStatus(messageId, 'read');
          io.to(`room_${conversationId}`).emit('message_status_update', {
            conversationId,
            messageId,
            status: 'read'
          });
        }
      } catch (err) {
        console.error('Socket markAsRead error:', err);
      }
    });

    socket.on('messageDelivered', async ({ conversationId, messageId }) => {
      try {
        await MessageService.updateDeliveryStatus(messageId, 'delivered');
        io.to(`room_${conversationId}`).emit('message_status_update', {
          conversationId,
          messageId,
          status: 'delivered'
        });
      } catch (err) {
        console.error('Socket messageDelivered error:', err);
      }
    });

    socket.on('markConversationAsRead', async ({ conversationId }) => {
      try {
        const Message = require('../models/Message');
        // Update all unread messages in this conversation where sender is NOT the current user
        await Message.updateMany(
          { conversation: conversationId, sender: { $ne: socket.user.id }, status: { $ne: 'read' } },
          { $set: { status: 'read' } }
        );
        
        io.to(`room_${conversationId}`).emit('conversation_read', {
          conversationId,
          readBy: socket.user.id
        });
      } catch (err) {
        console.error('Socket markConversationAsRead error:', err);
      }
    });

    // --- Presence / Status Events ---
    socket.on('status_update', async (data) => {
      try {
        const User = require('../models/User');
        const update = {
          presenceStatus: data.status
        };
        
        if (data.status === 'away' || data.status === 'in-break' || data.status === 'in-meeting' || data.status === 'busy') {
          update.awayReason = data.reason || data.status;
          update.awaySince = new Date();
        } else {
          update.awayReason = null;
          update.awaySince = null;
        }

        await User.findByIdAndUpdate(socket.user.id, update);

        // Broadcast to everyone
        io.emit('user_status_changed', {
          userId: socket.user.id,
          ...update
        });
      } catch (error) {
        console.error('Socket status_update error:', error);
      }
    });

    // --- WebRTC Events (Future-ready & Call) ---
    socket.on('call_invite', (data) => {
      // Broadcast ringing to all target user's devices
      socket.to(`user_${data.targetUserId}`).emit('call_ringing', {
        callId: data.callId,
        conversationId: data.conversationId,
        from: socket.user.id,
        callType: data.callType,
        callerDetails: data.callerDetails
      });
    });

    socket.on('call_accept', (data) => {
      // Broadcast to caller that call is accepted
      socket.to(`user_${data.targetUserId}`).emit('call_accept', {
        callId: data.callId,
        from: socket.user.id
      });
      // Also broadcast to other devices of the accepting user to stop ringing
      socket.to(`user_${socket.user.id}`).emit('call_answered_elsewhere', { callId: data.callId });
    });

    socket.on('call_reject', (data) => {
      socket.to(`user_${data.targetUserId}`).emit('call_reject', { callId: data.callId });
      socket.to(`user_${socket.user.id}`).emit('call_answered_elsewhere', { callId: data.callId });
    });

    socket.on('call_cancel', (data) => {
      socket.to(`user_${data.targetUserId}`).emit('call_cancel', { callId: data.callId });
    });

    socket.on('call_end', (data) => {
      socket.to(`user_${data.targetUserId}`).emit('call_end', { callId: data.callId });
    });

    socket.on('webrtc_offer', (data) => {
      socket.to(`user_${data.targetUserId}`).emit('webrtc_offer', {
        callId: data.callId,
        offer: data.offer,
        from: socket.user.id
      });
    });

    socket.on('webrtc_answer', (data) => {
      socket.to(`user_${data.targetUserId}`).emit('webrtc_answer', {
        callId: data.callId,
        answer: data.answer,
        from: socket.user.id
      });
    });

    socket.on('webrtc_ice_candidate', (data) => {
      socket.to(`user_${data.targetUserId}`).emit('webrtc_ice_candidate', {
        callId: data.callId,
        candidate: data.candidate,
        from: socket.user.id
      });
    });

    socket.on('participant_muted', (data) => {
      socket.to(`user_${data.targetUserId}`).emit('participant_muted', { isMuted: data.isMuted, from: socket.user.id });
    });

    socket.on('camera_toggle', (data) => {
      socket.to(`user_${data.targetUserId}`).emit('camera_toggle', { isEnabled: data.isEnabled, from: socket.user.id });
    });

    socket.on('screen_share_start', (data) => {
      socket.to(`user_${data.targetUserId}`).emit('screen_share_start', { from: socket.user.id });
    });

    socket.on('screen_share_stop', (data) => {
      socket.to(`user_${data.targetUserId}`).emit('screen_share_stop', { from: socket.user.id });
    });

    socket.on('raise_hand', (data) => {
      socket.to(`user_${data.targetUserId}`).emit('raise_hand', { isRaised: data.isRaised, from: socket.user.id });
    });

    socket.on('network_quality', (data) => {
      socket.to(`user_${data.targetUserId}`).emit('network_quality', { quality: data.quality, from: socket.user.id });
    });

    // --- Mailbox / Notifications ---
    // Can be emitted by the backend when new items arrive
    
    socket.on('disconnect', async () => {
      console.log(`User Disconnected: ${socket.user.id}`);
      
      // Check if user still has other active sockets connected
      const activeSockets = await io.in(`user_${socket.user.id}`).fetchSockets();
      if (activeSockets.length > 0) {
        console.log(`User ${socket.user.id} still has ${activeSockets.length} active socket(s). Keeping online.`);
        return; // Don't mark offline
      }

      await UserRepository.updateOnlineStatus(socket.user.id, null, false);
      
      const User = require('../models/User');
      
      await PresenceService.setStatus(socket.user.id, 'Offline', io);
      await CallService.handleUserDisconnect(socket.user.id);
      
      await User.findByIdAndUpdate(socket.user.id, { presenceStatus: 'offline' });
      io.emit('user_status_changed', { userId: socket.user.id, presenceStatus: 'offline' });
    });
  });

  return io;
};

const getIO = () => {
  if (!ioInstance) throw new Error('Socket.io not initialized');
  return ioInstance;
};

module.exports = { initSocket, getIO };
