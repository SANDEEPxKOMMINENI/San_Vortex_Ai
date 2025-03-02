/*
  # Final fix for storage policies

  1. Changes
    - Simplify storage policies
    - Use user_id directly in file path
    - Enable public bucket access
    - Remove complex path parsing

  2. Security
    - Maintain user isolation
    - Enable public read access
    - Secure write operations
*/

-- Ensure bucket is properly configured
UPDATE storage.buckets
SET public = true
WHERE id = 'chat-files';

-- Drop all existing policies
DROP POLICY IF EXISTS "Enable upload for authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Enable public read access" ON storage.objects;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON storage.objects;

-- Create simplified policies
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-files' AND
  position(auth.uid()::text in name) = 1
);

CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-files');

CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chat-files' AND
  position(auth.uid()::text in name) = 1
);

CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-files' AND
  position(auth.uid()::text in name) = 1
);