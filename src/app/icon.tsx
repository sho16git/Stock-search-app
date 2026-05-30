import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: "linear-gradient(145deg, #0f172a 0%, #1e293b 100%)",
          borderRadius: 7,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          padding: "5px 5px 4px",
          gap: 2,
          position: "relative",
        }}
      >
        {/* Bar chart bars */}
        <div style={{ width: 4, height: 10, background: "#3b82f6", borderRadius: "2px 2px 0 0", opacity: 0.85 }} />
        <div style={{ width: 4, height: 16, background: "#6366f1", borderRadius: "2px 2px 0 0" }} />
        <div style={{ width: 4, height: 8,  background: "#3b82f6", borderRadius: "2px 2px 0 0", opacity: 0.85 }} />
        <div style={{ width: 4, height: 20, background: "#818cf8", borderRadius: "2px 2px 0 0" }} />
        {/* Trend line overlay */}
        <div style={{
          position: "absolute",
          top: 4, left: 4, right: 4,
          height: 2,
          background: "linear-gradient(90deg, transparent 0%, #38bdf8 40%, #a78bfa 100%)",
          borderRadius: 1,
        }} />
      </div>
    ),
    { ...size },
  );
}
