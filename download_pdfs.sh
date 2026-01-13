#!/bin/bash

# Configuration
BASE_URL="https://ceogoa.nic.in/PDF/EROLL/MOTHERROLL/FINALROLL/2025/ENG/AC20"
START_RANGE=1
END_RANGE=44
OUTPUT_DIR="downloaded_pdfs"

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

echo "Starting download from AC20 (Range $START_RANGE to $END_RANGE)..."

for i in $(seq $START_RANGE $END_RANGE); do
    FILENAME="S05A20P${i}.pdf"
    URL="${BASE_URL}/${FILENAME}"
    TARGET_PATH="${OUTPUT_DIR}/${FILENAME}"

    # Skip if file exists and is not empty (optional: remove -s check if you want to force re-download)
    if [ -s "$TARGET_PATH" ]; then
        echo "Skipping $FILENAME (already exists)"
        continue
    fi

    echo "Downloading $FILENAME..."
    
    # -L follows redirects
    # --fail returns error code on 404
    # --silent hides progress bar but --show-error shows failures
    curl -L --fail --silent --show-error "$URL" -o "$TARGET_PATH"

    if [ $? -eq 0 ]; then
        echo "Successfully downloaded $FILENAME"
    else
        echo "Failed to download $FILENAME (might not exist on server)"
        # Remove empty file if download failed
        [ -f "$TARGET_PATH" ] && rm "$TARGET_PATH"
    fi
done

echo "Download process completed. Files are in '$OUTPUT_DIR/'."
