# Multi-User Authentication Setup

To enable "Private" storage for multiple users, you need to update your database schema to support Supabase Auth.

## 1. Enable Email Auth
1. Go to **Authentication** -> **Providers** in Supabase Dashboard.
2. Ensure **Email** is enabled.
3. (Optional) Disable "Confirm email" in **Authentication** -> **URL Configuration** if you want instant login without email verification for testing.

## 2. Update Database Schema
Go to **SQL Editor** and run this script to secure your data:

```sql
-- 1. Add user_id column to existing table
alter table codes 
add column user_id uuid references auth.users not null default auth.uid();

-- 2. Enable Row Level Security (RLS)
alter table codes enable row level security;

-- 3. Create Security Policies
-- Policy: Users can only see their own codes
create policy "Users can see own codes" 
on codes for select 
using (auth.uid() = user_id);

-- Policy: Users can insert their own codes
create policy "Users can insert own codes" 
on codes for insert 
with check (auth.uid() = user_id);

-- Policy: Users can update their own codes
create policy "Users can update own codes" 
on codes for update 
using (auth.uid() = user_id);

-- Policy: Users can delete their own codes
create policy "Users can delete own codes" 
on codes for delete 
using (auth.uid() = user_id);
```

**Warning:** If you have existing saved codes, the first command might fail if you aren't logged in. You might need to delete existing rows first: `truncate table codes;`
