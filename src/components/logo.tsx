import React from "react";

export function NaturalCreatorLogo({ className = "h-9" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* SVG Icon vectoriel élégant émeraude & cyan sombre */}
      <svg
        viewBox="0 0 100 100"
        className="h-full w-auto"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="ncGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="ncGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Halo externe doux */}
        <circle cx="50" cy="50" r="44" stroke="url(#ncGradient1)" strokeWidth="2" strokeOpacity="0.3" />

        {/* Nœuds réseau IA d'atome / créativité */}
        <path
          d="M 50 12 C 70 25, 88 50, 50 88 C 12 50, 30 25, 50 12 Z"
          fill="url(#ncGradient1)"
          fillOpacity="0.15"
          stroke="url(#ncGradient1)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#subtleGlow)"
        />

        <path
          d="M 20 38 C 35 20, 75 30, 80 62 C 65 80, 25 70, 20 38 Z"
          stroke="url(#ncGradient2)"
          strokeWidth="2.5"
          strokeDasharray="4 3"
          strokeLinecap="round"
        />

        {/* Nœud central - Symbole d'intelligence organique */}
        <circle cx="50" cy="50" r="9" fill="url(#ncGradient1)" />
        <circle cx="50" cy="50" r="4" fill="#ffffff" />
        <circle cx="32" cy="32" r="3" fill="#10b981" />
        <circle cx="68" cy="32" r="3" fill="#06b6d4" />
        <circle cx="50" cy="74" r="3" fill="#14b8a6" />

        {/* Lignes de réseau d'interconnexion */}
        <line x1="50" y1="50" x2="32" y2="32" stroke="#10b981" strokeWidth="1.5" strokeOpacity="0.6" />
        <line x1="50" y1="50" x2="68" y2="32" stroke="#06b6d4" strokeWidth="1.5" strokeOpacity="0.6" />
        <line x1="50" y1="50" x2="50" y2="74" stroke="#14b8a6" strokeWidth="1.5" strokeOpacity="0.6" />
      </svg>

      {/* Texte Marque Élégant */}
      <div className="flex flex-col text-left">
        <span className="text-xl font-black tracking-tight leading-none text-white">
          NaturalCreator<span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">AI</span>
        </span>
        <span className="text-[10px] font-medium tracking-wider text-slate-400 uppercase mt-0.5">
          www.naturalcreatorai.com
        </span>
      </div>
    </div>
  );
}
