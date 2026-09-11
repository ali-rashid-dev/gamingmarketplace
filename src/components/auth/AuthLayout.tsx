import type { ReactNode } from "react";
import { AuthLogo } from "./AuthLogo";

function VaultDoorPattern() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
    >
      {/* Ultra-dark subtle background gradient mask */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#100F0D_0%,#0E0D0B_55%)] opacity-60" />

      {/* Engraved concentric vault door radial SVG - ultra-faint & dark */}
      <svg
        className="h-[min(170vw,1000px)] w-[min(170vw,1000px)] text-gold/05 opacity-35"
        viewBox="0 0 1000 1000"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer radial ring & dial scale */}
        <circle cx="500" cy="500" r="480" stroke="currentColor" strokeWidth="1" strokeDasharray="6 10" opacity="0.2" />
        <circle cx="500" cy="500" r="440" stroke="currentColor" strokeWidth="1" opacity="0.25" />
        <circle cx="500" cy="500" r="400" stroke="currentColor" strokeWidth="1" strokeDasharray="12 12" opacity="0.2" />

        {/* Mid radial gear teeth & vault locking rings */}
        <circle cx="500" cy="500" r="320" stroke="currentColor" strokeWidth="1.2" opacity="0.3" />
        <circle cx="500" cy="500" r="260" stroke="currentColor" strokeWidth="1" strokeDasharray="4 8" opacity="0.2" />
        <circle cx="500" cy="500" r="200" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
        <circle cx="500" cy="500" r="140" stroke="currentColor" strokeWidth="1" opacity="0.2" />
        <circle cx="500" cy="500" r="80" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" opacity="0.25" />

        {/* 12 Symmetrical vault door spokes / locking pins */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
          <line
            key={angle}
            x1="500"
            y1="500"
            x2={500 + 440 * Math.cos((angle * Math.PI) / 180)}
            y2={500 + 440 * Math.sin((angle * Math.PI) / 180)}
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.15"
          />
        ))}

        {/* Bolt markers around the rim */}
        {[0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270, 285, 300, 315, 330, 345].map((angle) => (
          <circle
            key={angle}
            cx={500 + 320 * Math.cos((angle * Math.PI) / 180)}
            cy={500 + 320 * Math.sin((angle * Math.PI) / 180)}
            r="2"
            fill="currentColor"
            opacity="0.25"
          />
        ))}
      </svg>

      {/* Outer edge vignette transition - deep dark cover */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_5%,#0E0D0B_55%)]" />
    </div>
  );
}

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0E0D0B] px-5 py-12 sm:px-8 sm:py-16">
      <VaultDoorPattern />

      <div className="relative z-10 w-full max-w-[27rem]">
        <div className="mb-8 sm:mb-10">
          <AuthLogo />
        </div>
        {children}
        <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-3.5 w-3.5 text-patina"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <rect x="4" y="10.5" width="16" height="10" rx="2" />
            <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
          </svg>
          Secured vault access — encrypted end to end
        </p>
      </div>
    </main>
  );
}
