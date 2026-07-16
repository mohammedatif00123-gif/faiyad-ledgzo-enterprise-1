const CallSession = require('../models/CallSession');
const CallParticipant = require('../models/CallParticipant');
const MessageRepository = require('../repositories/MessageRepository');
const PresenceService = require('./PresenceService');
const { AppError } = require('../utils/errors');

class CallService {
  async _isUserBusy(userId) {
    const activeParticipants = await CallParticipant.find({ user: userId, leftAt: null }).populate('callSession');
    const terminalStates = ['Rejected', 'Missed', 'Ended', 'Cancelled', 'Busy'];
    
    for (const p of activeParticipants) {
      if (p.callSession && !terminalStates.includes(p.callSession.status)) {
        // Check if the call is stale (e.g. older than 12 hours)
        const hoursSinceStart = (new Date() - new Date(p.callSession.startedAt)) / (1000 * 60 * 60);
        if (hoursSinceStart < 12) {
          return true;
        }
      }
    }
    return false;
  }

  async startCall({ conversationId, callerId, participants, callType = 'voice' }) {
    // 1. Check if caller is already in a call
    if (await this._isUserBusy(callerId)) {
      throw new AppError('You are already in a call', 400);
    }

    let callParticipants = participants || [];

    // If participants are not provided, fetch all conversation members except caller
    if (callParticipants.length === 0) {
      const ConversationMember = require('../models/ConversationMember');
      const members = await ConversationMember.find({ conversation: conversationId, user: { $ne: callerId } });
      callParticipants = members.map(m => m.user.toString());
    }

    if (callParticipants.length === 0) {
      throw new AppError('No participants found for this call', 400);
    }

    // 2. Check if receiver is busy (for 1-on-1 calls)
    if (callParticipants.length === 1) {
      if (await this._isUserBusy(callParticipants[0])) {
        throw new AppError('User is busy on another call', 409);
      }

      // Check if receiver is offline
      const receiverPresence = await PresenceService.getMyPresence(callParticipants[0]);
      if (!receiverPresence || receiverPresence.status === 'Offline') {
        await this._createSystemMessage(conversationId, callerId, '📞 Missed voice call');
        throw new AppError('User is offline. Call cannot be completed.', 400);
      }
    }

    // 3. Create Call Session
    const callSession = new CallSession({
      conversation: conversationId,
      initiatedBy: callerId,
      participants: [callerId, ...callParticipants],
      callType,
      status: 'Ringing',
      startedAt: new Date()
    });
    await callSession.save();

    // 4. Create Caller Participant
    const callerParticipant = new CallParticipant({
      callSession: callSession._id,
      user: callerId,
      joinedAt: new Date(),
      connectionState: 'checking'
    });
    await callerParticipant.save();

    // 5. Update Caller Presence
    const { getIO } = require('../sockets');
    await PresenceService.setStatus(callerId, 'In Call', getIO());

    // 6. Emit call_ringing to all participants
    const inviter = await require('../models/User').findById(callerId);
    const io = getIO();
    if (io) {
      callParticipants.forEach(async (pId) => {
        // Only ring online users
        const presence = await PresenceService.getMyPresence(pId);
        if (presence && presence.status !== 'Offline') {
          io.to(`user_${pId.toString()}`).emit('call_ringing', {
            callId: callSession._id,
            conversationId,
            from: callerId,
            callType,
            callerDetails: {
              _id: inviter._id,
              firstName: inviter.firstName,
              lastName: inviter.lastName,
              avatar: inviter.avatar
            }
          });
        }
      });
    }

    // 7. Generate System Message
    await this._createSystemMessage(conversationId, callerId, 'call_log', `📞 ${callType === 'video' ? 'Video' : 'Voice'} call started`);

    return callSession;
  }

  async acceptCall(callId, userId) {
    const callSession = await CallSession.findById(callId);
    if (!callSession) throw new AppError('Call not found', 404);

    const terminalStates = ['Rejected', 'Missed', 'Ended', 'Cancelled'];
    if (terminalStates.includes(callSession.status)) {
      throw new AppError(`Cannot accept call in ${callSession.status} state`, 400);
    }

    let participant = await CallParticipant.findOne({
      callSession: callSession._id,
      user: userId,
      leftAt: null
    });

    if (!participant) {
      participant = new CallParticipant({
        callSession: callSession._id,
        user: userId,
        joinedAt: new Date(),
        connectionState: 'connected'
      });
      await participant.save();
    } else {
      participant.connectionState = 'connected';
      participant.joinedAt = participant.joinedAt || new Date();
      await participant.save();
    }

    // Ensure the joining participant is part of the session roster
    const participantIds = callSession.participants.map(p => p.toString());
    if (!participantIds.includes(userId.toString())) {
      callSession.participants.push(userId);
    }

    // Update Call Session
    if (!callSession.answeredAt) {
      callSession.status = 'Connected';
      callSession.answeredAt = new Date();
    } else if (callSession.status === 'Ringing' || callSession.status === 'Connecting') {
      callSession.status = 'Connected';
    }
    await callSession.save();

    // Update Presence
    const { getIO } = require('../sockets');
    await PresenceService.setStatus(userId, 'In Call', getIO());

    // Broadcast peer_joined_call to ALL OTHER participants in the session
    const io = getIO();
    if (io) {
      callSession.participants.forEach(pId => {
        if (pId.toString() !== userId.toString()) {
          io.to(`user_${pId.toString()}`).emit('peer_joined_call', {
            callId: callSession._id,
            joinedUserId: userId
          });
        }
      });
    }

    const User = require('../models/User');
    const u = await User.findById(userId);
    await this._createSystemMessage(callSession.conversation, userId, `${u.firstName} joined the call`);

    return callSession;
  }

  async inviteParticipant(callId, newUserId, inviterId) {
    const callSession = await CallSession.findById(callId);
    if (!callSession) throw new AppError('Call not found', 404);
    if (callSession.status === 'Ended' || callSession.status === 'Cancelled') {
      throw new AppError('Cannot invite to a closed call', 400);
    }

    // Check if user is busy
    const activeCall = await CallParticipant.findOne({ user: newUserId, leftAt: null });
    if (activeCall) throw new AppError('User is busy on another call', 409);

    // Add to participants if not already
    const isMember = callSession.participants.some(id => id.toString() === newUserId.toString());
    if (!isMember) {
      callSession.participants.push(newUserId);
      await callSession.save();
    }

    // Emit call_invite to the new user
    const inviter = await require('../models/User').findById(inviterId);
    const { getIO } = require('../sockets');
    const io = getIO();
    if (io) {
      io.to(`user_${newUserId.toString()}`).emit('call_ringing', {
        callId: callSession._id,
        conversationId: callSession.conversation,
        from: inviterId,
        callType: callSession.callType,
        callerDetails: {
          _id: inviter._id,
          firstName: inviter.firstName,
          lastName: inviter.lastName,
          avatar: inviter.avatar
        }
      });
    }

    return callSession;
  }

  async rejectCall(callId, userId) {
    const callSession = await CallSession.findById(callId);
    if (!callSession) throw new Error('Call not found');

    callSession.status = 'Rejected';
    callSession.endReason = 'rejected';
    callSession.endedAt = new Date();
    await callSession.save();

    // Mark participant as left
    await CallParticipant.updateMany(
      { callSession: callId, leftAt: null },
      { $set: { leftAt: new Date(), connectionState: 'closed' } }
    );

    // Generate System Message
    const User = require('../models/User');
    const u = await User.findById(userId);
    await this._createSystemMessage(callSession.conversation, userId, `${u.firstName} declined the call`);

    // Reset Caller Presence
    const { getIO } = require('../sockets');
    await PresenceService.setStatus(callSession.initiatedBy, 'Online', getIO());

    return callSession;
  }

  async endCall(callId, userId) {
    const callSession = await CallSession.findById(callId);
    if (!callSession) throw new Error('Call not found');

    if (callSession.status === 'Ended' || callSession.status === 'Cancelled') return callSession;

    const isInitiator = callSession.initiatedBy.toString() === userId.toString();
    const isCancelled = callSession.status === 'Ringing';

    // Mark the specific user as left
    await CallParticipant.findOneAndUpdate(
      { callSession: callId, user: userId, leftAt: null },
      { $set: { leftAt: new Date(), connectionState: 'closed' } }
    );

    // Get remaining active participants
    const activeCount = await CallParticipant.countDocuments({ callSession: callId, leftAt: null });

    // If less than 2 people left, or the initiator cancels before anyone answers
    if (activeCount < 2 || (isCancelled && isInitiator)) {
      // End the call for everyone
      await CallParticipant.updateMany(
        { callSession: callId, leftAt: null },
        { $set: { leftAt: new Date(), connectionState: 'closed' } }
      );

      callSession.status = isCancelled ? 'Cancelled' : 'Ended';
      callSession.endedAt = new Date();
      callSession.endReason = isCancelled ? 'cancelled' : 'completed';

      if (callSession.answeredAt) {
        callSession.duration = Math.floor((callSession.endedAt - callSession.answeredAt) / 1000);
      }

      await callSession.save();

      // Generate System Message
      if (isCancelled) {
        await this._createSystemMessage(callSession.conversation, callSession.initiatedBy, '📞 Call cancelled');
      } else {
        const mins = Math.floor(callSession.duration / 60);
        const secs = callSession.duration % 60;
        await this._createSystemMessage(callSession.conversation, callSession.initiatedBy, `📞 Voice call ended. Duration: ${mins}m ${secs}s`);
      }

      // Reset Presence for all participants
      const { getIO } = require('../sockets');
      const io = getIO();
      for (const pId of callSession.participants) {
        if (io) {
          io.to(`user_${pId.toString()}`).emit('call_end', { callId });
        }
        await PresenceService.setStatus(pId, 'Online', io);
      }
    } else {
      // Call continues for remaining participants
      const { getIO } = require('../sockets');
      const io = getIO();
      if (io) {
        // Emit call_end to the user who left
        io.to(`user_${userId.toString()}`).emit('call_end', { callId });

        // Notify others that someone left
        for (const pId of callSession.participants) {
          if (pId.toString() !== userId.toString()) {
            io.to(`user_${pId.toString()}`).emit('participant_left', { callId, userId });
          }
        }
      }
      await PresenceService.setStatus(userId, 'Online', io);
    }

    return callSession;
  }

  async handleTimeout(callId) {
    const callSession = await CallSession.findById(callId);
    if (!callSession || callSession.status !== 'Ringing') return;

    callSession.status = 'Missed';
    callSession.endedAt = new Date();
    callSession.endReason = 'timeout';
    await callSession.save();

    // Mark participant as left
    await CallParticipant.updateMany(
      { callSession: callId, leftAt: null },
      { $set: { leftAt: new Date(), connectionState: 'closed' } }
    );

    await this._createSystemMessage(callSession.conversation, callSession.initiatedBy, '📞 Missed voice call');
    await PresenceService.setStatus(callSession.initiatedBy, 'Online', getIO());

    return callSession;
  }

  async handleUserDisconnect(userId) {
    // Find all active call participations for this user
    const activeParticipations = await CallParticipant.find({ user: userId, leftAt: null });

    for (const participation of activeParticipations) {
      participation.leftAt = new Date();
      participation.connectionState = 'closed';
      await participation.save();

      // Check remaining participants
      const callIdObj = participation.callSession;

      const callSessionDoc = await CallSession.findById(callIdObj);
      if (callSessionDoc) {
        // Generate System Message
        const User = require('../models/User');
        const u = await User.findById(userId);
        await this._createSystemMessage(callSessionDoc.conversation, userId, `${u.firstName} left the call`);
      }

      const remaining = await CallParticipant.countDocuments({ callSession: callIdObj, leftAt: null });

      if (remaining < 2) {
        // End the call since less than 2 people are left
        await this.endCall(callIdObj, userId);
      }
    }
  }

  async getCallHistory(userId, filters = {}) {
    // Implement history logic later based on callSession and participant records
    return await CallSession.find({ participants: userId })
      .populate('initiatedBy', 'firstName lastName avatar')
      .populate('participants', 'firstName lastName avatar')
      .sort({ createdAt: -1 });
  }

  async _createSystemMessage(conversationId, senderId, content) {
    const msg = await MessageRepository.create({
      conversation: conversationId,
      sender: senderId,
      content,
      messageType: 'system',
      systemAction: 'call_log'
    });

    const { getIO } = require('../sockets');
    const io = getIO();
    if (io) {
      const populatedMsg = await MessageRepository.model.findById(msg._id)
        .populate('sender', 'firstName lastName avatar');
      io.to(`room_${conversationId}`).emit('newMessage', populatedMsg);
    }
    return msg;
  }
}

module.exports = new CallService();
