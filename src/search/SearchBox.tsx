import { type KeyboardEvent, useId, useMemo, useState } from "react";
import { COPY } from "../app/copy";
import type { City } from "../data/city";
import { type ComboboxState, handleComboboxKey } from "./combobox";
import { normalizeForSearch, searchCities } from "./match";

type SearchBoxProps = {
  cities: readonly City[];
  onSelect: (city: City) => void;
};

const CLOSED: ComboboxState = { open: false, activeIndex: -1 };

export function SearchBox({ cities, onSelect }: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const [combobox, setCombobox] = useState<ComboboxState>(CLOSED);
  const results = useMemo(() => searchCities(cities, query), [cities, query]);
  const listId = useId();
  const hasQuery = normalizeForSearch(query) !== "";
  const expanded = combobox.open && hasQuery;
  const optionId = (index: number) => `${listId}-option-${index}`;

  const choose = (city: City) => {
    onSelect(city);
    setQuery(city.name);
    setCombobox(CLOSED);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Safari は変換確定の Enter で isComposing が false になるので keyCode 229 も見る
    const isComposing = event.nativeEvent.isComposing || event.keyCode === 229;
    const result = handleComboboxKey(combobox, event.key, isComposing, results.length);
    if (result.preventDefault) {
      event.preventDefault();
    }
    setCombobox(result.state);
    const chosen = result.chooseIndex === null ? undefined : results[result.chooseIndex];
    if (chosen) {
      choose(chosen);
    }
  };

  return (
    <div className="relative font-body text-body">
      <input
        type="search"
        role="combobox"
        aria-label={COPY.searchLabel}
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          expanded && combobox.activeIndex >= 0 ? optionId(combobox.activeIndex) : undefined
        }
        placeholder={COPY.searchPlaceholder}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setCombobox({ open: true, activeIndex: -1 });
        }}
        onFocus={() => setCombobox((state) => ({ ...state, open: true }))}
        onBlur={() => setCombobox(CLOSED)}
        onKeyDown={onKeyDown}
        className="w-full rounded-md border border-border bg-surface p-md text-on-surface shadow-md outline-none focus:border-primary"
      />
      <ul
        id={listId}
        // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: ARIA combobox パターンで ul に listbox の role を付ける必要がある
        role="listbox"
        hidden={!expanded || results.length === 0}
        className="absolute inset-x-0 top-full mt-xs overflow-hidden rounded-md border border-border bg-surface shadow-md"
      >
        {results.map((city, index) => (
          // biome-ignore lint/a11y/useFocusableInteractive: フォーカスは input 側が保持し、option 自体はフォーカスしない combobox パターン
          <li
            key={city.id}
            id={optionId(index)}
            // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: ARIA combobox パターンで li に option の role を付ける必要がある
            role="option"
            aria-selected={index === combobox.activeIndex}
            // blur より先に選択を確定させる
            onMouseDown={(event) => {
              event.preventDefault();
              choose(city);
            }}
            className="cursor-pointer px-md py-sm aria-selected:bg-highlight aria-selected:text-primary"
          >
            {city.name}
          </li>
        ))}
      </ul>
      {expanded && results.length === 0 && (
        <p
          role="status"
          className="absolute inset-x-0 top-full mt-xs rounded-md border border-border bg-surface px-md py-sm text-label text-muted shadow-md"
        >
          {COPY.noResults}
        </p>
      )}
    </div>
  );
}
