/*
  # Add API key to profiles table

  1. Changes
    - Add `api_key` column to profiles table
    - Update preferences schema to include custom API settings
*/

-- Add API key column to profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'api_key'
  ) THEN
    ALTER TABLE profiles ADD COLUMN api_key text;
  END IF;
END $$;

-- Update existing profiles to include new preferences fields
UPDATE profiles
SET preferences = preferences || 
  jsonb_build_object(
    'sidebar_collapsed', false,
    'use_custom_api', false
  )
WHERE preferences IS NOT NULL;