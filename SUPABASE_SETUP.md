# Supabase Setup Instructions

To make the Save/Load feature work, you need to set up your Supabase project.

## 1. Create Project
Go to [Supabase](https://supabase.com/) and create a new project.

## 2. Run SQL Query
Go to the **SQL Editor** in your Supabase dashboard and run the following query to create the table:

```sql
create table codes (
  id uuid primary key default uuid_generate_v4(),
  title text,
  language text,
  code text,
  input text,
  output text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

**Note:** Row Level Security (RLS) is enabled by default. You must disable it for this "personal mode" to work without authentication. Move to the **Table Editor**, click on `codes`, click "RLS" (Security), and **Disable RLS**.

## 3. Get Credentials
1. Go to **Project Settings** -> **API**.
2. Copy the **Project URL**.
3. Copy the **anon** public key.

## 4. Update Code
Open `main.js` and replace the placeholders:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY';
```
