"use client";

import React, { useRef, useEffect } from "react";

interface AudioWaveformProps {
  color?: string;
  height?: number;
  frequency?: number;
  amplitude?: number;
  noise?: number;
  className?: string;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  color = "#00f0ff",
  height = 48,
  frequency = 0.05,
  amplitude = 16,
  noise = 0.3,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameId: number;
    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, width, h);

      // Draw faint center grid line
      ctx.strokeStyle = "rgba(0, 240, 255, 0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(width, h / 2);
      ctx.stroke();

      // Main waveform path
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;

      for (let x = 0; x < width; x++) {
        const jitter = (Math.random() - 0.5) * noise * amplitude;
        const wave1 = Math.sin(x * frequency + phase) * amplitude;
        const wave2 = Math.cos(x * (frequency * 0.45) - phase * 0.7) * (amplitude * 0.4);
        const y = h / 2 + wave1 + wave2 + jitter;

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Secondary ghost wave
      ctx.beginPath();
      ctx.strokeStyle = "rgba(0, 240, 255, 0.25)";
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      for (let x = 0; x < width; x += 2) {
        const y = h / 2 + Math.sin(x * frequency * 1.3 - phase) * (amplitude * 0.6);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      phase += 0.08;
      frameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(frameId);
  }, [color, frequency, amplitude, noise]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={height}
      className={`w-full h-auto block rounded ${className}`}
    />
  );
};
