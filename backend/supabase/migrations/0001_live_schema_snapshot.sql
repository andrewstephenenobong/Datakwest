-- Generated from the live Datakwest Supabase project inventory.
-- This migration is a reviewable source artifact. It has not been applied automatically.
-- Secrets, production rows, auth provider settings, and storage objects are intentionally excluded.

create extension if not exists pgcrypto;

create table if not exists public."profiles" (
  "id" uuid NOT NULL,
  "email" text,
  "onboarding_completed" boolean DEFAULT false,
  "assessment" jsonb,
  "roadmap" jsonb,
  "xp" integer DEFAULT 0,
  "streak" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now(),
  "last_active_date" date,
  "skill_progress" jsonb DEFAULT '{}'::jsonb,
  primary key ("id")
);
alter table public."profiles" enable row level security;
do $$ begin
  alter table public."profiles" add constraint "profiles_id_fkey" foreign key ("id") references auth.users ("id");
exception when duplicate_object then null; end $$;

create table if not exists public."lessons" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "phase_number" integer NOT NULL,
  "lesson_index" integer NOT NULL,
  "title" text NOT NULL,
  "content" jsonb,
  "completed" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now(),
  "practice_submission" text,
  "practice_feedback" jsonb,
  "practice_attempts" integer DEFAULT 0,
  "skill" text,
  primary key ("id")
);
alter table public."lessons" enable row level security;
do $$ begin
  alter table public."lessons" add constraint "lessons_user_id_fkey" foreign key ("user_id") references auth.users ("id");
exception when duplicate_object then null; end $$;

create table if not exists public."phase_progress" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "phase_number" integer NOT NULL,
  "best_score" integer DEFAULT 0,
  "passed" boolean DEFAULT false,
  "attempts" integer DEFAULT 0,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now(),
  primary key ("id")
);
alter table public."phase_progress" enable row level security;
do $$ begin
  alter table public."phase_progress" add constraint "phase_progress_user_id_fkey" foreign key ("user_id") references auth.users ("id");
exception when duplicate_object then null; end $$;

create table if not exists public."events" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "event_type" text NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone DEFAULT now(),
  primary key ("id")
);
alter table public."events" enable row level security;
do $$ begin
  alter table public."events" add constraint "events_user_id_fkey" foreign key ("user_id") references auth.users ("id");
exception when duplicate_object then null; end $$;

create table if not exists public."ai_usage" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "usage_date" date DEFAULT CURRENT_DATE NOT NULL,
  "call_count" integer DEFAULT 0 NOT NULL,
  primary key ("id")
);
alter table public."ai_usage" enable row level security;
do $$ begin
  alter table public."ai_usage" add constraint "ai_usage_user_id_fkey" foreign key ("user_id") references auth.users ("id");
exception when duplicate_object then null; end $$;

create table if not exists public."skill_tracks" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "skill" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "phases" jsonb NOT NULL,
  "lesson_cache" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  primary key ("id")
);
alter table public."skill_tracks" enable row level security;

create table if not exists public."user_track_progress" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "skill" text NOT NULL,
  "lesson_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "phase_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  primary key ("id")
);
alter table public."user_track_progress" enable row level security;
do $$ begin
  alter table public."user_track_progress" add constraint "user_track_progress_user_id_fkey" foreign key ("user_id") references auth.users ("id");
exception when duplicate_object then null; end $$;

CREATE UNIQUE INDEX ai_usage_pkey ON public.ai_usage USING btree (id);
CREATE UNIQUE INDEX ai_usage_user_id_usage_date_key ON public.ai_usage USING btree (user_id, usage_date);
CREATE UNIQUE INDEX events_pkey ON public.events USING btree (id);
CREATE UNIQUE INDEX lessons_pkey ON public.lessons USING btree (id);
CREATE UNIQUE INDEX lessons_user_id_phase_number_lesson_index_key ON public.lessons USING btree (user_id, phase_number, lesson_index);
CREATE UNIQUE INDEX phase_progress_pkey ON public.phase_progress USING btree (id);
CREATE UNIQUE INDEX phase_progress_user_id_phase_number_key ON public.phase_progress USING btree (user_id, phase_number);
CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);
CREATE UNIQUE INDEX skill_tracks_pkey ON public.skill_tracks USING btree (id);
CREATE UNIQUE INDEX skill_tracks_skill_key ON public.skill_tracks USING btree (skill);
CREATE UNIQUE INDEX user_track_progress_pkey ON public.user_track_progress USING btree (id);
CREATE UNIQUE INDEX user_track_progress_user_id_skill_key ON public.user_track_progress USING btree (user_id, skill);

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

drop policy if exists 'Users can manage own usage' on public."ai_usage";
create policy 'Users can manage own usage' on public."ai_usage" as permissive for all to public using ((auth.uid() = user_id));
drop policy if exists 'Users can view own usage' on public."ai_usage";
create policy 'Users can view own usage' on public."ai_usage" as permissive for select to public using ((auth.uid() = user_id));
drop policy if exists 'Users can insert own events' on public."events";
create policy 'Users can insert own events' on public."events" as permissive for insert to public with check ((auth.uid() = user_id));
drop policy if exists 'Users can insert own lessons' on public."lessons";
create policy 'Users can insert own lessons' on public."lessons" as permissive for insert to public with check ((auth.uid() = user_id));
drop policy if exists 'Users can update own lessons' on public."lessons";
create policy 'Users can update own lessons' on public."lessons" as permissive for update to public using ((auth.uid() = user_id));
drop policy if exists 'Users can view own lessons' on public."lessons";
create policy 'Users can view own lessons' on public."lessons" as permissive for select to public using ((auth.uid() = user_id));
drop policy if exists 'Users can insert own phase progress' on public."phase_progress";
create policy 'Users can insert own phase progress' on public."phase_progress" as permissive for insert to public with check ((auth.uid() = user_id));
drop policy if exists 'Users can update own phase progress' on public."phase_progress";
create policy 'Users can update own phase progress' on public."phase_progress" as permissive for update to public using ((auth.uid() = user_id));
drop policy if exists 'Users can view own phase progress' on public."phase_progress";
create policy 'Users can view own phase progress' on public."phase_progress" as permissive for select to public using ((auth.uid() = user_id));
drop policy if exists 'Users can insert own profile' on public."profiles";
create policy 'Users can insert own profile' on public."profiles" as permissive for insert to public with check ((auth.uid() = id));
drop policy if exists 'Users can update own profile' on public."profiles";
create policy 'Users can update own profile' on public."profiles" as permissive for update to public using ((auth.uid() = id));
drop policy if exists 'Users can view own profile' on public."profiles";
create policy 'Users can view own profile' on public."profiles" as permissive for select to public using ((auth.uid() = id));
drop policy if exists 'Anyone authenticated can read skill tracks' on public."skill_tracks";
create policy 'Anyone authenticated can read skill tracks' on public."skill_tracks" as permissive for select to public using ((auth.role() = 'authenticated'::text));
drop policy if exists 'Authenticated users can insert skill tracks' on public."skill_tracks";
create policy 'Authenticated users can insert skill tracks' on public."skill_tracks" as permissive for insert to public with check ((auth.role() = 'authenticated'::text));
drop policy if exists 'Users manage own track progress' on public."user_track_progress";
create policy 'Users manage own track progress' on public."user_track_progress" as permissive for all to public using ((auth.uid() = user_id));

-- Review required: the live project contains broad client UPDATE/ALL policies on user-owned data.
-- Before production launch, move authoritative XP, streak, score, usage, and readiness mutations into trusted RPC/Edge Function paths.
