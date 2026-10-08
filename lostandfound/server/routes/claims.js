import express from 'express';
import {
  createClaim,
  getClaimsByItem,
  getPendingClaimsForUser,
  getClaimById,
  updateClaimStatus,
  getItemById,
} from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const normalizeClaim = (claim) => {
  if (!claim) return null;
  return {
    id: claim.id,
    itemId: claim.item_id || claim.itemId,
    ownerId: claim.owner_id || claim.ownerId,
    requestorId: claim.requestor_id || claim.requestorId,
    requestorName: claim.requestor_name || claim.requestorName,
    requestorContact: claim.requestor_contact || claim.requestorContact,
    message: claim.message,
    status: claim.status,
    createdAt: claim.created_at || claim.createdAt,
    updatedAt: claim.updated_at || claim.updatedAt,
  };
};

// POST /api/claims (Initiate claim or contact request)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { itemId, contactInfo, message } = req.body;

    if (!itemId || !contactInfo) {
      return res.status(400).json({ success: false, message: 'Item ID and contact info are required.' });
    }

    const item = await getItemById(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    if (item.user_id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot claim your own posted item.' });
    }

    const newClaim = await createClaim({
      item_id: itemId,
      owner_id: item.user_id,
      requestor_id: req.user.id,
      requestor_name: req.user.username || req.user.email.split('@')[0],
      requestor_contact: contactInfo,
      message: message || (item.type === 'lost' ? 'I found your item!' : 'This item belongs to me!'),
    });

    // Notify owner via Socket.io if connected
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${item.user_id}`).emit('new_claim_notification', normalizeClaim(newClaim));
    }

    return res.status(201).json({
      success: true,
      message: 'Claim request sent to owner.',
      claim: normalizeClaim(newClaim),
    });
  } catch (error) {
    console.error('Create claim error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error submitting claim.' });
  }
});

// GET /api/claims/item/:itemId (Fetch claims for an item)
router.get('/item/:itemId', authenticateToken, async (req, res) => {
  try {
    const { itemId } = req.params;
    const item = await getItemById(itemId);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    const claims = await getClaimsByItem(itemId);

    // If requester is owner, return all claims. Otherwise only return requester's own claim
    const isOwner = item.user_id === req.user.id;
    const filteredClaims = isOwner
      ? claims
      : claims.filter((c) => (c.requestor_id || c.requestorId) === req.user.id);

    return res.json({
      success: true,
      claims: filteredClaims.map(normalizeClaim),
    });
  } catch (error) {
    console.error('Get item claims error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error retrieving claims.' });
  }
});

// GET /api/claims/notifications (Fetch pending claims directed to current user)
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const pendingClaims = await getPendingClaimsForUser(req.user.id);

    return res.json({
      success: true,
      count: pendingClaims.length,
      notifications: pendingClaims.map(normalizeClaim),
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error retrieving notifications.' });
  }
});

// PUT /api/claims/:id/status (Accept or reject a claim)
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['accepted', 'rejected', 'archived'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const claim = await getClaimById(id);
    if (!claim) {
      return res.status(404).json({ success: false, message: 'Claim not found.' });
    }

    // Only owner of the item can update status
    if (claim.owner_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the item owner can respond to this claim.' });
    }

    const updatedClaim = await updateClaimStatus(id, status);

    // Notify requester via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${claim.requestor_id}`).emit('claim_status_updated', normalizeClaim(updatedClaim));
      io.to(`claim_${id}`).emit('claim_status_updated', normalizeClaim(updatedClaim));
    }

    return res.json({
      success: true,
      message: `Claim ${status} successfully.`,
      claim: normalizeClaim(updatedClaim),
    });
  } catch (error) {
    console.error('Update claim status error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error updating claim status.' });
  }
});

export default router;
