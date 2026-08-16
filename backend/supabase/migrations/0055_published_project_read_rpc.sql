-- Server-authoritative published project read.
-- Learners receive only the public brief fields needed by the project workspace.

create or replace function public.get_published_project(
  p_project_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project jsonb;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'id', p.id,
    'title', p.title,
    'brief', p.brief,
    'rubric', p.rubric,
    'status', p.status
  )
  into v_project
  from public.projects p
  where p.status = 'published'
    and (p_project_id is null or p.id = p_project_id)
  order by p.created_at desc
  limit 1;

  return coalesce(v_project, '{}'::jsonb);
end;
$$;

revoke all on function public.get_published_project(uuid) from public;
grant execute on function public.get_published_project(uuid) to authenticated;

comment on function public.get_published_project(uuid) is 'Authenticated read boundary for published project briefs; avoids direct learner access to projects table.';
