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

        @keyframes ms-celebrate {
          0%, 100% { transform: translateY(0px); }
          30%      { transform: translateY(-10px); }
          60%      { transform: translateY(-5px); }
        }

        @keyframes arm-up-l {
          0%, 100% { transform: rotate(-115deg); }
          50%      { transform: rotate(-130deg); }
        }
        @keyframes arm-side-r {
          0%, 100% { transform: rotate(35deg); }
          50%      { transform: rotate(20deg); }
        }

        @keyframes star-spin {
          0%   { transform: rotate(0deg)   scale(1);    opacity: 1; }
          50%  { transform: rotate(180deg) scale(1.3);  opacity: 0.7; }
          100% { transform: rotate(360deg) scale(1);    opacity: 1; }
        }

        @keyframes confetti-l {
          0%   { transform: translate(0,0) rotate(0deg);   opacity: 1; }
          100% { transform: translate(-12px,-28px) rotate(-40deg); opacity: 0; }
        }
        @keyframes confetti-r {
          0%   { transform: translate(0,0) rotate(0deg);   opacity: 1; }
          100% { transform: translate(12px,-28px) rotate(40deg);  opacity: 0; }
        }

        @keyframes bubble-bob {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-4px); }
        }

        @keyframes crown-glow {
          0%, 100% { filter: drop-shadow(0 0 4px #ffe066); }
          50%      { filter: drop-shadow(0 0 10px #ffe066); }
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
          bottom: 60px;
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

        /* confetes saindo do balão */
        .ms-confetti {
          position: absolute;
          top: -4px;
          left: 50%;
          display: flex;
          gap: 5px;
          transform: translateX(-50%);
        }
        .ms-cf { font-size: 10px; }
        .ms-cf:nth-child(odd)  { animation: confetti-l 1s ease-out infinite; }
        .ms-cf:nth-child(even) { animation: confetti-r 1s ease-out infinite; animation-delay: 0.5s; }

        /* ── MESSI ── */
        .ms-fig {
          position: relative;
          width: 44px;
          height: 88px;
          flex-shrink: 0;
          animation: ms-celebrate 0.8s ease-in-out infinite;
        }

        /* Corona */
        .ms-crown {
          position: absolute;
          top: -14px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 18px;
          line-height: 1;
          z-index: 10;
          animation: crown-glow 1.2s ease-in-out infinite;
        }

        /* Cabeça */
        .ms-head {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #d4956a;
          border: 1.5px solid #b37a52;
          z-index: 3;
        }
        /* cabelo escuro */
        .ms-head::before {
          content: '';
          position: absolute;
          top: -3px; left: 1px;
          width: 20px; height: 11px;
          border-radius: 50% 50% 0 0;
          background: #2d1b00;
        }
        /* barba */
        .ms-head::after {
          content: '';
          position: absolute;
          bottom: 0px; left: 2px;
          width: 18px; height: 8px;
          border-radius: 0 0 8px 8px;
          background: #3d2400;
        }
        /* olhos */
        .ms-eyes {
          position: absolute;
          top: 8px; left: 0;
          width: 100%;
          display: flex;
          justify-content: space-around;
          padding: 0 3px;
          z-index: 4;
        }
        .ms-eye {
          width: 4px; height: 4px;
          border-radius: 50%;
          background: #111;
        }
        /* sorriso */
        .ms-smile {
          position: absolute;
          bottom: 5px; left: 50%;
          transform: translateX(-50%);
          width: 10px; height: 5px;
          border-bottom: 2px solid #7a3e1a;
          border-left: 1px solid #7a3e1a;
          border-right: 1px solid #7a3e1a;
          border-radius: 0 0 6px 6px;
          z-index: 4;
        }

        /* Braços — rotação a partir do ombro (top center) */
        .ms-arm-l, .ms-arm-r {
          position: absolute;
          top: 22px;
          width: 7px;
          height: 20px;
          border-radius: 3px;
          transform-origin: top center;
          z-index: 2;
        }
        .ms-arm-l {
          left: 5px;
          background: #74acdf;
          border: 1px solid #4a8abf;
          animation: arm-up-l 0.8s ease-in-out infinite;
        }
        .ms-arm-r {
          right: 5px;
          background: #74acdf;
          border: 1px solid #4a8abf;
          animation: arm-side-r 0.8s ease-in-out infinite;
        }
        /* mãos na ponta do braço */
        .ms-arm-l::after, .ms-arm-r::after {
          content: '';
          position: absolute;
          bottom: -4px; left: 50%;
          transform: translateX(-50%);
          width: 7px; height: 6px;
          border-radius: 50%;
          background: #d4956a;
        }

        /* Corpo jersey Argentina */
        .ms-body {
          position: absolute;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          width: 24px;
          height: 28px;
          border-radius: 4px 4px 2px 2px;
          background: repeating-linear-gradient(
            90deg,
            #74acdf 0px, #74acdf 5px,
            white    5px, white    10px
          );
          border: 1px solid #4a8abf;
          z-index: 1;
        }
        /* número 10 */
        .ms-body::after {
          content: '10';
          position: absolute;
          top: 10px; left: 50%;
          transform: translateX(-50%);
          font-family: sans-serif;
          font-size: 8px;
          font-weight: 900;
          color: #003f87;
          line-height: 1;
        }

        /* Shorts */
        .ms-shorts {
          position: absolute;
          top: 46px;
          left: 50%;
          transform: translateX(-50%);
          width: 22px;
          height: 12px;
          background: #003f87;
          border-radius: 2px;
        }

        /* Pernas */
        .ms-leg-l, .ms-leg-r {
          position: absolute;
          top: 56px;
          width: 9px;
          height: 24px;
          border-radius: 3px;
          background: #d4956a;
          border: 1px solid #b37a52;
        }
        .ms-leg-l { left: 6px; }
        .ms-leg-r { right: 6px; }

        /* Meias e chuteiras */
        .ms-leg-l::after, .ms-leg-r::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0;
          width: 9px; height: 10px;
          background: white;
          border-radius: 2px;
        }
        .ms-leg-l::before, .ms-leg-r::before {
          content: '';
          position: absolute;
          bottom: -4px; left: -1px;
          width: 12px; height: 5px;
          background: #111;
          border-radius: 3px 4px 2px 2px;
          z-index: 2;
        }

        /* estrelas no fundo (efeito de celebração) */
        .ms-star {
          position: absolute;
          font-size: 10px;
          animation: star-spin 1.5s linear infinite;
        }
        .ms-star-1 { top: 5px;  left: -8px;  animation-delay: 0s; }
        .ms-star-2 { top: 15px; right: -8px; animation-delay: 0.5s; }
        .ms-star-3 { top: -5px; left: 10px;  animation-delay: 1s; }
      `}</style>

      <div className="ms-scene">
        {RUNS.map((r, i) => (
          <div
            key={i}
            className="ms-wrapper"
            style={{ top: r.top, animationDelay: r.delay, animationDuration: r.dur }}
          >
            {/* Balão GOAT */}
            <div className="ms-bubble">
              🐐 GOAT 🏆<br />
              <span style={{ fontSize: 9, fontWeight: 600 }}>QUE MIRA BOBO!</span>
              <div className="ms-confetti">
                <span className="ms-cf">🎊</span>
                <span className="ms-cf">⭐</span>
                <span className="ms-cf">🎊</span>
              </div>
            </div>

            {/* Messi */}
            <div className="ms-fig">
              <div className="ms-crown">👑</div>

              <div className="ms-head">
                <div className="ms-eyes">
                  <div className="ms-eye" />
                  <div className="ms-eye" />
                </div>
                <div className="ms-smile" />
              </div>

              <div className="ms-arm-l" />
              <div className="ms-arm-r" />
              <div className="ms-body" />
              <div className="ms-shorts" />
              <div className="ms-leg-l" />
              <div className="ms-leg-r" />

              <span className="ms-star ms-star-1">✨</span>
              <span className="ms-star ms-star-2">⭐</span>
              <span className="ms-star ms-star-3">✨</span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
