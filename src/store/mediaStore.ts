import { create } from "zustand";

export interface MediaState {
  ready: boolean;
  isMobile: boolean;
  reducedMotion: boolean;
  setFlags: (flags: Partial<Omit<MediaState, "setFlags">>) => void;
}

export const useMediaStore = create<MediaState>((set) => ({
  ready: false,
  isMobile: false,
  reducedMotion: false,
  setFlags: (flags) => set(flags),
}));
