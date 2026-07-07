'use client'

const RUNS = [
  { top: '12%', delay: '0s',   dur: '11s' },
  { top: '55%', delay: '7s',   dur: '9s'  },
  { top: '30%', delay: '18s',  dur: '13s' },
]

export default function CR7Effect() {
  return (
    <>
      <style>{`
        .cr7-scene {
          position: fixed;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 50;
        }

        @keyframes cr7-run {
          0%   { transform: translateX(0);      opacity: 0; }
          4%   { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateX(-140vw); opacity: 0; }
        }

        @keyframes cr7-legs {
          0%, 100% { transform: rotate(-18deg); }
          50%      { transform: rotate(18deg);  }
        }

        @keyframes cr7-arm-l {
          0%, 100% { transform: rotate(20deg); }
          50%      { transform: rotate(-20deg); }
        }

        @keyframes cr7-arm-r {
          0%, 100% { transform: rotate(-20deg); }
          50%      { transform: rotate(20deg);  }
        }

        @keyframes tear-drop {
          0%   { transform: translateY(0);    opacity: 1; }
          100% { transform: translateY(18px); opacity: 0; }
        }

        @keyframes bubble-bob {
          0%, 100% { transform: translateY(0px); }
          50%      { transform: translateY(-3px); }
        }

        .cr7-wrapper {
          position: absolute;
          right: 0;
          display: flex;
          align-items: flex-end;
          gap: 8px;
          animation: cr7-run linear infinite;
        }

        /* Speech bubble */
        .cr7-bubble {
          background: white;
          color: #111;
          font-family: sans-serif;
          font-size: 11px;
          font-weight: 700;
          padding: 5px 8px;
          border-radius: 10px;
          white-space: nowrap;
          position: relative;
          bottom: 52px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.35);
          animation: bubble-bob 1.4s ease-in-out infinite;
          line-height: 1.3;
          text-align: center;
        }
        .cr7-bubble::after {
          content: '';
          position: absolute;
          bottom: -7px;
          right: 12px;
          border: 7px solid transparent;
          border-top-color: white;
          border-bottom: 0;
        }

        /* Figure root */
        .cr7-fig {
          position: relative;
          width: 36px;
          height: 80px;
        }

        /* Head */
        .cr7-head {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #d4956a;
          border: 1.5px solid #b37a52;
          overflow: visible;
        }

        /* Hair */
        .cr7-hair {
          position: absolute;
          top: -3px;
          left: 1px;
          width: 20px;
          height: 10px;
          border-radius: 50% 50% 0 0;
          background: #1a1a1a;
        }

        /* Eyes (closed/sad) */
        .cr7-eyes {
          position: absolute;
          top: 9px;
          left: 0;
          width: 100%;
          display: flex;
          justify-content: space-around;
          padding: 0 3px;
        }
        .cr7-eye {
          width: 4px;
          height: 2px;
          border-radius: 0 0 4px 4px;
          border-bottom: 2px solid #444;
          border-left: 1px solid #444;
          border-right: 1px solid #444;
        }

        /* Tears */
        .cr7-tear-l, .cr7-tear-r {
          position: absolute;
          width: 3px;
          height: 7px;
          border-radius: 0 0 3px 3px;
          background: linear-gradient(to bottom, #7ec8e3, #4ab0d1);
          top: 12px;
          animation: tear-drop 0.7s ease-in infinite;
        }
        .cr7-tear-l { left: 3px; animation-delay: 0s; }
        .cr7-tear-r { right: 3px; animation-delay: 0.35s; }

        /* Mouth (sad arc) */
        .cr7-mouth {
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          width: 8px;
          height: 4px;
          border-radius: 0 0 4px 4px;
          border-bottom: 2px solid #8b4513;
          border-left: 1px solid #8b4513;
          border-right: 1px solid #8b4513;
          transform: translateX(-50%) scaleY(-1);
        }

        /* Body (red jersey) */
        .cr7-body {
          position: absolute;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          width: 24px;
          height: 26px;
          background: #d62828;
          border-radius: 4px 4px 2px 2px;
          border: 1px solid #a01f1f;
        }

        /* #7 on jersey */
        .cr7-number {
          position: absolute;
          top: 6px;
          left: 50%;
          transform: translateX(-50%);
          font-family: sans-serif;
          font-size: 9px;
          font-weight: 900;
          color: #ffe066;
          line-height: 1;
          letter-spacing: -0.5px;
        }

        /* Green collar stripe */
        .cr7-collar {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 8px;
          height: 5px;
          background: #1a7a2e;
          border-radius: 0 0 3px 3px;
        }

        /* Arms */
        .cr7-arm-l, .cr7-arm-r {
          position: absolute;
          top: 22px;
          width: 6px;
          height: 18px;
          background: #d62828;
          border-radius: 3px;
          transform-origin: top center;
        }
        .cr7-arm-l {
          left: 2px;
          animation: cr7-arm-l 0.45s ease-in-out infinite;
        }
        .cr7-arm-r {
          right: 2px;
          animation: cr7-arm-r 0.45s ease-in-out infinite;
        }

        /* Shorts */
        .cr7-shorts {
          position: absolute;
          top: 44px;
          left: 50%;
          transform: translateX(-50%);
          width: 22px;
          height: 12px;
          background: #1a1a1a;
          border-radius: 2px;
        }

        /* Legs */
        .cr7-leg-l, .cr7-leg-r {
          position: absolute;
          top: 56px;
          width: 8px;
          height: 22px;
          border-radius: 3px;
          transform-origin: top center;
        }
        .cr7-leg-l {
          left: 6px;
          background: #d4956a;
          animation: cr7-legs 0.45s ease-in-out infinite;
        }
        .cr7-leg-r {
          right: 6px;
          background: #d4956a;
          animation: cr7-legs 0.45s ease-in-out infinite reverse;
        }

        /* Socks + shoes */
        .cr7-sock-l, .cr7-sock-r {
          position: absolute;
          bottom: 0;
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 2px;
        }
        .cr7-sock-l { left: 0; }
        .cr7-sock-r { right: 0; }

        .cr7-shoe-l, .cr7-shoe-r {
          position: absolute;
          bottom: -3px;
          width: 10px;
          height: 5px;
          background: #111;
          border-radius: 2px 4px 2px 2px;
        }
        .cr7-shoe-l { left: -1px; }
        .cr7-shoe-r { right: -1px; }
      `}</style>

      <div className="cr7-scene">
        {RUNS.map((r, i) => (
          <div
            key={i}
            className="cr7-wrapper"
            style={{ top: r.top, animationDelay: r.delay, animationDuration: r.dur }}
          >
            <div className="cr7-bubble">
              SIIUUUU... 😭<br />
              <span style={{ fontSize: 9, fontWeight: 400 }}>Portugal eliminado</span>
            </div>

            <div className="cr7-fig">
              {/* Head */}
              <div className="cr7-head">
                <div className="cr7-hair" />
                <div className="cr7-eyes">
                  <div className="cr7-eye" />
                  <div className="cr7-eye" />
                </div>
                <div className="cr7-tear-l" />
                <div className="cr7-tear-r" />
                <div className="cr7-mouth" />
              </div>

              {/* Arms */}
              <div className="cr7-arm-l" />
              <div className="cr7-arm-r" />

              {/* Body */}
              <div className="cr7-body">
                <div className="cr7-collar" />
                <div className="cr7-number">7</div>
              </div>

              {/* Shorts */}
              <div className="cr7-shorts" />

              {/* Legs */}
              <div className="cr7-leg-l">
                <div className="cr7-sock-l" />
                <div className="cr7-shoe-l" />
              </div>
              <div className="cr7-leg-r">
                <div className="cr7-sock-r" />
                <div className="cr7-shoe-r" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
