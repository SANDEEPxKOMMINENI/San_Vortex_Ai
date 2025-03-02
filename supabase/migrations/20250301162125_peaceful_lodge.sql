/*
  # Create folders table

  1. New Tables
    - `folders`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamp)
  
  2. Changes to existing tables
    - Add `folder_id` column to chats table
    - Add `is_favorite` column to chats table
  
  3. Security
    - Enable RLS on folders table
    - Add policies for CRUD operations
*/

-- Create folders table
CREATE TABLE IF NOT EXISTS folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create their own folders"
  ON folders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own folders"
  ON folders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
  ON folders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
  ON folders
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add folder_id column to chats table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chats' AND column_name = 'folder_id'
  ) THEN
    ALTER TABLE chats ADD COLUMN folder_id uuid REFERENCES folders(id);
  END IF;
END $$;

-- Add is_favorite column to chats table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chats' AND column_name = 'is_favorite'
  ) THEN
    ALTER TABLE chats ADD COLUMN is_favorite boolean DEFAULT false;
  END IF;
END $$;