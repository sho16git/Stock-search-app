import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "linear-gradient(145deg, #0f172a 0%, #1e293b 100%)",
          borderRadius: 40,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          padding: "28px 28px 24px",
          gap: 10,
          position: "relative",
        }}
      >
        {/* Bar chart */}
        <div style={{ width: 24, height: 58,  background: "#3b82f6", borderRadius: "8px 8px 0 0", opacity: 0.85 }} />
        <div style={{ width: 24, height: 96,  background: "#6366f1", borderRadius: "8px 8px 0 0" }} />
        <div style={{ width: 24, height: 46,  background: "#3b82f6", borderRadius: "8px 8px 0 0", opacity: 0.85 }} />
        <div style={{ width: 24, height: 120, background: "#818cf8", borderRadius: "8px 8px 0 0" }} />
        {/* Trend line overlay */}
        <div style={{
          position: "absolute",
          top: 24, left: 24, right: 24,
          height: 10,
          background: "linear-gradient(90deg, transparent 0%, #38bdf8 40%, #a78bfa 100%)",
          borderRadius: 5,
        }} />
        {/* Small dot at line end */}
        <div style={{
          position: "absolute",
          top: 18, right: 24,
          width: 16, height: 16,
          background: "#a78bfa",
          borderRadius: 8,
        }} />
      </div>
    ),
    { ...size },
  );
}
