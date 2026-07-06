'use client'

// Ângulo de movimento: translate(-130vw, 75vw) → atan(75/130) ≈ 30° abaixo da horizontal
// A CAUDA aponta 30° acima da horizontal (direção oposta ao movimento)
// rotate(-30deg) no elemento da cauda = contrarrelógio → extremidade direita sobe ✓

const COMETS = [
  { top: '6%',  delay: '0s',  dur: '9s',  len: 520, w: 2.5 },
  { top: '22%', delay: '6s',  dur: '7s',  len: 360, w: 1.5 },
  { top: '3%',  delay: '15s', dur: '12s', len: 640, w: 3   },
  { top: '40%', delay: '24s', dur: '8s',  len: 300, w: 1.5 },
]

export default function CometEffect() {
  return (
    <>
      <style>{`
        .cx-scene {
          position: fixed;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 50;
        }

        @keyframes cx-fly {
          0%   { transform: translate(0, 0);         opacity: 0; }
          5%   { opacity: 1; }
          88%  { opacity: 1; }
          100% { transform: translate(-130vw, 75vw); opacity: 0; }
        }

        /* Wrapper: define a posição da CABEÇA e move em diagonal */
        .cx {
          position: absolute;
          right: 0;
          width: 0;
          height: 0;
          will-change: transform;
          animation: cx-fly linear infinite;
        }

        /* Cauda principal: sai da cabeça e vai para cima-direita (oposto ao movimento) */
        .cx-tail {
          position: absolute;
          left: 0;
          top: 0;
          height: var(--w);
          transform: translateY(-50%) rotate(-30deg);
          transform-origin: left center;
          border-radius: 0 999px 999px 0;
          background: linear-gradient(
            to right,
            rgba(255, 255, 255, 1)    0%,
            rgba(210, 235, 255, 0.85) 20%,
            rgba(160, 210, 255, 0.45) 55%,
            rgba(100, 180, 255, 0.1)  80%,
            transparent               100%
          );
        }

        /* Halo difuso sobre a cauda para dar volume */
        .cx-halo {
          position: absolute;
          left: 0;
          top: 0;
          height: calc(var(--w) * 4);
          transform: translateY(-50%) rotate(-30deg);
          transform-origin: left center;
          border-radius: 0 999px 999px 0;
          background: linear-gradient(
            to right,
            rgba(180, 225, 255, 0.35) 0%,
            rgba(140, 200, 255, 0.15) 40%,
            transparent               75%
          );
          filter: blur(5px);
        }

        /* Cabeça brilhante na posição (0, 0) do wrapper */
        .cx-head {
          position: absolute;
          left: -4px;
          top: -4px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: radial-gradient(circle, #fff 30%, rgba(200,235,255,0.6) 70%, transparent 100%);
          box-shadow:
            0 0 3px  2px rgba(255, 255, 255, 1),
            0 0 10px 4px rgba(180, 225, 255, 0.85),
            0 0 22px 8px rgba(120, 190, 255, 0.5),
            0 0 45px 16px rgba(80, 160, 255, 0.2);
        }
      `}</style>

      <div className="cx-scene">
        {COMETS.map((c, i) => (
          <div
            key={i}
            className="cx"
            style={{
              top: c.top,
              animationDelay: c.delay,
              animationDuration: c.dur,
              ['--w' as string]: `${c.w}px`,
            }}
          >
            <div className="cx-halo" style={{ width: c.len * 0.65 }} />
            <div className="cx-tail" style={{ width: c.len }} />
            <div className="cx-head" />
          </div>
        ))}
      </div>
    </>
  )
}
