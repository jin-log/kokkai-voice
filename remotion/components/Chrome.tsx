import React from "react";
import { THEME } from "../theme";

type Props = {
  category: string;
  beatIndex: number;
  beatTotal: number;
};

export const Chrome: React.FC<Props> = ({
  category,
  beatIndex,
  beatTotal,
}) => {
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "40px 36px 0",
          zIndex: 10,
        }}
      >
        <span
          style={{
            background: "rgba(0,0,0,0.45)",
            border: "1px solid rgba(255,255,255,0.2)",
            padding: "10px 24px",
            borderRadius: 999,
            fontSize: 28,
            fontWeight: 800,
            color: "#e2e8f0",
            fontFamily: THEME.font,
          }}
        >
          {category}
        </span>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "0 36px 48px",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          {Array.from({ length: beatTotal }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 4,
                background:
                  i <= beatIndex
                    ? "rgba(255,255,255,0.85)"
                    : "rgba(255,255,255,0.2)",
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
};
