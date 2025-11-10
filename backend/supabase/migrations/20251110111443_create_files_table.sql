CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL CHECK (length(filename) <= 255),
    file_size BIGINT NOT NULL CHECK (file_size > 0 AND file_size <= 52428800),
    storage_path TEXT NOT NULL UNIQUE,
    thumbnail_url TEXT,
    has_thumbnail BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_user_filename UNIQUE (user_id, filename)
);

CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_user_uploaded ON files(user_id, uploaded_at DESC);

ALTER TABLE files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own files" ON files;
DROP POLICY IF EXISTS "Users can insert their own files" ON files;
DROP POLICY IF EXISTS "Users can update their own files" ON files;
DROP POLICY IF EXISTS "Users can delete their own files" ON files;
CREATE POLICY "Users can view their own files" ON files FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own files" ON files FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own files" ON files FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own files" ON files FOR DELETE USING (auth.uid() = user_id);
