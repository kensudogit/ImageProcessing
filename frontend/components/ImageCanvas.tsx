"use client";

import { DetectionBox } from "@/lib/api";

interface Props {
  src: string;
  boxes?: DetectionBox[];
  alt?: string;
  style?: React.CSSProperties;
}

export default function ImageCanvas({ src, boxes = [], alt = "image", style }: Props) {
  return (
    <div className="detection-wrapper" style={style}>
      <img src={src} alt={alt} style={{ display: "block", maxWidth: "100%" }} />
      {boxes.length > 0 && (
        <svg viewBox={`0 0 100 100`} preserveAspectRatio="none">
          {/* boxes are drawn as % via inline style, so parent must be position:relative */}
        </svg>
      )}
    </div>
  );
}

/** Show image with bounding-box overlays. src must be loaded image element to get natural size. */
export function DetectionCanvas({
  src,
  boxes = [],
  imgWidth,
  imgHeight,
}: {
  src: string;
  boxes: DetectionBox[];
  imgWidth: number;
  imgHeight: number;
}) {
  return (
    <div style={{ position: "relative", display: "inline-block", maxWidth: "100%" }}>
      <img src={src} alt="detection" style={{ display: "block", maxWidth: "100%" }} />
      <svg
        style={{
          position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
        }}
        viewBox={`0 0 ${imgWidth} ${imgHeight}`}
        preserveAspectRatio="xMinYMin meet"
      >
        {boxes.map((b, i) => (
          <g key={i}>
            <rect
              x={b.x} y={b.y} width={b.w} height={b.h}
              fill="none" stroke="#22c55e" strokeWidth="2"
            />
            <rect x={b.x} y={b.y - 16} width={Math.max(b.label.length * 7, 60)} height="16" fill="#22c55e" />
            <text x={b.x + 3} y={b.y - 4} fill="#000" fontSize="11" fontWeight="bold">
              {b.label} {(b.confidence * 100).toFixed(0)}%
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
