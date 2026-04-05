"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ShotlistTable } from "@/components/shotlist/ShotlistTable";
import { PdfRenderer, type PdfTextExtractionData } from "@/components/workspace/PdfRenderer";
import { FabricTramlineCanvas, type FabricZoomControls } from "@/components/workspace/FabricTramlineCanvas";
import { type DrawMode } from "@/lib/hooks/useFabricCanvas";
import { useScriptStore, type ITramline, type IShotlistRow } from "@/lib/store/useScriptStore";
import { generateStressData } from "@/lib/utils/stress-test";
import { BreakdownView } from "@/components/breakdown/BreakdownView";

// ─── Tab type ─────────────────────────────────────────────────────────────────

type Tab = "BREAKDOWN" | "LINE SCRIPT" | "SHOTLIST";

// ─── Mock data (có thêm field x) ─────────────────────────────────────────────

const MOCK_TRAMLINES: ITramline[] = [
  {
    id: "tram-001", pageNumber: 1, x: 140, startY: 120, endY: 420,
    shotName: "1A", shotSize: "WIDE", color: "#19e66f",
    segments: [{ type: "straight", startY: 120, endY: 320 }, { type: "zigzag", startY: 320, endY: 420 }],
  },
  {
    id: "tram-002", pageNumber: 1, x: 200, startY: 420, endY: 680,
    shotName: "1B", shotSize: "MCU", color: "#f59e0b",
    segments: [{ type: "straight", startY: 420, endY: 680 }],
  },
  {
    id: "tram-003", pageNumber: 2, x: 140, startY: 80, endY: 350,
    shotName: "2A", shotSize: "CU", color: "#3b82f6",
    segments: [{ type: "straight", startY: 80, endY: 200 }, { type: "zigzag", startY: 200, endY: 280 }, { type: "straight", startY: 280, endY: 350 }],
  },
  {
    id: "tram-004", pageNumber: 2, x: 200, startY: 350, endY: 600,
    shotName: "2B", shotSize: "OTS", color: "#ec4899",
    segments: [{ type: "straight", startY: 350, endY: 600 }],
  },
];

const MOCK_SHOTLIST: IShotlistRow[] = [
  { tramlineId: "tram-001", rowNumber: 1, sceneNumber: "SC-01", location: "VAN PHONG - TANG 12", shotName: "1A", intExt: "INT", dayNight: "DAY", description: "MINH buoc vao van phong nhin thay ban trong.", autoDetectText: "INT. VAN PHONG - NGAY\nMINH (30) buoc vao.", dialogue: [], subjects: ["MINH"], scriptTime: "1/8", shotSize: "WIDE", shotType: "Observe", side: "", angle: "Eye Level", movement: "Pan", lens: "35mm", note: "" },
  { tramlineId: "tram-002", rowNumber: 2, sceneNumber: "SC-01", location: "VAN PHONG - TANG 12", shotName: "1B", intExt: "INT", dayNight: "DAY", description: "Close up ban tay MINH cam to giay.", autoDetectText: "", dialogue: ["MINH: Co ay da di that roi."], subjects: ["MINH"], scriptTime: "2/8", shotSize: "MCU", shotType: "Single", side: "", angle: "Eye Level", movement: "Static", lens: "85mm", note: "" },
  { tramlineId: "tram-003", rowNumber: 3, sceneNumber: "SC-02", location: "BAI DO XE - B2", shotName: "2A", intExt: "EXT", dayNight: "NIGHT", description: "ANH TUAN ngoi trong xe dien thoai do chuong.", autoDetectText: "EXT. BAI DO XE - DEM\nANH TUAN (45) ngoi.", dialogue: [], subjects: ["ANH TUAN"], scriptTime: "1/8", shotSize: "CU", shotType: "Single", side: "L", angle: "Low Angle", movement: "Static", lens: "50mm", note: "" },
  { tramlineId: "tram-004", rowNumber: 4, sceneNumber: "SC-02", location: "BAI DO XE - B2", shotName: "2B", intExt: "EXT", dayNight: "NIGHT", description: "", autoDetectText: "", dialogue: ["ANH TUAN: May dang o dau?"], subjects: ["ANH TUAN"], scriptTime: "1/8", shotSize: "OTS", shotType: "Two", side: "", angle: "Eye Level", movement: "Handheld", lens: "35mm", note: "Kiem tra am thanh" },
];

// ─── Lining Toolbar ────────────────────────────────────────────────────────────

interface LiningToolbarProps {
  drawMode: DrawMode;
  onDrawModeChange: (mode: DrawMode) => void;
  // Zoom / Pan controls
  isPanMode: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onTogglePanMode: () => void;
}

function LiningToolbar({
  drawMode,
  onDrawModeChange,
  isPanMode,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onTogglePanMode,
}: Readonly<LiningToolbarProps>) {
  // Nhóm 1: Modes group — Break Scene (indigo) + Draw/Split (green) gộp chung
  // Nhóm 2: Zoom/Pan group
  // Break Scene icon: đường ngang + box label ở giữa
  const breakSceneIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="7" y2="12" />
      <rect x="7" y="8.5" width="10" height="7" rx="1.5" />
      <line x1="17" y1="12" x2="21" y2="12" />
    </svg>
  );

  const drawTools: { mode: DrawMode; label: string; icon: React.ReactNode }[] = [
    {
      mode: "idle",
      label: "Select",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 3l14 9-7 1-4 7z" />
        </svg>
      ),
    },
    {
      mode: "draw",
      label: "Draw",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="3" x2="12" y2="21" />
          <line x1="8" y1="7" x2="16" y2="7" />
          <line x1="8" y1="17" x2="16" y2="17" />
        </svg>
      ),
    },
    {
      mode: "split",
      label: "Split",
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      ),
    },
  ];

  const isBreakSceneMode = drawMode === "breakscene";

  const renderDrawBtn = (mode: DrawMode, label: string, icon: React.ReactNode, accent: string, accentBg: string, accentBorder: string) => (
    <button
      key={mode}
      onClick={() => onDrawModeChange(mode)}
      title={label}
      className="flex flex-col items-center gap-0.5 rounded-md transition-colors"
      style={{
        background: drawMode === mode ? accentBg : "transparent",
        color: drawMode === mode ? accent : "#71717A",
        border: drawMode === mode ? `1px solid ${accentBorder}` : "1px solid transparent",
        // Apple HIG: minimum 44×44px touch target
        minWidth: 44,
        minHeight: 44,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "6px 4px",
      }}
    >
      {icon}
      <span style={{ fontSize: 9, fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, letterSpacing: "0.05em", marginTop: 2 }}>
        {label.toUpperCase()}
      </span>
    </button>
  );

  return (
    <div
      className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20"
      style={{ background: "#F8F7F4", borderRadius: 8, padding: 4, boxShadow: "0 1px 8px rgba(24,24,27,0.12), 0 0 0 1px rgba(24,24,27,0.07)" }}
    >
      {/* Modes group: Break Scene + Draw/Split/Select — tất cả kề nhau */}
      <div className="flex flex-col gap-1">
        {/* Break Scene — indigo, gộp trực tiếp trên cụm Draw/Split */}
        {renderDrawBtn("breakscene", "Break", breakSceneIcon, "#6366f1", "rgba(99,102,241,0.13)", "rgba(99,102,241,0.35)")}

        {/* Separator mỏng giữa Break Scene và các tool vẽ */}
        <div style={{ height: 1, background: "rgba(24,24,27,0.1)", margin: "1px 4px" }} />

        {/* Select / Draw / Split — bị tắt khi Break Scene đang active */}
        <div
          className="flex flex-col gap-1"
          style={{
            opacity: isBreakSceneMode ? 0.30 : 1,
            pointerEvents: isBreakSceneMode ? "none" : "auto",
            transition: "opacity 0.15s",
          }}
        >
          {drawTools.map(({ mode, label, icon }) =>
            renderDrawBtn(mode, label, icon, "#16a34a", "rgba(25,230,111,0.15)", "rgba(25,230,111,0.3)")
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(24,24,27,0.1)", margin: "0 2px" }} />

      {/* Zoom / Pan group — 4 nút, tối thiểu 44×44px (Apple HIG) */}
      <div className="flex flex-col gap-1">

        {/* Zoom In */}
        <button
          onClick={onZoomIn}
          title="Zoom In (Ctrl + scroll)"
          style={{
            minWidth: 44, minHeight: 44,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 2, padding: "6px 4px",
            background: "transparent",
            color: "#71717A",
            border: "1px solid transparent",
            borderRadius: 6,
            transition: "background 0.12s, color 0.12s",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(24,24,27,0.07)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
          <span style={{ fontSize: 9, fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, letterSpacing: "0.05em" }}>
            ZOOM+
          </span>
        </button>

        {/* Zoom Out */}
        <button
          onClick={onZoomOut}
          title="Zoom Out (Ctrl + scroll)"
          style={{
            minWidth: 44, minHeight: 44,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 2, padding: "6px 4px",
            background: "transparent",
            color: "#71717A",
            border: "1px solid transparent",
            borderRadius: 6,
            transition: "background 0.12s, color 0.12s",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(24,24,27,0.07)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
          <span style={{ fontSize: 9, fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, letterSpacing: "0.05em" }}>
            ZOOM−
          </span>
        </button>

        {/* Fit Screen (Reset Zoom) */}
        <button
          onClick={onResetZoom}
          title="Fit Screen — reset zoom & pan"
          style={{
            minWidth: 44, minHeight: 44,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 2, padding: "6px 4px",
            background: "transparent",
            color: "#71717A",
            border: "1px solid transparent",
            borderRadius: 6,
            transition: "background 0.12s, color 0.12s",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(24,24,27,0.07)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3" />
            <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
            <path d="M3 16v3a2 2 0 0 0 2 2h3" />
            <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
          </svg>
          <span style={{ fontSize: 9, fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, letterSpacing: "0.05em" }}>
            FIT
          </span>
        </button>

        {/* Hand Tool (Pan Mode) — active khi isPanMode=true */}
        <button
          onClick={onTogglePanMode}
          title={isPanMode ? "Pan Mode — đang bật (nhấn để tắt)" : "Pan Mode — kéo để di chuyển"}
          style={{
            minWidth: 44, minHeight: 44,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 2, padding: "6px 4px",
            // Active state: màu amber nổi bật, dễ nhận ra trên iPad
            background: isPanMode ? "rgba(245,158,11,0.15)" : "transparent",
            color: isPanMode ? "#d97706" : "#71717A",
            border: isPanMode ? "1px solid rgba(245,158,11,0.35)" : "1px solid transparent",
            borderRadius: 6,
            transition: "background 0.12s, color 0.12s, border-color 0.12s",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            if (!isPanMode) (e.currentTarget as HTMLButtonElement).style.background = "rgba(24,24,27,0.07)";
          }}
          onMouseLeave={(e) => {
            if (!isPanMode) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          }}
        >
          {/* Hand / palm icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2" />
            <path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2" />
            <path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8" />
            <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
          </svg>
          <span style={{ fontSize: 9, fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, letterSpacing: "0.05em" }}>
            {isPanMode ? "PAN ●" : "PAN"}
          </span>
        </button>

      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const hydrate = useScriptStore((s) => s.hydrate);
  const shotlistCount = useScriptStore((s) => s.tramlines.length);

  const [activeTab, setActiveTab] = useState<Tab>("LINE SCRIPT");
  const [pdfSrc, setPdfSrc] = useState<string | ArrayBuffer | null>(null);
  const [pdfTotalPages, setPdfTotalPages] = useState(0);
  const [extractedData, setExtractedData] = useState<PdfTextExtractionData[]>([]);
  const [drawMode, setDrawMode] = useState<DrawMode>("idle");
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "error">("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Zoom / Pan state — shared across ALL canvas instances ──────────────────
  const [isPanMode, setIsPanMode] = useState(false);
  /**
   * Registry: pageNumber → FabricZoomControls
   * Khi zoomIn/Out/Fit được nhấn, gọi đồng thời trên tất cả canvas đang hiển thị.
   */
  const zoomControlsMapRef = useRef(new Map<number, FabricZoomControls>());

  const togglePanMode = useCallback(() => setIsPanMode((p) => !p), []);

  const handleZoomIn = useCallback(() => {
    zoomControlsMapRef.current.forEach((c) => c.zoomIn());
  }, []);
  const handleZoomOut = useCallback(() => {
    zoomControlsMapRef.current.forEach((c) => c.zoomOut());
  }, []);
  const handleResetZoom = useCallback(() => {
    zoomControlsMapRef.current.forEach((c) => c.resetZoom());
  }, []);

  useEffect(() => {
    hydrate(MOCK_TRAMLINES, MOCK_SHOTLIST);
  }, [hydrate]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input để cho phép chọn lại cùng file
    e.target.value = "";
    if (!file || file.type !== "application/pdf") return;

    // Revoke blob URL cũ nếu có
    if (pdfSrc && typeof pdfSrc === "string" && pdfSrc.startsWith("blob:")) {
      URL.revokeObjectURL(pdfSrc);
    }

    setExtractedData([]);
    setUploadError(null);
    setUploadState("uploading");

    // Preview ngay bằng blob URL trong khi upload R2 chạy nền
    const blobUrl = URL.createObjectURL(file);
    setPdfSrc(blobUrl);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const json = (await res.json()) as { url?: string; error?: string };

      if (!res.ok || !json.url) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }

      // Thay blob URL bằng R2 public URL
      URL.revokeObjectURL(blobUrl);
      setPdfSrc(json.url);
      setUploadState("idle");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload thất bại";
      console.error("[Upload]", err);
      // Giữ blob URL để người dùng vẫn làm việc được, chỉ báo lỗi
      setUploadState("error");
      setUploadError(msg);
    }
  }, [pdfSrc]);

  const setPdfTextForPage = useScriptStore((s) => s.setPdfTextForPage);

  const handleTextExtracted = useCallback((data: PdfTextExtractionData) => {
    // Feed text lines vào store → tự động re-parse tramlines trên trang này
    setPdfTextForPage(data.pageNumber, data.lines);

    setExtractedData((prev) => {
      const filtered = prev.filter((d) => d.pageNumber !== data.pageNumber);
      return [...filtered, data].sort((a, b) => a.pageNumber - b.pageNumber);
    });

    if (process.env.NODE_ENV === "development") {
      console.groupCollapsed(`[PDF] Page ${data.pageNumber}: ${data.blocks.length} blocks, ${data.sceneHeaders.length} scenes`);
      data.sceneHeaders.forEach((s) =>
        console.log(`  ${s.sceneNumber || "?"}: ${s.intExt} ${s.location} - ${s.dayNight} y=[${s.y.toFixed(0)},${s.yBottom.toFixed(0)}]`)
      );
      console.groupEnd();
    }
  }, [setPdfTextForPage]);

  // ── renderOverlay: inject FabricTramlineCanvas vào mỗi trang PDF ──────────
  // Truyền isPanMode và controls registry callbacks xuống mỗi canvas instance.
  const renderOverlay = useCallback(({ pageNumber, width, height }: { pageNumber: number; width: number; height: number }) => (
    <FabricTramlineCanvas
      pageNumber={pageNumber}
      width={width}
      height={height}
      drawMode={drawMode}
      isPanMode={isPanMode}
      onControlsReady={(controls) => {
        zoomControlsMapRef.current.set(pageNumber, controls);
      }}
      onControlsDestroyed={() => {
        zoomControlsMapRef.current.delete(pageNumber);
      }}
    />
  ), [drawMode, isPanMode]);

  return (
    <main className="h-screen flex flex-col overflow-hidden" style={{ background: "#F8F7F4" }}>

      {/* ── Tab Bar ─────────────────────────────────────────────────────── */}
      <header
        className="flex items-center px-4 border-b shrink-0"
        style={{ borderColor: "rgba(24,24,27,0.1)", height: 44 }}
      >
        <span className="text-[13px] font-bold tracking-[0.1em] mr-6 shrink-0" style={{ color: "#18181B", fontFamily: "Space Grotesk, sans-serif" }}>
          SCRIPT LINING
        </span>

        {(["BREAKDOWN", "LINE SCRIPT", "SHOTLIST"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 h-full text-[11px] font-semibold tracking-[0.1em] transition-colors border-b-2 relative"
            style={{
              color: activeTab === tab ? "#18181B" : "#A1A1AA",
              borderBottomColor: activeTab === tab ? "#19e66f" : "transparent",
              fontFamily: "Space Grotesk, sans-serif",
            }}
          >
            {tab}
            {tab === "SHOTLIST" && shotlistCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                style={{ background: "#19e66f", color: "#18181B" }}>
                {shotlistCount}
              </span>
            )}
          </button>
        ))}

        <div className="flex-1" />

        {/* DEV: Stress test button — Phase 4 performance testing */}
        {process.env.NODE_ENV === "development" && (
          <button
            onClick={() => {
              const { tramlines, shotlist } = generateStressData(500, 120);
              hydrate(tramlines, shotlist);
              console.info(`[StressTest] Loaded ${tramlines.length} tramlines across 120 pages`);
            }}
            className="px-2 py-1 rounded text-[10px] font-semibold mr-2"
            style={{
              background: "rgba(239,68,68,0.08)",
              color: "#dc2626",
              border: "1px solid rgba(239,68,68,0.15)",
              fontFamily: "Space Grotesk, sans-serif",
            }}
            title="DEV: Load 500 stress-test tramlines"
          >
            STRESS ×500
          </button>
        )}

        {activeTab === "LINE SCRIPT" && (
          <div className="flex items-center gap-2">
            {pdfTotalPages > 0 && (
              <span className="text-[11px] text-[#71717A]">{pdfTotalPages} trang</span>
            )}
            {extractedData.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded font-medium"
                style={{ background: "rgba(25,230,111,0.12)", color: "#16a34a" }}>
                {extractedData.reduce((s, d) => s + d.sceneHeaders.length, 0)} scene
              </span>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadState === "uploading"}
              title={uploadState === "error" && uploadError ? uploadError : undefined}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-semibold transition-opacity"
              style={{
                background: uploadState === "error"
                  ? "rgba(239,68,68,0.10)"
                  : uploadState === "uploading"
                    ? "rgba(25,230,111,0.10)"
                    : "rgba(24,24,27,0.06)",
                color: uploadState === "error"
                  ? "#dc2626"
                  : uploadState === "uploading"
                    ? "#16a34a"
                    : "#18181B",
                fontFamily: "Space Grotesk, sans-serif",
                opacity: uploadState === "uploading" ? 0.7 : 1,
                cursor: uploadState === "uploading" ? "not-allowed" : "pointer",
              }}
            >
              {uploadState === "uploading" ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className="animate-spin">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  Uploading...
                </>
              ) : uploadState === "error" ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  Retry Upload
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Upload Script
                </>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
          </div>
        )}
      </header>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden relative">

        {activeTab === "BREAKDOWN" && (
          <BreakdownView
            pdfSrc={pdfSrc}
            onTextExtracted={handleTextExtracted}
            onDocumentLoaded={setPdfTotalPages}
          />
        )}

        {activeTab === "LINE SCRIPT" && (
          /* touch-action: none — ngăn Safari/Chrome tự cuộn trang khi vuốt trên canvas.
             Mọi touch event được Fabric.js và custom handlers xử lý hoàn toàn. */
          <div className="relative h-full flex" style={{ touchAction: "none" }}>
            {/* Lining Toolbar (bên trái, nổi trên PDF) */}
            <LiningToolbar
              drawMode={drawMode}
              onDrawModeChange={setDrawMode}
              isPanMode={isPanMode}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onResetZoom={handleResetZoom}
              onTogglePanMode={togglePanMode}
            />

            {/* PDF + Fabric Canvas overlay */}
            <PdfRenderer
              src={pdfSrc}
              scale={1.5}
              onTextExtracted={handleTextExtracted}
              onDocumentLoaded={setPdfTotalPages}
              renderOverlay={renderOverlay}
              className="flex-1 h-full"
            />
          </div>
        )}

        {activeTab === "SHOTLIST" && (
          <ShotlistTable className="h-full" />
        )}
      </div>
    </main>
  );
}
