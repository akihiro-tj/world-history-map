import { describe, expect, it } from "vitest";
import { type ComboboxState, handleComboboxKey } from "./combobox";

const closed: ComboboxState = { open: false, activeIndex: -1 };
const open0: ComboboxState = { open: true, activeIndex: 0 };

describe("handleComboboxKey", () => {
  it("IME の変換中は何もしない", () => {
    for (const key of ["Enter", "ArrowDown", "ArrowUp", "Escape"]) {
      expect(handleComboboxKey(open0, key, true, 3)).toEqual({
        state: open0,
        chooseIndex: null,
        preventDefault: false,
      });
    }
  });

  it("↓ で次の候補へ進み、最後の次は先頭に戻る", () => {
    expect(handleComboboxKey(closed, "ArrowDown", false, 3).state).toEqual({
      open: true,
      activeIndex: 0,
    });
    expect(
      handleComboboxKey({ open: true, activeIndex: 2 }, "ArrowDown", false, 3).state.activeIndex,
    ).toBe(0);
  });

  it("↑ で前の候補へ戻り、先頭の前は最後に移る", () => {
    expect(handleComboboxKey(open0, "ArrowUp", false, 3).state.activeIndex).toBe(2);
    expect(
      handleComboboxKey({ open: true, activeIndex: 2 }, "ArrowUp", false, 3).state.activeIndex,
    ).toBe(1);
  });

  it("候補が無ければ ↑↓ で選択位置を持たない", () => {
    expect(handleComboboxKey(closed, "ArrowDown", false, 0).state.activeIndex).toBe(-1);
  });

  it("Enter で選択中の候補を決定し、未選択なら先頭を決定する", () => {
    expect(handleComboboxKey({ open: true, activeIndex: 1 }, "Enter", false, 3).chooseIndex).toBe(
      1,
    );
    expect(handleComboboxKey(closed, "Enter", false, 3).chooseIndex).toBe(0);
    expect(handleComboboxKey(open0, "Enter", false, 3).state).toEqual(closed);
  });

  it("候補が無ければ Enter で何もしない", () => {
    expect(handleComboboxKey(open0, "Enter", false, 0).chooseIndex).toBeNull();
  });

  it("Esc で候補を閉じる", () => {
    expect(handleComboboxKey(open0, "Escape", false, 3)).toEqual({
      state: closed,
      chooseIndex: null,
      preventDefault: true,
    });
  });

  it("その他のキーは何もしない", () => {
    expect(handleComboboxKey(open0, "a", false, 3).state).toBe(open0);
  });
});
