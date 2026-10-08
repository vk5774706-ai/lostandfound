-- ==============================================================================
-- College Lost & Found Portal - Supabase PostgreSQL Schema
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ITEMS TABLE
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    contact_info VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('lost', 'found')),
    image_url TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'archived')),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CLAIMS TABLE
CREATE TABLE IF NOT EXISTS claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requestor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requestor_name VARCHAR(255) NOT NULL,
    requestor_contact VARCHAR(255) NOT NULL,
    message TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. MESSAGES TABLE (Real-time In-App Chat)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_name VARCHAR(255),
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. RESOLVED ITEMS TABLE (History Log)
CREATE TABLE IF NOT EXISTS resolved_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_item_id UUID REFERENCES items(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_by_name VARCHAR(255),
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR FAST QUERYING
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_claims_item_id ON claims(item_id);
CREATE INDEX IF NOT EXISTS idx_claims_owner_id ON claims(owner_id);
CREATE INDEX IF NOT EXISTS idx_claims_requestor_id ON claims(requestor_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);

CREATE INDEX IF NOT EXISTS idx_messages_claim_id ON messages(claim_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at ASC);

-- ==============================================================================
-- DISABLE RLS (Row Level Security) FOR EXPRESS BACKEND (Service Role / Public Key)
-- OR ENABLE AND ALLOW ALL (Express server handles authorization using JWT)
-- ==============================================================================
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE items DISABLE ROW LEVEL SECURITY;
ALTER TABLE claims DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE resolved_items DISABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- OPTIONAL SEED DATA FOR TESTING
-- ==============================================================================
INSERT INTO users (id, username, email, password_hash, photo_url)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Alex Johnson', 'alex@campus.edu', '$2a$10$wK1WpT7jQG43y3dFqP3KRe19q.yYg2n26qV3f6PzXJ3aI2eXbB6cO', 'https://ui-avatars.com/api/?name=Alex+Johnson'),
    ('22222222-2222-2222-2222-222222222222', 'Sarah Connor', 'sarah@campus.edu', '$2a$10$wK1WpT7jQG43y3dFqP3KRe19q.yYg2n26qV3f6PzXJ3aI2eXbB6cO', 'https://ui-avatars.com/api/?name=Sarah+Connor')
ON CONFLICT (email) DO NOTHING;

INSERT INTO items (id, title, description, category, location, contact_info, type, status, user_id, user_name)
VALUES
    ('33333333-3333-3333-3333-333333333333', 'Black Leather Wallet', 'Lost my Tommy Hilfiger leather wallet containing student ID and bus pass.', 'Accessories', 'Library 2nd Floor Silent Area', '+1 (555) 234-5678', 'lost', 'active', '11111111-1111-1111-1111-111111111111', 'Alex Johnson'),
    ('44444444-4444-4444-4444-444444444444', 'MacBook Pro Charger 85W', 'Found USB-C Apple power adapter plugged near the window.', 'Electronics', 'Student Center Cafeteria', '+1 (555) 987-6543', 'found', 'active', '22222222-2222-2222-2222-222222222222', 'Sarah Connor'),
    ('55555555-5555-5555-5555-555555555555', 'Calculus 8th Edition Textbook', 'Hardcover Stewart calculus book with blue cover and handwritten notes.', 'Books', 'Math Building Room 102', '+1 (555) 345-6789', 'lost', 'active', '11111111-1111-1111-1111-111111111111', 'Alex Johnson')
ON CONFLICT (id) DO NOTHING;

INSERT INTO resolved_items (title, resolved_by_name, completed_at)
VALUES 
    ('Hydro Flask Blue Water Bottle', 'Campus Security', NOW() - INTERVAL '1 day'),
    ('Sony WH-1000XM4 Headphones', 'Student Lost & Found Office', NOW() - INTERVAL '3 days')
ON CONFLICT DO NOTHING;
