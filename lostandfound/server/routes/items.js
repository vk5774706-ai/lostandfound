import express from 'express';
import {
  getItems,
  getItemById,
  createItem,
  updateItem,
  markItemResolved,
} from '../database/db.js';
import { authenticateToken, optionalAuthenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Helper to normalize item response for client compatibility
const normalizeItem = (item) => {
  if (!item) return null;
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    category: item.category,
    location: item.location,
    contactInfo: item.contact_info || item.contactInfo,
    type: item.type,
    imageUrl: item.image_url || item.imageUrl,
    status: item.status,
    userId: item.user_id || item.userId,
    userName: item.user_name || item.userName,
    createdAt: item.created_at || item.createdAt,
    updatedAt: item.updated_at || item.updatedAt,
  };
};

// GET /api/items
// Supports query: ?tab=all|lost|found|my_posts&category=...&search=...&limit=...
router.get('/', optionalAuthenticateToken, async (req, res) => {
  try {
    const { tab = 'all', category, search, limit = 50 } = req.query;
    const currentUserId = req.user ? req.user.id : null;

    const items = await getItems({
      tab,
      category,
      search,
      limit: parseInt(limit, 10) || 50,
      currentUserId,
    });

    return res.json({
      success: true,
      count: items.length,
      items: items.map(normalizeItem),
    });
  } catch (error) {
    console.error('Get items error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error fetching items.' });
  }
});

// GET /api/items/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const item = await getItemById(id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    return res.json({
      success: true,
      item: normalizeItem(item),
    });
  } catch (error) {
    console.error('Get item by ID error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error retrieving item.' });
  }
});

// POST /api/items (Create new lost or found item)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, category, location, contactInfo, type, imageUrl } = req.body;

    if (!title || !description || !location || !contactInfo || !type) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, location, contact info, and type are required.',
      });
    }

    const newItem = await createItem({
      title: title.trim(),
      description: description.trim(),
      category: category || 'Other',
      location: location.trim(),
      contact_info: contactInfo.trim(),
      type: type === 'found' ? 'found' : 'lost',
      image_url: imageUrl || null,
      user_id: req.user.id,
      user_name: req.user.username || req.user.email.split('@')[0],
    });

    return res.status(201).json({
      success: true,
      message: `${type === 'lost' ? 'Lost' : 'Found'} item posted successfully!`,
      item: normalizeItem(newItem),
    });
  } catch (error) {
    console.error('Create item error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error posting item.' });
  }
});

// PUT /api/items/:id/resolve (Mark an item as resolved)
router.put('/:id/resolve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const item = await getItemById(id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found.' });
    }

    // Only owner can resolve or campus admin
    if (item.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You are not authorized to resolve this item.' });
    }

    const resolved = await markItemResolved(
      id,
      req.user.id,
      req.user.username || req.user.email.split('@')[0]
    );

    return res.json({
      success: true,
      message: 'Item marked as resolved!',
      resolved,
    });
  } catch (error) {
    console.error('Resolve item error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Error resolving item.' });
  }
});

export default router;
