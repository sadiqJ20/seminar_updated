-- Update auth settings to allow immediate login after signup
-- Note: auth.config table doesn't exist in newer Supabase versions
-- Email confirmation is disabled by default in local development
-- confirmed_at is a generated column in newer Supabase versions
ALTER TABLE auth.users ALTER COLUMN email_confirmed_at SET DEFAULT now();