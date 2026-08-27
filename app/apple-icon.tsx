import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ alignItems: "center", background: "linear-gradient(135deg, #3B3B3B 0%, #636363 100%)", borderRadius: 36, display: "flex", height: "100%", justifyContent: "center", position: "relative", width: "100%" }}>
      <svg width="180" height="180" viewBox="0 0 64 64">
        <path d="M9 64C17 50 24 42 24 31C24 19 31 9 44 0H61C43 14 39 23 40 33C41 45 35 55 29 64Z" fill="white" />
        <path d="M22 58C29 47 33 39 32 30C31 21 36 14 45 7" fill="none" stroke="#3B3B3B" strokeWidth="3" strokeLinecap="round" strokeDasharray="5 6" />
        <circle cx="49" cy="13" r="7" fill="#B5B5B5" stroke="#3B3B3B" strokeWidth="3" />
      </svg>
    </div>,
    size,
  );
}
