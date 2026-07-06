import React, { useMemo } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { ShortDataGraphPoint } from "../../types/short-data";
import { THEME } from "../../theme";

const W = 880;
const H = 280;
const PAD = { top: 24, right: 28, bottom: 44, left: 56 };

type Props = {
  data: ShortDataGraphPoint[];
};

export const AnimatedLineGraph: React.FC<Props> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { points, pathD, minV, maxV } = useMemo(() => {
    if (!data.length) return { points: [], pathD: "", minV: 0, maxV: 1 };
    const values = data.map((d) => d.value);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const span = maxV - minV || 0.01;
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;

    const pts = data.map((d, i) => {
      const x = PAD.left + (i / Math.max(1, data.length - 1)) * innerW;
      const y = PAD.top + innerH - ((d.value - minV) / span) * innerH;
      return { x, y, ...d };
    });

    const pathD = pts
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");

    return { points: pts, pathD, minV, maxV };
  }, [data]);

  const draw = spring({
    frame: frame - 8,
    fps,
    config: { damping: 18, stiffness: 90 },
  });
  const pathLen = 1200;
  const dashOffset = interpolate(draw, [0, 1], [pathLen, 0]);

  if (!data.length) return null;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      {[0, 0.5, 1].map((t) => {
        const y = PAD.top + (H - PAD.top - PAD.bottom) * t;
        return (
          <line
            key={t}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y}
            y2={y}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={1}
          />
        );
      })}
      <path
        d={pathD}
        fill="none"
        stroke="#38bdf8"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={pathLen}
        strokeDashoffset={dashOffset}
      />
      {points.map((p, i) => {
        const pop = spring({
          frame: frame - 12 - i * 4,
          fps,
          config: { damping: 14, stiffness: 140 },
        });
        const r = interpolate(pop, [0, 1], [0, 9]);
        return (
          <g key={p.year}>
            <circle cx={p.x} cy={p.y} r={r} fill="#38bdf8" />
            <circle cx={p.x} cy={p.y} r={r + 4} fill="none" stroke="rgba(56,189,248,0.35)" strokeWidth={2} />
            <text
              x={p.x}
              y={H - 12}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize={22}
              fontFamily={THEME.font}
              fontWeight={700}
            >
              {p.year}
            </text>
          </g>
        );
      })}
      <text
        x={PAD.left}
        y={PAD.top - 6}
        fill="#64748b"
        fontSize={20}
        fontFamily={THEME.font}
      >
        {minV.toFixed(2)} — {maxV.toFixed(2)}
      </text>
    </svg>
  );
};
