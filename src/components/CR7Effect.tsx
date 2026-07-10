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
        .mb-scene {
          position: fixed;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 50;
        }

        @keyframes mb-slide {
          0%   { transform: translateX(0);      opacity: 0; }
          5%   { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateX(-140vw); opacity: 0; }
        }

        @keyframes mb-run {
          0%, 100% { transform: translateY(0px) rotate(-3deg); }
          25%      { transform: translateY(-8px) rotate(2deg); }
          50%      { transform: translateY(-4px) rotate(-2deg); }
          75%      { transform: translateY(-10px) rotate(3deg); }
        }

        @keyframes mb-arm-up {
          0%, 100% { transform: rotate(-105deg); }
          50%      { transform: rotate(-125deg); }
        }
        @keyframes mb-arm-side {
          0%, 100% { transform: rotate(30deg); }
          50%      { transform: rotate(15deg); }
        }
        @keyframes mb-leg-l {
          0%, 100% { transform: rotate(-20deg); }
          50%      { transform: rotate(15deg); }
        }
        @keyframes mb-leg-r {
          0%, 100% { transform: rotate(20deg); }
          50%      { transform: rotate(-15deg); }
        }

        @keyframes bubble-bob {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-4px); }
        }

        @keyframes star-pop {
          0%   { transform: scale(0) rotate(0deg);   opacity: 1; }
          60%  { transform: scale(1.4) rotate(180deg); opacity: 1; }
          100% { transform: scale(0) rotate(360deg); opacity: 0; }
        }

        .mb-wrapper {
          position: absolute;
          right: 0;
          display: flex;
          align-items: flex-end;
          gap: 10px;
          animation: mb-slide linear infinite;
        }

        /* ── BALÃO ── */
        .mb-bubble {
          background: white;
          color: #111;
          font-family: sans-serif;
          font-size: 11px;
          font-weight: 800;
          padding: 6px 10px;
          border-radius: 12px;
          white-space: nowrap;
          position: relative;
          bottom: 62px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
          animation: bubble-bob 1s ease-in-out infinite;
          line-height: 1.5;
          text-align: center;
        }
        .mb-bubble::after {
          content: '';
          position: absolute;
          bottom: -8px; right: 14px;
          border: 8px solid transparent;
          border-top-color: white;
          border-bottom: 0;
        }

        /* ── FIGURA MBAPPÉ ── */
        .mb-fig {
          position: relative;
          width: 44px;
          height: 92px;
          flex-shrink: 0;
          animation: mb-run 0.55s ease-in-out infinite;
        }

        /* Estrelas de celebração */
        .mb-star {
          position: absolute;
          font-size: 10px;
          animation: star-pop 1.1s ease-out infinite;
        }
        .mb-star-1 { top: 2px;  left: -10px; animation-delay: 0s; }
        .mb-star-2 { top: 10px; right: -10px; animation-delay: 0.4s; }
        .mb-star-3 { top: -4px; left: 14px;  animation-delay: 0.8s; }

        /* Cabeça */
        .mb-head {
          position: absolute;
          top: 0; left: 50%;
          transform: translateX(-50%);
          width: 22px; height: 22px;
          border-radius: 50%;
          background: #8b5e3c;
          border: 1.5px solid #6b4020;
          z-index: 3;
        }
        /* cabelo curto */
        .mb-head::before {
          content: '';
          position: absolute;
          top: -2px; left: 1px;
          width: 20px; height: 9px;
          border-radius: 50% 50% 0 0;
          background: #1a0a00;
        }
        /* olhos */
        .mb-eyes {
          position: absolute;
          top: 8px; left: 0;
          width: 100%;
          display: flex;
          justify-content: space-around;
          padding: 0 3px;
          z-index: 4;
        }
        .mb-eye {
          width: 4px; height: 4px;
          border-radius: 50%;
          background: #111;
        }
        /* sorriso */
        .mb-smile {
          position: absolute;
          bottom: 4px; left: 50%;
          transform: translateX(-50%);
          width: 10px; height: 5px;
          border-bottom: 2px solid #5a2d0c;
          border-left: 1px solid #5a2d0c;
          border-right: 1px solid #5a2d0c;
          border-radius: 0 0 6px 6px;
          z-index: 4;
        }

        /* Braços — origem no ombro */
        .mb-arm-l, .mb-arm-r {
          position: absolute;
          top: 22px;
          width: 7px; height: 20px;
          border-radius: 3px;
          transform-origin: top center;
          z-index: 2;
        }
        .mb-arm-l {
          left: 5px;
          background: #002395; /* azul França */
          border: 1px solid #001570;
          animation: mb-arm-up 0.55s ease-in-out infinite;
        }
        .mb-arm-r {
          right: 5px;
          background: #002395;
          border: 1px solid #001570;
          animation: mb-arm-side 0.55s ease-in-out infinite;
        }
        /* mãos */
        .mb-arm-l::after, .mb-arm-r::after {
          content: '';
          position: absolute;
          bottom: -4px; left: 50%;
          transform: translateX(-50%);
          width: 7px; height: 6px;
          border-radius: 50%;
          background: #8b5e3c;
        }

        /* Corpo — jersey azul França */
        .mb-body {
          position: absolute;
          top: 20px; left: 50%;
          transform: translateX(-50%);
          width: 24px; height: 28px;
          border-radius: 4px 4px 2px 2px;
          background: #002395;
          border: 1px solid #001570;
          z-index: 1;
        }
        /* número 10 */
        .mb-body::after {
          content: '10';
          position: absolute;
          top: 10px; left: 50%;
          transform: translateX(-50%);
          font-family: sans-serif;
          font-size: 8px;
          font-weight: 900;
          color: #ffe066;
          line-height: 1;
        }
        /* detalhe tricolor no ombro */
        .mb-body::before {
          content: '';
          position: absolute;
          top: 2px; left: 2px;
          width: 6px; height: 100%;
          background: linear-gradient(to bottom, #ED2939 0%, #ED2939 33%, white 33%, white 66%, #002395 66%);
          border-radius: 2px 0 0 2px;
          opacity: 0.7;
        }

        /* Shorts */
        .mb-shorts {
          position: absolute;
          top: 46px; left: 50%;
          transform: translateX(-50%);
          width: 22px; height: 12px;
          background: white;
          border: 1px solid #ddd;
          border-radius: 2px;
        }

        /* Pernas */
        .mb-leg-l, .mb-leg-r {
          position: absolute;
          top: 56px;
          width: 9px; height: 24px;
          border-radius: 3px;
          background: #8b5e3c;
          border: 1px solid #6b4020;
          transform-origin: top center;
        }
        .mb-leg-l { left: 6px;  animation: mb-leg-l 0.55s ease-in-out infinite; }
        .mb-leg-r { right: 6px; animation: mb-leg-r 0.55s ease-in-out infinite; }
        /* meias azuis */
        .mb-leg-l::after, .mb-leg-r::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0;
          width: 9px; height: 10px;
          background: #002395;
          border-radius: 2px;
        }
        /* chuteiras */
        .mb-leg-l::before, .mb-leg-r::before {
          content: '';
          position: absolute;
          bottom: -4px; left: -1px;
          width: 12px; height: 5px;
          background: #ED2939;
          border-radius: 3px 4px 2px 2px;
          z-index: 2;
        }
      `}</style>

      <div className="mb-scene">
        {RUNS.map((r, i) => (
          <div
            key={i}
            className="mb-wrapper"
            style={{ top: r.top, animationDelay: r.delay, animationDuration: r.dur }}
          >
            {/* Balão */}
            <div className="mb-bubble">
              ⚽ Mbappé na semifinal! 🇫🇷<br />
              <span style={{ fontSize: 9, fontWeight: 600 }}>França 🆚 Marrocos — gol dele!</span>
            </div>

            {/* Mbappé */}
            <div className="mb-fig">
              <span className="mb-star mb-star-1">⭐</span>
              <span className="mb-star mb-star-2">✨</span>
              <span className="mb-star mb-star-3">⭐</span>

              <div className="mb-head">
                <div className="mb-eyes">
                  <div className="mb-eye" />
                  <div className="mb-eye" />
                </div>
                <div className="mb-smile" />
              </div>

              <div className="mb-arm-l" />
              <div className="mb-arm-r" />
              <div className="mb-body" />
              <div className="mb-shorts" />
              <div className="mb-leg-l" />
              <div className="mb-leg-r" />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
