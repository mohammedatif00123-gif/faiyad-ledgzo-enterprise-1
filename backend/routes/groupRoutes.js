const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const GroupService = require('../services/GroupService');
const Conversation = require('../models/Conversation');
const ConversationMember = require('../models/ConversationMember');
const { sendResponse } = require('../utils/apiResponse');

// Apply auth middleware to all routes
router.use(protect);

// Helper for sending IO events
const emitToGroup = (req, groupId, event, payload) => {
  if (req.app.get('io')) {
    req.app.get('io').to(`room_${groupId}`).emit(event, payload);
  }
};

// @route   POST /api/groups
// @desc    Create a new group
router.post('/', async (req, res) => {
  try {
    const group = await GroupService.createGroup(req.body, req);
    
    // Auto-join the creator
    if (req.app.get('io')) {
      const io = req.app.get('io');
      // In a real scenario we'd need to emit to the creator's user room to join the group room
      io.to(`user_${req.user.id}`).emit('group_created', group);
    }
    
    return sendResponse(res, 201, 'Group created successfully', group);
  } catch (err) {
    return sendResponse(res, 500, err.message);
  }
});

// @route   GET /api/groups
// @desc    Get all groups user is member of
router.get('/', async (req, res) => {
  try {
    const memberships = await ConversationMember.find({ user: req.user.id, status: 'active' }).populate('conversation');
    const groups = memberships.map(m => m.conversation).filter(c => c && c.type === 'channel' && !c.isSoftDeleted);
    return sendResponse(res, 200, 'Groups fetched', groups);
  } catch (err) {
    return sendResponse(res, 500, err.message);
  }
});

// @route   PUT /api/groups/:id
// @desc    Update group basic info (name, description, visibility)
router.put('/:id', async (req, res) => {
  try {
    const { name, description, visibility } = req.body;
    const member = await ConversationMember.findOne({ conversation: req.params.id, user: req.user.id, status: 'active' });
    if (!member) return sendResponse(res, 403, 'Not a member');

    const group = await Conversation.findById(req.params.id);
    
    // Check permissions
    if (group.permissionsMatrix?.adminsOnlyEditInfo && !['owner', 'admin'].includes(member.role)) {
      return sendResponse(res, 403, 'Only admins can edit group info');
    }

    const oldName = group.name;
    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (visibility) group.visibility = visibility;
    
    await group.save();

    await GroupService.logAudit(req, group._id, 'Conversation', 'UPDATE_INFO', { name: oldName }, { name, description, visibility });

    if (name && name !== oldName) {
      await GroupService.createSystemMessage(group._id, `${req.user.firstName} changed the group name to "${name}".`, 'GROUP_RENAMED', req);
    }

    emitToGroup(req, group._id, 'group_updated', group);

    return sendResponse(res, 200, 'Group updated', group);
  } catch (err) {
    return sendResponse(res, 500, err.message);
  }
});

// @route   POST /api/groups/:id/members/bulk
// @desc    Bulk add members
router.post('/:id/members/bulk', async (req, res) => {
  try {
    const { memberIds } = req.body;
    const group = await GroupService.addMembers(req.params.id, memberIds, req);
    
    emitToGroup(req, group._id, 'member_added', { groupId: group._id, newMembers: memberIds });
    
    return sendResponse(res, 200, 'Members added successfully', group);
  } catch (err) {
    return sendResponse(res, 500, err.message);
  }
});

// @route   POST /api/groups/:id/leave
// @desc    Leave group
router.post('/:id/leave', async (req, res) => {
  try {
    const result = await GroupService.leaveGroup(req.params.id, req);
    emitToGroup(req, req.params.id, 'member_left', { groupId: req.params.id, userId: req.user.id, newOwnerId: result.newOwnerId });
    return sendResponse(res, 200, 'Left group successfully', result);
  } catch (err) {
    return sendResponse(res, 500, err.message);
  }
});

module.exports = router;
