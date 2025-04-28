CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_object JSONB NOT NULL,
  user_agent TEXT,
  active BOOLEAN DEFAULT TRUE,
  
  CONSTRAINT unique_subscription_endpoint UNIQUE ((subscription_object->>'endpoint'))
);
create table device_tokens (
     id uuid primary key default uuid_generate_v4(),
     user_id uuid references auth.users not null,
     token text not null unique,
     device_type text, -- 'android', 'ios', etc.
     created_at timestamp with time zone default now()
   );