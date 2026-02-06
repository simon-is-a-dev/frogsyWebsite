-- Create user_notification_preferences table for storing custom notification times
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  morning_time time DEFAULT '08:00:00',
  afternoon_time time DEFAULT '19:00:00',
  morning_enabled boolean DEFAULT true,
  afternoon_enabled boolean DEFAULT true,
  timezone text DEFAULT 'UTC',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS (Row Level Security)
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to manage their own preferences
CREATE POLICY "Users can manage their own notification preferences"
  ON user_notification_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_notification_preferences_updated_at 
    BEFORE UPDATE ON user_notification_preferences 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
