#!/usr/bin/env bash
set -euo pipefail

OUTPUT=".cache/territory-data.csv"
PATTERN=".cache/territory-batch-*.csv"

files=( $PATTERN )
if [ ${#files[@]} -eq 0 ]; then
  echo "Error: No batch CSV files found matching $PATTERN" >&2
  exit 1
fi

head -1 "${files[0]}" > "$OUTPUT"
for f in "${files[@]}"; do
  tail -n +2 "$f" >> "$OUTPUT"
done

total=$(( $(wc -l < "$OUTPUT") - 1 ))
echo "Merged ${#files[@]} batch files into $OUTPUT ($total rows)"
