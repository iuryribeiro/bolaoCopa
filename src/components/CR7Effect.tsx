'use client'

import { useEffect, useRef, useState } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  alpha: number
  color: string
  radius: number
  gravity: number
  decay: number
}

interface Rocket {
  x: number
  y: number
  vy: number
  color: string
  trail: { x: number; y: number; alpha: number }[]
  exploded: boolean
}

const COLORS = [
  '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1',
  '#96CEB4', '#FFEAA7', '#DDA0DD', '#98FB98',
  '#FF69B4', '#FFA500', '#00CED1', '#FF4500',
]

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)]
}

function explode(x: number, y: number, color: string): Particle[] {
  const count = 80 + Math.floor(Math.random() * 40)
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2
    const speed = 1.5 + Math.random() * 4
    return {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 1,
      color: Math.random() > 0.3 ? color : '#FFFFFF',
      radius: 1.5 + Math.random() * 2,
      gravity: 0.06,
      decay: 0.013 + Math.random() * 0.012,
    }
  })
}

export default function CR7Effect() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [fading, setFading] = useState(false)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const rockets: Rocket[] = []
    const particles: Particle[] = []
    let frame = 0
    let rafId: number

    function launchRocket() {
      rockets.push({
        x: 0.15 * canvas!.width + Math.random() * 0.7 * canvas!.width,
        y: canvas!.height,
        vy: -(12 + Math.random() * 8),
        color: randomColor(),
        trail: [],
        exploded: false,
      })
    }

    function tick() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)

      // Lança foguetes em intervalos irregulares
      if (frame % 22 === 0 || frame % 37 === 0) launchRocket()

      // Atualiza foguetes
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i]
        r.trail.push({ x: r.x, y: r.y, alpha: 0.6 })
        r.y += r.vy
        r.vy += 0.18 // gravidade leve

        // Desenha rastro
        r.trail.forEach((t, ti) => {
          t.alpha -= 0.07
          if (t.alpha <= 0) return
          ctx!.beginPath()
          ctx!.arc(t.x, t.y, 2, 0, Math.PI * 2)
          ctx!.fillStyle = `rgba(255,200,50,${t.alpha})`
          ctx!.fill()
        })
        r.trail = r.trail.filter(t => t.alpha > 0)

        // Ponto brilhante do foguete
        ctx!.beginPath()
        ctx!.arc(r.x, r.y, 3, 0, Math.PI * 2)
        ctx!.fillStyle = '#FFF'
        ctx!.fill()

        // Explode quando desacelera o suficiente (perto do topo)
        if (r.vy >= -1 && !r.exploded) {
          r.exploded = true
          particles.push(...explode(r.x, r.y, r.color))
          rockets.splice(i, 1)
        }
      }

      // Atualiza partículas
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.vy += p.gravity
        p.vx *= 0.97
        p.alpha -= p.decay
        if (p.alpha <= 0) { particles.splice(i, 1); continue }

        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx!.globalAlpha = p.alpha
        ctx!.fillStyle = p.color
        ctx!.fill()
        ctx!.globalAlpha = 1
      }

      frame++
      rafId = requestAnimationFrame(tick)
    }

    // Foguetes iniciais imediatos
    launchRocket()
    launchRocket()
    launchRocket()
    tick()

    // Fade e esconde
    const fadeTimer = setTimeout(() => setFading(true), 4500)
    const hideTimer = setTimeout(() => { setVisible(false); cancelAnimationFrame(rafId) }, 5300)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      clearTimeout(fadeTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  if (!visible) return null

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.8s ease',
      }}
    />
  )
}
