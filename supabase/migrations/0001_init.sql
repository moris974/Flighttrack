-- ============================================================
-- Flight Tracker App - schema iniziale
-- ============================================================

-- Profili utente (estende auth.users di Supabase)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  home_airport_iata text,
  avatar_url text,
  import_email_slug text unique,
  calendar_ics_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Gli utenti vedono e modificano solo il proprio profilo"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Aeroporti (cache locale di dati statici: nome, coordinate, timezone)
create table if not exists public.airports (
  iata text primary key,
  icao text,
  name text not null,
  city text,
  country text,
  latitude double precision,
  longitude double precision,
  timezone text
);

-- Itinerari: raggruppano uno o più voli collegati (es. andata+ritorno o scali)
create table if not exists public.itineraries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text,
  created_at timestamptz not null default now()
);

alter table public.itineraries enable row level security;

create policy "Gli utenti gestiscono solo i propri itinerari"
  on public.itineraries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Voli tracciati da un utente
create table if not exists public.flights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  itinerary_id uuid references public.itineraries(id) on delete set null,

  flight_number text not null,          -- es. "FR1234"
  airline_iata text,
  flight_date date not null,

  departure_iata text references public.airports(iata),
  arrival_iata text references public.airports(iata),

  scheduled_departure timestamptz,
  scheduled_arrival timestamptz,
  estimated_departure timestamptz,
  estimated_arrival timestamptz,
  actual_departure timestamptz,
  actual_arrival timestamptz,

  departure_terminal text,
  departure_gate text,
  arrival_terminal text,
  arrival_gate text,

  status text default 'scheduled',      -- scheduled | active | landed | delayed | cancelled | diverted
  delay_minutes integer default 0,
  aircraft_type text,
  registration text,
  aircraft_icao24 text,          -- codice transponder Mode S, per la posizione live (OpenSky)

  booking_reference text,
  seat text,
  notes text,

  source text default 'manual',         -- manual | email_import | calendar_import
  external_ref text,                    -- id del volo lato provider dati (es. AeroDataBox)
  share_token text unique,
  live_notifications boolean default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.flights enable row level security;

create policy "Gli utenti gestiscono solo i propri voli"
  on public.flights for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Lettura pubblica dei voli condivisi tramite token"
  on public.flights for select
  using (share_token is not null);

create index if not exists flights_user_date_idx on public.flights (user_id, flight_date);

-- Notifiche generate (ritardi, cambi gate, ecc.)
create table if not exists public.flight_notifications (
  id uuid primary key default gen_random_uuid(),
  flight_id uuid not null references public.flights(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,                   -- delay | gate_change | boarding | landed | cancelled
  message text not null,
  read boolean default false,
  created_at timestamptz not null default now()
);

alter table public.flight_notifications enable row level security;

create policy "Gli utenti vedono solo le proprie notifiche"
  on public.flight_notifications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Genera automaticamente una notifica quando cambia lo stato o il gate di un volo
create or replace function public.notify_flight_change()
returns trigger as $$
declare
  msg text;
  ntype text;
begin
  if new.status is distinct from old.status then
    ntype := case new.status
      when 'delayed' then 'delay'
      when 'landed' then 'landed'
      when 'cancelled' then 'cancelled'
      else 'status_change'
    end;
    msg := 'Il volo ' || coalesce(new.airline_iata, '') || new.flight_number ||
           ' e'' ora: ' || new.status;
    insert into public.flight_notifications (flight_id, user_id, type, message)
    values (new.id, new.user_id, ntype, msg);
  end if;

  if new.departure_gate is distinct from old.departure_gate
     and new.departure_gate is not null then
    msg := 'Gate cambiato per il volo ' || coalesce(new.airline_iata, '') ||
           new.flight_number || ': ' || new.departure_gate;
    insert into public.flight_notifications (flight_id, user_id, type, message)
    values (new.id, new.user_id, 'gate_change', msg);
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists flights_notify_change on public.flights;
create trigger flights_notify_change
  after update on public.flights
  for each row execute function public.notify_flight_change();

-- Luoghi visitati: popolati sia automaticamente (voli atterrati) sia manualmente
create table if not exists public.visited_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  iata text,                      -- presente solo per i luoghi aggiunti da un volo
  city text not null,
  country text,
  latitude double precision not null,
  longitude double precision not null,
  visited_on date,
  notes text,
  source text not null default 'manual', -- 'flight' | 'manual'
  created_at timestamptz not null default now()
);

alter table public.visited_places enable row level security;

create policy "Gli utenti gestiscono solo i propri luoghi visitati"
  on public.visited_places for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Evita duplicati per i luoghi aggiunti automaticamente dai voli (uno per aeroporto/utente)
create unique index if not exists visited_places_user_iata_unique
  on public.visited_places (user_id, iata)
  where iata is not null;

-- Quando un volo risulta atterrato, aggiunge automaticamente l'aeroporto di arrivo
-- ai luoghi visitati (se non già presente)
create or replace function public.add_visited_place_on_landing()
returns trigger as $$
declare
  arr public.airports%rowtype;
begin
  if new.status = 'landed' and new.arrival_iata is not null then
    select * into arr from public.airports where iata = new.arrival_iata;

    if arr.iata is not null and arr.latitude is not null then
      insert into public.visited_places
        (user_id, iata, city, country, latitude, longitude, visited_on, source)
      values
        (new.user_id, arr.iata, coalesce(arr.city, arr.iata), arr.country,
         arr.latitude, arr.longitude, new.flight_date, 'flight')
      on conflict (user_id, iata) where iata is not null do nothing;
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists flights_add_visited_place on public.flights;
create trigger flights_add_visited_place
  after insert or update on public.flights
  for each row execute function public.add_visited_place_on_landing();

-- Sottoscrizioni push (una per dispositivo/browser) per le notifiche live
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "Gli utenti gestiscono solo le proprie sottoscrizioni push"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Trigger per aggiornare updated_at sui voli
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists flights_set_updated_at on public.flights;
create trigger flights_set_updated_at
  before update on public.flights
  for each row execute function public.set_updated_at();

-- Crea automaticamente una riga in profiles quando un utente si registra
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, import_email_slug)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    substr(md5(random()::text || new.id::text), 1, 10)
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Candidati di volo estratti da email inoltrate, in attesa di conferma dell'utente
create table if not exists public.import_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  flight_number text,
  flight_date date,
  source_subject text,
  status text not null default 'pending', -- pending | confirmed | dismissed
  created_at timestamptz not null default now()
);

alter table public.import_candidates enable row level security;

create policy "Gli utenti vedono solo i propri candidati di import"
  on public.import_candidates for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
