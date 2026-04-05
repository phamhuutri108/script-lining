/**
 * BreakdownPanel.tsx — Phase 6: Breakdown Mode (Right Panel)
 * ─────────────────────────────────────────────────────────────────────────────
 * Hiển thị danh sách tất cả elements đã được tag, nhóm theo Category.
 * Mỗi category = 1 section với viền trái màu tương ứng.
 *
 * Layout tham chiếu: ui-reference-spec.md §1.2 (StudioBinder Breakdown Panel)
 */

"use client";

import { useScriptStore } from "@/lib/store/useScriptStore";
import {
  BREAKDOWN_CATEGORIES,
  getCategoryById,
} from "@/lib/breakdown-categories";

interface BreakdownPanelProps {
  className?: string;
}

export function BreakdownPanel({ className }: Readonly<BreakdownPanelProps>) {
  const elements = useScriptStore((s) => s.breakdownElements);
  const removeElement = useScriptStore((s) => s.removeBreakdownElement);

  const totalCount = elements.length;

  // Group elements by category (giữ thứ tự BREAKDOWN_CATEGORIES)
  const grouped = BREAKDOWN_CATEGORIES.map((cat) => ({
    category: cat,
    items: elements.filter((e) => e.categoryId === cat.id),
  })).filter((g) => g.items.length > 0);

  return (
    <div
      className={className}
      style={{
        background: "#F8F7F4",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderLeft: "1px solid rgba(24,24,27,0.08)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px 10px",
          borderBottom: "1px solid rgba(24,24,27,0.08)",
          background: "#F8F7F4",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "#18181B",
              fontFamily: "Space Grotesk, sans-serif",
              textTransform: "uppercase",
            }}
          >
            Breakdown
          </span>
          {totalCount > 0 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "1px 6px",
                borderRadius: 999,
                background: "#18181B",
                color: "#F8F7F4",
                fontFamily: "Space Grotesk, sans-serif",
              }}
            >
              {totalCount}
            </span>
          )}
        </div>
        {totalCount > 0 && (
          <p
            style={{
              fontSize: 10,
              color: "#A1A1AA",
              marginTop: 2,
              fontFamily: "Space Grotesk, sans-serif",
            }}
          >
            {grouped.length} {grouped.length === 1 ? "category" : "categories"}
          </p>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {totalCount === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              padding: 24,
              gap: 8,
              textAlign: "center",
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "rgba(24,24,27,0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#A1A1AA"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#3F3F46",
                fontFamily: "Space Grotesk, sans-serif",
              }}
            >
              Chưa có element nào
            </p>
            <p
              style={{
                fontSize: 11,
                color: "#A1A1AA",
                lineHeight: 1.5,
                fontFamily: "Space Grotesk, sans-serif",
              }}
            >
              Bôi đen text trên kịch bản rồi chọn category để bắt đầu breakdown.
            </p>
          </div>
        ) : (
          grouped.map(({ category, items }) => (
            <div key={category.id} style={{ marginBottom: 4 }}>
              {/* Category header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 16px 4px",
                }}
              >
                <span
                  style={{
                    width: 3,
                    height: 14,
                    borderRadius: 2,
                    background: category.color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    color: category.color,
                    textTransform: "uppercase",
                    fontFamily: "Space Grotesk, sans-serif",
                  }}
                >
                  {category.name}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#A1A1AA",
                    fontFamily: "Space Grotesk, sans-serif",
                    marginLeft: "auto",
                  }}
                >
                  {items.length}
                </span>
              </div>

              {/* Element list */}
              <div style={{ padding: "0 8px 4px" }}>
                {items.map((el) => (
                  <ElementRow
                    key={el.id}
                    text={el.text}
                    color={category.color}
                    bgHighlight={category.bgHighlight}
                    onRemove={() => removeElement(el.id)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer: category legend */}
      {totalCount === 0 && (
        <div
          style={{
            padding: "10px 16px 12px",
            borderTop: "1px solid rgba(24,24,27,0.07)",
            background: "#F0EEE9",
            flexShrink: 0,
          }}
        >
          <p
            style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "#A1A1AA",
              textTransform: "uppercase",
              fontFamily: "Space Grotesk, sans-serif",
              marginBottom: 6,
            }}
          >
            Categories
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "4px 8px",
            }}
          >
            {BREAKDOWN_CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: cat.color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 9,
                    color: "#71717A",
                    fontFamily: "Space Grotesk, sans-serif",
                  }}
                >
                  {cat.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ElementRow ───────────────────────────────────────────────────────────────

interface ElementRowProps {
  text: string;
  color: string;
  bgHighlight: string;
  onRemove: () => void;
}

function ElementRow({
  text,
  color,
  bgHighlight,
  onRemove,
}: Readonly<ElementRowProps>) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 8px",
        borderRadius: 6,
        background: bgHighlight,
        marginBottom: 2,
        minHeight: 28,
      }}
    >
      <span
        style={{
          flex: 1,
          fontSize: 12,
          fontWeight: 500,
          color: "#18181B",
          fontFamily: "Space Grotesk, sans-serif",
          wordBreak: "break-word",
          lineHeight: 1.4,
        }}
      >
        {text}
      </span>
      <button
        onClick={onRemove}
        title="Xóa element"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 2,
          color: "#A1A1AA",
          flexShrink: 0,
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "color 0.1s",
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.color = "#dc2626")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.color = "#A1A1AA")
        }
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

// Re-export getCategoryById for use elsewhere
export { getCategoryById };
