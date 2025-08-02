-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notebooks table
CREATE TABLE notebooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    embedding_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat history table
CREATE TABLE chat_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
    user_prompt TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notes table
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('manual', 'ai_generated')),
    linked_chat_id UUID REFERENCES chat_history(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document embeddings table (for vector search)
CREATE TABLE document_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    embedding_id UUID NOT NULL,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(768),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_notebooks_user_id ON notebooks(user_id);
CREATE INDEX idx_documents_notebook_id ON documents(notebook_id);
CREATE INDEX idx_chat_history_notebook_id ON chat_history(notebook_id);
CREATE INDEX idx_notes_notebook_id ON notes(notebook_id);
CREATE INDEX idx_document_embeddings_document_id ON document_embeddings(document_id);
CREATE INDEX idx_document_embeddings_embedding_id ON document_embeddings(embedding_id);

-- Vector similarity search function
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding vector(768),
    p_notebook_id UUID,
    p_user_id UUID,
    match_threshold float,
    match_count int
)
RETURNS TABLE (
    document_id UUID,
    content TEXT,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        de.document_id,
        de.content,
        1 - (de.embedding <=> query_embedding) as similarity
    FROM document_embeddings de
    INNER JOIN documents d ON de.document_id = d.id
    INNER JOIN notebooks n ON d.notebook_id = n.id
    WHERE n.user_id = p_user_id
      AND d.notebook_id = p_notebook_id
      AND 1 - (de.embedding <=> query_embedding) > match_threshold
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notebooks (users can only see their own)
CREATE POLICY "Users can view own notebooks" ON notebooks
    FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert own notebooks" ON notebooks
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update own notebooks" ON notebooks
    FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete own notebooks" ON notebooks
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- RLS Policies for documents (users can only see documents in their notebooks)
CREATE POLICY "Users can view documents in own notebooks" ON documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM notebooks n 
            WHERE n.id = documents.notebook_id 
            AND n.user_id::text = auth.uid()::text
        )
    );
CREATE POLICY "Users can insert documents in own notebooks" ON documents
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM notebooks n 
            WHERE n.id = documents.notebook_id 
            AND n.user_id::text = auth.uid()::text
        )
    );
CREATE POLICY "Users can update documents in own notebooks" ON documents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM notebooks n 
            WHERE n.id = documents.notebook_id 
            AND n.user_id::text = auth.uid()::text
        )
    );
CREATE POLICY "Users can delete documents in own notebooks" ON documents
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM notebooks n 
            WHERE n.id = documents.notebook_id 
            AND n.user_id::text = auth.uid()::text
        )
    );

-- Similar policies for chat_history, notes, and document_embeddings
CREATE POLICY "Users can view chat in own notebooks" ON chat_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM notebooks n 
            WHERE n.id = chat_history.notebook_id 
            AND n.user_id::text = auth.uid()::text
        )
    );
CREATE POLICY "Users can insert chat in own notebooks" ON chat_history
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM notebooks n 
            WHERE n.id = chat_history.notebook_id 
            AND n.user_id::text = auth.uid()::text
        )
    );
CREATE POLICY "Users can delete chat in own notebooks" ON chat_history
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM notebooks n 
            WHERE n.id = chat_history.notebook_id 
            AND n.user_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Users can view notes in own notebooks" ON notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM notebooks n 
            WHERE n.id = notes.notebook_id 
            AND n.user_id::text = auth.uid()::text
        )
    );
CREATE POLICY "Users can insert notes in own notebooks" ON notes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM notebooks n 
            WHERE n.id = notes.notebook_id 
            AND n.user_id::text = auth.uid()::text
        )
    );
CREATE POLICY "Users can update notes in own notebooks" ON notes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM notebooks n 
            WHERE n.id = notes.notebook_id 
            AND n.user_id::text = auth.uid()::text
        )
    );
CREATE POLICY "Users can delete notes in own notebooks" ON notes
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM notebooks n 
            WHERE n.id = notes.notebook_id 
            AND n.user_id::text = auth.uid()::text
        )
    );

-- CREATE POLICY "Users can view embeddings in own documents" ON document_embeddings
--     FOR SELECT USING (
--         EXISTS (
--             SELECT 1 FROM documents d
--             INNER JOIN notebooks n ON d.notebook_id = n.id
--             WHERE d.id = document_embeddings.document_id 
--             AND n.user_id::text = auth.uid()::text
--         )
--     );
-- CREATE POLICY "Users can insert embeddings in own documents" ON document_embeddings
--     FOR INSERT WITH CHECK (
--         EXISTS (
--             SELECT 1 FROM documents d
--             INNER JOIN notebooks n ON d.notebook_id = n.id
--             WHERE d.id = document_embeddings.document_id 
--             AND n.user_id::text = auth.uid()::text
--         )
--     );
-- CREATE POLICY "Users can delete embeddings in own documents" ON document_embeddings
--     FOR DELETE USING (
--         EXISTS (
--             SELECT 1 FROM documents d
--             INNER JOIN notebooks n ON d.notebook_id = n.id
--             WHERE d.id = document_embeddings.document_id 
--             AND n.user_id::text = auth.uid()::text
--         )
--     );
