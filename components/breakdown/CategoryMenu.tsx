/**
 * CategoryMenu.tsx — Phase 6: Breakdown Mode
 * ─────────────────────────────────────────────────────────────────────────────
 * Popup context menu hiện ra khi user bôi đen text trên PDF.
 * Hiển thị 12 categories theo màu chuẩn industry.
 * Vị trí: fixed, tính theo viewport coordinates từ useTextSelection.
 *
 * Thiết kế: "The Editorial Minimalist" — nền trắng tinh, viền nhẹ,
 * mỗi category là một row có dot màu + tên.
 */

"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { BREAKDOWN_CATEGORIES } from "@/lib/breakdown-categories";

interface CategoryMenuProps {
  /** Viewport-relative position (px) — đặt menu ở đây */
  x: number;
  y: number;
  /** Text đang được selected */
  selectedText: string;
  onSelect: (categoryId: string) => void;
  onClose: () => void;
  /** Gọi khi menu mount để đánh dấu "menu đang mở" */
  onOpen?: () => void;
}

export function CategoryMenu({
  x,
  y,
  selectedText,
  onSelect,
  onClose,
  onOpen,
}: Readonly<CategoryMenuProps>) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Thông báo cho parent biết menu đã mở
  useEffect(() => {
    onOpen?.();
  }, [onOpen]);

  // Điều chỉnh vị trí để không tràn ra ngoài viewport
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = el.getBoundingClientRect();

    let finalX = x - rect.width / 2;
    let finalY = y;

    // Tràn phải
    if (finalX + rect.width > vw - 12) finalX = vw - rect.width - 12;
    // Tràn trái
    if (finalX < 12) finalX = 12;
    // Tràn dưới → hiện lên trên selection
    if (finalY + rect.height > vh - 12) finalY = y - rect.height - 24;

    el.style.left = `${finalX}px`;
    el.style.top = `${finalY}px`;
    el.style.opacity = "1";
    el.style.transform = "scale(1) translateY(0)";
  }, [x, y]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      data-breakdown-menu="true"
      style={{
        position: "fixed",
        left: x,
        top: y,
        zIndex: 9999,
        opacity: 0,
        transform: "scale(0.95) translateY(-4px)",
        transition: "opacity 0.12s ease, transform 0.12s ease",
        minWidth: 200,
        maxWidth: 240,
        background: "#FFFFFF",
        borderRadius: 10,
        boxShadow:
          "0 4px 24px rgba(24,24,27,0.16), 0 0 0 1px rgba(24,24,27,0.08)",
        overflow: "hidden",
        fontFamily: "Space Grotesk, sans-serif",
      }}
    >
      {/* Header — text đang chọn */}
      <div
        style={{
          padding: "9px 12px 7px",
          borderBottom: "1px solid rgba(24,24,27,0.07)",
          background: "#FAFAF9",
        }}
      >
        <p
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.08em",
            color: "#A1A1AA",
            textTransform: "uppercase",
            marginBottom: 2,
          }}
        >
          Tag as
        </p>
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#18181B",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: 210,
          }}
          title={selectedText}
        >
          &ldquo;{selectedText.length > 28 ? selectedText.slice(0, 28) + "…" : selectedText}&rdquo;
        </p>
      </div>

      {/* Category list */}
      <div style={{ padding: "4px 0", maxHeight: 320, overflowY: "auto" }}>
        {BREAKDOWN_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            data-breakdown-menu="true"
            onClick={() => {
              onSelect(cat.id);
              onClose();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              width: "100%",
              padding: "6px 12px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = cat.bgHighlight;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            {/* Color dot */}
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: cat.color,
                flexShrink: 0,
                boxShadow: `0 0 0 2px ${cat.bgHighlight}`,
              }}
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "#18181B",
                letterSpacing: "0.01em",
              }}
            >
              {cat.name}
            </span>
          </button>
        ))}
      </div>

      {/* Footer — dismiss */}
      <div
        style={{
          padding: "5px 12px 7px",
          borderTop: "1px solid rgba(24,24,27,0.07)",
          background: "#FAFAF9",
        }}
      >
        <button
          data-breakdown-menu="true"
          onClick={onClose}
          style={{
            fontSize: 10,
            color: "#A1A1AA",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            fontFamily: "Space Grotesk, sans-serif",
            letterSpacing: "0.06em",
          }}
        >
          ESC to dismiss
        </button>
      </div>
    </div>,
    document.body,
  );
}
