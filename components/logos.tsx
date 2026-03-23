export const LogoHorizontal = ({ height = 44 }: { height?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 220" height={height} style={{ display: "block", flexShrink: 0, width: "auto" }}>
    <defs>
      <linearGradient id="lh-g" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style={{ stopColor: "#f5d96a" }} /><stop offset="40%" style={{ stopColor: "#e8c547" }} /><stop offset="100%" style={{ stopColor: "#b8941e" }} />
      </linearGradient>
      <linearGradient id="lh-gh" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style={{ stopColor: "#604800" }} /><stop offset="50%" style={{ stopColor: "#f5d96a" }} /><stop offset="100%" style={{ stopColor: "#604800" }} />
      </linearGradient>
      <filter id="lh-glow"><feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#e8c547" floodOpacity="0.5" /></filter>
    </defs>
    <rect x="40" y="20" width="520" height="1.5" rx="1" fill="url(#lh-gh)" opacity="0.7" />
    <rect x="40" y="200" width="520" height="1.5" rx="1" fill="url(#lh-gh)" opacity="0.7" />
    <rect x="40" y="20" width="22" height="2" fill="#e8c547" /><rect x="40" y="20" width="2" height="22" fill="#e8c547" />
    <rect x="538" y="20" width="22" height="2" fill="#e8c547" /><rect x="558" y="20" width="2" height="22" fill="#e8c547" />
    <rect x="40" y="198" width="22" height="2" fill="#e8c547" /><rect x="40" y="176" width="2" height="24" fill="#e8c547" />
    <rect x="538" y="198" width="22" height="2" fill="#e8c547" /><rect x="558" y="176" width="2" height="24" fill="#e8c547" />
    <text x="300" y="78" fontFamily="'Bebas Neue',Impact,'Arial Black',sans-serif" fontSize="26" letterSpacing="16" fill="url(#lh-g)" textAnchor="middle" filter="url(#lh-glow)">SISTEMA</text>
    <rect x="190" y="88" width="220" height="1" rx="1" fill="#e8c547" opacity="0.4" />
    <text x="300" y="178" fontFamily="'Bebas Neue',Impact,'Arial Black',sans-serif" fontSize="100" letterSpacing="2" fill="url(#lh-g)" textAnchor="middle" filter="url(#lh-glow)">IRONLIFTING</text>
  </svg>
);

export const LogoIL = ({ size = 32 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 420" width={size} height={size * 420 / 400} style={{ display: "block", flexShrink: 0 }}>
    <defs>
      <linearGradient id="le-g" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style={{ stopColor: "#f8e47a" }} /><stop offset="45%" style={{ stopColor: "#e8c547" }} /><stop offset="100%" style={{ stopColor: "#9a7010" }} />
      </linearGradient>
      <linearGradient id="le-gh" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style={{ stopColor: "#604800" }} /><stop offset="50%" style={{ stopColor: "#f5d96a" }} /><stop offset="100%" style={{ stopColor: "#604800" }} />
      </linearGradient>
      <linearGradient id="le-sf" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style={{ stopColor: "#161a24" }} /><stop offset="100%" style={{ stopColor: "#0a0c12" }} />
      </linearGradient>
      <linearGradient id="le-ss" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style={{ stopColor: "#f5d96a" }} /><stop offset="50%" style={{ stopColor: "#e8c547" }} /><stop offset="100%" style={{ stopColor: "#9a7010" }} />
      </linearGradient>
      <filter id="le-glow"><feGaussianBlur stdDeviation="10" result="b" /><feColorMatrix in="b" type="matrix" values="1.2 0.8 0 0 0 0.8 0.6 0 0 0 0 0 0 0 0 0 0 0 0.55 0" result="c" /><feMerge><feMergeNode in="c" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      <filter id="le-glowSm"><feGaussianBlur stdDeviation="4" result="b" /><feColorMatrix in="b" type="matrix" values="1.2 0.8 0 0 0 0.8 0.6 0 0 0 0 0 0 0 0 0 0 0 0.4 0" result="c" /><feMerge><feMergeNode in="c" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      <clipPath id="le-clip"><path d="M200,44 L358,96 L358,248 Q358,346 200,404 Q42,346 42,248 L42,96 Z" /></clipPath>
    </defs>
    <path d="M200,44 L358,96 L358,248 Q358,346 200,404 Q42,346 42,248 L42,96 Z" fill="url(#le-sf)" stroke="url(#le-ss)" strokeWidth="3.5" />
    <path d="M200,60 L344,108 L344,246 Q344,334 200,386 Q56,334 56,246 L56,108 Z" fill="none" stroke="#e8c547" strokeWidth="1" opacity="0.3" />
    <text x="200" y="136" fontFamily="'Bebas Neue',Impact,'Arial Black',sans-serif" fontSize="36" letterSpacing="12" fill="url(#le-g)" textAnchor="middle" filter="url(#le-glowSm)">SISTEMA</text>
    <text x="218" y="305" fontFamily="'Bebas Neue',Impact,'Arial Black',sans-serif" fontSize="210" letterSpacing="-4" fill="url(#le-g)" textAnchor="middle" filter="url(#le-glow)" clipPath="url(#le-clip)">IL</text>
    <rect x="108" y="316" width="184" height="2" rx="1" fill="url(#le-gh)" opacity="0.7" />
    <text x="200" y="342" fontFamily="'Bebas Neue',Impact,'Arial Black',sans-serif" fontSize="14" letterSpacing="8" fill="url(#le-g)" textAnchor="middle" filter="url(#le-glowSm)">IRONLIFTING</text>
    <circle cx="122" cy="337" r="2" fill="#e8c547" opacity="0.45" />
    <circle cx="278" cy="337" r="2" fill="#e8c547" opacity="0.45" />
    <rect x="20" y="20" width="22" height="2" fill="#e8c547" opacity="0.5" /><rect x="20" y="20" width="2" height="22" fill="#e8c547" opacity="0.5" />
    <rect x="358" y="20" width="22" height="2" fill="#e8c547" opacity="0.5" /><rect x="378" y="20" width="2" height="22" fill="#e8c547" opacity="0.5" />
    <rect x="20" y="398" width="22" height="2" fill="#e8c547" opacity="0.5" /><rect x="20" y="376" width="2" height="24" fill="#e8c547" opacity="0.5" />
    <rect x="358" y="398" width="22" height="2" fill="#e8c547" opacity="0.5" /><rect x="378" y="376" width="2" height="24" fill="#e8c547" opacity="0.5" />
  </svg>
);

export const LogoILSolo = ({ size = 28 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 380" width={size} height={size * 380 / 400} style={{ display: "block", flexShrink: 0 }}>
    <defs>
      <linearGradient id="ls-g" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style={{ stopColor: "#f8e47a" }} /><stop offset="45%" style={{ stopColor: "#e8c547" }} /><stop offset="100%" style={{ stopColor: "#9a7010" }} />
      </linearGradient>
      <linearGradient id="ls-gh" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style={{ stopColor: "#604800" }} /><stop offset="50%" style={{ stopColor: "#f5d96a" }} /><stop offset="100%" style={{ stopColor: "#604800" }} />
      </linearGradient>
      <filter id="ls-glow"><feGaussianBlur stdDeviation="10" result="b" /><feColorMatrix in="b" type="matrix" values="1.2 0.8 0 0 0 0.8 0.6 0 0 0 0 0 0 0 0 0 0 0 0.5 0" result="c" /><feMerge><feMergeNode in="c" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      <filter id="ls-glowSm"><feGaussianBlur stdDeviation="3" result="b" /><feColorMatrix in="b" type="matrix" values="1.2 0.8 0 0 0 0.8 0.6 0 0 0 0 0 0 0 0 0 0 0 0.4 0" result="c" /><feMerge><feMergeNode in="c" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
    </defs>
    <rect x="22" y="22" width="22" height="2" fill="#e8c547" opacity="0.6" /><rect x="22" y="22" width="2" height="22" fill="#e8c547" opacity="0.6" />
    <rect x="356" y="22" width="22" height="2" fill="#e8c547" opacity="0.6" /><rect x="376" y="22" width="2" height="22" fill="#e8c547" opacity="0.6" />
    <rect x="22" y="356" width="22" height="2" fill="#e8c547" opacity="0.6" /><rect x="22" y="334" width="2" height="24" fill="#e8c547" opacity="0.6" />
    <rect x="356" y="356" width="22" height="2" fill="#e8c547" opacity="0.6" /><rect x="376" y="334" width="2" height="24" fill="#e8c547" opacity="0.6" />
    <text x="200" y="100" fontFamily="'Bebas Neue',Impact,'Arial Black',sans-serif" fontSize="32" letterSpacing="14" fill="url(#ls-g)" textAnchor="middle" filter="url(#ls-glowSm)">SISTEMA</text>
    <rect x="100" y="112" width="200" height="1.5" rx="1" fill="url(#ls-gh)" opacity="0.5" />
    <text x="218" y="300" fontFamily="'Bebas Neue',Impact,'Arial Black',sans-serif" fontSize="240" letterSpacing="-4" fill="url(#ls-g)" textAnchor="middle" filter="url(#ls-glow)">IL</text>
    <rect x="80" y="318" width="240" height="2" rx="1" fill="url(#ls-gh)" opacity="0.65" />
    <text x="200" y="344" fontFamily="'Bebas Neue',Impact,'Arial Black',sans-serif" fontSize="15" letterSpacing="9" fill="url(#ls-g)" textAnchor="middle" filter="url(#ls-glowSm)">IRONLIFTING</text>
    <circle cx="112" cy="339" r="2" fill="#e8c547" opacity="0.45" />
    <circle cx="288" cy="339" r="2" fill="#e8c547" opacity="0.45" />
  </svg>
);
