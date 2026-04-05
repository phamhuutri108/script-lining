/**
 * stress-test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Stress test utility — Phase 4 Performance Testing.
 *
 * Tạo dữ liệu giả lập để kiểm tra khả năng chịu tải của:
 *   1. Zustand store (500 tramlines, 500 shotlist rows)
 *   2. FabricTramlineCanvas (render nhiều tramlines trên cùng 1 trang)
 *   3. Virtual scroll (phân bố đều trên 120 trang)
 *   4. Auto-detect parser (re-parse tất cả khi setPdfTextForPage được gọi)
 *
 * ## Cách dùng (DEV ONLY):
 * ```tsx
 * import { generateStressTramlines, generateStressShotlist } from '@/lib/utils/stress-test';
 *
 * const tramlines = generateStressTramlines(500, 120);
 * const shotlist  = generateStressShotlist(tramlines);
 * store.hydrate(tramlines, shotlist);
 * ```
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { ITramline, ILineSegment, IShotlistRow } from "@/lib/store/useScriptStore";

// ─── Constants ────────────────────────────────────────────────────────────────

const SHOT_SIZES  = ["WIDE", "MCU", "CU", "OTS", "ECU", "INSERT", "AERIAL", "CRANE"] as const;
const SHOT_TYPES  = ["Observe", "Single", "Two", "Three", "Group", "OTS", "POV", "Insert", "B-roll"] as const;
const MOVEMENTS   = ["Static", "Pan", "Tilt", "Dolly In", "Dolly Out", "Handheld", "Steadicam", "Crane", "Zoom"] as const;
const ANGLES      = ["Eye Level", "Low Angle", "High Angle", "Dutch", "Bird's Eye", "Worm's Eye"] as const;
const LENSES      = ["24mm", "35mm", "50mm", "85mm", "135mm", ""] as const;

const TRAMLINE_COLORS = [
  "#19e66f", "#f59e0b", "#3b82f6", "#ec4899",
  "#8b5cf6", "#ef4444", "#14b8a6", "#f97316",
];

const LOCATIONS = [
  "VĂN PHÒNG - TẦNG 12",
  "BÃI ĐỖ XE - B2",
  "HÀNH LANG - TẦNG 3",
  "PHÒNG HỌP - 501",
  "LOBBY - TẦNG 1",
  "MÁI NHÀ",
  "ĐƯỜNG PHỐ TRUNG TÂM",
  "CÔNG VIÊN",
  "NHÀ KHO",
  "PHÒNG SERVER",
];

const SUBJECTS = [
  "MINH", "ANH TUẤN", "LINH", "PHONG", "HƯƠNG",
  "GIÁM ĐỐC", "BẢO VỆ", "LỄ TÂN", "KỸ THUẬT VIÊN",
];

const DESCRIPTIONS = [
  "Nhân vật bước vào căn phòng, nhìn quanh cảnh giác.",
  "Cận cảnh bàn tay run rẩy cầm tờ giấy.",
  "Toàn cảnh không gian trống vắng lúc bình minh.",
  "Over-the-shoulder nhìn màn hình máy tính.",
  "Nhân vật dừng lại, lắng nghe tiếng động lạ.",
  "Insert cận cảnh dây điện thoại bị cắt đứt.",
  "Wide shot văn phòng — tất cả nhân viên nhìn về phía cửa.",
  "Phản ứng của nhân vật khi nghe tin xấu.",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Pseudo-random number based on a seed (deterministic, no Math.random dependency) */
function seededRand(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function pickIndex<T>(arr: readonly T[], seed: number): T {
  return arr[Math.floor(seededRand(seed) * arr.length)];
}

/**
 * Tạo mảng ILineSegment cho một tramline.
 * Mỗi tramline có 1–3 segment, xen kẽ straight/zigzag, bắt đầu bằng straight.
 */
function buildSegments(
  startY: number,
  endY: number,
  numSegments: number,
  seed: number,
): ILineSegment[] {
  if (numSegments === 1) {
    return [{ type: "straight", startY, endY }];
  }

  const totalHeight = endY - startY;
  // Split points: divide evenly with slight jitter
  const splitPoints: number[] = [];
  for (let i = 1; i < numSegments; i++) {
    const base = startY + (totalHeight * i) / numSegments;
    const jitter = (seededRand(seed + i * 37) - 0.5) * (totalHeight * 0.1);
    splitPoints.push(base + jitter);
  }
  splitPoints.sort((a, b) => a - b);

  const boundaries = [startY, ...splitPoints, endY];
  return boundaries.slice(0, -1).map((y, idx): ILineSegment => ({
    type: idx % 2 === 0 ? "straight" : "zigzag",
    startY: y,
    endY: boundaries[idx + 1],
  }));
}

// ─── Main Generators ──────────────────────────────────────────────────────────

/**
 * Tạo N ITramline ngẫu nhiên nhưng deterministic, rải đều trên `totalPages` trang.
 *
 * @param count       - Số tramlines cần tạo (default 500)
 * @param totalPages  - Số trang PDF giả lập (default 120)
 * @param pageHeight  - Chiều cao mỗi trang theo CSS px tại scale 1.5 (default 1188)
 */
export function generateStressTramlines(
  count = 500,
  totalPages = 120,
  pageHeight = 1188,
): ITramline[] {
  const tramlines: ITramline[] = [];
  const pagesPerTramline = totalPages / count;

  for (let i = 0; i < count; i++) {
    // Phân bố đều: mỗi page sẽ có khoảng count/totalPages tramlines
    const pageNumber = 1 + (i % totalPages);

    // Chiều cao mỗi tramline: 80–400px
    const startYRatio = seededRand(i * 7 + 1);
    const heightRatio = 0.07 + seededRand(i * 13 + 2) * 0.33;
    const startY = Math.round(startYRatio * (pageHeight - 400));
    const endY = Math.round(startY + 80 + heightRatio * pageHeight);
    const clampedEndY = Math.min(endY, pageHeight - 20);

    // X position: 80–300px từ trái (nơi user thường vẽ tramline)
    const x = Math.round(80 + seededRand(i * 19 + 3) * 220);

    // Số segments: 1, 2, hoặc 3 (phân bố 50% / 30% / 20%)
    const segRand = seededRand(i * 23 + 4);
    const numSegments = segRand < 0.5 ? 1 : segRand < 0.8 ? 2 : 3;

    const shotLetter = String.fromCharCode(65 + (i % 26)); // A-Z
    const shotNum = Math.floor(i / 26) + 1;

    tramlines.push({
      id: `stress-${i.toString().padStart(4, "0")}`,
      pageNumber,
      x,
      startY,
      endY: clampedEndY,
      shotName: `${shotNum}${shotLetter}`,
      shotSize: pickIndex(SHOT_SIZES, i * 31 + 5),
      color: TRAMLINE_COLORS[i % TRAMLINE_COLORS.length],
      segments: buildSegments(startY, clampedEndY, numSegments, i * 41 + 6),
    });
  }

  // Sort by pageNumber → startY để rowNumber tương ứng thứ tự đọc
  tramlines.sort((a, b) =>
    a.pageNumber !== b.pageNumber
      ? a.pageNumber - b.pageNumber
      : a.startY - b.startY,
  );

  return tramlines;
}

/**
 * Tạo IShotlistRow tương ứng cho mỗi ITramline.
 * Dữ liệu là mock nhưng có cấu trúc hợp lệ để test render shotlist table.
 */
export function generateStressShotlist(tramlines: ITramline[]): IShotlistRow[] {
  return tramlines.map((tram, idx): IShotlistRow => {
    const seed = idx * 53 + 7;
    const intExt: "INT" | "EXT" = seededRand(seed) > 0.5 ? "INT" : "EXT";
    const dayNight: "DAY" | "NIGHT" = seededRand(seed + 1) > 0.6 ? "DAY" : "NIGHT";
    const location = pickIndex(LOCATIONS, seed + 2);

    // Tạo 0–2 dòng dialogue
    const dialogueCount = Math.floor(seededRand(seed + 3) * 3);
    const dialogue: string[] = [];
    for (let d = 0; d < dialogueCount; d++) {
      const speaker = pickIndex(SUBJECTS, seed + d * 7);
      dialogue.push(`${speaker}: (stress test dialogue line ${d + 1})`);
    }

    // Lấy 1–2 subjects
    const subjectCount = 1 + Math.floor(seededRand(seed + 10) * 2);
    const subjects: string[] = [];
    for (let s = 0; s < subjectCount; s++) {
      const sub = pickIndex(SUBJECTS, seed + s * 11);
      if (!subjects.includes(sub)) subjects.push(sub);
    }

    return {
      tramlineId: tram.id,
      rowNumber: idx + 1,
      sceneNumber: `SC-${tram.pageNumber.toString().padStart(2, "0")}`,
      location,
      shotName: tram.shotName,
      intExt,
      dayNight,
      description: pickIndex(DESCRIPTIONS, seed + 4),
      autoDetectText: `${intExt}. ${location} - ${dayNight}\n${pickIndex(SUBJECTS, seed + 5)} bước vào.`,
      dialogue,
      subjects,
      scriptTime: `${1 + Math.floor(seededRand(seed + 6) * 4)}/8`,
      shotSize: tram.shotSize,
      shotType: pickIndex(SHOT_TYPES, seed + 12),
      side: seededRand(seed + 13) > 0.6 ? "L" : seededRand(seed + 14) > 0.5 ? "R" : "",
      angle: pickIndex(ANGLES, seed + 15),
      movement: pickIndex(MOVEMENTS, seed + 16),
      lens: pickIndex(LENSES, seed + 17),
      note: "",
    };
  });
}

/**
 * Convenience: tạo cả tramlines lẫn shotlist trong 1 call.
 *
 * @returns { tramlines, shotlist } — sẵn sàng feed vào store.hydrate()
 */
export function generateStressData(
  count = 500,
  totalPages = 120,
): { tramlines: ITramline[]; shotlist: IShotlistRow[] } {
  const tramlines = generateStressTramlines(count, totalPages);
  const shotlist = generateStressShotlist(tramlines);
  return { tramlines, shotlist };
}
