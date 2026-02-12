-- Create a function to search for courses
create or replace function match_courses (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  course_code text,
  title text,
  description text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    courses.id,
    courses.course_code,
    courses.title,
    courses.description,
    1 - (courses.embedding <=> query_embedding) as similarity
  from courses
  where 1 - (courses.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
end;
$$;
