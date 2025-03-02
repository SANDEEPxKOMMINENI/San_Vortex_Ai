/*
  # Fix storage bucket policies

  1. Changes
    - Drop existing storage policies
    - Create new policies with proper folder name handling
    - Add policy for public access to uploaded files

  2. Security
    - Enable authenticated users to upload files to their folders
    - Allow public read access to all files
    - Restrict update/delete to file owners
*/

-- Drop existing storage policies
DROP POLICY IF EXISTS "Users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their files" ON storage.objects;

-- Create new storage policies
CREATE POLICY "Enable upload for authenticated users"
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'chat-files' AND 
  (storage.foldername(name))[1] = auth.uid()::text
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
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Enable delete for users based on user_id"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-files' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Update bucket public access
UPDATE storage.buckets
SET public = true
WHERE id = 'chat-files';