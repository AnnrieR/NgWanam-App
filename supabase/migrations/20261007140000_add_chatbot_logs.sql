-- The admin report asks for "total chatbot conversations", but the rule-based
-- assistant never wrote anything down. Each exchange is now logged together
-- with the session it belongs to, so conversations (distinct sessions) and
-- messages (rows) are both real numbers instead of a guess.

create table public.chatbot_logs (
  id uuid primary key default gen_random_uuid(),
  -- Deliberately not a foreign key: the floating assistant also runs for
  -- visitors who never sign in, and their conversations still have to count.
  session_id uuid not null,
  profile_id uuid references public.profiles (id) on delete set null,
  question text not null,
  answer text,
  created_at timestamptz not null default now()
);

create index chatbot_logs_session_id_idx on public.chatbot_logs (session_id);
create index chatbot_logs_created_at_idx on public.chatbot_logs (created_at desc);

alter table public.chatbot_logs enable row level security;

create policy "staff and admins read chatbot logs"
  on public.chatbot_logs
  for select
  to authenticated
  using (private.is_staff_or_admin());

-- Clients never insert into the table directly — this security-definer function
-- does, so RLS stays on while the anonymous widget still gets counted.
create function public.log_chatbot_conversation(
  p_session_id uuid,
  p_question text,
  p_answer text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_session_id is null then
    raise exception 'Session id is required.';
  end if;
  if coalesce(trim(p_question), '') = '' then
    return;
  end if;

  insert into public.chatbot_logs (session_id, profile_id, question, answer)
  values (p_session_id, auth.uid(), left(p_question, 1000), left(coalesce(p_answer, ''), 2000));
end;
$$;

-- CREATE FUNCTION hands EXECUTE to PUBLIC, and Supabase's default privileges
-- also hand it to anon. The widget is public by design (landing page too), so
-- anon and authenticated both keep it — but never PUBLIC.
revoke execute on function public.log_chatbot_conversation(uuid, text, text) from public;
grant execute on function public.log_chatbot_conversation(uuid, text, text) to anon, authenticated;
