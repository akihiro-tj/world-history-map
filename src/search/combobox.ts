// 検索窓（WAI-ARIA combobox）のキー操作。React から切り離して単体テストする

export type ComboboxState = { open: boolean; activeIndex: number };

export type ComboboxKeyResult = {
  state: ComboboxState;
  chooseIndex: number | null;
  preventDefault: boolean;
};

const CLOSED: ComboboxState = { open: false, activeIndex: -1 };

export function handleComboboxKey(
  state: ComboboxState,
  key: string,
  isComposing: boolean,
  resultCount: number,
): ComboboxKeyResult {
  const unchanged: ComboboxKeyResult = { state, chooseIndex: null, preventDefault: false };
  // IME の変換確定の Enter などで候補を決定しない
  if (isComposing) {
    return unchanged;
  }
  switch (key) {
    case "ArrowDown": {
      const activeIndex =
        resultCount === 0
          ? -1
          : state.open && state.activeIndex >= 0
            ? (state.activeIndex + 1) % resultCount
            : 0;
      return { state: { open: true, activeIndex }, chooseIndex: null, preventDefault: true };
    }
    case "ArrowUp": {
      const activeIndex =
        resultCount === 0 ? -1 : state.activeIndex <= 0 ? resultCount - 1 : state.activeIndex - 1;
      return { state: { open: true, activeIndex }, chooseIndex: null, preventDefault: true };
    }
    case "Enter": {
      if (resultCount === 0) {
        return unchanged;
      }
      const chooseIndex =
        state.activeIndex >= 0 && state.activeIndex < resultCount ? state.activeIndex : 0;
      return { state: CLOSED, chooseIndex, preventDefault: true };
    }
    case "Escape":
      return { state: CLOSED, chooseIndex: null, preventDefault: true };
    default:
      return unchanged;
  }
}
