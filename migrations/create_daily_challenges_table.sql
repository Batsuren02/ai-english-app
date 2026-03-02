-- Create daily_challenges table for Phase 3 gamification

CREATE TABLE IF NOT EXISTS daily_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('flashcard_sprint', 'perfect_streak', 'category_blitz', 'new_words')),
  target_count INTEGER NOT NULL DEFAULT 5,
  progress INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  reward_xp INTEGER NOT NULL DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint: one challenge per user per day
  CONSTRAINT one_challenge_per_day UNIQUE(user_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_challenges_user_date ON daily_challenges(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_completed ON daily_challenges(user_id, completed);

-- Enable Row Level Security
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own challenges
CREATE POLICY "Users can view own challenges" ON daily_challenges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own challenges" ON daily_challenges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenges" ON daily_challenges
  FOR UPDATE USING (auth.uid() = user_id);
