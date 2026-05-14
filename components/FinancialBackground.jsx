"use client";

import { useEffect, useRef } from "react";

const FONT_SIZE = 14;
const ACCENT = "#4361EE";

const POOL = [
  "$", "€", "%", "+", "-",
  "0","1","2","3","4","5","6","7","8","9",
  "143.5", "29.6", "16.6%", "8.2%", "52.1", "7.4%",
  "99.3", "0.5%", "211.0", "3.8%",
];

function pickChar() {
  return POOL[Math.floor(Math.random() * POOL.length)];
}

export default function FinancialBackground({ className = "" }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let W, H, cols, drops, speeds, chars;

    const init = () => {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width = Math.round(W * window.devicePixelRatio);
      canvas.height = Math.round(H * window.devicePixelRatio);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      cols = Math.floor(W / FONT_SIZE);
      drops = Array.from({ length: cols }, () => Math.random() * -(H / FONT_SIZE) * 2);
      speeds = Array.from({ length: cols }, () => 0.4 + Math.random() * 0.6); // 1–2 px per frame at 60fps
      chars  = Array.from({ length: cols }, () => pickChar());
    };

    init();
    window.addEventListener("resize", init);

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // transparent — page gradient shows through
      ctx.clearRect(0, 0, W, H);

      // ── Matrix rain — opacity 0.15, single colour ──
      ctx.font = `${FONT_SIZE}px 'Courier New', monospace`;

      for (let i = 0; i < cols; i++) {
        const x = i * FONT_SIZE;
        const y = drops[i] * FONT_SIZE;

        // trail: 10 chars fading upward
        const TRAIL = 10;
        for (let j = 0; j <= TRAIL; j++) {
          const ty = y - j * FONT_SIZE;
          if (ty < 0 || ty > H) continue;
          // head at 0.75, trail fades to ~0.04
          const alpha = 0.75 * Math.pow(1 - j / TRAIL, 1.6);
          ctx.fillStyle = ACCENT + Math.round(alpha * 255).toString(16).padStart(2, "0");
          const ch = j === 0 ? chars[i] : pickChar();
          ctx.fillText(ch, x, ty);
        }

        // advance
        drops[i] += speeds[i] / FONT_SIZE; // convert px/frame → rows/frame
        if (drops[i] * FONT_SIZE > H + FONT_SIZE * 10) {
          drops[i] = Math.random() * -(H / FONT_SIZE);
          chars[i] = pickChar();
        }
      }

      // ── Subtle fade at edges — fully transparent, no solid color ──
      const fade = ctx.createLinearGradient(0, H * 0.7, 0, H);
      fade.addColorStop(0, "rgba(255,255,255,0)");
      fade.addColorStop(1, "rgba(255,255,255,0.15)");
      ctx.fillStyle = fade;
      ctx.fillRect(0, 0, W, H);

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", init);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 h-full w-full ${className}`}
      style={{ display: "block" }}
      aria-hidden
    />
  );
}
