import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import crypto from 'crypto';

// In-memory fallback dataset for seamless local execution if Supabase credentials are not set
const memoryStore = {
  users: [
    {
      id: '11111111-1111-1111-1111-111111111111',
      username: 'Alex Johnson',
      email: 'alex@campus.edu',
      password_hash: '$2a$10$wK1WpT7jQG43y3dFqP3KRe19q.yYg2n26qV3f6PzXJ3aI2eXbB6cO', // 'password123'
      photo_url: 'https://ui-avatars.com/api/?name=Alex+Johnson',
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      username: 'Sarah Connor',
      email: 'sarah@campus.edu',
      password_hash: '$2a$10$wK1WpT7jQG43y3dFqP3KRe19q.yYg2n26qV3f6PzXJ3aI2eXbB6cO',
      photo_url: 'https://ui-avatars.com/api/?name=Sarah+Connor',
      created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    },
  ],
  items: [
    {
      id: '33333333-3333-3333-3333-333333333333',
      title: 'Black Leather Wallet',
      description: 'Lost my Tommy Hilfiger leather wallet containing student ID and bus pass. Please return if found.',
      category: 'Accessories',
      location: 'Library 2nd Floor Silent Area',
      contact_info: '+1 (555) 234-5678',
      type: 'lost',
      image_url: null,
      status: 'active',
      user_id: '11111111-1111-1111-1111-111111111111',
      user_name: 'Alex Johnson',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      title: 'MacBook Pro Charger 85W',
      description: 'Found USB-C Apple power adapter plugged near the window.',
      category: 'Electronics',
      location: 'Student Center Cafeteria',
      contact_info: '+1 (555) 987-6543',
      type: 'found',
      image_url: null,
      status: 'active',
      user_id: '22222222-2222-2222-2222-222222222222',
      user_name: 'Sarah Connor',
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: '55555555-5555-5555-5555-555555555555',
      title: 'Calculus 8th Edition Textbook',
      description: 'Hardcover Stewart calculus book with blue cover and handwritten formulas inside.',
      category: 'Books',
      location: 'Math Building Room 102',
      contact_info: '+1 (555) 345-6789',
      type: 'lost',
      image_url: null,
      status: 'active',
      user_id: '11111111-1111-1111-1111-111111111111',
      user_name: 'Alex Johnson',
      created_at: new Date(Date.now() - 43200000).toISOString(),
    },
  ],
  claims: [],
  messages: [],
  resolved_items: [
    {
      id: 'r1',
      original_item_id: null,
      title: 'Hydro Flask Blue Water Bottle',
      resolved_by: '22222222-2222-2222-2222-222222222222',
      resolved_by_name: 'Campus Security',
      owner_id: '11111111-1111-1111-1111-111111111111',
      completed_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'r2',
      original_item_id: null,
      title: 'Sony WH-1000XM4 Headphones',
      resolved_by: '11111111-1111-1111-1111-111111111111',
      resolved_by_name: 'Student Lost & Found Office',
      owner_id: '22222222-2222-2222-2222-222222222222',
      completed_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
  ],
};

const generateUUID = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + '-' + Date.now();

// ─── USER OPERATIONS ──────────────────────────────────────────

export const findUserByEmail = async (email) => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }
  return memoryStore.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
};

export const findUserById = async (id) => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, email, photo_url, created_at')
      .eq('id', id)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }
  const u = memoryStore.users.find((user) => user.id === id);
  if (!u) return null;
  const { password_hash, ...rest } = u;
  return rest;
};

export const createUser = async ({ username, email, passwordHash, photoUrl }) => {
  const newUser = {
    id: generateUUID(),
    username,
    email: email.toLowerCase(),
    password_hash: passwordHash,
    photo_url: photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}`,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('users')
      .insert([newUser])
      .select('id, username, email, photo_url, created_at')
      .single();
    if (error) throw error;
    return data;
  }

  memoryStore.users.push(newUser);
  const { password_hash, ...safeUser } = newUser;
  return safeUser;
};

// ─── ITEMS OPERATIONS ──────────────────────────────────────────

export const getItems = async ({ tab = 'all', category, search, limit = 50, currentUserId }) => {
  if (isSupabaseConfigured && supabase) {
    let query = supabase.from('items').select('*');

    if (tab === 'my_posts' && currentUserId) {
      query = query.eq('user_id', currentUserId);
    } else {
      query = query.eq('status', 'active');
      if (tab === 'lost' || tab === 'found') {
        query = query.eq('type', tab);
      }
    }

    if (category && category !== 'All Categories') {
      query = query.eq('category', category);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`title.ilike.${term},location.ilike.${term},description.ilike.${term}`);
    }

    query = query.order('created_at', { ascending: false }).limit(limit);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  // Memory fallback query
  let result = [...memoryStore.items];
  if (tab === 'my_posts' && currentUserId) {
    result = result.filter((i) => i.user_id === currentUserId);
  } else {
    result = result.filter((i) => i.status === 'active');
    if (tab === 'lost' || tab === 'found') {
      result = result.filter((i) => i.type === tab);
    }
  }

  if (category && category !== 'All Categories') {
    result = result.filter((i) => i.category === category);
  }

  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    result = result.filter(
      (i) =>
        i.title.toLowerCase().includes(term) ||
        i.location.toLowerCase().includes(term) ||
        (i.description && i.description.toLowerCase().includes(term))
    );
  }

  result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return result.slice(0, limit);
};

export const getItemById = async (id) => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('items').select('*').eq('id', id).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }
  return memoryStore.items.find((i) => i.id === id) || null;
};

export const createItem = async (itemData) => {
  const newItem = {
    id: generateUUID(),
    title: itemData.title,
    description: itemData.description,
    category: itemData.category,
    location: itemData.location,
    contact_info: itemData.contactInfo || itemData.contact_info,
    type: itemData.type,
    image_url: itemData.imageUrl || itemData.image_url || null,
    status: 'active',
    user_id: itemData.userId || itemData.user_id,
    user_name: itemData.userName || itemData.user_name,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('items').insert([newItem]).select().single();
    if (error) throw error;
    return data;
  }

  memoryStore.items.unshift(newItem);
  return newItem;
};

export const updateItem = async (id, updates) => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('items').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  const idx = memoryStore.items.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  memoryStore.items[idx] = { ...memoryStore.items[idx], ...updates, updated_at: new Date().toISOString() };
  return memoryStore.items[idx];
};

export const markItemResolved = async (id, resolvedByUserId, resolvedByName) => {
  const item = await getItemById(id);
  if (!item) throw new Error('Item not found');

  if (isSupabaseConfigured && supabase) {
    // 1. Mark item resolved
    await supabase.from('items').update({ status: 'resolved' }).eq('id', id);
    // 2. Archive claims
    await supabase.from('claims').update({ status: 'archived' }).eq('item_id', id);
    // 3. Add to resolved items
    const { data, error } = await supabase
      .from('resolved_items')
      .insert([
        {
          original_item_id: id,
          title: item.title,
          resolved_by: resolvedByUserId,
          resolved_by_name: resolvedByName,
          owner_id: item.user_id,
          completed_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Fallback
  item.status = 'resolved';
  memoryStore.claims.forEach((c) => {
    if (c.item_id === id) c.status = 'archived';
  });
  const resolvedRecord = {
    id: generateUUID(),
    original_item_id: id,
    title: item.title,
    resolved_by: resolvedByUserId,
    resolved_by_name: resolvedByName,
    owner_id: item.user_id,
    completed_at: new Date().toISOString(),
  };
  memoryStore.resolved_items.unshift(resolvedRecord);
  return resolvedRecord;
};

// ─── CLAIMS OPERATIONS ─────────────────────────────────────────

export const createClaim = async (claimData) => {
  const newClaim = {
    id: generateUUID(),
    item_id: claimData.itemId || claimData.item_id,
    owner_id: claimData.ownerId || claimData.owner_id,
    requestor_id: claimData.requestorId || claimData.requestor_id,
    requestor_name: claimData.requestorName || claimData.requestor_name,
    requestor_contact: claimData.requestorContact || claimData.requestor_contact,
    message: claimData.message || 'I would like to claim this item.',
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('claims').insert([newClaim]).select().single();
    if (error) throw error;
    return data;
  }

  memoryStore.claims.unshift(newClaim);
  return newClaim;
};

export const getClaimsByItem = async (itemId) => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .eq('item_id', itemId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  return memoryStore.claims
    .filter((c) => c.item_id === itemId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

export const getPendingClaimsForUser = async (userId) => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('claims')
      .select('*')
      .eq('owner_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  return memoryStore.claims
    .filter((c) => c.owner_id === userId && c.status === 'pending')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

export const getClaimById = async (id) => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('claims').select('*').eq('id', id).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }
  return memoryStore.claims.find((c) => c.id === id) || null;
};

export const updateClaimStatus = async (id, status) => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('claims')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const claim = memoryStore.claims.find((c) => c.id === id);
  if (!claim) throw new Error('Claim not found');
  claim.status = status;
  claim.updated_at = new Date().toISOString();
  return claim;
};

// ─── MESSAGES OPERATIONS ───────────────────────────────────────

export const getMessagesByClaim = async (claimId) => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('claim_id', claimId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  }

  return memoryStore.messages
    .filter((m) => m.claim_id === claimId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
};

export const createMessage = async ({ claimId, senderId, senderName, text }) => {
  const newMsg = {
    id: generateUUID(),
    claim_id: claimId,
    sender_id: senderId,
    sender_name: senderName || 'User',
    text,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('messages').insert([newMsg]).select().single();
    if (error) throw error;
    return data;
  }

  memoryStore.messages.push(newMsg);
  return newMsg;
};

// ─── RESOLVED ITEMS OPERATIONS ─────────────────────────────────

export const getResolvedItems = async (limit = 20) => {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('resolved_items')
      .select('*')
      .order('completed_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  }

  return [...memoryStore.resolved_items]
    .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
    .slice(0, limit);
};
