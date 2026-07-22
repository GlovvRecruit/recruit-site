alter table leads
  add column if not exists is_channel_friend boolean not null default false,
  add column if not exists last_sent_at timestamptz;
