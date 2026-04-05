/**
 * script-parser.ts — Re-export layer (Phase 8 migration)
 * ─────────────────────────────────────────────────────────────────────────────
 * Logic đã được migrate sang lib/utils/autoDetect.ts.
 * File này giữ lại để tránh break import từ các consumer cũ.
 *
 * @deprecated Import trực tiếp từ '@/lib/utils/autoDetect' cho code mới.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type { AutoDetectResult as ParsedShotlistData } from '@/lib/utils/autoDetect';

export {
  detectShotlistFields      as parseTramlineToShotlistData,
  reParseTramline,
  mergeAutoDetectFields     as buildAutoUpdateFields,
  filterStraightLines       as filterLinesToStraightSegments,
} from '@/lib/utils/autoDetect';
