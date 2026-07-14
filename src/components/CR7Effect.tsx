'use client'

import { useEffect, useState } from 'react'

export default function CR7Effect() {
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 3200)
    const hideTimer = setTimeout(() => setVisible(false), 3900)
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer) }
  }, [])

  if (!visible) return null

  return (
    <>
      <style>{`
        .talim-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.75);
          backdrop-filter: blur(4px);
          transition: opacity 0.7s ease;
        }
        .talim-overlay.fade { opacity: 0; }

        .talim-wrap {
          position: relative;
          display: inline-block;
        }

        .talim-img {
          max-height: 70vh;
          max-width: 80vw;
          object-fit: contain;
          border-radius: 12px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.6);
          display: block;
        }

        /* lágrimas posicionadas sobre os olhos da imagem */
      `}</style>

      <div className={`talim-overlay${fading ? ' fade' : ''}`}>
        <div className="talim-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/espanha.png" alt="" className="talim-img" />
        </div>
      </div>
    </>
  )
}
