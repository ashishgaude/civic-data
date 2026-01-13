-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create polling_stations table
create table if not exists polling_stations (
  id uuid default uuid_generate_v4() primary key,
  assembly_constituency text,
  main_town_or_village text,
  police_station text,
  block text,
  subdivision text,
  district text,
  pin_code text,
  polling_station_name text,
  polling_station_type text,
  polling_station_address text,
  number_of_electors integer,
  file_name text unique, -- to prevent duplicates from same file
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create voters table
create table if not exists voters (
  id uuid default uuid_generate_v4() primary key,
  polling_station_id uuid references polling_stations(id) on delete cascade,
  name text,
  relative_name text,
  relative_type text,
  house_number text,
  age integer,
  gender text,
  voter_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for faster queries
create index if not exists idx_voters_polling_station_id on voters(polling_station_id);
create index if not exists idx_voters_name on voters(name);
create index if not exists idx_voters_voter_id on voters(voter_id);
create index if not exists idx_polling_stations_name on polling_stations(polling_station_name);
