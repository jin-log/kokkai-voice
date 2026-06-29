import React from "react";
import { fontSizeForLine } from "../lib/telop";
import { THEME, type StyleConfig } from "../theme";

type Props = {
  lines: string[];
  cfg: StyleConfig;
};

export const TelopStack: React.FC<Props> = ({ lines, cfg }) => {
  return (
    <div
      style={{
        background: "rgba(0,0,0,0.5)",
        borderRadius: 20,
        padding: "32px 36px",
        border: `1px solid rgba(255,255,255,0.1)`,
        boxShadow: "0 20px 56px rgba(0,0,0,0.55)",
        maxWidth: "100%",
        width: "100%",
      }}
    >
      {lines.map((line, i) => {
        const base =
          i === 0 ? cfg.size : Math.round(cfg.size * cfg.subScale);
        const fontSize = fontSizeForLine(line, base);
        return (
          <div
            key={`${i}-${line}`}
            style={{
              fontSize,
              fontWeight: i === 0 ? 900 : 800,
              color: cfg.lineColors[i] ?? THEME.colors.text,
              whiteSpace: "nowrap",
              textAlign: "center",
              lineHeight: 1.22,
              letterSpacing: "-0.02em",
              fontFamily: THEME.font,
              marginBottom: i < lines.length - 1 ? 14 : 0,
              textShadow: "0 2px 12px rgba(0,0,0,0.45)",
            }}
          >
            {line}
          </div>
        );
      })}
      <div
        style={{
          marginTop: 18,
          marginLeft: "auto",
          marginRight: "auto",
          width: 120,
          height: 6,
          borderRadius: 4,
          background: `linear-gradient(90deg, ${cfg.accent}, transparent)`,
        }}
      />
    </div>
  );
};
