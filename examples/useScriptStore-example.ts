import { create } from 'zustand';
import { ITramline, IShotlistRow } from '../types/script-lining';

interface ScriptState {
  tramlines: ITramline[];
  shotlist: IShotlistRow[];
  addTramline: (line: ITramline) => void;
  updateTramline: (id: string, updates: Partial<ITramline>) => void;
  updateShotlistRow: (tramlineId: string, updates: Partial<IShotlistRow>) => void;
}

export const useScriptStore = create<ScriptState>((set) => ({
  tramlines: [],
  shotlist: [],
  addTramline: (line) => set((state) => ({ tramlines: [...state.tramlines, line] })),
  updateTramline: (id, updates) =>
    set((state) => ({
      tramlines: state.tramlines.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
  updateShotlistRow: (tramlineId, updates) =>
    set((state) => ({
      shotlist: state.shotlist.map((s) => (s.tramlineId === tramlineId ? { ...s, ...updates } : s)),
    })),
}));