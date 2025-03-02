/*
  # Fix storage bucket and policies

  1. Changes
    - Recreate storage bucket with proper configuration
    - Update storage policies with correct path handling
    - Enable public access for uploaded files

  2. Security
    - Ensure bucket exists with proper settings
    - Set up correct RLS policies for file operations
    - Enable public access for viewing files
*/

-- Recreate storage bucket with proper settings
DELETE FROM storage.buckets WHERE id = 'chat-files';
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Drop existing policies
DROP POLICY IF EXISTS "Enable upload for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Enable public read access" ON storage.objects;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON storage.objects;

-- Create new policies with correct path handling
CREATE POLICY "Enable upload for authenticated users"
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'chat-files' AND
  auth.uid()::text = SPLIT_PART(name, '/', 1)
);

CREATE POLICY "Enable public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-files');

CREATE POLICY "Enable update for users based on user_id"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chat-files' AND
  auth.uid()::text = SPLIT_PART(name, '/', 1)
);

CREATE POLICY "Enable delete for users based on user_id"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-files' AND
  auth.uid()::text = SPLIT_PART(name, '/', 1)
);

-- Ensure public access is enabled for the bucket
DO $$
BEGIN
  UPDATE storage.buckets
  SET public = true
  WHERE id = 'chat-files';
END $$;