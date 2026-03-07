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
