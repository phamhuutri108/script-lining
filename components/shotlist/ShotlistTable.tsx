"use client";

/**
 * ShotlistTable.tsx — Phase 7: Google Sheets–Style Shotlist
 * ─────────────────────────────────────────────────────────────────────────────
 * Giao diện bảng theo đúng PRD §TÍNH NĂNG B (feature-idea.md):
 *
 * LAYOUT (từ trên xuống):
 *   Row 0  — Film title bar (sticky, full-width)
 *   Row 1  — 2-tier column headers (sticky, rowspan visual)
 *   Data   — Shot rows, xen kẽ màu, scene grouping stripe bên trái
 *
 * 18 CỘT:
 *   [Frozen] #  │  SCENE#  │  LOCATION  │  SHOT#  │  INT/EXT  │  D/N
 *   [Scroll] DESCRIPTION │ DIALOGUE │ SUBJECTS │ TIME │ SIZE │ TYPE │ SIDE │ ANGLE │ MOV │ LENS │ NOTE
 *
 * DESIGN: The Editorial Minimalist
 *   - Canvas: #F8F7F4  /  Header dark: #2C2C2E
 *   - Accent: #19e66f  /  Font: Space Grotesk
 *   - Frozen col bg: #F8F7F4 (sticky left)
 *
 * Two-way binding: updateShotlistRow → sync ITramline.shotName / shotSize qua Zustand
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as React from "react";
import { useScriptStore, type IShotlistRow, type IAutoDetectScene } from "@/lib/store/useScriptStore";
import { cn } from "@/lib/utils";

// ─── Enum options ─────────────────────────────────────────────────────────────

const SHOT_SIZES  = ["", "EWS", "WS", "FS", "MFS", "MS", "MCU", "CU", "ECU", "WIDE", "OTS", "INSERT", "Random"] as const;
const SHOT_TYPES  = ["", "Observe", "Single", "Two", "Three", "Four", "Group", "OTS", "POV", "Insert", "B-roll"] as const;
const MOVEMENTS   = ["", "Static", "Pan", "Tilt", "Dolly In", "Dolly Out", "Handheld", "Steadicam", "Crane", "Zoom"] as const;
const ANGLES      = ["", "Eye Level", "Low Angle", "High Angle", "Dutch", "Bird's Eye", "Worm's Eye"] as const;
const INT_EXT     = ["", "INT", "EXT"] as const;
const DAY_NIGHT   = ["", "DAY", "NIGHT"] as const;

// ─── Scene stripe colors (cycle through scenes) ───────────────────────────────

const SCENE_STRIPE_COLORS = [
  "rgba(25,230,111,0.07)",
  "rgba(59,130,246,0.07)",
  "rgba(245,158,11,0.07)",
  "rgba(236,72,153,0.07)",
  "rgba(139,92,246,0.07)",
  "rgba(239,68,68,0.07)",
  "rgba(20,184,166,0.07)",
] as const;

// ─── Shared style constants ───────────────────────────────────────────────────

const FONT = "'Space Grotesk', sans-serif";
const HEADER_BG = "#2C2C2E";
const HEADER_TEXT = "rgba(255,255,255,0.75)";
const CANVAS = "#F8F7F4";
const BORDER = "rgba(24,24,27,0.09)";

// ─── Column definitions ───────────────────────────────────────────────────────

interface ColDef {
  id: string;
  label: string;
  width: number;
  frozen?: boolean;          // sticky left
  frozenLeft?: number;       // px offset when frozen
  align?: "left" | "center";
}

const COLUMNS: ColDef[] = [
  // ── Frozen ──────────────────────────────────────────────────────────────────
  { id: "rowNumber",   label: "#",        width: 42,  frozen: true,  frozenLeft: 0,   align: "center" },
  { id: "sceneNumber", label: "SCENE #",  width: 78,  frozen: true,  frozenLeft: 42,  align: "center" },
  { id: "location",    label: "LOCATION", width: 148, frozen: true,  frozenLeft: 120, align: "left"   },
  { id: "shotName",    label: "SHOT #",   width: 72,  frozen: true,  frozenLeft: 268, align: "center" },
  { id: "intExt",      label: "INT/EXT",  width: 70,  frozen: true,  frozenLeft: 340, align: "center" },
  { id: "dayNight",    label: "D/N",      width: 56,  frozen: true,  frozenLeft: 410, align: "center" },
  // ── Scrollable ───────────────────────────────────────────────────────────────
  { id: "description",    label: "DESCRIPTION", width: 260, align: "left"   },
  { id: "dialogue",       label: "DIALOGUE",    width: 220, align: "left"   },
  { id: "subjects",       label: "SUBJECTS",    width: 160, align: "left"   },
  { id: "scriptTime",     label: "TIME",        width: 64,  align: "center" },
  { id: "shotSize",       label: "SIZE",        width: 80,  align: "center" },
  { id: "shotType",       label: "TYPE",        width: 100, align: "center" },
  { id: "side",           label: "SIDE",        width: 56,  align: "center" },
  { id: "angle",          label: "ANGLE",       width: 110, align: "center" },
  { id: "movement",       label: "MOV",         width: 100, align: "center" },
  { id: "lens",           label: "LENS",        width: 70,  align: "center" },
  { id: "note",           label: "NOTE",        width: 180, align: "left"   },
];

const FROZEN_COLS = COLUMNS.filter((c) => c.frozen);
const FROZEN_WIDTH = FROZEN_COLS.reduce((s, c) => s + c.width, 0); // 466px

// ─── Helpers ──────────────────────────────────────────────────────────────────

function frozenCellStyle(col: ColDef, bgOverride?: string): React.CSSProperties {
  if (!col.frozen) return {};
  return {
    position: "sticky",
    left: col.frozenLeft,
    zIndex: 2,
    background: bgOverride ?? CANVAS,
  };
}

// Build a scene → stripe color map
function buildSceneColorMap(rows: IShotlistRow[]): Map<string, string> {
  const map = new Map<string, string>();
  let idx = 0;
  for (const row of rows) {
    if (!map.has(row.sceneNumber)) {
      map.set(row.sceneNumber, SCENE_STRIPE_COLORS[idx % SCENE_STRIPE_COLORS.length]);
      idx++;
    }
  }
  return map;
}

// ─── Cell Editors ─────────────────────────────────────────────────────────────

interface TextCellProps {
  value: string;
  tramlineId: string;
  field: keyof IShotlistRow;
  multiline?: boolean;
  align?: "left" | "center";
  mono?: boolean;
  bold?: boolean;
}

function TextCell({
  value,
  tramlineId,
  field,
  multiline = false,
  align = "left",
  mono = false,
  bold = false,
}: Readonly<TextCellProps>) {
  const update = useScriptStore((s) => s.updateShotlistRow);
  const [local, setLocal] = React.useState(value);
  React.useEffect(() => { setLocal(value); }, [value]);

  const sharedStyle: React.CSSProperties = {
    width: "100%",
    background: "transparent",
    border: "none",
    outline: "none",
    fontFamily: mono ? "monospace" : FONT,
    fontSize: 12,
    fontWeight: bold ? 600 : 400,
    color: "#18181B",
    textAlign: align,
    lineHeight: 1.5,
    resize: "none" as const,
    padding: "2px 4px",
    borderRadius: 3,
  };

  const focusStyle = "focus:ring-1 focus:ring-[#19e66f] rounded-sm";

  if (multiline) {
    return (
      <textarea
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => { if (local !== value) update(tramlineId, { [field]: local } as Partial<IShotlistRow>); }}
        className={focusStyle}
        style={{ ...sharedStyle, minHeight: 90, resize: "vertical" }}
        rows={4}
      />
    );
  }
  return (
    <input
      type="text"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => { if (local !== value) update(tramlineId, { [field]: local } as Partial<IShotlistRow>); }}
      className={focusStyle}
      style={sharedStyle}
    />
  );
}

interface SelectCellProps {
  value: string;
  tramlineId: string;
  field: keyof IShotlistRow;
  options: readonly string[];
  align?: "left" | "center";
}

function SelectCell({ value, tramlineId, field, options, align = "center" }: Readonly<SelectCellProps>) {
  const update = useScriptStore((s) => s.updateShotlistRow);
  return (
    <select
      value={value}
      onChange={(e) => update(tramlineId, { [field]: e.target.value } as Partial<IShotlistRow>)}
      className="focus:ring-1 focus:ring-[#19e66f] rounded-sm"
      style={{
        width: "100%",
        background: "transparent",
        border: "none",
        outline: "none",
        fontFamily: FONT,
        fontSize: 12,
        color: value ? "#18181B" : "#A1A1AA",
        textAlign: align,
        cursor: "pointer",
        padding: "2px 2px",
        appearance: "none",
      }}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt || "—"}</option>
      ))}
    </select>
  );
}

function DialogueCell({ dialogue, tramlineId }: { dialogue: string[]; tramlineId: string }) {
  const update = useScriptStore((s) => s.updateShotlistRow);
  const [local, setLocal] = React.useState(dialogue.join("\n"));
  React.useEffect(() => { setLocal(dialogue.join("\n")); }, [dialogue]);
  return (
    <textarea
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const arr = local.split("\n").map((l) => l.trim()).filter(Boolean);
        update(tramlineId, { dialogue: arr });
      }}
      placeholder="Thoại..."
      className="focus:ring-1 focus:ring-[#19e66f] rounded-sm"
      style={{
        width: "100%", background: "transparent", border: "none", outline: "none",
        fontFamily: FONT, fontSize: 12, color: "#18181B", fontStyle: "italic",
        lineHeight: 1.5, resize: "none", padding: "2px 4px", minHeight: 90,
      }}
      rows={4}
    />
  );
}

function SubjectsCell({ subjects }: { subjects: string[] }) {
  if (!subjects.length) return <span style={{ color: "#A1A1AA", fontSize: 12 }}>—</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 4px" }}>
      {subjects.map((s) => (
        <span
          key={s}
          style={{
            fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 4,
            background: "rgba(25,230,111,0.12)", color: "#16a34a",
            fontFamily: FONT, letterSpacing: "0.04em",
          }}
        >
          {s}
        </span>
      ))}
    </div>
  );
}

// Renders the correct cell editor for a given column
function CellContent({ col, row }: { col: ColDef; row: IShotlistRow }) {
  const { id, align } = col;
  const t = row.tramlineId;

  switch (id) {
    case "rowNumber":
      return (
        <span style={{ fontFamily: "monospace", fontSize: 11, color: "#A1A1AA", display: "block", textAlign: "center" }}>
          {row.rowNumber}
        </span>
      );
    case "sceneNumber":
      // Master-Slave: Scene# bị khoá — chỉ đổi được từ Break Scene label trên canvas
      return <SceneNumberCell sceneNumber={row.sceneNumber} />;
    case "location":
      return <TextCell value={row.location} tramlineId={t} field="location" />;
    case "shotName":
      return <TextCell value={row.shotName} tramlineId={t} field="shotName" align="center" bold />;
    case "intExt":
      return <SelectCell value={row.intExt} tramlineId={t} field="intExt" options={INT_EXT} />;
    case "dayNight":
      return <SelectCell value={row.dayNight} tramlineId={t} field="dayNight" options={DAY_NIGHT} />;
    case "description":
      return <TextCell value={row.description} tramlineId={t} field="description" multiline />;
    case "dialogue":
      return <DialogueCell dialogue={row.dialogue} tramlineId={t} />;
    case "subjects":
      return <SubjectsCell subjects={row.subjects} />;
    case "scriptTime":
      return <TextCell value={row.scriptTime} tramlineId={t} field="scriptTime" align="center" mono />;
    case "shotSize":
      return <SelectCell value={row.shotSize} tramlineId={t} field="shotSize" options={SHOT_SIZES} />;
    case "shotType":
      return <SelectCell value={row.shotType} tramlineId={t} field="shotType" options={SHOT_TYPES} />;
    case "side":
      return <TextCell value={row.side} tramlineId={t} field="side" align="center" />;
    case "angle":
      return <SelectCell value={row.angle} tramlineId={t} field="angle" options={ANGLES} />;
    case "movement":
      return <SelectCell value={row.movement} tramlineId={t} field="movement" options={MOVEMENTS} />;
    case "lens":
      return <TextCell value={row.lens} tramlineId={t} field="lens" align="center" mono />;
    case "note":
      return <TextCell value={row.note} tramlineId={t} field="note" multiline />;
    default:
      return null;
  }
}

// ─── Scene Number Cell (read-only, Master-Slave) ─────────────────────────────
//
// Scene# bị KHÓA tại đây — nguồn sự thật duy nhất là Label trên Break Scene
// trong canvas kịch bản. Khi user click, tooltip giải thích lý do.

function SceneNumberCell({ sceneNumber }: { sceneNumber: string }) {
  const [tooltipVisible, setTooltipVisible] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  // Đóng tooltip khi click/touch ra ngoài
  React.useEffect(() => {
    if (!tooltipVisible) return;
    const handler = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setTooltipVisible(false);
      }
    };
    document.addEventListener("pointerdown", handler, true);
    return () => document.removeEventListener("pointerdown", handler, true);
  }, [tooltipVisible]);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      {/* Badge read-only — click/tap để xem giải thích */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`Scene ${sceneNumber || "—"} — read-only`}
        title="Không thể đổi Scene# tại đây. Hãy đổi trên Label của đường Break Scene bên kịch bản"
        onClick={() => setTooltipVisible((v) => !v)}
        onKeyDown={(e) => e.key === "Enter" && setTooltipVisible((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          fontFamily: FONT,
          fontSize: 12,
          fontWeight: 700,
          color: "#6366f1",
          textAlign: "center",
          padding: "3px 6px",
          borderRadius: 4,
          background: "rgba(99,102,241,0.08)",
          border: "1px dashed rgba(99,102,241,0.28)",
          cursor: "not-allowed",
          userSelect: "none",
          whiteSpace: "nowrap",
          outline: "none",
          // Hiệu ứng nhẹ khi focus (keyboard navigation)
          transition: "background 0.12s",
        }}
      >
        {/* Lock icon */}
        <svg
          width="8" height="8"
          viewBox="0 0 24 24"
          fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, opacity: 0.55 }}
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        {sceneNumber || "—"}
      </div>

      {/* Custom tooltip — hoạt động cả iPad (click-triggered) lẫn desktop (hover via title) */}
      {tooltipVisible && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            background: "#18181B",
            color: "#E4E4E7",
            fontSize: 10,
            fontFamily: FONT,
            fontWeight: 500,
            padding: "8px 12px",
            borderRadius: 7,
            width: 238,
            lineHeight: 1.6,
            zIndex: 999,
            boxShadow: "0 6px 20px rgba(0,0,0,0.28)",
            pointerEvents: "none",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {/* Arrow pointer */}
          <div style={{
            position: "absolute",
            top: -5,
            left: 14,
            width: 10, height: 10,
            background: "#18181B",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRight: "none",
            borderBottom: "none",
            transform: "rotate(45deg)",
          }} />
          <span style={{ color: "#818cf8", fontWeight: 700 }}>Scene#</span>
          {" "}bị khoá tại đây.
          <br />
          Hãy đổi trên{" "}
          <span style={{ color: "#19e66f", fontWeight: 600 }}>Label</span>
          {" "}của đường{" "}
          <span style={{ color: "#818cf8", fontWeight: 600 }}>Break Scene</span>
          {" "}bên kịch bản.
        </div>
      )}
    </div>
  );
}

// ─── Load AI Data Button ──────────────────────────────────────────────────────

type LoadStatus = 'idle' | 'loading' | 'ok' | 'error';

function LoadAIDataButton() {
  const importAutoDetectData = useScriptStore((s) => s.importAutoDetectData);
  const autoDetectData = useScriptStore((s) => s.autoDetectData);
  const [status, setStatus] = React.useState<LoadStatus>('idle');

  // Nếu đã có data trong cache thì hiện trạng thái "loaded"
  const alreadyLoaded = autoDetectData.length > 0;

  async function handleLoad() {
    setStatus('loading');
    try {
      const res = await fetch('/data/script-autodetect.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const scenes: IAutoDetectScene[] = await res.json();
      importAutoDetectData(scenes);
      setStatus('ok');
      // Reset về idle sau 3s
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      console.error('[LoadAIData]', err);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }

  const label =
    status === 'loading' ? 'Loading...' :
    status === 'ok'      ? `✓ ${autoDetectData.length} scenes loaded` :
    status === 'error'   ? '✗ Error' :
    alreadyLoaded        ? `AI Data ✓ (${autoDetectData.length})` :
                           'Load AI Data';

  const accent = status === 'ok' ? '#19e66f' : status === 'error' ? '#ef4444' : alreadyLoaded ? '#19e66f' : '#71717A';

  return (
    <button
      onClick={handleLoad}
      disabled={status === 'loading'}
      title="Nạp dữ liệu AI từ data/script-autodetect.json vào bảng Shotlist"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px',
        borderRadius: 5,
        border: `1px solid ${accent}`,
        background: alreadyLoaded || status === 'ok' ? `${accent}1A` : 'transparent',
        color: accent,
        fontFamily: FONT,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.07em',
        cursor: status === 'loading' ? 'wait' : 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      {/* Spark icon */}
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
      {label}
    </button>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <tr>
      <td colSpan={COLUMNS.length} style={{ padding: "60px 24px", textAlign: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "rgba(25,230,111,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#19e66f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="12" x2="12" y2="18" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </div>
          <p style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: "#3F3F46", margin: 0 }}>
            Chưa có shot nào
          </p>
          <p style={{ fontFamily: FONT, fontSize: 12, color: "#A1A1AA", margin: 0 }}>
            Vẽ tramline trên kịch bản ở chế độ LINE SCRIPT để bắt đầu.
          </p>
        </div>
      </td>
    </tr>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export interface ShotlistTableProps {
  className?: string;
  /** Tên phim hiển thị ở tiêu đề bảng */
  filmTitle?: string;
}

export function ShotlistTable({
  className,
  filmTitle = "SCRIPT LINING",
}: Readonly<ShotlistTableProps>) {
  const shotlist = useScriptStore((s) => s.shotlist);
  const sceneColorMap = React.useMemo(() => buildSceneColorMap(shotlist), [shotlist]);

  const totalWidth = COLUMNS.reduce((s, c) => s + c.width, 0);

  return (
    <div
      className={cn("relative flex flex-col h-full", className)}
      style={{ fontFamily: FONT, background: CANVAS }}
    >
      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "6px 16px", borderBottom: `1px solid ${BORDER}`,
          background: CANVAS, flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#71717A", textTransform: "uppercase" }}>
          Shotlist — {shotlist.length} shot{shotlist.length !== 1 ? "s" : ""}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LoadAIDataButton />
          <span style={{ fontSize: 10, fontWeight: 600, color: "#19e66f", letterSpacing: "0.08em" }}>
            TWO-WAY BINDING ✓
          </span>
        </div>
      </div>

      {/* ── Table Container ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
        <table
          style={{
            width: totalWidth, minWidth: "100%",
            borderCollapse: "separate", borderSpacing: 0,
            tableLayout: "fixed",
          }}
        >
          <colgroup>
            {COLUMNS.map((col) => (
              <col key={col.id} style={{ width: col.width, minWidth: col.width }} />
            ))}
          </colgroup>

          <thead>
            {/* ── Row 1: Film Title ───────────────────────────────────────── */}
            <tr>
              <td
                colSpan={COLUMNS.length}
                style={{
                  position: "sticky", top: 0, zIndex: 20,
                  background: HEADER_BG,
                  padding: "0 16px",
                  height: 36,
                  borderBottom: `1px solid rgba(255,255,255,0.08)`,
                }}
              >
                <span style={{
                  fontSize: 13, fontWeight: 800, letterSpacing: "0.18em",
                  color: "#FFFFFF", textTransform: "uppercase",
                  fontFamily: FONT,
                }}>
                  {filmTitle}
                </span>
              </td>
            </tr>

            {/* ── Row 2: Column Headers ────────────────────────────────────── */}
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.id}
                  style={{
                    position: "sticky",
                    top: 36,          // below film title row
                    zIndex: col.frozen ? 11 : 10,
                    background: HEADER_BG,
                    padding: "7px 8px",
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    color: HEADER_TEXT,
                    textAlign: col.align ?? "left",
                    borderRight: `1px solid rgba(255,255,255,0.07)`,
                    borderBottom: `2px solid rgba(255,255,255,0.15)`,
                    whiteSpace: "nowrap",
                    userSelect: "none",
                    ...(col.frozen
                      ? { left: col.frozenLeft, position: "sticky" }
                      : {}),
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {shotlist.length === 0 ? (
              <EmptyState />
            ) : (
              shotlist.map((row, rowIdx) => {
                const stripeColor = sceneColorMap.get(row.sceneNumber) ?? "transparent";
                const isEven = rowIdx % 2 === 0;
                const rowBg = isEven ? CANVAS : "rgba(24,24,27,0.022)";

                return (
                  <tr
                    key={row.tramlineId}
                    data-tramline-id={row.tramlineId}
                    style={{
                      background: rowBg,
                      borderBottom: `1px solid ${BORDER}`,
                    }}
                    className="group"
                  >
                    {COLUMNS.map((col) => {
                      const isTall = col.id === "description" || col.id === "dialogue" || col.id === "note";
                      const cellBg = col.frozen ? rowBg : undefined;

                      return (
                        <td
                          key={col.id}
                          style={{
                            padding: "6px 8px",
                            verticalAlign: "top",
                            minHeight: isTall ? 108 : 36,
                            borderRight: `1px solid ${BORDER}`,
                            // Scene stripe: thin left border on first frozen col
                            ...(col.id === "rowNumber"
                              ? { borderLeft: `3px solid ${stripeColor.replace("0.07", "0.5")}` }
                              : {}),
                            ...frozenCellStyle(col, cellBg),
                          }}
                        >
                          <CellContent col={col} row={row} />
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "5px 16px", borderTop: `1px solid ${BORDER}`,
          background: CANVAS, flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 10, color: "#A1A1AA" }}>
          {shotlist.length} row{shotlist.length !== 1 ? "s" : ""} · {COLUMNS.length} cols · Scroll ngang để xem thêm
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {Array.from(sceneColorMap.entries()).slice(0, 5).map(([scene, color]) => (
            <span
              key={scene}
              style={{
                fontSize: 9, padding: "1px 6px", borderRadius: 3,
                background: color, color: "#18181B",
                fontWeight: 600, fontFamily: FONT, letterSpacing: "0.05em",
              }}
            >
              {scene}
            </span>
          ))}
          {sceneColorMap.size > 5 && (
            <span style={{ fontSize: 9, color: "#A1A1AA" }}>+{sceneColorMap.size - 5}</span>
          )}
        </div>
      </div>
    </div>
  );
}
