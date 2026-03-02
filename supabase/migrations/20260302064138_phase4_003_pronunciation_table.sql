-- Phase 4: Create pronunciation attempts table for pronunciation practice tracking
CREATE TABLE pronunciation_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  audio_duration_ms INTEGER,
  transcript TEXT,
  similarity_score FLOAT,
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_pronunciation_attempts_user_id ON pronunciation_attempts(user_id);
CREATE INDEX idx_pronunciation_attempts_word_id ON pronunciation_attempts(word_id);
CREATE INDEX idx_pronunciation_attempts_created_at ON pronunciation_attempts(created_at);
