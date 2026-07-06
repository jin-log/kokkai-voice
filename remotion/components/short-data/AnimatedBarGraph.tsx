import React, { useMemo } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { ShortDataGraphPoint } from "../../types/short-data";
import { THEME } from "../../theme";

const W = 880;
const H = 280;
const PAD = { top: 24, right: 28, bottom: 44, left: 40 };

type Props = {
  data: ShortDataGraphPoint[];
};

export const AnimatedBarGraph: React.FC<Props> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bars = useMemo(() => {
    if (!data.length) return [];
    const values = data.map((d) => d.value);
    const maxV = Math.max(...values);
    const span = maxV || 1;
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const gap = 16;
    const barW = (innerW - gap * (data.length - 1)) / data.length;

    return data.map((d, i) => {
      const h = (d.value / span) * innerH;
      const x = PAD.left + i * (barW + gap);
      const y = PAD.top + innerH - h;
      return { x, y, w: barW, h, ...d };
    });
  }, [data]);

  if (!data.length) return null;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      {bars.map((b, i) => {
        const grow = spring({
          frame: frame - 6 - i * 5,
          fps,
          config: { damping: 16, stiffness: 110 },
        });
        const bh = b.h * grow;
        const by = PAD.top + (H - PAD.top - PAD.bottom) - bh;
        return (
          <g key={b.year}>
            <rect
              x={b.x}
              y={by}
              width={b.w}
              height={bh}
              rx={8}
              fill="url(#barGrad)"
            />
            <text
              x={b.x + b.w / 2}
              y={by - 10}
              textAnchor="middle"
              fill="#7dd3fc"
              fontSize={24}
              fontWeight={800}
              fontFamily={THEME.font}
              opacity={grow}
            >
              {b.value}
            </text>
            <text
              x={b.x + b.w / 2}
              y={H - 12}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize={22}
              fontFamily={THEME.font}
              fontWeight={700}
            >
              {b.year}
            </text>
          </g>
        );
      })}
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>
    </svg>
  );
};
