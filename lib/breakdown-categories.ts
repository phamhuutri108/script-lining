/**
 * Industry-standard breakdown categories cho film production.
 * Màu sắc theo yêu cầu Phase 6 + tham chiếu ui-reference-spec.md §1.3
 */

export interface BreakdownCategory {
  id: string;
  name: string;
  color: string;           // hex màu chữ/viền
  bgHighlight: string;     // rgba nền highlight trên PDF text
}

export const BREAKDOWN_CATEGORIES: BreakdownCategory[] = [
  { id: "cast",        name: "Cast",        color: "#FF0000", bgHighlight: "rgba(255,0,0,0.22)"      },
  { id: "stunts",      name: "Stunts",      color: "#FF8C00", bgHighlight: "rgba(255,140,0,0.22)"    },
  { id: "extras_atm",  name: "Extras-Atm",  color: "#228B22", bgHighlight: "rgba(34,139,34,0.22)"   },
  { id: "extras_sil",  name: "Extras-Sil",  color: "#FFD700", bgHighlight: "rgba(255,215,0,0.25)"   },
  { id: "sfx",         name: "SFX",         color: "#0066CC", bgHighlight: "rgba(0,102,204,0.20)"   },
  { id: "props",       name: "Props",       color: "#8B00FF", bgHighlight: "rgba(139,0,255,0.18)"   },
  { id: "vehicle",     name: "Vehicle",     color: "#FF69B4", bgHighlight: "rgba(255,105,180,0.22)" },
  { id: "wardrobe",    name: "Wardrobe",    color: "#00BFFF", bgHighlight: "rgba(0,191,255,0.20)"   },
  { id: "makeup",      name: "Makeup",      color: "#FF6600", bgHighlight: "rgba(255,102,0,0.20)"   },
  { id: "sound",       name: "Sound",       color: "#8B4513", bgHighlight: "rgba(139,69,19,0.20)"   },
  { id: "equip",       name: "Equip",       color: "#C8950A", bgHighlight: "rgba(200,149,10,0.22)"  },
  { id: "notes",       name: "Notes",       color: "#555555", bgHighlight: "rgba(85,85,85,0.18)"    },
] as const;

export function getCategoryById(id: string): BreakdownCategory | undefined {
  return BREAKDOWN_CATEGORIES.find((c) => c.id === id);
}
