const express = require('express');
const router = express.Router();
const CallService = require('../services/CallService');
const { protect } = require('../middlewares/authMiddleware');
const { sendResponse } = require('../utils/apiResponse');

router.use(protect);

// Start Call
router.post('/start', async (req, res, next) => {
  try {
    const { conversationId, participants, callType } = req.body;
    const callSession = await CallService.startCall({
      conversationId,
      callerId: req.user._id,
      participants,
      callType
    });
    sendResponse(res, 201, 'Call started', { callSession });
  } catch (err) {
    next(err);
  }
});

// Accept Call
router.post('/:id/accept', async (req, res, next) => {
  try {
    const callSession = await CallService.acceptCall(req.params.id, req.user._id);
    sendResponse(res, 200, 'Call accepted', { callSession });
  } catch (err) {
    next(err);
  }
});

// Reject Call
router.post('/:id/reject', async (req, res, next) => {
  try {
    const callSession = await CallService.rejectCall(req.params.id, req.user._id);
    sendResponse(res, 200, 'Call rejected', { callSession });
  } catch (err) {
    next(err);
  }
});

// End Call / Cancel Call
router.post('/:id/end', async (req, res, next) => {
  try {
    const callSession = await CallService.endCall(req.params.id, req.user._id);
    sendResponse(res, 200, 'Call ended', { callSession });
  } catch (err) {
    next(err);
  }
});

// Get History
router.get('/history', async (req, res, next) => {
  try {
    const history = await CallService.getCallHistory(req.user._id, req.query);
    sendResponse(res, 200, 'Call history fetched', { history });
  } catch (err) {
    next(err);
  }
});

// Invite Participant
router.post('/:id/invite', async (req, res, next) => {
  try {
    const { userId } = req.body;
    const callSession = await CallService.inviteParticipant(req.params.id, userId, req.user._id);
    sendResponse(res, 200, 'Participant invited', { callSession });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
