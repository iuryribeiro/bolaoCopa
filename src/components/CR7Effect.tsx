'use client'

const RUNS = [
  { top: '10%', delay: '0s',  dur: '13s' },
  { top: '50%', delay: '9s',  dur: '11s' },
  { top: '28%', delay: '22s', dur: '14s' },
]

export default function CR7Effect() {
  return (
    <>
      <style>{`
        .ms-scene {
          position: fixed;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 50;
        }

        @keyframes ms-slide {
          0%   { transform: translateX(0);      opacity: 0; }
          5%   { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateX(-140vw); opacity: 0; }
        }

        @keyframes bubble-bob {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-4px); }
        }

        @keyframes lp-shake {
          0%, 100% { transform: rotate(-2deg); }
          50%      { transform: rotate(2deg); }
        }

        .ms-wrapper {
          position: absolute;
          right: 0;
          display: flex;
          align-items: flex-end;
          gap: 10px;
          animation: ms-slide linear infinite;
        }

        /* ── BALÃO ── */
        .ms-bubble {
          background: white;
          color: #111;
          font-family: sans-serif;
          font-size: 11px;
          font-weight: 800;
          padding: 6px 10px;
          border-radius: 12px;
          white-space: nowrap;
          position: relative;
          bottom: 70px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
          animation: bubble-bob 1s ease-in-out infinite;
          line-height: 1.4;
          text-align: center;
        }
        .ms-bubble::after {
          content: '';
          position: absolute;
          bottom: -8px;
          right: 14px;
          border: 8px solid transparent;
          border-top-color: white;
          border-bottom: 0;
        }

        /* ── LAPORTE ── */
        .ms-fig {
          position: relative;
          width: 64px;
          height: 96px;
          flex-shrink: 0;
          animation: lp-shake 0.9s ease-in-out infinite;
        }

        .ms-fig img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top;
          border-radius: 8px;
          border: 2px solid rgba(255,255,255,0.2);
        }

        .ms-ban {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 52px;
          line-height: 1;
          pointer-events: none;
        }
      `}</style>

      <div className="ms-scene">
        {RUNS.map((r, i) => (
          <div
            key={i}
            className="ms-wrapper"
            style={{ top: r.top, animationDelay: r.delay, animationDuration: r.dur }}
          >
            {/* Balão */}
            <div className="ms-bubble">
              🚫 não de nem agua 🚫
            </div>

            {/* Laporte com sinal de proibido */}
            <div className="ms-fig">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/laporte.jpg" alt="Laporte" />
              <div className="ms-ban">🚫</div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
