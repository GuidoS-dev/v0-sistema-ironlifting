import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHistory } from "@/app/sistema/hooks/useHistory";

beforeEach(() => {
  localStorage.clear();
});

describe("useHistory", () => {
  it("inicializa con el valor inicial", () => {
    const { result } = renderHook(() => useHistory("k1", { val: 0 }));
    expect(result.current.current).toEqual({ val: 0 });
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("push agrega snapshots y persiste en localStorage", () => {
    const { result } = renderHook(() => useHistory("k1", { val: 0 }));
    act(() => result.current.push({ val: 1 }));
    expect(result.current.current).toEqual({ val: 1 });
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
    const stored = JSON.parse(localStorage.getItem("liftplan_hist_k1") || "");
    expect(stored.stack.length).toBe(2);
    expect(stored.idx).toBe(1);
  });

  it("undo retrocede al estado anterior", () => {
    const { result } = renderHook(() => useHistory("k1", { val: 0 }));
    act(() => result.current.push({ val: 1 }));
    act(() => result.current.push({ val: 2 }));
    act(() => result.current.undo());
    expect(result.current.current).toEqual({ val: 1 });
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(true);
  });

  it("redo avanza al siguiente estado", () => {
    const { result } = renderHook(() => useHistory("k1", { val: 0 }));
    act(() => result.current.push({ val: 1 }));
    act(() => result.current.undo());
    act(() => result.current.redo());
    expect(result.current.current).toEqual({ val: 1 });
  });

  it("push después de undo descarta el futuro", () => {
    const { result } = renderHook(() => useHistory("k1", { val: 0 }));
    act(() => result.current.push({ val: 1 }));
    act(() => result.current.push({ val: 2 }));
    act(() => result.current.undo());
    act(() => result.current.push({ val: 99 }));
    expect(result.current.current).toEqual({ val: 99 });
    expect(result.current.canRedo).toBe(false);
  });

  it("respeta maxLen", () => {
    const { result } = renderHook(() => useHistory("k1", { val: 0 }, 3));
    act(() => result.current.push({ val: 1 }));
    act(() => result.current.push({ val: 2 }));
    act(() => result.current.push({ val: 3 }));
    act(() => result.current.push({ val: 4 }));
    const stored = JSON.parse(localStorage.getItem("liftplan_hist_k1") || "");
    expect(stored.stack.length).toBe(3);
    expect(result.current.current).toEqual({ val: 4 });
  });

  it("clearHistory resetea con nuevo inicial", () => {
    const { result } = renderHook(() => useHistory("k1", { val: 0 }));
    act(() => result.current.push({ val: 1 }));
    act(() => result.current.clearHistory({ val: 99 }));
    expect(result.current.current).toEqual({ val: 99 });
    expect(result.current.canUndo).toBe(false);
  });

  it("rehidrata desde localStorage al montar", () => {
    localStorage.setItem(
      "liftplan_hist_k1",
      JSON.stringify({ stack: [{ val: 0 }, { val: 7 }], idx: 1 }),
    );
    const { result } = renderHook(() => useHistory("k1", { val: 0 }));
    expect(result.current.current).toEqual({ val: 7 });
    expect(result.current.canUndo).toBe(true);
  });
});
