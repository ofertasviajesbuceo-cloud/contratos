import React from 'react';
import type { AgencyProfile } from '../types/contract';

export function DiverTriangleLogo({ className = 'w-20 h-16' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 96"
      className={className}
      aria-label="Logotipo Viajes Mar de Hielo"
      role="img"
    >
      <polygon
        points="60,4 116,90 4,90"
        fill="#facc15"
        stroke="#0f172a"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {/* Stylized scuba diver silhouette */}
      <g fill="#0f172a">
        <path d="M36 53 c6 -4 14 -6 24 -4 l13 4 l4 -2 l3 4 l-6 4 l-15 -3 l-10 4 l-9 -3 z" />
        <circle cx="77" cy="48" r="4.2" />
        <rect x="48" y="42" width="16" height="5" rx="2.5" transform="rotate(8 56 44)" />
        <path d="M29 56 l10 -4 l-2 6 l-10 3 z" />
      </g>
      <text
        x="60"
        y="83"
        textAnchor="middle"
        fontSize="8.8"
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
        fill="#0f172a"
        letterSpacing="0.2"
      >
        VIAJES mArDEhIELO
      </text>
    </svg>
  );
}

export function AgencyStampMark({ className = 'w-32 h-24' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 170 120"
      className={className}
      aria-label="Sello Agencia Viajes Mar de Hielo"
      role="img"
    >
      <polygon
        points="85,8 152,108 18,108"
        fill="none"
        stroke="#1e3a8a"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <g fill="#1e3a8a" opacity="0.88">
        <path d="M56 61 c7 -4 16 -5 27 -3 l14 4 l5 -2 l3 4 l-7 4 l-16 -3 l-12 4 l-10 -3 z" />
        <circle cx="101" cy="56" r="4.5" />
        <rect x="70" y="50" width="17" height="5" rx="2.5" transform="rotate(8 78 52)" />
      </g>
      <text
        x="85"
        y="84"
        textAnchor="middle"
        fontSize="14"
        fontWeight="800"
        fontFamily="Arial, Helvetica, sans-serif"
        fill="#0f172a"
      >
        AGENCIA
      </text>
      <text
        x="85"
        y="102"
        textAnchor="middle"
        fontSize="9.5"
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
        fill="#1e3a8a"
      >
        VIAJES mArDEhIELO
      </text>
    </svg>
  );
}

export function DocumentWaveHeader({ agency }: { agency: AgencyProfile }) {
  return (
    <div className="relative w-full h-[28mm] overflow-hidden shrink-0 select-none">
      <svg
        viewBox="0 0 794 108"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="mdh-wave-top" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1e40af" />
            <stop offset="55%" stopColor="#3b6cb7" />
            <stop offset="100%" stopColor="#6090d4" />
          </linearGradient>
        </defs>
        <path
          d="M0,0 L794,0 L794,96 C640,96 560,68 410,68 C260,68 160,106 0,104 Z"
          fill="url(#mdh-wave-top)"
        />
        <path
          d="M0,88 C180,104 320,60 500,72 C620,80 710,96 794,84 L794,108 L0,108 Z"
          fill="#93b4e4"
          opacity="0.28"
        />
      </svg>

      <div className="relative z-10 flex items-start justify-between px-[16mm] pt-[2.5mm]">
        <div className="text-white text-[8.3pt] leading-[1.2] font-normal">
          <p className="font-bold tracking-wide">{agency.commercialName}</p>
          <p>{agency.addressLine1}</p>
          <p>{agency.addressLine2}</p>
          <p>{agency.phone}</p>
          <p className="underline">{agency.email}</p>
        </div>
        <div className="pt-[1mm]">
          <DiverTriangleLogo className="w-[24mm] h-[19mm]" />
        </div>
      </div>
    </div>
  );
}

export function DocumentWaveFooter({ agency }: { agency: AgencyProfile }) {
  return (
    <div className="relative w-full h-[17mm] overflow-hidden shrink-0 select-none">
      <svg
        viewBox="0 0 794 64"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="mdh-wave-bot" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#93b4e4" />
            <stop offset="50%" stopColor="#5a87cb" />
            <stop offset="100%" stopColor="#26549c" />
          </linearGradient>
        </defs>
        <path
          d="M0,18 C140,2 280,28 450,24 C600,20 710,4 794,16 L794,64 L0,64 Z"
          fill="url(#mdh-wave-bot)"
        />
        <path
          d="M0,30 C180,8 340,38 520,26 C640,18 730,10 794,22 L794,64 L0,64 Z"
          fill="#26549c"
          opacity="0.42"
        />
      </svg>

      <div className="relative z-10 h-full flex items-end justify-center pb-[3.5mm] px-[14mm]">
        <p className="text-white text-[8.2pt] text-center">{agency.footerText}</p>
      </div>
    </div>
  );
}
