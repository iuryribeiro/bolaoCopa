interface BolaoLogoProps {
  size?: number
  className?: string
}

export function BolaoLogo({ size = 36, className }: BolaoLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Fundo gradiente */}
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
        <linearGradient id="trophyGrad" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      {/* Fundo arredondado */}
      <rect width="36" height="36" rx="10" fill="url(#bgGrad)" />

      {/* Troféu */}
      {/* Copa do troféu */}
      <path
        d="M13 7h10v7c0 3.314-2.239 6-5 6s-5-2.686-5-6V7z"
        fill="url(#trophyGrad)"
      />
      {/* Alças do troféu */}
      <path
        d="M13 9H10a2 2 0 000 4h3"
        stroke="#f59e0b"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M23 9h3a2 2 0 010 4h-3"
        stroke="#f59e0b"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Pescoço */}
      <rect x="16.5" y="20" width="3" height="3" rx="0.5" fill="#f59e0b" />
      {/* Base */}
      <rect x="13" y="23" width="10" height="2" rx="1" fill="#f59e0b" />
      {/* Base inferior */}
      <rect x="12" y="25" width="12" height="2" rx="1" fill="#fbbf24" />

      {/* Brilho no troféu */}
      <path
        d="M15 9.5c0.5-0.3 1.5-0.5 2-0.5"
        stroke="#fef3c7"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.6"
      />

      {/* Estrelas / bola decorativa pequena no canto */}
      <circle cx="28" cy="8" r="3" fill="white" opacity="0.15" />
      <circle cx="28" cy="8" r="1.5" fill="white" opacity="0.3" />
    </svg>
  )
}

export function BolaoLogoSmall({ size = 28, className }: BolaoLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="bgGradSm" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
      </defs>
      <rect width="28" height="28" rx="8" fill="url(#bgGradSm)" />
      {/* Copa */}
      <path d="M10 5h8v5.5c0 2.485-1.791 4.5-4 4.5s-4-2.015-4-4.5V5z" fill="#fde68a" />
      {/* Alças */}
      <path d="M10 7H8a1.5 1.5 0 000 3h2" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M18 7h2a1.5 1.5 0 010 3h-2" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      {/* Pescoço */}
      <rect x="12.5" y="15" width="3" height="2.5" rx="0.5" fill="#f59e0b" />
      {/* Base */}
      <rect x="10" y="17.5" width="8" height="1.5" rx="0.75" fill="#f59e0b" />
      <rect x="9" y="19" width="10" height="1.5" rx="0.75" fill="#fbbf24" />
    </svg>
  )
}
