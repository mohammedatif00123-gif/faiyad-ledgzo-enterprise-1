const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const UserRepository = require('../repositories/UserRepository');
const ChatService = require('../services/ChatService');
const MessageService = require('../services/MessageService');
const ReadReceipt = require('../models/ReadReceipt');

let ioInstance = null;

const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });
  ioInstance = io;

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers['authorization'];
      if (!token) return next(new Error('Authentication error'));
      
      const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User Connected: ${socket.user.id} with socket: ${socket.id}`);
    
    // Set user as online in DB and PresenceService
    await UserRepository.updateOnlineStatus(socket.user.id, socket.id, true);
    const PresenceService = require('../services/PresenceService');
    await PresenceService.setStatus(socket.user.id, 'Online', io);

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
        io.to(`room_${data.conversationId}`).emit('newMessage', message);
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
      await ReadReceipt.findOneAndUpdate(
        { conversation: conversationId, user: socket.user.id },
        { lastReadMessage: messageId, unreadCount: 0 }
      );
      socket.to(`room_${conversationId}`).emit('messageRead', {
        conversationId,
        userId: socket.user.id,
        messageId
      });
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
      await UserRepository.updateOnlineStatus(socket.user.id, null, false);
      
      const PresenceService = require('../services/PresenceService');
      const CallService = require('../services/CallService');
      
      await PresenceService.setStatus(socket.user.id, 'Offline', io);
      await CallService.handleUserDisconnect(socket.user.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!ioInstance) throw new Error('Socket.io not initialized');
  return ioInstance;
};

module.exports = { initSocket, getIO };
