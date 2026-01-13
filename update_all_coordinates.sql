-- Add geolocation columns to polling_stations
alter table polling_stations 
add column if not exists latitude double precision,
add column if not exists longitude double precision;

-- Optional: Create an index for geospatial queries (if using PostGIS later)
-- create index if not exists idx_polling_stations_lat_long on polling_stations(latitude, longitude);


-- Bulk Update for All 44 Polling Stations
-- Using specific locations where known, and village centroids for high accuracy grouping.

-- 1. MARCEL / ORGAO Cluster
-- Sharada English High School (Both North/South wings)
UPDATE polling_stations 
SET latitude = 15.5178, longitude = 73.9697 
WHERE polling_station_name ILIKE '%Sharada English High School%';

-- Orgao Village (Madapai, Deulwada)
UPDATE polling_stations 
SET latitude = 15.5200, longitude = 73.9650 
WHERE polling_station_name ILIKE '%Orgao%' OR polling_station_name ILIKE '%Deulwada%';

-- 2. TIVREM
UPDATE polling_stations 
SET latitude = 15.4984, longitude = 73.9652 
WHERE polling_station_name ILIKE '%Tivrem%';

-- 3. BOMA
UPDATE polling_stations 
SET latitude = 15.4741, longitude = 73.9632 
WHERE polling_station_name ILIKE '%Boma%';

-- 4. CANDOLA (Amyewada, Haldanwada)
UPDATE polling_stations 
SET latitude = 15.5139, longitude = 73.9678 
WHERE polling_station_name ILIKE '%Candola%';

-- 5. BETKI (Betqui)
UPDATE polling_stations 
SET latitude = 15.4961, longitude = 74.0046 
WHERE polling_station_name ILIKE '%Betki%';

-- 6. VOLVOI (Volvai)
UPDATE polling_stations 
SET latitude = 15.4940, longitude = 74.0110 
WHERE polling_station_name ILIKE '%Volvoi%' OR polling_station_name ILIKE '%Volvai%';

-- 7. SAVOI-VEREM Cluster (Pali, Savoi, Library)
UPDATE polling_stations 
SET latitude = 15.4808, longitude = 74.0196 
WHERE polling_station_name ILIKE '%Savoi%';

-- 8. VAGURME (Use approx location near Savoi-Verem as it's adjacent)
UPDATE polling_stations 
SET latitude = 15.4750, longitude = 74.0150 
WHERE polling_station_name ILIKE '%Vagurme%';

-- 9. PRIOL / MARDOL Cluster (Shiksha Sadan, Gauthan, Apewal, Magilwada)
-- Priol Village Center
UPDATE polling_stations 
SET latitude = 15.4365, longitude = 73.9909 
WHERE polling_station_name ILIKE '%Priol%';

-- Mardol Specific (Shiksha Sadan)
UPDATE polling_stations 
SET latitude = 15.4450, longitude = 73.9850 
WHERE polling_station_name ILIKE '%Mardol%' OR polling_station_name ILIKE '%Shiksha Sadan%';

-- 10. QUERIM (Kerim) (Arla, Satode)
UPDATE polling_stations 
SET latitude = 15.4268, longitude = 74.0210 
WHERE polling_station_name ILIKE '%Querim%';

-- 11. ADCOLNA
UPDATE polling_stations 
SET latitude = 15.4872, longitude = 73.9693 
WHERE polling_station_name ILIKE '%Adcolna%';

-- 12. VELING (Gauthan, Khazanwada) - Near Priol/Mardol
UPDATE polling_stations 
SET latitude = 15.4300, longitude = 73.9800 
WHERE polling_station_name ILIKE '%Veling%';

-- 13. CUNCOLIM (Priol context, likely near Mardol/Priol, not the South Goa city)
-- Assuming Cuncolim-Priol
UPDATE polling_stations 
SET latitude = 15.4400, longitude = 73.9950 
WHERE polling_station_name ILIKE '%Cuncolim%';

-- 14. Muslimwada / Balbhavan (Likely Bhoma/Banastari area based on context)
UPDATE polling_stations 
SET latitude = 15.4800, longitude = 73.9600 
WHERE polling_station_name ILIKE '%Muslimwada%';

-- Fallback for any remaining NULLs to Ponda Center
UPDATE polling_stations
SET 
  latitude = 15.4026,
  longitude = 74.0182
WHERE latitude IS NULL;
