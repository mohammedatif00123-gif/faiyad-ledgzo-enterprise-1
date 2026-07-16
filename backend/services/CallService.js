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
    const { getIO } = require('../sockets');

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

    // 8. Enforce Ringing Timeout Server-Side
    const timeoutSeconds = parseInt(process.env.CALL_RING_TIMEOUT) || 60;
    setTimeout(async () => {
      try {
        const session = await CallSession.findById(callSession._id);
        if (session && session.status === 'Ringing') {
          session.status = 'Missed';
          session.endedAt = new Date();
          await session.save();
          
          if (io) {
            io.to(`room_${conversationId}`).emit('call_timeout', { callId: session._id });
          }
          console.log(`[CallService] Call ${session._id} timed out after ${timeoutSeconds}s`);
        }
      } catch (err) {
        console.error('Error enforcing call timeout:', err);
      }
    }, timeoutSeconds * 1000);

    return callSession;
  }

  async acceptCall(callId, userId) {
    const { getIO } = require('../sockets');

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
    const { getIO } = require('../sockets');

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

    // 1. Create CallParticipant in 'invited' state
    const participant = new CallParticipant({
      callSession: callId,
      user: newUserId,
      joinedAt: null, // explicit null
      leftAt: null,
      connectionState: 'invited'
    });
    await participant.save();

    // 2. Set Ringing Timeout
    const timeoutSeconds = parseInt(process.env.CALL_RING_TIMEOUT) || 60;
    setTimeout(async () => {
      try {
        const CallParticipant = require('../models/CallParticipant');
        const p = await CallParticipant.findById(participant._id);
        
        // If still invited and hasn't joined or left
        if (p && !p.leftAt && !p.joinedAt && p.connectionState === 'invited') {
          p.leftAt = new Date();
          p.connectionState = 'missed';
          await p.save();
          
          const io = getIO();
          if (io) {
            io.to(`user_${newUserId.toString()}`).emit('call_missed', { callId });
            // Notify the room that the participant missed the call
            io.to(`room_${callSession.conversation.toString()}`).emit('participant_missed', { 
              callId, 
              userId: newUserId 
            });
          }
        }
      } catch (err) {
        console.error('Add participant timeout error:', err);
      }
    }, timeoutSeconds * 1000);

    // Emit call_invite to the new user
    const inviter = await require('../models/User').findById(inviterId);
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

  async cancelInvitation(callId, targetUserId, callerId) {
    const { getIO } = require('../sockets');
    
    const callSession = await CallSession.findById(callId);
    if (!callSession) throw new AppError('Call not found', 404);

    // Only allow if call is still active
    if (callSession.status === 'Ended' || callSession.status === 'Cancelled') {
      throw new AppError('Cannot cancel invitation for a closed call', 400);
    }

    // Find the pending invitation
    const participant = await CallParticipant.findOne({
      callSession: callId,
      user: targetUserId,
      joinedAt: null,
      leftAt: null,
      connectionState: 'invited'
    });

    if (!participant) {
      throw new AppError('No pending invitation found for this user', 404);
    }

    participant.leftAt = new Date();
    participant.connectionState = 'cancelled';
    await participant.save();

    // Emit event to dismiss the incoming call UI for the target user
    const io = getIO();
    if (io) {
      io.to(`user_${targetUserId.toString()}`).emit('call_cancelled', { callId });
    }

    return callSession;
  }


  async rejectCall(callId, userId) {
    const callSession = await CallSession.findById(callId);
    if (!callSession) throw new Error('Call not found');

    // 1. Mark this specific user as rejected
    let participant = await CallParticipant.findOne({ callSession: callId, user: userId });
    if (!participant) {
      participant = new CallParticipant({
        callSession: callId,
        user: userId,
        joinedAt: new Date(),
        leftAt: new Date(),
        connectionState: 'rejected'
      });
      await participant.save();
    } else {
      participant.leftAt = new Date();
      participant.connectionState = 'rejected';
      await participant.save();
    }

    // 2. Check if the entire call should be ended
    const activeCount = await CallParticipant.countDocuments({ callSession: callId, leftAt: null });
    const respondedCount = await CallParticipant.countDocuments({ callSession: callId });
    const totalParticipants = callSession.participants.length;

    // Generate System Message for this user's rejection
    const User = require('../models/User');
    const u = await User.findById(userId);
    await this._createSystemMessage(callSession.conversation, userId, `${u.firstName} declined the call`);

    const { getIO } = require('../sockets');
    const io = getIO();

    if (activeCount < 2 && respondedCount >= totalParticipants) {
      // Everyone has responded, and less than 2 people are active. End the session.
      callSession.status = callSession.status === 'Ringing' ? 'Rejected' : 'Ended';
      callSession.endReason = callSession.status === 'Ringing' ? 'rejected' : 'completed';
      callSession.endedAt = new Date();
      await callSession.save();

      // Reset Caller Presence
      await PresenceService.setStatus(callSession.initiatedBy, 'Online', io);
      
      if (io) {
        io.to(`room_${callSession.conversation}`).emit('call_reject', { callId });
      }
    } else {
      // It's a group call and someone rejected, but others might still be ringing or active.
      // Notify others in the call that this specific participant left/rejected
      if (io) {
        callSession.participants.forEach(pId => {
          if (pId.toString() !== userId.toString()) {
             io.to(`user_${pId.toString()}`).emit('participant_left', { callId: callSession._id, userId });
          }
        });
      }
    }

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
    const { getIO } = require('../sockets');
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
    const { getIO } = require('../sockets');
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
      } else {
        // Notify others that someone dropped completely
        const io = getIO();
        if (io && callSessionDoc) {
          for (const pId of callSessionDoc.participants) {
            if (pId.toString() !== userId.toString()) {
              io.to(`user_${pId.toString()}`).emit('participant_left', { 
                callId: callIdObj, 
                userId 
              });
            }
          }
        }
      }
    }
  }

  async getActiveCallForUser(userId) {
    // 1. Check if the user is already actively participating in a call (Connected or Outgoing Ringing)
    const activeParticipant = await CallParticipant.findOne({
      user: userId,
      leftAt: null
    }).sort({ joinedAt: -1 });

    let callSessionId = null;

    if (activeParticipant) {
      callSessionId = activeParticipant.callSession;
    } else {
      // 2. If no active participant record, check if they are INVITED to an incoming call
      // The call might be Ringing, or already Connected by another group member.
      const incomingCalls = await CallSession.find({
        participants: userId,
        status: { $in: ['Ringing', 'Connecting', 'Connected'] }
      }).sort({ startedAt: -1 }).limit(5); // check the most recent few

      for (const call of incomingCalls) {
        // Ensure they haven't ALREADY participated and left this specific call
        const pastParticipation = await CallParticipant.findOne({
          user: userId,
          callSession: call._id
        });

        // Consider it active if there's no past participation, OR if it's explicitly a pending invitation
        if (!pastParticipation || (pastParticipation.connectionState === 'invited' && !pastParticipation.leftAt && !pastParticipation.joinedAt)) {
          const timeoutSeconds = parseInt(process.env.CALL_RING_TIMEOUT) || 60;
          
          // Calculate time based on when the participant was invited (or when the call started if no participant record yet)
          const startTime = pastParticipation ? pastParticipation.createdAt : call.startedAt;
          const secondsSinceStart = (new Date() - new Date(startTime)) / 1000;
          
          if (secondsSinceStart < timeoutSeconds) {
            callSessionId = call._id;
            break; // Found the active incoming call
          }
        }
      }
    }

    if (!callSessionId) return null;

    // Fetch the actual CallSession
    const callSession = await CallSession.findById(callSessionId)
      .populate('initiatedBy', 'firstName lastName avatar email')
      .populate('participants', 'firstName lastName avatar email');

    if (!callSession) return null;

    return callSession;
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

    // Update Conversation updatedAt for ordering
    const Conversation = require('../models/Conversation');
    await Conversation.findByIdAndUpdate(conversationId, { updatedAt: new Date() });

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
