import pytesseract
from pdf2image import convert_from_path, pdfinfo_from_path
import re
import json
import os
import sys

def clean_text(text):
    text = text.strip()
    # Remove common trailing OCR artifacts from fields that might pick up next line's text
    # "Photo", "Available", "Proto", "Availble", "Avallable"
    # We use a regex to replace them at the end of string
    text = re.sub(r"\s*(Photo|Available|Proto|Availble|Avallable|Avaiiable).*$", "", text, flags=re.IGNORECASE)
    return text.strip()

def extract_common_info(text):
    info = {}
    # Assembly Constituency
    ac_match = re.search(r"Assembly Constituency.*?[:\-]\s*(.*)", text, re.IGNORECASE)
    if ac_match:
        raw_ac = ac_match.group(1)
        # Clean up noise like "| parewo.:1 |"
        if '|' in raw_ac:
            raw_ac = raw_ac.split('|')[0]
        info['assembly_constituency'] = clean_text(raw_ac)
    
    # Part No
    part_match = re.search(r"Part No.*?[:\.]\s*(\d+)", text, re.IGNORECASE)
    if part_match:
        info['part_no'] = clean_text(part_match.group(1))

    # Main Town or Village
    mt_match = re.search(r"Main Town or Village\s*[:\=\-\?]\s*(.*)", text, re.IGNORECASE)
    if mt_match:
        info['main_town_or_village'] = clean_text(mt_match.group(1))

    # Post Office
    po_match = re.search(r"Post Office\s*[:\=\-\?]\s*(.*)", text, re.IGNORECASE)
    if po_match:
        info['post_office'] = clean_text(po_match.group(1))

    # Police Station
    ps_match = re.search(r"Police Station\s*[:\=\-\?]\s*(.*)", text, re.IGNORECASE)
    if ps_match:
        info['police_station'] = clean_text(ps_match.group(1))

    # Block
    block_match = re.search(r"Block\s*[:\=\-\?]\s*(.*)", text, re.IGNORECASE)
    if block_match:
        info['block'] = clean_text(block_match.group(1))

    # Subdivision
    sd_match = re.search(r"Subdivision\s*[:\=\-\?]\s*(.*)", text, re.IGNORECASE)
    if sd_match:
        info['subdivision'] = clean_text(sd_match.group(1))

    # District
    dist_match = re.search(r"District\s*[:\=\-\?]\s*(.*)", text, re.IGNORECASE)
    if dist_match:
        info['district'] = clean_text(dist_match.group(1))

    # Pin Code
    pin_match = re.search(r"Pin code\s*[:\=\-\?]\s*(\d+)", text, re.IGNORECASE)
    if pin_match:
        info['pin_code'] = clean_text(pin_match.group(1))
        
    # Polling Station Details
    # Name
    # Look for "No. and Name..." and then capture the pattern "1- Something"
    ps_name_match = re.search(r"No\. and Name of Polling Station[\s\S]*?(\d+\s*-[^\n]+)", text, re.IGNORECASE)
    if ps_name_match:
        info['polling_station_name'] = clean_text(ps_name_match.group(1))
    elif re.search(r"Polling Station.*?(?:Name|Address).*?[:\-]\s*(.*)", text, re.IGNORECASE):
        # Fallback to old method if specific one fails
        fallback_match = re.search(r"Polling Station.*?(?:Name|Address).*?[:\-]\s*(.*)", text, re.IGNORECASE)
        info['polling_station_name'] = clean_text(fallback_match.group(1))
        
    # Type
    ps_type_match = re.search(r"Type of Polling Station\s*[\s\S]*?(General|Male|Female)", text, re.IGNORECASE)
    if ps_type_match:
        info['polling_station_type'] = clean_text(ps_type_match.group(1))
        
    # Address
    # The address often appears below the "Address... : Stations in this part :" line
    # We look for "Stations in this part :" and capture what follows until the next section "4," or similar
    ps_addr_match = re.search(r"Stations in this part\s*[:\-]\s*([\s\S]*?)(?:4,|\d+,|NUMBER OF ELECTORS|$)", text, re.IGNORECASE)
    if ps_addr_match:
        addr = ps_addr_match.group(1).replace('\n', ' ').strip()
        info['polling_station_address'] = clean_text(addr)
        
    return info

def extract_electors_stats(text):
    stats = {}
    # Check for "Net Elector" first as it's the final count
    net_match = re.search(r"Net Elector.*?\s+(\d+)\s*$", text, re.IGNORECASE | re.MULTILINE)
    if net_match:
        stats['total'] = net_match.group(1)
    else:
        # Fallback to Mother Roll if Net Elector not found
        # Pattern: Mother Roll ... 78 178
        mr_match = re.search(r"Mother Roll.*?\s+(\d+)\s*$", text, re.IGNORECASE | re.MULTILINE)
        if mr_match:
            stats['total'] = mr_match.group(1)
            
    return stats

def extract_voters_from_text(text):
    voters = []
    
    # Normalize common OCR typos
    text = text.replace("Narne", "Name").replace("Numiber", "Number")
    
    lines = text.split('\n')
    current_voter = {}
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Check for Name
        # Name : ...
        # Improved Regex: Match Name, then any non-alphanumeric separator (including multiple), then the name.
        name_match = re.search(r"^Name\s*[^a-zA-Z0-9]+\s*(.*)", line, re.IGNORECASE)
        if name_match:
            if 'name' in current_voter:
                # Save previous voter if it has enough fields
                # We check if it has at least one other field to avoid junk
                if any(k in current_voter for k in ['age', 'gender', 'house_number', 'relative_name', 'id']):
                     voters.append(current_voter)
                current_voter = {}
            
            current_voter['name'] = clean_text(name_match.group(1))
            continue

        # Relative Name
        rel_match = re.search(r"^(Fathers|Husbands|Mothers)\s*Name\s*[^a-zA-Z0-9]+\s*(.*)", line, re.IGNORECASE)
        if rel_match:
            current_voter['relative_type'] = rel_match.group(1)
            current_voter['relative_name'] = clean_text(rel_match.group(2))
            continue

        # House Number
        # Allow space or no separator if "Number" is present
        hn_match = re.search(r"^House\s*Number\s*[^a-zA-Z0-9]*\s*(.*)", line, re.IGNORECASE)
        if hn_match:
            current_voter['house_number'] = clean_text(hn_match.group(1))
            continue
            
        # Age and Gender (often on same line)
        # Age : 77 Gender : Male
        # Age ' 52 Gender * Male
        # Age +55
        # Age : & (OCR error for 8?) - handle non-digits
        age_gender_match = re.search(r"Age\s*[\:\'\}\$\+\-\=\!]\s*([0-9&]+)\s*Gender\s*[\:\*\-\=\+\!]\s*(Male|Female)", line, re.IGNORECASE)
        if age_gender_match:
            age_raw = age_gender_match.group(1).replace('&', '8') # Fix common OCR typo
            current_voter['age'] = age_raw
            current_voter['gender'] = age_gender_match.group(2)
            continue
            
        # Voter ID (TRW...)
        id_match = re.search(r"([A-Z]{3}\d{7})", line)
        if id_match:
            current_voter['id'] = id_match.group(1)
            continue
            
    # Add last voter
    if 'name' in current_voter and any(k in current_voter for k in ['age', 'gender', 'house_number', 'relative_name', 'id']):
        voters.append(current_voter)
        
    return voters

def process_pdf(pdf_path):
    print(f"Processing {pdf_path}...")
    try:
        info = pdfinfo_from_path(pdf_path)
        total_pages = info["Pages"]
        
        # 1. Common Info from Page 1
        images_p1 = convert_from_path(pdf_path, first_page=1, last_page=1)
        text_p1 = pytesseract.image_to_string(images_p1[0])
        common_info = extract_common_info(text_p1)
        
        all_voters = []
        
        # 2. Extract voters from Page 3 onwards
        # Note: Page 2 is often a summary or map page.
        for page_num in range(3, total_pages + 1):
            # print(f"  Processing page {page_num}...")
            images = convert_from_path(pdf_path, first_page=page_num, last_page=page_num)
            if not images:
                continue
            
            # Split page into 3 columns to handle layout better
            # This avoids PSM analysis issues with grid layouts
            img = images[0]
            width, height = img.size
            col_width = width / 3
            
            # Define crops (left, top, right, bottom)
            # We overlap slightly or just cut exact. Exact is usually fine for text columns.
            col1 = img.crop((0, 0, col_width, height))
            col2 = img.crop((col_width, 0, col_width * 2, height))
            col3 = img.crop((col_width * 2, 0, width, height))
            
            # OCR each column
            # Use PSM 6 (Block of text) for columns to ensure line order
            text1 = pytesseract.image_to_string(col1, config='--psm 6')
            text2 = pytesseract.image_to_string(col2, config='--psm 6')
            text3 = pytesseract.image_to_string(col3, config='--psm 6')
            
            # Combine text linearly
            full_page_text = text1 + "\n" + text2 + "\n" + text3
            
            voters = extract_voters_from_text(full_page_text)
            all_voters.extend(voters)
            
        # 3. Extract Stats from Last Page (Summary)
        if total_pages > 1:
            try:
                images_last = convert_from_path(pdf_path, first_page=total_pages, last_page=total_pages)
                if images_last:
                    # Use PSM 6 to preserve table layout structure slightly better for regex
                    text_last = pytesseract.image_to_string(images_last[0], config='--psm 6')
                    stats = extract_electors_stats(text_last)
                    if 'total' in stats:
                        common_info['number_of_electors'] = stats['total']
            except Exception as e_stats:
                print(f"Warning: Could not extract stats from last page: {e_stats}")

        return {
            "common_info": common_info,
            "voters": all_voters,
            "voter_count": len(all_voters)
        }
        
    except Exception as e:
        print(f"Error processing {pdf_path}: {e}")
        return None

if __name__ == "__main__":
    input_dir = "downloaded_pdfs"
    output_dir = "extracted_data_json"

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Created output directory: {output_dir}")

    if not os.path.exists(input_dir):
        print(f"Input directory not found: {input_dir}")
        sys.exit(1)

    pdf_files = sorted([f for f in os.listdir(input_dir) if f.lower().endswith('.pdf')])
    
    if not pdf_files:
        print(f"No PDF files found in {input_dir}")
        sys.exit(0)
        
    print(f"Found {len(pdf_files)} PDF files. Starting extraction...")

    for i, pdf_file in enumerate(pdf_files, 1):
        pdf_path = os.path.join(input_dir, pdf_file)
        json_filename = os.path.splitext(pdf_file)[0] + ".json"
        output_path = os.path.join(output_dir, json_filename)
        
        print(f"[{i}/{len(pdf_files)}] Processing {pdf_file}...")
        
        result = process_pdf(pdf_path)
        
        if result:
            with open(output_path, "w") as f:
                json.dump(result, f, indent=2)
            print(f"  Saved to {output_path} (Voters: {result['voter_count']})")
        else:
            print(f"  Failed to extract data from {pdf_file}")
