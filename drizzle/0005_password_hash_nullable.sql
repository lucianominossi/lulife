-- Allow null password_hash after Supabase Auth (passwords live in auth.users)
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;
