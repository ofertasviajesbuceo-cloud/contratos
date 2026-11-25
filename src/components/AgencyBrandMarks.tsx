import React, { useId } from 'react';
import type { AgencyProfile } from '../types/contract';

export const AGENCY_LOGO_SRC = './assets/aistudio/LOGO_OVB_80x80_89ca52e9.png';

export function DiverTriangleLogo({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <img
      src={AGENCY_LOGO_SRC}
      alt="Logotipo Viajes Mar de Hielo"
      draggable={false}
      className={`object-contain select-none ${className}`}
    />
  );
}

export function AgencyStampMark({ className = 'w-[24mm] h-[22mm]' }: { className?: string }) {
  const uid = useId().replace(/:/g, '');
  const filterId = `mdh-blue-stamp-${uid}`;

  return (
    <svg
      viewBox="0 0 120 120"
      className={`select-none -rotate-3 ${className}`}
      role="img"
      aria-label="Sello Agencia Viajes Mar de Hielo"
    >
      <defs>
        <filter id={filterId} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          {/* Extract dark strokes/silhouettes (border, plane, diver, boat, text) and drop yellow fill */}
          <feColorMatrix
            type="matrix"
            in="SourceGraphic"
            result="rawMask"
            values="
              0 0 0 0 0
              0 0 0 0 0
              0 0 0 0 0
              -0.40 -0.90 -0.15 1.00 0
            "
          />
          <feComponentTransfer in="rawMask" result="crispMask">
            <feFuncA type="linear" slope="1.40" intercept="-0.02" />
          </feComponentTransfer>
          {/* Subtle rubber-stamp ink grain without hurting thin lines */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.55"
            numOctaves="2"
            seed="7"
            result="grain"
          />
          <feColorMatrix
            type="matrix"
            in="grain"
            result="grainAlpha"
            values="
              0 0 0 0 0
              0 0 0 0 0
              0 0 0 0 0
              0 0 0 0.16 0.86
            "
          />
          <feComposite in="crispMask" in2="grainAlpha" operator="in" result="stampedMask" />
          <feFlood floodColor="#1d4ed8" floodOpacity="0.92" result="stampInk" />
          <feComposite in="stampInk" in2="stampedMask" operator="in" />
        </filter>
      </defs>
      <image
        href={AGENCY_LOGO_SRC}
        x="4"
        y="4"
        width="112"
        height="112"
        preserveAspectRatio="xMidYMid meet"
        filter={`url(#${filterId})`}
      />
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
        <div className="pt-[0.5mm]">
          <DiverTriangleLogo className="w-[22mm] h-[22mm]" />
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
