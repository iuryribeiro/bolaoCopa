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
        @keyframes tear-fall {
          0%   { transform: translateY(0px) scaleY(1); opacity: 1; }
          80%  { opacity: 0.7; }
          100% { transform: translateY(60px) scaleY(1.4); opacity: 0; }
        }
        @keyframes tear-sway {
          0%, 100% { margin-left: 0px; }
          50%      { margin-left: 4px; }
        }
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
        .talim-tears {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none;
        }

        .tear {
          position: absolute;
          width: 10px;
          border-radius: 0 0 50% 50%;
          background: linear-gradient(to bottom, rgba(120,200,255,0.9), rgba(80,170,240,0.4));
          animation: tear-fall 0.65s ease-in infinite, tear-sway 1.3s ease-in-out infinite;
          box-shadow: 0 0 4px rgba(120,200,255,0.5);
        }

        /* lágrima olho esquerdo */
        .tear-l1 { left: 31%; top: 44%; height: 22px; animation-delay: 0s, 0s; }
        .tear-l2 { left: 33%; top: 44%; height: 16px; animation-delay: 0.32s, 0.2s; width: 7px; }

        /* lágrima olho direito */
        .tear-r1 { left: 58%; top: 44%; height: 22px; animation-delay: 0.16s, 0.5s; }
        .tear-r2 { left: 60%; top: 44%; height: 14px; animation-delay: 0.48s, 0.1s; width: 7px; }
      `}</style>

      <div className={`talim-overlay${fading ? ' fade' : ''}`}>
        <div className="talim-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/talim.jfif" alt="" className="talim-img" />
          <div className="talim-tears">
            <div className="tear tear-l1" />
            <div className="tear tear-l2" />
            <div className="tear tear-r1" />
            <div className="tear tear-r2" />
          </div>
        </div>
      </div>
    </>
  )
}
