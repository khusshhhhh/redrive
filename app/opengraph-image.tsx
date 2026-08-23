import { ImageResponse } from "next/og";

export const alt = "Redrive — useful vehicles, shared locally across Australia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "stretch",
        background: "#f7faf9",
        color: "#0b3338",
        display: "flex",
        fontFamily: "Arial, sans-serif",
        height: "100%",
        justifyContent: "space-between",
        overflow: "hidden",
        padding: "72px 76px",
        position: "relative",
        width: "100%",
      }}
    >
      <div style={{ background: "#087985", borderRadius: 999, height: 410, opacity: 0.08, position: "absolute", right: -80, top: -130, width: 410 }} />
      <div style={{ background: "#d4a72c", borderRadius: 999, bottom: -150, height: 360, opacity: 0.11, position: "absolute", right: 190, width: 360 }} />

      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", maxWidth: 790, zIndex: 1 }}>
        <div style={{ alignItems: "center", display: "flex", fontSize: 42, fontWeight: 700, gap: 20 }}>
          <div style={{ alignItems: "center", background: "#0b3338", borderRadius: 20, display: "flex", height: 76, justifyContent: "center", overflow: "hidden", width: 76 }}>
            <svg width="76" height="76" viewBox="0 0 64 64">
              <path d="M9 64C17 50 24 42 24 31C24 19 31 9 44 0H61C43 14 39 23 40 33C41 45 35 55 29 64Z" fill="white" />
              <path d="M22 58C29 47 33 39 32 30C31 21 36 14 45 7" fill="none" stroke="#0b3338" strokeWidth="3" strokeLinecap="round" strokeDasharray="5 6" />
              <circle cx="49" cy="13" r="7" fill="#d4a72c" stroke="#0b3338" strokeWidth="3" />
            </svg>
          </div>
          redrive
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: "#087985", fontSize: 24, fontWeight: 700, letterSpacing: 4, marginBottom: 20, textTransform: "uppercase" }}>Australian vehicle sharing</div>
          <div style={{ fontSize: 69, fontWeight: 750, letterSpacing: -3, lineHeight: 1.04 }}>The right vehicle for the road ahead.</div>
          <div style={{ color: "#526a6d", fontSize: 28, lineHeight: 1.45, marginTop: 25 }}>Cars, utes, vans, campervans and more—shared by local hosts.</div>
        </div>
      </div>

      <div style={{ alignItems: "center", display: "flex", justifyContent: "center", position: "relative", width: 250 }}>
        <div style={{ border: "3px dashed #8eb8b3", borderRadius: 999, height: 390, position: "absolute", width: 190 }} />
        <div style={{ background: "#0b3338", border: "12px solid white", borderRadius: 999, boxShadow: "0 16px 42px rgba(11,51,56,.18)", height: 88, position: "absolute", right: 19, top: 70, width: 88 }} />
        <div style={{ background: "#d4a72c", border: "12px solid white", borderRadius: 999, bottom: 58, height: 88, left: 5, position: "absolute", width: 88 }} />
      </div>
    </div>,
    size,
  );
}
