import { create } from "zustand";

type ChamberState = {
  progress: number;
  introDone: boolean;
  objectRevealed: boolean;
  gatherT: number;
  whisper: string | null;
  pointer: { x: number; y: number };
  velocity: { x: number; y: number };
  hoveringBox: boolean;
  pulse: number;
  setProgress: (progress: number) => void;
  setIntroDone: () => void;
  setObjectRevealed: () => void;
  setGatherT: (gatherT: number) => void;
  setWhisper: (whisper: string | null) => void;
  setPointer: (x: number, y: number) => void;
  setHoveringBox: (hoveringBox: boolean) => void;
  nudgePulse: () => void;
};

export const useChamberStore = create<ChamberState>((set) => ({
  progress: 0,
  introDone: false,
  objectRevealed: false,
  gatherT: 0,
  whisper: null,
  pointer: { x: 0, y: 0 },
  velocity: { x: 0, y: 0 },
  hoveringBox: false,
  pulse: 0,
  setProgress: (progress) => set({ progress }),
  setIntroDone: () => set({ introDone: true, objectRevealed: true, gatherT: 1 }),
  setObjectRevealed: () => set({ objectRevealed: true }),
  setGatherT: (gatherT) => set({ gatherT }),
  setWhisper: (whisper) => set({ whisper }),
  setPointer: (x, y) =>
    set((state) => ({
      pointer: { x, y },
      velocity: { x: x - state.pointer.x, y: y - state.pointer.y },
    })),
  setHoveringBox: (hoveringBox) => set({ hoveringBox }),
  nudgePulse: () => set((state) => ({ pulse: state.pulse + 1 })),
}));
