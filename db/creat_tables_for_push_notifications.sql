create table push_subscriptions (
     id uuid primary key default uuid_generate_v4(),
     user_id uuid references auth.users not null,
     endpoint text not null,
     auth text not null,
     p256dh text not null,
     created_at timestamp with time zone default now()
   );
create table device_tokens (
     id uuid primary key default uuid_generate_v4(),
     user_id uuid references auth.users not null,
     token text not null unique,
     device_type text, -- 'android', 'ios', etc.
     created_at timestamp with time zone default now()
   );