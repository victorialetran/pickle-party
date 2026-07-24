import React from 'react'
import { hashStr } from './db.js'

// Cute pickle characters with bachelorette accessories, drawn as inline SVG.
export const ACCESSORIES = ['veil', 'tiara', 'hearts', 'bow', 'cowboy', 'boa', 'crown']

// The veil is reserved for the bride: it never appears on anonymous answer
// cards or on other players' avatars, so a veiled pickle always means Miranda.
export const CARD_POOL = ACCESSORIES.filter((a) => a !== 'veil')

export function avatarFor(name, playerId) {
  if ((name || '').toLowerCase().includes('miranda')) return 'veil'
  return CARD_POOL[hashStr(playerId) % CARD_POOL.length]
}

function Accessory({ kind }) {
  switch (kind) {
    case 'veil':
      return (
        <g>
          <path
            d="M60 4 C24 8 8 52 14 112 L30 94 C24 58 32 20 60 12 C88 20 96 58 90 94 L106 112 C112 52 96 8 60 4 Z"
            fill="#ffffff"
            opacity="0.85"
          />
          <path d="M38 16 Q60 6 82 16" stroke="#F8BBD0" strokeWidth="5" fill="none" strokeLinecap="round" />
          <circle cx="60" cy="8" r="5" fill="#F48FB1" />
        </g>
      )
    case 'tiara':
      return (
        <g>
          <path d="M40 22 L46 6 L54 20 L60 2 L66 20 L74 6 L80 22 Z" fill="#FFD54F" stroke="#F9A825" strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="60" cy="2" r="3.5" fill="#FF4081" />
          <circle cx="46" cy="6" r="2.5" fill="#FF80AB" />
          <circle cx="74" cy="6" r="2.5" fill="#FF80AB" />
        </g>
      )
    case 'hearts':
      return (
        <g>
          <path d="M34 66 H86" stroke="#E91E63" strokeWidth="4" />
          <path
            d="M46 60 C41 54 32 56 32 63 C32 69 40 74 46 78 C52 74 60 69 60 63 C60 56 51 54 46 60 Z"
            fill="#FF4081" stroke="#C2185B" strokeWidth="2"
          />
          <path
            d="M74 60 C69 54 60 56 60 63 C60 69 68 74 74 78 C80 74 88 69 88 63 C88 56 79 54 74 60 Z"
            fill="#FF4081" stroke="#C2185B" strokeWidth="2"
          />
        </g>
      )
    case 'bow':
      return (
        <g transform="translate(78 14) rotate(18)">
          <path d="M0 0 L-20 -10 L-20 10 Z" fill="#FF4081" stroke="#C2185B" strokeWidth="2" strokeLinejoin="round" />
          <path d="M0 0 L20 -10 L20 10 Z" fill="#FF4081" stroke="#C2185B" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="0" cy="0" r="5" fill="#F50057" />
        </g>
      )
    case 'cowboy':
      return (
        <g>
          <ellipse cx="60" cy="22" rx="34" ry="9" fill="#F48FB1" stroke="#EC407A" strokeWidth="2.5" />
          <path d="M42 22 C42 4 78 4 78 22 Z" fill="#F8BBD0" stroke="#EC407A" strokeWidth="2.5" />
          <path d="M42 19 H78" stroke="#EC407A" strokeWidth="3" />
        </g>
      )
    case 'boa':
      return (
        <g>
          {[26, 37, 48, 59, 70, 81, 92].map((x, i) => (
            <circle key={x} cx={x} cy={112 + (i % 2 ? 4 : -2)} r="8.5" fill={i % 2 ? '#FF80AB' : '#F48FB1'} opacity="0.95" />
          ))}
        </g>
      )
    case 'crown':
      return (
        <g>
          <path d="M38 24 L38 6 L48 16 L60 2 L72 16 L82 6 L82 24 Z" fill="#FFD54F" stroke="#F9A825" strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="60" cy="2" r="3" fill="#FF4081" />
        </g>
      )
    default:
      return null
  }
}

export function Pickle({ accessory = 'none', size = 90, wink = false }) {
  return (
    <svg viewBox="0 0 120 160" width={size} height={(size * 160) / 120} aria-hidden="true" data-accessory={accessory}>
      {/* body */}
      <path
        d="M60 14 C88 14 96 46 94 84 C92 122 82 150 60 150 C38 150 28 122 26 84 C24 46 32 14 60 14 Z"
        fill="#8BC34A"
        stroke="#689F38"
        strokeWidth="4"
      />
      {/* speckles */}
      <circle cx="42" cy="42" r="3" fill="#689F38" opacity="0.55" />
      <circle cx="80" cy="52" r="2.6" fill="#689F38" opacity="0.55" />
      <circle cx="36" cy="102" r="2.6" fill="#689F38" opacity="0.55" />
      <circle cx="84" cy="98" r="3" fill="#689F38" opacity="0.55" />
      <circle cx="60" cy="132" r="2.6" fill="#689F38" opacity="0.55" />
      {/* face */}
      {accessory !== 'hearts' && (
        <g>
          <circle cx="46" cy="68" r="5" fill="#33511E" />
          {wink ? (
            <path d="M68 68 Q74 64 80 68" stroke="#33511E" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          ) : (
            <circle cx="74" cy="68" r="5" fill="#33511E" />
          )}
          <circle cx="47.6" cy="66.4" r="1.6" fill="#fff" />
          {!wink && <circle cx="75.6" cy="66.4" r="1.6" fill="#fff" />}
        </g>
      )}
      <path d="M48 88 Q60 100 72 88" stroke="#33511E" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <ellipse cx="36" cy="82" rx="6" ry="4" fill="#F48FB1" opacity="0.8" />
      <ellipse cx="84" cy="82" rx="6" ry="4" fill="#F48FB1" opacity="0.8" />
      <Accessory kind={accessory} />
    </svg>
  )
}

// The bride pickle — veil + tiara + wink. Used for branding & the winner screen.
export function BridePickle({ size = 110 }) {
  return (
    <svg viewBox="0 0 120 160" width={size} height={(size * 160) / 120} aria-hidden="true">
      <path
        d="M60 4 C24 8 8 52 14 112 L30 94 C24 58 32 20 60 12 C88 20 96 58 90 94 L106 112 C112 52 96 8 60 4 Z"
        fill="#ffffff"
        opacity="0.85"
      />
      <path
        d="M60 14 C88 14 96 46 94 84 C92 122 82 150 60 150 C38 150 28 122 26 84 C24 46 32 14 60 14 Z"
        fill="#8BC34A"
        stroke="#689F38"
        strokeWidth="4"
      />
      <circle cx="42" cy="42" r="3" fill="#689F38" opacity="0.55" />
      <circle cx="80" cy="52" r="2.6" fill="#689F38" opacity="0.55" />
      <circle cx="84" cy="98" r="3" fill="#689F38" opacity="0.55" />
      <circle cx="46" cy="68" r="5" fill="#33511E" />
      <path d="M68 68 Q74 64 80 68" stroke="#33511E" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <circle cx="47.6" cy="66.4" r="1.6" fill="#fff" />
      <path d="M48 88 Q60 100 72 88" stroke="#33511E" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <ellipse cx="36" cy="82" rx="6" ry="4" fill="#F48FB1" opacity="0.8" />
      <ellipse cx="84" cy="82" rx="6" ry="4" fill="#F48FB1" opacity="0.8" />
      <path d="M40 22 L46 6 L54 20 L60 2 L66 20 L74 6 L80 22 Z" fill="#FFD54F" stroke="#F9A825" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="60" cy="2" r="3.5" fill="#FF4081" />
    </svg>
  )
}
