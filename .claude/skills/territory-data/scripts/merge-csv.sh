#!/usr/bin/env bash
set -euo pipefail

OUTPUT=".cache/territory-data.csv"
PATTERN=".cache/territory-batch-*.csv"

files=( $PATTERN )
if [ ${#files[@]} -eq 0 ]; then
  echo "Error: No batch CSV files found matching $PATTERN" >&2
  exit 1
fi

expected_cols=$(head -1 "${files[0]}" | awk -F',' '{print NF}')

for f in "${files[@]}"; do
  bad_lines=$(awk -F',' -v expected="$expected_cols" 'NF != expected {print FILENAME":"NR": expected "expected" fields but got "NF}' "$f")
  if [ -n "$bad_lines" ]; then
    echo "Error: Column count mismatch in batch file:" >&2
    echo "$bad_lines" >&2
    exit 1
  fi
done

head -1 "${files[0]}" > "$OUTPUT"
for f in "${files[@]}"; do
  tail -n +2 "$f" >> "$OUTPUT"
done

total=$(( $(wc -l < "$OUTPUT") - 1 ))
echo "Merged ${#files[@]} batch files into $OUTPUT ($total rows)"

errors=0

echo "--- Validating context length (min 50 chars) ---"
short_ctx=$(awk -F',' 'NR > 1 {
  gsub(/^"|"$/, "", $10)
  if (length($10) > 0 && length($10) < 50)
    print NR": "$1" context too short ("length($10)" chars)"
}' "$OUTPUT")
if [ -n "$short_ctx" ]; then
  echo "Error: Short context entries found:" >&2
  echo "$short_ctx" >&2
  errors=1
fi

echo "--- Validating key_events sort order ---"
unsorted=$(awk -F',' 'NR > 1 {
  gsub(/^"|"$/, "", $11)
  n = split($11, events, "|")
  prev = -99999
  for (i = 1; i <= n; i++) {
    split(events[i], parts, ":")
    y = parts[1]
    if (y ~ /^前/) { gsub(/^前/, "", y); y = -y }
    y = y + 0
    if (y < prev) print NR": "$1" unsorted key_events (year "y" after "prev")"
    prev = y
  }
}' "$OUTPUT")
if [ -n "$unsorted" ]; then
  echo "Error: Unsorted key_events found:" >&2
  echo "$unsorted" >&2
  errors=1
fi

if [ "$errors" -ne 0 ]; then
  echo "Validation FAILED. Fix the issues above before importing." >&2
  exit 1
fi

echo "All validations passed."
