interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export default function Logo({ size = 'md', showText = true }: LogoProps) {
  const sizes = {
    sm: { icon: 32, text: 'text-xl', gap: 'gap-2' },
    md: { icon: 40, text: 'text-2xl', gap: 'gap-2' },
    lg: { icon: 56, text: 'text-4xl', gap: 'gap-3' },
  };

  const { icon, text, gap } = sizes[size];

  return (
    <div className={`flex items-center ${gap}`}>
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Roof */}
        <path d="M10 35 L50 15 L90 35 L85 40 L50 22 L15 40 Z" fill="#5B9A9A" />
        <path d="M15 40 L50 22 L85 40 L80 45 L50 28 L20 45 Z" fill="#4A8585" />
        {/* Roof ridges */}
        <line x1="30" y1="32" x2="35" y2="42" stroke="#3D7070" strokeWidth="1.5" />
        <line x1="50" y1="22" x2="50" y2="35" stroke="#3D7070" strokeWidth="1.5" />
        <line x1="70" y1="32" x2="65" y2="42" stroke="#3D7070" strokeWidth="1.5" />
        {/* Stall body */}
        <rect x="25" y="45" width="50" height="35" fill="#E8E4DF" stroke="#B8B4AF" strokeWidth="1.5" />
        {/* Counter top */}
        <rect x="22" y="45" width="56" height="6" fill="#D4CFC8" stroke="#B8B4AF" strokeWidth="1" />
        {/* Counter front panel */}
        <rect x="30" y="55" width="40" height="20" fill="#F5F2EE" stroke="#C8C4BF" strokeWidth="1" />
        {/* Support poles */}
        <rect x="23" y="40" width="4" height="40" fill="#8B8580" />
        <rect x="73" y="40" width="4" height="40" fill="#8B8580" />
      </svg>
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={`${text} font-light text-gray-500 tracking-wide`}>Lang</span>
          <span className={`${text} font-bold text-gray-700 -mt-1`}>Stall</span>
        </div>
      )}
    </div>
  );
}
