/*
  # Fix profiles table and related functionality

  1. Changes
    - Drop and recreate profiles table with correct schema
    - Update trigger function for new user creation
    - Add insert policy for profiles
    - Fix storage policies for avatars

  2. Security
    - Enable RLS on profiles table
    - Add proper policies for profile access
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate profiles table
DROP TABLE IF EXISTS public.profiles;
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name text DEFAULT '',
  bio text DEFAULT '',
  avatar_url text,
  preferences jsonb DEFAULT jsonb_build_object(
    'theme', 'system',
    'message_size', 'medium',
    'default_model', 'google/gemini-2.0-flash-lite-preview-02-05:free',
    'notifications_enabled', true
  ),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Drop existing avatar policies
DROP POLICY IF EXISTS "Allow authenticated avatar uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public avatar reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated avatar updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated avatar deletes" ON storage.objects;

-- Create storage policies for avatars
CREATE POLICY "Allow authenticated avatar uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = SPLIT_PART(name, '/', 1)
);

CREATE POLICY "Allow public avatar reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Allow authenticated avatar updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = SPLIT_PART(name, '/', 1)
);

CREATE POLICY "Allow authenticated avatar deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = SPLIT_PART(name, '/', 1)
);

-- Create trigger function for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    full_name,
    preferences
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    jsonb_build_object(
      'theme', 'system',
      'message_size', 'medium',
      'default_model', 'google/gemini-2.0-flash-lite-preview-02-05:free',
      'notifications_enabled', true
    )
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create profiles for existing users
INSERT INTO public.profiles (user_id, full_name, preferences)
SELECT 
  id as user_id,
  COALESCE(raw_user_meta_data->>'full_name', '') as full_name,
  jsonb_build_object(
    'theme', 'system',
    'message_size', 'medium',
    'default_model', 'google/gemini-2.0-flash-lite-preview-02-05:free',
    'notifications_enabled', true
  ) as preferences
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;