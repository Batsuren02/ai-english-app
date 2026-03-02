'use client'

import { useRef, useEffect } from 'react'

interface WaveformDisplayProps {
  samples: Float32Array | null
  color?: string
  height?: number
  label?: string
}

export default function WaveformDisplay({
  samples,
  color = 'var(--accent)',
  height = 64,
  label = 'Waveform',
}: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.offsetWidth
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    // Clear canvas
    ctx.fillStyle = 'var(--bg)'
    ctx.fillRect(0, 0, width, height)

    if (!samples || samples.length === 0) {
      // Draw placeholder bars
      ctx.fillStyle = color
      ctx.globalAlpha = 0.3
      const barWidth = width / 200
      for (let i = 0; i < 200; i++) {
        const barHeight = Math.sin((i / 200) * Math.PI) * (height / 2)
        const x = i * barWidth
        const y = height / 2 - barHeight / 2
        ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight)
      }
      ctx.globalAlpha = 1
      return
    }

    // Draw waveform from samples
    const barWidth = width / samples.length
    ctx.fillStyle = color
    ctx.globalAlpha = 0.8

    for (let i = 0; i < samples.length; i++) {
      const sample = Math.abs(samples[i])
      const barHeight = sample * height
      const x = i * barWidth
      const y = height / 2 - barHeight / 2

      ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight)
    }

    ctx.globalAlpha = 1

    // Draw center line
    ctx.strokeStyle = 'var(--border)'
    ctx.beginPath()
    ctx.moveTo(0, height / 2)
    ctx.lineTo(width, height / 2)
    ctx.stroke()
  }, [samples, color, height])

  return (
    <div className="flex flex-col gap-2">
      {label && <p className="text-xs text-[var(--ink-light)] font-medium">{label}</p>}
      <canvas
        ref={canvasRef}
        className="w-full border border-[var(--border)] rounded-lg bg-[var(--bg)]"
        style={{ height: `${height}px` }}
      />
    </div>
  )
}
