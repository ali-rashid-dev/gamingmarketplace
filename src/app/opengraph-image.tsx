import { ImageResponse } from "next/og";

export const alt = "GameTrade game marketplace";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px",
          color: "#f8fafc",
          background:
            "radial-gradient(ellipse at 82% 18%, rgba(59,130,246,0.42), transparent 38%), linear-gradient(135deg, #0b1220, #111827 56%, #082f49)",
        }}
      >
        <div style={{ display: "flex", color: "#67e8f9", fontSize: 24, fontWeight: 700 }}>
          PLAYER-TO-PLAYER GAME MARKETPLACE
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 32,
            fontSize: 84,
            fontWeight: 700,
            letterSpacing: "-0.05em",
          }}
        >
          GameTrade
        </div>
        <div style={{ display: "flex", marginTop: 20, color: "#cbd5e1", fontSize: 34 }}>
          Find your next game-changing deal.
        </div>
        <div style={{ display: "flex", marginTop: 44, color: "#94a3b8", fontSize: 22 }}>
          Accounts · Items · Top-ups · Services
        </div>
      </div>
    ),
    size
  );
}
