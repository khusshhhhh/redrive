import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ alignItems: "center", background: "#0b3338", borderRadius: 36, display: "flex", height: "100%", justifyContent: "center", position: "relative", width: "100%" }}>
      <div style={{ border: "17px solid white", borderBottomColor: "transparent", borderLeft: "0px", borderRadius: "0 34px 34px 0", height: 86, left: 56, position: "absolute", top: 42, width: 65 }} />
      <div style={{ background: "white", borderRadius: 12, height: 108, left: 53, position: "absolute", top: 37, width: 18 }} />
      <div style={{ background: "white", borderRadius: 12, height: 78, left: 89, position: "absolute", top: 94, transform: "rotate(-40deg)", transformOrigin: "top", width: 18 }} />
      <div style={{ background: "#d4a72c", border: "7px solid #0b3338", borderRadius: 999, height: 39, position: "absolute", right: 20, top: 17, width: 39 }} />
    </div>,
    size,
  );
}
