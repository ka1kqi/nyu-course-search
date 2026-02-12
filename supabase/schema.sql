-- Enable pgvector extension
create extension if not exists vector;

-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone
);

-- Create courses table
create table public.courses (
  id uuid default gen_random_uuid() primary key,
  course_code text not null,
  title text not null,
  description text,
  embedding vector(768), -- Nomic embedding dimension
  metadata jsonb, -- Store extra info like instructor, semester, etc.
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create saved_courses table
create table public.saved_courses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, course_id)
);

-- Create search_history table
create table public.search_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  query text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.saved_courses enable row level security;
alter table public.search_history enable row level security;

-- Policies
-- Profiles: Users can view/edit their own profile
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

-- Courses: Readable by everyone, writable only by service_role (admin/scripts)
create policy "Courses are viewable by everyone." on public.courses for select using (true);

-- Saved Courses: Users can view/edit their own saved courses
create policy "Users can view own saved courses." on public.saved_courses for select using (auth.uid() = user_id);
create policy "Users can insert own saved courses." on public.saved_courses for insert with check (auth.uid() = user_id);
create policy "Users can delete own saved courses." on public.saved_courses for delete using (auth.uid() = user_id);

-- Search History: Users can view own history
create policy "Users can view own search history." on public.search_history for select using (auth.uid() = user_id);
create policy "Users can insert own search history." on public.search_history for insert with check (auth.uid() = user_id);

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
