-- Migration script to add event_date column to news_items table
ALTER TABLE news_items ADD COLUMN IF NOT EXISTS event_date TEXT;
