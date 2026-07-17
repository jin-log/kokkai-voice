import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { THEME } from "../../theme";

type Props = {
  question?: string;
  /** 2行目（誘導） */
  endHint?: string;
  logoSrc?: string;
};

const DEFAULT_LOGO = "assets/logo-header-nihon-seiji-naw.png";
const DEFAULT_END_HINT = "コメント欄のリンクから";

/** エンド — 質問テロップ＋ロゴ（ロゴは読み上げなし・後から表示） */
export const EndSlide: React.FC<Props> = ({
  question = "あなたはどう思いますか？",
  endHint = DEFAULT_END_HINT,
  logoSrc = DEFAULT_LOGO,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const textEnter = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 110 },
  });
  const textY = interpolate(textEnter, [0, 1], [36, 0]);

  const logoEnter = spring({
    frame: frame - 22,
    fps,
    config: { damping: 13, stiffness: 100 },
  });
  const logoY = interpolate(logoEnter, [0, 1], [48, 0]);

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: "#ffffff" }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "96px 56px",
          zIndex: 5,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            opacity: textEnter,
            transform: `translateY(${textY}px)`,
            width: "100%",
          }}
        >
          <div
            style={{
              fontSize: 60,
              fontWeight: 900,
              color: "#0f172a",
              fontFamily: THEME.font,
              textAlign: "center",
              lineHeight: 1.28,
            }}
          >
            {question}
          </div>
          <div
            style={{
              marginTop: 22,
              fontSize: 38,
              fontWeight: 800,
              color: "#2563eb",
              fontFamily: THEME.font,
              textAlign: "center",
            }}
          >
            {endHint}
          </div>

          <div
            style={{
              opacity: logoEnter,
              transform: `translateY(${logoY}px) scale(${interpolate(logoEnter, [0, 1], [0.92, 1])})`,
              marginTop: 28,
            }}
          >
            <Img
              src={staticFile(logoSrc)}
              style={{
                width: 760,
                maxWidth: "88vw",
                height: "auto",
                objectFit: "contain",
              }}
            />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
