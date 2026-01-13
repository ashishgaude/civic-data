-- Function to get global age and gender demographics
create or replace function get_global_demographics()
returns json
language plpgsql
as $$
declare
  total_voters integer;
  gender_counts json;
  age_counts json;
begin
  select count(*) into total_voters from voters;

  select json_object_agg(gender, count) into gender_counts
  from (
    select gender, count(*) 
    from voters 
    where gender is not null 
    group by gender
  ) t;

  select json_object_agg(age_group, count) into age_counts
  from (
    select 
      case 
        when age between 18 and 29 then '18-29'
        when age between 30 and 45 then '30-45'
        when age between 46 and 60 then '46-60'
        when age > 60 then '60+'
        else 'Unknown'
      end as age_group,
      count(*)
    from voters
    where age is not null
    group by age_group
  ) t;

  return json_build_object(
    'total_voters', total_voters,
    'gender_counts', gender_counts,
    'age_counts', age_counts
  );
end;
$$;

-- Function to get top surnames globally
create or replace function get_global_top_surnames(limit_count int default 10)
returns table(surname text, count bigint)
language sql
as $$
  select 
    upper(split_part(name, ' ', array_length(regexp_split_to_array(trim(name), '\s+'), 1))) as surname,
    count(*) as count
  from voters
  where name is not null 
  -- basic filter for junk
  and length(split_part(name, ' ', array_length(regexp_split_to_array(trim(name), '\s+'), 1))) > 2
  and upper(split_part(name, ' ', array_length(regexp_split_to_array(trim(name), '\s+'), 1))) not in ('PHOTO','AVAILABLE','VOTER','NAME','HUSBAND','FATHER','MOTHER','HOUSE','NUMBER','FEMALE','MALE','OTHER','MISSING','DELETED')
  group by surname
  order by count desc
  limit limit_count;
$$;

-- Function to get top polling stations by voter count
create or replace function get_top_stations_by_voters(limit_count int default 10)
returns table(station_name text, voter_count bigint)
language sql
as $$
  select 
    ps.polling_station_name, 
    count(v.id) as voter_count
  from polling_stations ps
  join voters v on v.polling_station_id = ps.id
  group by ps.id, ps.polling_station_name
  order by voter_count desc
  limit limit_count;
$$;
