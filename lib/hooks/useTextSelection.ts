/**
 * useTextSelection — Phase 6: Breakdown Mode
 * ─────────────────────────────────────────────────────────────────────────────
 * Lắng nghe sự kiện mouseup trong container ref để phát hiện khi user
 * bôi đen (select) text. Trả về text đã chọn và vị trí popup.
 *
 * Popup được hiện tại điểm cuối của selection (getBoundingClientRect).
 * Trả về null khi selection trống hoặc user click ra ngoài.
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface TextSelectionState {
  text: string;
  // viewport-relative position (px) để đặt popup tại đây
  x: number;
  y: number;
}

export function useTextSelection(
  containerRef: React.RefObject<HTMLElement | null>,
) {
  const [selection, setSelection] = useState<TextSelectionState | null>(null);
  // Track xem popup đang mở không để tránh dismiss ngay khi click menu
  const menuOpenRef = useRef(false);

  const clearSelection = useCallback(() => {
    setSelection(null);
    menuOpenRef.current = false;
  }, []);

  const markMenuOpen = useCallback(() => {
    menuOpenRef.current = true;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleMouseUp(e: MouseEvent) {
      // Cho phép event propagate — chỉ đọc selection
      const sel = window.getSelection();
      const text = sel?.toString().trim() ?? "";

      if (!text || text.length < 1) {
        // Nếu click ra ngoài menu → đóng
        if (!menuOpenRef.current) {
          setSelection(null);
        }
        return;
      }

      // Lấy bounding rect của range cuối cùng
      const range = sel?.getRangeAt(0);
      if (!range) return;

      const rect = range.getBoundingClientRect();

      // Đặt popup ngay dưới & giữa selection
      setSelection({
        text,
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8,
      });
    }

    function handleMouseDown(e: MouseEvent) {
      // Nếu user click ra ngoài trong khi menu đang mở → clear
      if (!menuOpenRef.current) return;
      const target = e.target as HTMLElement;
      if (!target.closest("[data-breakdown-menu]")) {
        clearSelection();
        window.getSelection()?.removeAllRanges();
      }
    }

    // Keydown Escape
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        clearSelection();
        window.getSelection()?.removeAllRanges();
      }
    }

    container.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [containerRef, clearSelection]);

  return { selection, clearSelection, markMenuOpen };
}
