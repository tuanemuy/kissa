-- Add missing fields to regions table
ALTER TABLE regions ADD COLUMN latitude REAL;
ALTER TABLE regions ADD COLUMN longitude REAL;

-- Add missing fields to locations table
ALTER TABLE locations ADD COLUMN category TEXT;
ALTER TABLE locations ADD COLUMN contact_info TEXT;
ALTER TABLE locations ADD COLUMN operating_hours TEXT;