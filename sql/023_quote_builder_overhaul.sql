-- 023_quote_builder_overhaul.sql
-- Phase 7.6: Quote Builder UI Overhaul
-- Adds is_favorite to pricebook_items, new line item categories, category on estimate_line_items

-- 1. Add is_favorite to pricebook_items (for Quick Picks in quote builder)
ALTER TABLE pricebook_items ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;

-- 2. Insert new categories (additive — existing categories unchanged)
INSERT INTO pricebook_categories (name, slug, hcp_type, display_order) VALUES
  ('Indoor',             'indoor',              'material', 7),
  ('Cased Coil',         'cased_coil',          'material', 8),
  ('Outdoor',            'outdoor',             'material', 9),
  ('Equipment Warranty', 'equipment_warranty',   'material', 10),
  ('Labor Warranty',     'labor_warranty',       'service',  11),
  ('Maintenance Plan',   'maintenance_plan',     'service',  12)
ON CONFLICT (slug) DO NOTHING;

-- 3. Add category column to estimate_line_items for display grouping on proposals
ALTER TABLE estimate_line_items ADD COLUMN IF NOT EXISTS category TEXT;
