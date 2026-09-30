export type ProductTheme = {
  paper: string;
  stroke: string;
  pieces: readonly [string, string, string, string, string];
};

const BRAND: ProductTheme = {
  paper: "#efe8dc",
  stroke: "rgba(23,20,17,0.16)",
  pieces: ["#f5c400", "#e31b23", "#1d4ed8", "#9b2242", "#fffaf3"],
};

export const PRODUCT_THEMES: Record<string, ProductTheme> = {
  "po-drop": {
    paper: "#efe8dc",
    stroke: "rgba(23,20,17,0.14)",
    pieces: ["#171411", "#e31b23", "#fffaf3", "#c41e3a", "#d8d0c4"],
  },
  "po-10": {
    paper: "#f3ead4",
    stroke: "rgba(80,40,20,0.32)",
    pieces: ["#c7392b", "#f4f0e6", "#3d6b3a", "#e8c547", "#3a6ea5"],
  },
  "po-11": {
    paper: "#f4eee6",
    stroke: "rgba(20,16,12,0.2)",
    pieces: ["#c45c4a", "#e8b7c4", "#1a1a1a", "#d9cbb8", "#6b7a5a"],
  },
  "po-12": {
    paper: "#f6e8ee",
    stroke: "rgba(80,20,36,0.18)",
    pieces: ["#7a1f32", "#d45d7a", "#f2b3c4", "#3d4f32", "#c4a574"],
  },
  "po-13": {
    paper: "#efe8dc",
    stroke: "rgba(23,20,17,0.12)",
    pieces: ["#1d4ed8", "#f5c400", "#e31b23", "#f8f8f8", "#111111"],
  },
  "po-20": {
    paper: "#e8eef8",
    stroke: "rgba(24,48,96,0.16)",
    pieces: ["#1d4ed8", "#0b1f4a", "#f8f8f8", "#e31b23", "#7aa2d4"],
  },
  "po-14": {
    paper: "#f6e6d8",
    stroke: "rgba(90,20,12,0.18)",
    pieces: ["#c41e3a", "#e87722", "#d4a017", "#1a6b6b", "#f4e1c1"],
  },
  "po-15": {
    paper: "#f8ece8",
    stroke: "rgba(90,20,20,0.18)",
    pieces: ["#c12222", "#f2a0a0", "#3d6b3a", "#fff6f0", "#7a2e2e"],
  },
  "po-16": {
    paper: "#efe8dc",
    stroke: "rgba(23,20,17,0.14)",
    pieces: ["#9b2242", "#e8c4c8", "#171411", "#fffaf3", "#c41e3a"],
  },
  "po-17": {
    paper: "#f3eee4",
    stroke: "rgba(40,50,40,0.16)",
    pieces: ["#c45c78", "#3d6b4a", "#6b8fb8", "#e8d5a3", "#fffaf3"],
  },
  "po-18": {
    paper: "#f4f0ea",
    stroke: "rgba(80,16,16,0.16)",
    pieces: ["#c41e3a", "#171411", "#fffaf3", "#e31b23", "#d8d0c4"],
  },
  "po-19": {
    paper: "#efe8d4",
    stroke: "rgba(60,50,20,0.16)",
    pieces: ["#c9a227", "#5c6b32", "#d4b84a", "#fffaf3", "#3d4a24"],
  },
  "po-01": {
    paper: "#efe8dc",
    stroke: "rgba(20,20,20,0.16)",
    pieces: ["#c8102e", "#111111", "#c0c0c0", "#ffffff", "#6b6b6b"],
  },
  "po-02": {
    paper: "#eef2f8",
    stroke: "rgba(40,50,80,0.16)",
    pieces: ["#7aa2d4", "#f5d76e", "#c9b8e8", "#fffaf3", "#4a5a78"],
  },
  "po-03": {
    paper: "#ece8dc",
    stroke: "rgba(20,16,12,0.18)",
    pieces: ["#171411", "#c9a227", "#5c5346", "#fffaf3", "#8a1f1f"],
  },
  "po-04": {
    paper: "#f4efe4",
    stroke: "rgba(60,40,16,0.16)",
    pieces: ["#d4a017", "#6b8f71", "#e8d5a3", "#fffaf3", "#5c4a32"],
  },
  "po-05": {
    paper: "#efe8dc",
    stroke: "rgba(23,20,17,0.12)",
    pieces: ["#1a3a6b", "#d4b84a", "#243018", "#8aa4d4", "#0d1118"],
  },
  "po-06": {
    paper: "#efe8dc",
    stroke: "rgba(23,20,17,0.16)",
    pieces: ["#e31b23", "#f5c400", "#f8f8f8", "#1d4ed8", "#171411"],
  },
  "po-07": {
    paper: "#efe8dc",
    stroke: "rgba(23,20,17,0.16)",
    pieces: ["#171411", "#e31b23", "#7a7268", "#fffaf3", "#9b2242"],
  },
  "po-08": {
    paper: "#f3e6ea",
    stroke: "rgba(20,12,16,0.18)",
    pieces: ["#e8a0b4", "#171411", "#c41e3a", "#d4c4b0", "#fffaf3"],
  },
  "po-09": {
    paper: "#ece6d4",
    stroke: "rgba(60,48,20,0.18)",
    pieces: ["#c9a227", "#171411", "#8a7350", "#fffaf3", "#5c4a20"],
  },
};

export function themeFor(id: string): ProductTheme {
  const theme = PRODUCT_THEMES[id] ?? BRAND;
  return { ...theme, stroke: "rgba(23,20,17,0.14)" };
}
