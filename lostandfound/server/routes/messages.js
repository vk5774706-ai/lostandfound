import express from 'express';
import {
  getMessagesByClaim,
  createMessage,
  getClaimById,
} from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const normalizeMessage = (msg) => {
  if (!msg) return null;
  return {
    id: msg.id,
    claimId: msg.claim_id || msg.claimId,
    senderId: msg.sender_id || msg.senderId,
    senderName: msg.sender_name || msg.senderName,
    text: msg.text,
    createdAt: msg.created_at || msg.createdAt,
  };
};

// GET /api/messages/:claimId
router.get('/:claimId', authenticateToken, async (req, res) => {
  try {
    const { claimId } = req.params;

    const claim = await getClaimById(claimId);
    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim not found.' });
    }

    // Only owner or requester can view chat messages
    if (claim.owner_id !== req.user.id && claim.requestor_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this conversation.' });
    }

    const messages = await getMessagesByClaim(claimId);

    return res.json({
      success: true,
      messages: messages.map(normalizeMessage),
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error fetching messages.' });
  }
});

// POST /api/messages
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { claimId, text } = req.body;

    if (!claimId || !text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Claim ID and message text are required.' });
    }

    const claim = await getClaimById(claimId);
    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim not found.' });
    }

    // Only owner or requester can send message
    if (claim.owner_id !== req.user.id && claim.requestor_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to send messages in this chat.' });
    }

    const newMsg = await createMessage({
      claimId,
      senderId: req.user.id,
      senderName: req.user.username || req.user.email.split('@')[0],
      text: text.trim(),
    });

    const normalized = normalizeMessage(newMsg);

    // Broadcast to Socket.io room for this claim
    const io = req.app.get('io');
    if (io) {
      io.to(`claim_${claimId}`).emit('receive_message', normalized);
    }

    return res.status(201).json({
      success: true,
      message: normalized,
    });
  } catch (error) {
    console.error('Send message error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error sending message.' });
  }
});

export default router;
