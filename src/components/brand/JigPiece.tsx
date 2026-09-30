import type { ReactNode } from "react";
import type { PieceEdges } from "@/lib/jigsaw";
import { jigSvgPath } from "@/lib/jigSvg";

export function JigPiece({
  edges,
  fill,
  stroke = "rgba(23,20,17,0.28)",
  className = "",
  padClass = "px-[18%] py-[16%]",
  children,
}: {
  edges: PieceEdges;
  fill: string;
  stroke?: string;
  className?: string;
  padClass?: string;
  children?: ReactNode;
}) {
  return (
    <div className={`relative ${className}`}>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path d={jigSvgPath(100, edges)} fill={fill} stroke={stroke} strokeWidth="1.6" />
      </svg>
      <div className={`relative z-[1] flex h-full flex-col ${padClass}`}>{children}</div>
    </div>
  );
}
