-- Create user_feedback table for storing user-submitted feedback
-- This migration creates the table with proper schema, constraints, RLS policies, and indexes

-- Create user_feedback table
CREATE TABLE IF NOT EXISTS "public"."user_feedback" (
    "id" bigint NOT NULL,
    "user_id" uuid NOT NULL,
    "type" text NOT NULL,
    "message" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "user_feedback_type_check" CHECK (("type" = ANY (ARRAY['bug'::text, 'suggestion'::text, 'complaint'::text, 'other'::text]))),
    CONSTRAINT "user_feedback_message_length_check" CHECK ((char_length("message") <= 1000))
);

-- Set table owner
ALTER TABLE "public"."user_feedback" OWNER TO "postgres";

-- Add table comment
COMMENT ON TABLE "public"."user_feedback" IS 'User-submitted feedback for product improvement';

-- Add foreign key constraint to auth.users
ALTER TABLE ONLY "public"."user_feedback"
    ADD CONSTRAINT "user_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- Set up identity column
ALTER TABLE "public"."user_feedback" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."user_feedback_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

-- Add primary key constraint
ALTER TABLE ONLY "public"."user_feedback"
    ADD CONSTRAINT "user_feedback_pkey" PRIMARY KEY ("id");

-- Enable Row Level Security
ALTER TABLE "public"."user_feedback" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Users can insert their own feedback
CREATE POLICY "Users can insert their own feedback" ON "public"."user_feedback"
    FOR INSERT TO "authenticated"
    WITH CHECK (((SELECT "auth"."uid"()) = "user_id"));

-- Policy: Users can view their own feedback
CREATE POLICY "Users can view their own feedback" ON "public"."user_feedback"
    FOR SELECT TO "authenticated"
    USING (((SELECT "auth"."uid"()) = "user_id"));

-- Policy: Users can update their own feedback (for future use)
CREATE POLICY "Users can update their own feedback" ON "public"."user_feedback"
    FOR UPDATE TO "authenticated"
    USING (((SELECT "auth"."uid"()) = "user_id"))
    WITH CHECK (((SELECT "auth"."uid"()) = "user_id"));

-- Policy: Users can delete their own feedback (for future use)
CREATE POLICY "Users can delete their own feedback" ON "public"."user_feedback"
    FOR DELETE TO "authenticated"
    USING (((SELECT "auth"."uid"()) = "user_id"));

-- Create indexes for performance
-- Index on user_id for efficient user-scoped queries
CREATE INDEX IF NOT EXISTS "user_feedback_user_id_idx" ON "public"."user_feedback" USING btree ("user_id");

-- Index on created_at for sorting/filtering
CREATE INDEX IF NOT EXISTS "user_feedback_created_at_idx" ON "public"."user_feedback" USING btree ("created_at" DESC);

-- Grant permissions
GRANT ALL ON TABLE "public"."user_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."user_feedback" TO "service_role";
GRANT USAGE, SELECT ON SEQUENCE "public"."user_feedback_id_seq" TO "authenticated";
GRANT USAGE, SELECT ON SEQUENCE "public"."user_feedback_id_seq" TO "service_role";

