import React from "react";

type Props = {
  stepIndex: number;
  stepTotal: number;
};

export const ProgressRail: React.FC<Props> = ({ stepIndex, stepTotal }) => {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "0 40px 52px",
        zIndex: 12,
      }}
    >
      <div style={{ display: "flex", gap: 8 }}>
        {Array.from({ length: stepTotal }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 4,
              background:
                i <= stepIndex ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.22)",
            }}
          />
        ))}
      </div>
    </div>
  );
};
