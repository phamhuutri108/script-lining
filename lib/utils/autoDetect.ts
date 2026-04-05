/**
 * autoDetect.ts — Auto Detect Engine (Phase 8 / Tính năng B §Bước 1)
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure utility module — không phụ thuộc React/Zustand, có thể unit-test độc lập.
 *
 * ## Nguồn gốc quy tắc (feature-idea.md §TÍNH NĂNG B):
 *   Format scene header kịch bản: "Scene#. INT/EXT (NỘI/NGOẠI). LOCATION - DAY/NIGHT"
 *   Ví dụ: "12A. INT. QUỐC LỘ 1D - SÁNG SỚM" hoặc "EXT. BÃI ĐỖ XE - ĐÊM"
 *
 * ## Quy Tắc Vàng (architecture-rules.md §2):
 *   CHỈ lấy text từ segment type === 'straight'.
 *   TUYỆT ĐỐI bỏ qua segment type === 'zigzag'.
 *
 * ## Cải tiến so với script-parser.ts v1:
 *   1. X-coordinate line-type classifier — dùng vị trí ngang (CSS px) của text
 *      để phân biệt Character Cue (center-indented) vs. Action vs. Dialogue.
 *   2. Regex mở rộng: thêm "SÁNG SỚM", "HOÀNG HÔN", "BÌNH MINH", "TRƯA",
 *      "CHIỀU TỐI", cặp I/E và E/I, và scene# dạng text (e.g. "Ba mươi").
 *   3. SUBJECTS: lọc thêm stop-words tiếng Việt, dedupe case-insensitive.
 *   4. DIALOGUE: xử lý "(CONT'D)", "(MORE)" và dialogue split qua nhiều trang.
 *   5. Public API rõ ràng: detectShotlistFields() là entry point duy nhất.
 *
 * ## Hệ tọa độ:
 *   TextLine.y / TextLine.yBottom  ← viewport CSS px (từ usePdfTextExtraction)
 *   ILineSegment.startY / endY     ← viewport CSS px (từ Fabric.js / Zustand)
 *   TextLine.blocks[].x            ← viewport CSS px (dùng để classify line type)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { ITramline, ILineSegment } from "@/lib/store/useScriptStore";
import type { TextLine } from "@/lib/hooks/usePdfTextExtraction";

// ─── Output Types ─────────────────────────────────────────────────────────────

/** Kết quả auto-detect trả về cho 1 tramline — merge vào IShotlistRow */
export interface AutoDetectResult {
  sceneNumber: string;
  intExt: "INT" | "EXT" | "";
  location: string;
  dayNight: "DAY" | "NIGHT" | "";
  description: string;
  autoDetectText: string;
  dialogue: string[];
  subjects: string[];
}

/** Partial update để merge thông minh (không ghi đè field user đã nhập thủ công) */
export type AutoDetectUpdate = Partial<AutoDetectResult>;

// ─── Internal Types ───────────────────────────────────────────────────────────

/**
 * Loại dòng trong kịch bản — phân loại dựa trên nội dung + vị trí X.
 *
 * X-coordinate heuristic (dựa trên Final Draft format ở scale=1.5, Letter page):
 *   Page width ≈ 918px
 *   Action / Scene Header : x < ACTION_X_THRESHOLD       (≈ 108–160px)
 *   Parenthetical         : x trong PARENTHETICAL_X_RANGE (≈ 180–280px)
 *   Character Cue         : x > CHARACTER_X_THRESHOLD    (≈ 260–380px)
 *   Dialogue              : x trong DIALOGUE_X_RANGE     (≈ 130–260px)
 *   Transition            : x > TRANSITION_X_THRESHOLD   (≈ 500px+)
 */
type LineType =
  | "scene_header"
  | "action"
  | "character_cue"
  | "parenthetical"
  | "dialogue"
  | "transition"
  | "page_number"
  | "unknown";

interface DialogueBlock {
  character: string;
  parenthetical: string;
  lines: string[];
}

// ─── X-coordinate thresholds (CSS px tại scale=1.5, A4/Letter) ───────────────

/** X tối thiểu để coi là Character Cue (center-indented) */
const CHAR_CUE_X_MIN = 215;

/** X tối đa để coi là Action / Scene Header text (left margin) */
const ACTION_X_MAX = 175;

/** X tối thiểu để coi là Transition (right-aligned) */
const TRANSITION_X_MIN = 500;

// ─── Regex Patterns ───────────────────────────────────────────────────────────

/**
 * SCENE_HEADER_RE
 *
 * Hỗ trợ format theo feature-idea.md:
 *   "Scene#. INT/EXT. LOCATION - DAY/NIGHT"
 *
 * Groups:
 *   [1] scene# từ prefix (CẢNH/SCENE/SC) — "12A" trong "CẢNH 12A:"
 *   [2] scene# từ số đầu dòng          — "12A" trong "12A. INT..."
 *   [3] INT/EXT variant
 *   [4] LOCATION
 *   [5] DAY/NIGHT variant
 *
 * Ví dụ match:
 *   "1. INT. VĂN PHÒNG - NGÀY"
 *   "12A. EXT. BÃI ĐỖ XE - ĐÊM"
 *   "EXT. ĐƯỜNG PHỐ - SÁNG SỚM"
 *   "CẢNH 3: NỘI. BẾP NHÀ - TRƯA"
 *   "INT/EXT. CỬA NHÀ - DAY"
 *   "3. I/E. SÂN BAY - CHIỀU TỐI"
 */
export const SCENE_HEADER_RE =
  /^(?:(?:CẢNH|SCENE|SC\.?)\s*([0-9]+[A-Z]?)[\s:.,]+)?(?:([0-9]+[A-Z]?)\s*[.\s]\s*)?(INT(?:(?:\.|\s*\/\s*)EXT)?|EXT(?:(?:\.|\s*\/\s*)INT)?|I\s*\/\s*E|E\s*\/\s*I|NỘI(?:\s*\/\s*NGOẠI)?|NGOẠI(?:\s*\/\s*NỘI)?)[.\s,]+([^-–—\n]+?)(?:\s*[-–—]\s*(.+?))?\.?\s*$/iu;

/**
 * DAY_NIGHT_RE — Normalize thời gian trong ngày sang DAY | NIGHT
 *
 * DAY  : NGÀY, DAY, SÁNG, SÁNG SỚM, SÁNG TỚI, TRƯA, CHIỀU, MORNING, AFTERNOON, NOON
 * NIGHT: ĐÊM, NIGHT, TỐI, CHIỀU TỐI, HOÀNG HÔN, BÌNH MINH, DUSK, DAWN, EVENING, KHUYA
 */
const DAY_RE   = /^(DAY|NGÀY|SÁNG\s*(SỚM|TỚI)?|TRƯA|CHIỀU$|MORNING|AFTERNOON|NOON|MIDDAY)/iu;
const NIGHT_RE = /^(NIGHT|ĐÊM|TỐI|CHIỀU\s*TỐI|HOÀNG\s*HÔN|BÌNH\s*MINH|DUSK|DAWN|EVENING|KHUYA)/iu;

/**
 * TRANSITION_RE — Dòng chuyển cảnh, bỏ qua hoàn toàn.
 * "FADE IN:", "CUT TO:", "SMASH CUT:", "MATCH CUT:", "TITLE CARD:"
 */
const TRANSITION_RE =
  /^(FADE\s+(IN|OUT|TO\s*BLACK|TO)|CUT\s+TO|SMASH\s+CUT|MATCH\s+CUT|TITLE\s+CARD|THE\s+END|IRIS\s+(IN|OUT)|TIME\s+CUT|JUMP\s+CUT)\s*:?\s*$/iu;

/**
 * PAGE_NUMBER_RE — Số trang hoặc header bảng (1-line "1." hoặc standalone số).
 */
const PAGE_NUMBER_RE = /^\d{1,4}\.?\s*$/;

/**
 * CONT_RE — Ký hiệu CONT'D/MORE trong thoại (bỏ qua, không phải character mới)
 */
const CONT_RE = /\(CONT'?D\)|\(MORE\)|\(TIẾP\)/iu;

/**
 * Từ ALL-CAPS cần loại khỏi SUBJECTS — technical keywords và stop-words tiếng Việt.
 *
 * Bao gồm:
 *   - Từ kỹ thuật của kịch bản (INT, EXT, V.O, ...)
 *   - Thời gian trong ngày tiếng Việt
 *   - Danh từ địa danh / không gian phổ biến trong kịch bản Việt
 *     (HÀNH LANG, VĂN PHÒNG, ... sẽ được filter qua multi-word check bên dưới)
 */
const EXCLUDED_CAPS = new Set([
  // Technical — screenplay structure
  "INT", "EXT", "I/E", "E/I",
  "V.O", "V.O.", "O.S", "O.S.", "O.C", "O.C.", "O/S",
  "CONT", "CONT'D", "MORE",
  "FADE", "CUT", "TO", "IN", "OUT",
  "THE", "END", "TITLE", "CARD", "SCENE", "SC",
  // Thời gian tiếng Việt
  "NGÀY", "ĐÊM", "SÁNG", "TỐI", "TRƯA", "CHIỀU", "KHUYA",
  "HOÀNG", "HÔN", "BÌNH",
  "NỘI", "NGOẠI", "CẢNH",
  // Stop-words tiếng Anh
  "A", "AN", "AND", "OR", "BUT", "NOT", "WITH", "FROM",
  "OF", "AT", "ON", "BY", "AS", "IS", "IT", "HE", "SHE",
  "NO", "MR", "MRS", "MS", "DR",
  // Danh từ địa điểm / không gian tiếng Việt thường viết hoa trong kịch bản
  "PHÒNG", "NHÀ", "CỬA", "HÀNH", "LANG", "TẦNG", "KHO",
  "SÂN", "ĐƯỜNG", "NGÕ", "THANG", "MÁI", "LOBBY",
  "CÔNG", "VIÊN", "VƯỜN", "CHỢ", "BẾP",
]);

/**
 * Multi-word location phrases cần loại khỏi SUBJECTS.
 * Dùng prefix-match (startsWith) để bắt các biến thể.
 */
const LOCATION_PHRASE_PREFIXES: string[] = [
  "HÀNH LANG", "VĂN PHÒNG", "PHÒNG BẾP", "PHÒNG KHÁCH", "PHÒNG NGỦ",
  "PHÒNG BỆNH", "PHÒNG HỌP", "CẦU THANG", "BÃI ĐỖ", "BÃI XE",
  "TẦNG ", "LOBBY ", "HÀNH LANG ",
];

// ─── Pure Helper Functions ────────────────────────────────────────────────────

/** Kiểm tra chuỗi có toàn chữ hoa không (Unicode-safe, bao gồm tiếng Việt có dấu) */
function isAllUpper(text: string): boolean {
  const letters = text.replace(/[^a-zA-ZÀ-ỹĐđ]/gu, "");
  return letters.length > 0 && letters === letters.toUpperCase();
}

/** Normalize INT/EXT variants → "INT" | "EXT" | "" */
function normalizeIntExt(raw: string): "INT" | "EXT" | "" {
  const u = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (/^(INT|NỘI|I\/E|I\/E)/.test(u)) return "INT";
  if (/^(EXT|NGOẠI|E\/I|E\/I)/.test(u)) return "EXT";
  return "";
}

/** Normalize thời gian trong ngày → "DAY" | "NIGHT" | "" */
function normalizeDayNight(raw: string): "DAY" | "NIGHT" | "" {
  const trimmed = raw.trim();
  if (DAY_RE.test(trimmed)) return "DAY";
  if (NIGHT_RE.test(trimmed)) return "NIGHT";
  return "";
}

/**
 * Lấy x-coordinate của phần lớn text trên một dòng.
 * Dùng median block.x để tránh outlier từ dấu câu đơn lẻ.
 */
function getLineX(line: TextLine): number {
  if (!line.blocks.length) return 0;
  const xs = line.blocks.map((b) => b.x).sort((a, b) => a - b);
  // Median
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 !== 0 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
}

// ─── Line Type Classifier ─────────────────────────────────────────────────────

/**
 * detectLineType
 *
 * Phân loại từng dòng text bằng 2 tín hiệu kết hợp:
 *   1. Nội dung text (regex patterns)
 *   2. Vị trí X (x-coordinate trong viewport CSS px)
 *
 * Ưu tiên: scene_header > transition > page_number > x-based classification
 */
function detectLineType(line: TextLine): LineType {
  const text = line.fullText.trim();
  if (!text) return "unknown";

  // ── 1. Page number (số đơn lẻ hoặc "1." ở đầu trang) ───────────────────
  if (PAGE_NUMBER_RE.test(text)) return "page_number";

  // ── 2. Transition ─────────────────────────────────────────────────────────
  if (TRANSITION_RE.test(text)) return "transition";

  // ── 3. Scene Header (text content wins) ───────────────────────────────────
  if (SCENE_HEADER_RE.test(text)) return "scene_header";

  // ── 4. Parenthetical ──────────────────────────────────────────────────────
  if (/^\s*\(.*\)\s*$/.test(text)) return "parenthetical";

  // ── 5. X-coordinate based classification ──────────────────────────────────
  const x = getLineX(line);

  // Transition (right-aligned)
  if (x >= TRANSITION_X_MIN) return "transition";

  // Character Cue (center-indented)
  if (x >= CHAR_CUE_X_MIN) {
    // Extra check: character cues are short ALL-CAPS (strip CONT'D suffixes)
    const stripped = text.replace(CONT_RE, "").trim();
    if (
      stripped.length >= 2 &&
      stripped.length <= 60 &&
      isAllUpper(stripped.replace(/[^a-zA-ZÀ-ỹĐđ\s]/gu, ""))
    ) {
      return "character_cue";
    }
    // If it's long or mixed case at high X → probably dialogue continues
    return "dialogue";
  }

  // Dialogue (indented from left margin but not as far as character cue)
  if (x > ACTION_X_MAX) return "dialogue";

  // Action / Scene header at left margin
  return "action";
}

// ─── Golden Rule: Filter to Straight Segments ────────────────────────────────

/**
 * filterStraightLines
 *
 * Quy Tắc Vàng (architecture-rules.md §2):
 * Chỉ giữ lại TextLine có trung điểm Y nằm trong một segment type === 'straight'.
 *
 * Dùng midpoint thay vì bounding box để tránh false positive khi dòng
 * vắt ngang ranh giới giữa 2 segment liền kề.
 */
export function filterStraightLines(
  segments: ILineSegment[],
  lines: TextLine[],
): TextLine[] {
  const straights = segments.filter((s) => s.type === "straight");
  if (!straights.length) return [];

  return lines.filter((line) => {
    const midY = (line.y + line.yBottom) / 2;
    return straights.some((seg) => midY >= seg.startY && midY <= seg.endY);
  });
}

// ─── Scene Header Parser ──────────────────────────────────────────────────────

export interface SceneHeaderFields {
  sceneNumber: string;
  intExt: "INT" | "EXT" | "";
  location: string;
  dayNight: "DAY" | "NIGHT" | "";
}

/**
 * parseSceneHeaderText
 *
 * Tách cấu trúc "Scene#. INT/EXT. LOCATION - DAY/NIGHT" từ 1 dòng text.
 * Trả về null nếu không match.
 *
 * @example
 * parseSceneHeaderText("12A. EXT. BÃI ĐỖ XE - ĐÊM")
 * // → { sceneNumber: "12A", intExt: "EXT", location: "BÃI ĐỖ XE", dayNight: "NIGHT" }
 *
 * parseSceneHeaderText("INT. VĂN PHÒNG - NGÀY")
 * // → { sceneNumber: "", intExt: "INT", location: "VĂN PHÒNG", dayNight: "DAY" }
 */
export function parseSceneHeaderText(text: string): SceneHeaderFields | null {
  const match = SCENE_HEADER_RE.exec(text.trim());
  if (!match) return null;

  const [, prefixScene, numScene, intExtRaw, locationRaw, dayNightRaw] = match;

  return {
    sceneNumber:  ((prefixScene ?? numScene) ?? "").trim().toUpperCase(),
    intExt:       normalizeIntExt(intExtRaw ?? ""),
    location:     (locationRaw ?? "").trim().replace(/\s+/g, " "),
    dayNight:     normalizeDayNight(dayNightRaw ?? ""),
  };
}

// ─── Subject Extractor ────────────────────────────────────────────────────────

/**
 * extractSubjectsFromText
 *
 * Tìm tên nhân vật / đối tượng ALL-CAPS trong đoạn action text.
 *
 * Chiến lược:
 *   1. Token hóa text
 *   2. Gom 1–3 token ALL-CAPS liên tiếp thành 1 subject (tên ghép "ANH TUẤN")
 *   3. Lọc bỏ stop-words trong EXCLUDED_CAPS
 *   4. Dedupe case-insensitive
 *
 * @example
 * extractSubjectsFromText("MINH bước vào, nhìn ANH TUẤN đang ngồi.")
 * // → ["ANH TUẤN", "MINH"]
 */
export function extractSubjectsFromText(text: string): string[] {
  // Bỏ qua dòng scene header — tránh extract location làm subject
  if (SCENE_HEADER_RE.test(text.trim())) return [];

  const found = new Map<string, string>(); // normalized → original
  const tokens = text.split(/\s+/);
  let i = 0;

  while (i < tokens.length) {
    // Lấy phần text thuần chữ cái (bỏ dấu câu bao quanh)
    const raw = tokens[i].replace(/^[^a-zA-ZÀ-ỹĐđ]+|[^a-zA-ZÀ-ỹĐđ]+$/gu, "");

    if (raw.length >= 2 && isAllUpper(raw) && !EXCLUDED_CAPS.has(raw)) {
      // Thử ghép thêm 1-2 token tiếp theo (tên ghép: "ANH TUẤN", "BÁC SĨ VĂN")
      let compound = raw;
      let j = i + 1;

      while (j < i + 3 && j < tokens.length) {
        const nextRaw = tokens[j].replace(/^[^a-zA-ZÀ-ỹĐđ]+|[^a-zA-ZÀ-ỹĐđ]+$/gu, "");
        if (nextRaw.length >= 1 && isAllUpper(nextRaw) && !EXCLUDED_CAPS.has(nextRaw)) {
          compound += " " + nextRaw;
          j++;
        } else {
          break;
        }
      }

      const compoundUpper = compound.toUpperCase();

      // ── Filter 1: Chính xác location phrase ─────────────────────────────
      const isExactLocation = LOCATION_PHRASE_PREFIXES.some(
        (prefix) => compoundUpper.startsWith(prefix),
      );

      // ── Filter 2: Look-ahead — partial location phrase ───────────────────
      // Ví dụ: compound="VĂN" nhưng token tiếp theo là "PHÒNG" → "VĂN PHÒNG" là location
      let isPartialLocation = false;
      if (!isExactLocation && j < tokens.length) {
        const nextToken = tokens[j].replace(/^[^a-zA-ZÀ-ỹĐđ]+|[^a-zA-ZÀ-ỹĐđ]+$/gu, "");
        const withNext = (compoundUpper + " " + nextToken.toUpperCase()).trim();
        isPartialLocation = LOCATION_PHRASE_PREFIXES.some(
          (prefix) => withNext.startsWith(prefix),
        );
        // Nếu là partial location → skip cả nextToken
        if (isPartialLocation) j++;
      }

      // ── Filter 3: Orphan excluded word ───────────────────────────────────
      // Ví dụ: "PHÒNG HỌP" → PHÒNG bị excluded → HỌP một mình compound
      // Kiểm tra token trước xem có phải excluded không
      const prevToken =
        i > 0
          ? tokens[i - 1].replace(/^[^a-zA-ZÀ-ỹĐđ]+|[^a-zA-ZÀ-ỹĐđ]+$/gu, "")
          : "";
      const isOrphanAfterExcluded =
        prevToken.length > 0 &&
        EXCLUDED_CAPS.has(prevToken.toUpperCase()) &&
        LOCATION_PHRASE_PREFIXES.some((prefix) =>
          (prevToken.toUpperCase() + " " + compoundUpper).startsWith(prefix),
        );

      if (!isExactLocation && !isPartialLocation && !isOrphanAfterExcluded) {
        if (!found.has(compoundUpper)) found.set(compoundUpper, compound);
      }

      i = j;
    } else {
      i++;
    }
  }

  return [...found.values()].sort();
}

// ─── Screenplay State Machine ─────────────────────────────────────────────────

type ParserState = "action" | "character_cue" | "parenthetical" | "dialogue";

interface ParsedContent {
  sceneNumber:    string;
  intExt:         "INT" | "EXT" | "";
  location:       string;
  dayNight:       "DAY" | "NIGHT" | "";
  description:    string;
  dialogue:       string[];
  subjects:       string[];
}

/**
 * parseScreenplayContent
 *
 * State machine đọc từng dòng (đã sort theo Y = reading order).
 *
 * Sử dụng detectLineType() để phân loại mỗi dòng, kết hợp:
 *   - Nội dung text (regex)
 *   - Vị trí X (x-coordinate)
 *
 * Trạng thái:
 *   action       → đang đọc action text / scene header
 *   character_cue → vừa gặp tên nhân vật (center-indented ALL-CAPS)
 *   parenthetical → vừa gặp "(thì thầm)"
 *   dialogue     → đang đọc thoại sau character cue
 */
function parseScreenplayContent(lines: TextLine[]): ParsedContent {
  // Đảm bảo đúng thứ tự đọc (Y tăng = xuống trang)
  const sorted = [...lines].sort((a, b) => a.y - b.y);

  let sceneNumber = "";
  let intExt: "INT" | "EXT" | "" = "";
  let location = "";
  let dayNight: "DAY" | "NIGHT" | "" = "";

  const actionLines:  string[] = [];
  const allSubjects = new Set<string>();
  const dialogueBlocks: DialogueBlock[] = [];

  let state: ParserState = "action";
  let currentBlock: DialogueBlock | null = null;

  for (const line of sorted) {
    const text = line.fullText.trim();
    if (!text) continue;

    const lineType = detectLineType(line);

    // ── SKIP: trang số và transition ────────────────────────────────────────
    if (lineType === "page_number" || lineType === "transition") continue;

    // ── Scene Header ─────────────────────────────────────────────────────────
    if (lineType === "scene_header") {
      const parsed = parseSceneHeaderText(text);
      if (parsed) {
        // Lấy giá trị đầu tiên tìm được, không ghi đè
        if (!sceneNumber && parsed.sceneNumber) sceneNumber = parsed.sceneNumber;
        if (!intExt && parsed.intExt)           intExt     = parsed.intExt;
        if (!location && parsed.location)       location   = parsed.location;
        if (!dayNight && parsed.dayNight)       dayNight   = parsed.dayNight;
      }
      // Reset state khi gặp scene mới
      flushBlock(currentBlock, dialogueBlocks);
      currentBlock = null;
      state = "action";
      continue;
    }

    // ── Parenthetical ─────────────────────────────────────────────────────────
    if (lineType === "parenthetical") {
      if (currentBlock && (state === "character_cue" || state === "dialogue")) {
        currentBlock.parenthetical = text.replace(/[()]/g, "").trim();
        state = "parenthetical";
      } else {
        // Parenthetical ngoài context dialogue → action
        actionLines.push(text);
      }
      continue;
    }

    // ── Character Cue ─────────────────────────────────────────────────────────
    if (lineType === "character_cue") {
      flushBlock(currentBlock, dialogueBlocks);
      const charName = text.replace(CONT_RE, "").trim();
      currentBlock = { character: charName, parenthetical: "", lines: [] };
      allSubjects.add(charName);
      state = "character_cue";
      continue;
    }

    // ── Dialogue Text ─────────────────────────────────────────────────────────
    if (lineType === "dialogue") {
      if (currentBlock && (state === "character_cue" || state === "parenthetical" || state === "dialogue")) {
        currentBlock.lines.push(text);
        state = "dialogue";
        continue;
      }
      // Không có currentBlock → coi như action
    }

    // ── Action Text (default) ──────────────────────────────────────────────────
    // Nếu đang ở dialogue mode và gặp action line → flush block
    if (state === "dialogue" && currentBlock) {
      flushBlock(currentBlock, dialogueBlocks);
      currentBlock = null;
      state = "action";
    }

    state = "action";
    actionLines.push(text);

    // Extract subjects từ action
    extractSubjectsFromText(text).forEach((s) => allSubjects.add(s));
  }

  // Flush block cuối cùng
  flushBlock(currentBlock, dialogueBlocks);

  // ── Serialize ────────────────────────────────────────────────────────────────

  const dialogue = dialogueBlocks.map((block) => {
    const nameWithParens = block.parenthetical
      ? `${block.character} (${block.parenthetical})`
      : block.character;
    return `${nameWithParens}: ${block.lines.join(" ").replace(/\s+/g, " ").trim()}`;
  });

  // Description: gom action lines ≥ 3 từ (bỏ dòng quá ngắn như stage directions ngắn)
  const description = actionLines
    .filter((l) => l.split(/\s+/).length >= 3)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  const subjects = [...allSubjects]
    .filter((s) => s.length >= 2 && !EXCLUDED_CAPS.has(s.toUpperCase()))
    .sort();

  return { sceneNumber, intExt, location, dayNight, description, dialogue, subjects };
}

function flushBlock(
  block: DialogueBlock | null,
  target: DialogueBlock[],
): void {
  if (block && block.lines.length > 0) {
    target.push(block);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * detectShotlistFields
 *
 * Entry point chính — kết hợp Golden Rule filter + screenplay state machine.
 *
 * @param tramline   ITramline từ Zustand store (cần .segments để filter)
 * @param pageLines  TextLine[] từ usePdfTextExtraction cho CÙNG TRANG với tramline
 * @returns          AutoDetectResult để merge vào IShotlistRow
 *
 * @example
 * ```ts
 * const result = detectShotlistFields(tramline, pdfTextLines);
 * store.updateShotlistRow(tramline.id, result);
 * ```
 */
export function detectShotlistFields(
  tramline: ITramline,
  pageLines: TextLine[],
): AutoDetectResult {
  // Bước 1: Quy Tắc Vàng — chỉ lấy text từ segments straight
  const straightLines = filterStraightLines(tramline.segments, pageLines);

  if (!straightLines.length) {
    return {
      sceneNumber: "", intExt: "", location: "", dayNight: "",
      description: "", autoDetectText: "", dialogue: [], subjects: [],
    };
  }

  // Bước 2: Gom raw text (reading order)
  const sortedLines = [...straightLines].sort((a, b) => a.y - b.y);
  const autoDetectText = sortedLines
    .map((l) => l.fullText.trim())
    .filter(Boolean)
    .join("\n");

  // Bước 3: Chạy screenplay state machine
  const content = parseScreenplayContent(sortedLines);

  return { ...content, autoDetectText };
}

/**
 * mergeAutoDetectFields
 *
 * Merge AutoDetectResult vào IShotlistRow hiện tại theo nguyên tắc:
 *   - `autoDetectText` và `subjects` : LUÔN overwrite (raw source of truth)
 *   - Các field còn lại              : CHỈ fill nếu giá trị hiện tại đang trống
 *
 * Điều này đảm bảo user không mất dữ liệu đã nhập thủ công.
 *
 * @param current  Giá trị hiện tại của IShotlistRow (các field liên quan)
 * @param detected Kết quả từ detectShotlistFields()
 * @returns        Partial<IShotlistRow> — chỉ chứa các field cần update
 */
export function mergeAutoDetectFields(
  current: AutoDetectResult,
  detected: AutoDetectResult,
): AutoDetectUpdate {
  const update: AutoDetectUpdate = {};

  // Luôn cập nhật (source of truth)
  update.autoDetectText = detected.autoDetectText;
  update.subjects = dedupeSubjects(current.subjects, detected.subjects);

  // Chỉ fill nếu đang trống
  if (!current.sceneNumber && detected.sceneNumber)   update.sceneNumber = detected.sceneNumber;
  if (!current.intExt && detected.intExt)             update.intExt      = detected.intExt;
  if (!current.location && detected.location)         update.location    = detected.location;
  if (!current.dayNight && detected.dayNight)         update.dayNight    = detected.dayNight;
  if (!current.description && detected.description)   update.description = detected.description;

  // Dialogue: merge nếu detected có thêm nội dung mới
  if (!current.dialogue.length && detected.dialogue.length) {
    update.dialogue = detected.dialogue;
  } else if (detected.dialogue.length > current.dialogue.length) {
    // Detected nhiều hơn → có thể segment mở rộng → overwrite
    update.dialogue = detected.dialogue;
  }

  return update;
}

/** Merge 2 mảng subjects, dedupe case-insensitive, sort */
function dedupeSubjects(existing: string[], detected: string[]): string[] {
  const map = new Map<string, string>();
  for (const s of [...existing, ...detected]) {
    const key = s.toUpperCase();
    if (!map.has(key)) map.set(key, s);
  }
  return [...map.values()].sort();
}

// ─── Backward-compatible wrappers (tương thích với script-parser.ts consumers) ─

/**
 * @deprecated Dùng detectShotlistFields() trực tiếp.
 * Giữ lại để tránh break import nếu có code ngoài store đang dùng.
 */
export function parseTramlineToShotlistData(
  tramline: ITramline,
  allLines: TextLine[],
): AutoDetectResult {
  return detectShotlistFields(tramline, allLines);
}

/**
 * @deprecated Dùng mergeAutoDetectFields() trực tiếp.
 */
export function buildAutoUpdateFields(
  current: AutoDetectResult,
  parsed: AutoDetectResult,
): AutoDetectUpdate {
  return mergeAutoDetectFields(current, parsed);
}

/**
 * @deprecated Dùng filterStraightLines() trực tiếp.
 */
export function filterLinesToStraightSegments(
  segments: ILineSegment[],
  lines: TextLine[],
): TextLine[] {
  return filterStraightLines(segments, lines);
}

/**
 * reParseTramline — re-chạy parser sau khi split/merge segment
 */
export function reParseTramline(
  tramline: ITramline,
  allLines: TextLine[],
): AutoDetectResult {
  return detectShotlistFields(tramline, allLines);
}
