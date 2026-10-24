-- Shann starter schema. Run in Supabase SQL Editor or with Supabase CLI.
create extension if not exists pgcrypto;

create type public.chat_kind as enum ('direct', 'group', 'channel');
create type public.member_role as enum ('owner', 'admin', 'member');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-zA-Z][a-zA-Z0-9_]{3,31}$'),
  display_name text not null default '',
  avatar_path text,
  bio text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  kind public.chat_kind not null default 'direct',
  title text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  check ((kind = 'direct' and title is null) or kind <> 'direct')
);
create table public.chat_members (
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'member',
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  muted boolean not null default false,
  primary key (chat_id, user_id)
);
-- Only ciphertext and IV are persisted. The app must encrypt on-device.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete restrict,
  ciphertext text not null check (length(ciphertext) <= 2000000),
  iv text not null,
  message_type text not null default 'text' check (message_type in ('text','image','file','voice','system')),
  reply_to uuid references public.messages(id) on delete set null,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index messages_chat_created_idx on public.messages(chat_id, created_at desc);
create index chat_members_user_idx on public.chat_members(user_id, chat_id);

create table public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.profiles enable row level security;
alter table public.chats enable row level security;
alter table public.chat_members enable row level security;
alter table public.messages enable row level security;
alter table public.user_blocks enable row level security;

create policy "profiles visible to signed-in users" on public.profiles
for select to authenticated using (true);
create policy "users insert own profile" on public.profiles
for insert to authenticated with check (id = auth.uid());
create policy "users update own profile" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "members can view their chats" on public.chats
for select to authenticated using (
  exists (select 1 from public.chat_members m where m.chat_id = id and m.user_id = auth.uid())
);
create policy "signed-in users create chats" on public.chats
for insert to authenticated with check (created_by = auth.uid());
create policy "members can view membership" on public.chat_members
for select to authenticated using (
  exists (select 1 from public.chat_members m where m.chat_id = chat_id and m.user_id = auth.uid())
);
create policy "chat creator can add first membership" on public.chat_members
for insert to authenticated with check (
  user_id = auth.uid() and exists (
    select 1 from public.chats c where c.id = chat_id and c.created_by = auth.uid()
  )
);
create policy "members can read messages" on public.messages
for select to authenticated using (
  exists (select 1 from public.chat_members m where m.chat_id = messages.chat_id and m.user_id = auth.uid())
);
create policy "members can send as themselves" on public.messages
for insert to authenticated with check (
  sender_id = auth.uid() and exists (
    select 1 from public.chat_members m where m.chat_id = messages.chat_id and m.user_id = auth.uid()
  )
);
create policy "sender can edit own message" on public.messages
for update to authenticated using (sender_id = auth.uid()) with check (sender_id = auth.uid());
create policy "sender can delete own message" on public.messages
for delete to authenticated using (sender_id = auth.uid());
create policy "users see blocks they created" on public.user_blocks
for select to authenticated using (blocker_id = auth.uid());
create policy "users manage their blocks" on public.user_blocks
for all to authenticated using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- Automatically provision a profile after Supabase Auth signup.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare candidate text;
begin
  candidate := coalesce(new.raw_user_meta_data ->> 'username', 'user_' || substr(new.id::text, 1, 8));
  if candidate !~ '^[a-zA-Z][a-zA-Z0-9_]{3,31}$' then
    candidate := 'user_' || substr(new.id::text, 1, 8);
  end if;
  insert into public.profiles (id, username, display_name)
  values (new.id, candidate, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- NOTE: production must harden chat creation/membership via a transactional RPC.
-- Current insert policies are a starter and should not be treated as a complete
-- invitation/role-management system. Do not expose a service_role key in the client.
