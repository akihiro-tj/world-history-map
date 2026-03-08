#!/usr/bin/env python3
import csv
import sys
import re

EXPECTED_COLS = 11
CONTEXT_MIN = 50
CONTEXT_MAX = 200
KEY_EVENTS_MIN = 3

def validate(filepath: str) -> list[str]:
    errors: list[str] = []
    with open(filepath, newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)

        if len(header) != EXPECTED_COLS:
            errors.append(f"Header has {len(header)} columns, expected {EXPECTED_COLS}")
            return errors

        context_idx = header.index("context")
        key_events_idx = header.index("key_events")

        for i, row in enumerate(reader, start=2):
            name = row[0] if row else "?"

            if len(row) != EXPECTED_COLS:
                errors.append(f"Line {i}: {name} has {len(row)} columns, expected {EXPECTED_COLS}")
                continue

            ctx = row[context_idx]
            if ctx and len(ctx) < CONTEXT_MIN:
                errors.append(f"Line {i}: {name} context too short ({len(ctx)} chars, min {CONTEXT_MIN})")
            elif ctx and len(ctx) > CONTEXT_MAX:
                errors.append(f"Line {i}: {name} context too long ({len(ctx)} chars, max {CONTEXT_MAX})")

            ke = row[key_events_idx]
            if not ke:
                continue

            events = ke.split("|")
            if len(events) < KEY_EVENTS_MIN:
                errors.append(f"Line {i}: {name} has {len(events)} key_events, min {KEY_EVENTS_MIN}")

            prev_year = -99999
            for event in events:
                m = re.match(r"^(前?)(\d+):", event)
                if not m:
                    errors.append(f"Line {i}: {name} malformed key_event: {event}")
                    continue
                y = int(m.group(2))
                if m.group(1) == "前":
                    y = -y
                if y < prev_year:
                    errors.append(f"Line {i}: {name} unsorted key_events (year {y} after {prev_year})")
                prev_year = y

                if re.match(r"^-\d+:", event):
                    errors.append(f"Line {i}: {name} BCE year missing 前 prefix: {event}")

    return errors


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <csv-file>", file=sys.stderr)
        sys.exit(2)

    filepath = sys.argv[1]
    errors = validate(filepath)

    if errors:
        print(f"FAIL: {len(errors)} error(s) found:", file=sys.stderr)
        for e in errors:
            print(f"  {e}", file=sys.stderr)
        sys.exit(1)
    else:
        print("All validations passed.")
        sys.exit(0)
