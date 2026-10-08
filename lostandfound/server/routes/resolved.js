import express from 'express';
import { getResolvedItems } from '../database/db.js';

const router = express.Router();

const normalizeResolved = (res) => {
  if (!res) return null;
  return {
    id: res.id,
    originalItemId: res.original_item_id || res.originalItemId,
    title: res.title,
    resolvedBy: res.resolved_by || res.resolvedBy,
    resolvedByName: res.resolved_by_name || res.resolvedByName || 'Community Member',
    ownerId: res.owner_id || res.ownerId,
    completedAt: res.completed_at || res.completedAt,
  };
};

// GET /api/resolved
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 30;
    const items = await getResolvedItems(limit);

    return res.json({
      success: true,
      count: items.length,
      resolved: items.map(normalizeResolved),
    });
  } catch (error) {
    console.error('Get resolved error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error fetching resolved cases.' });
  }
});

export default router;
