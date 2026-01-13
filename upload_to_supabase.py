import os
import json
import glob
from supabase import create_client, Client

# Check for environment variables
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    # Try loading from .env file manually if python-dotenv is not installed or just simple check
    try:
        from dotenv import load_dotenv
        load_dotenv()
        SUPABASE_URL = os.environ.get("SUPABASE_URL")
        SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
    except ImportError:
        pass

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_KEY environment variables are required.")
    print("Please set them or create a .env file.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

INPUT_DIR = "extracted_data_json"

def upload_data():
    if not os.path.exists(INPUT_DIR):
        print(f"Directory {INPUT_DIR} not found.")
        return

    json_files = sorted(glob.glob(os.path.join(INPUT_DIR, "*.json")))
    
    print(f"Found {len(json_files)} JSON files to process.")

    for i, file_path in enumerate(json_files, 1):
        file_name = os.path.basename(file_path)
        print(f"[{i}/{len(json_files)}] Processing {file_name}...")

        with open(file_path, "r") as f:
            data = json.load(f)

        common_info = data.get("common_info", {})
        voters = data.get("voters", [])

        # Check if already imported
        try:
            res = supabase.table("polling_stations").select("id").eq("file_name", file_name).execute()
            if res.data and len(res.data) > 0:
                print(f"  - Already imported (ID: {res.data[0]['id']}). Skipping.")
                continue
        except Exception as e:
            print(f"  - Error checking existence: {e}")
            continue

        # Prepare polling station record
        station_record = {
            "file_name": file_name,
            "assembly_constituency": common_info.get("assembly_constituency"),
            "main_town_or_village": common_info.get("main_town_or_village"),
            "police_station": common_info.get("police_station"),
            "block": common_info.get("block"),
            "subdivision": common_info.get("subdivision"),
            "district": common_info.get("district"),
            "pin_code": common_info.get("pin_code"),
            "polling_station_name": common_info.get("polling_station_name"),
            "polling_station_type": common_info.get("polling_station_type"),
            "polling_station_address": common_info.get("polling_station_address"),
            # Clean number_of_electors to int
            "number_of_electors": int(common_info.get("number_of_electors", "0").replace(",", "").strip() or 0)
        }

        # Insert polling station
        try:
            res = supabase.table("polling_stations").insert(station_record).execute()
            if not res.data:
                print("  - Failed to insert polling station.")
                continue
            
            station_id = res.data[0]['id']
            print(f"  - Inserted Polling Station (ID: {station_id})")

            # Prepare voters records
            voter_records = []
            for v in voters:
                # Clean age
                age_val = v.get("age")
                if age_val and isinstance(age_val, str):
                    # Extract digits only
                    age_digits = "".join(filter(str.isdigit, age_val))
                    age_val = int(age_digits) if age_digits else None
                elif age_val == "":
                    age_val = None

                voter_records.append({
                    "polling_station_id": station_id,
                    "name": v.get("name"),
                    "relative_name": v.get("relative_name"),
                    "relative_type": v.get("relative_type"),
                    "house_number": v.get("house_number"),
                    "age": age_val,
                    "gender": v.get("gender"),
                    "voter_id": v.get("id") # Using 'id' from JSON as 'voter_id' in DB
                })

            # Batch insert voters (chunking to be safe, e.g., 500 at a time)
            chunk_size = 500
            total_voters = len(voter_records)
            for j in range(0, total_voters, chunk_size):
                chunk = voter_records[j:j+chunk_size]
                supabase.table("voters").insert(chunk).execute()
                print(f"    - Inserted voters batch {j//chunk_size + 1}/{(total_voters + chunk_size - 1)//chunk_size}")

            print(f"  - Successfully imported {total_voters} voters.")

        except Exception as e:
            print(f"  - Error importing data: {e}")

if __name__ == "__main__":
    upload_data()
