-- Add unique constraint on user_id for data integrity and upsert support
ALTER TABLE profiles
  ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
