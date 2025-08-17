'use client'

import React from 'react'

// Flag components using SVG paths for better compatibility
export function FlagGB({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg">
      <clipPath id="a">
        <path d="M0 0v30h60V0z"/>
      </clipPath>
      <clipPath id="b">
        <path d="M30 15h30v15zv15H0zH0v-15z"/>
      </clipPath>
      <g clipPath="url(#a)">
        <path d="M0 0v30h60V0z" fill="#012169"/>
        <path d="M0 0l60 30m0-30L0 30" stroke="#fff" strokeWidth="6"/>
        <path d="M0 0l60 30m0-30L0 30" clipPath="url(#b)" stroke="#C8102E" strokeWidth="4"/>
        <path d="M30 0v30M0 15h60" stroke="#fff" strokeWidth="10"/>
        <path d="M30 0v30M0 15h60" stroke="#C8102E" strokeWidth="6"/>
      </g>
    </svg>
  )
}

export function FlagZA({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 18 12" xmlns="http://www.w3.org/2000/svg">
      {/* Red stripe */}
      <rect x="0" y="0" width="18" height="3.6" fill="#E03C31"/>
      {/* White stripe */}
      <rect x="0" y="3.6" width="18" height="1.2" fill="white"/>
      {/* Green stripe */}
      <rect x="0" y="4.8" width="18" height="2.4" fill="#00A859"/>
      {/* White stripe */}
      <rect x="0" y="7.2" width="18" height="1.2" fill="white"/>
      {/* Blue stripe */}
      <rect x="0" y="8.4" width="18" height="3.6" fill="#002395"/>
      
      {/* Black triangle */}
      <path d="M0 0 L9 6 L0 12 Z" fill="black"/>
      {/* Yellow triangle */}
      <path d="M0 0 L6 6 L0 12 Z" fill="#FFB81C"/>
    </svg>
  )
}

// Fallback emoji components
export function FlagEmojiGB({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <span className={className} style={{ fontSize: '1rem' }}>
      🇬🇧
    </span>
  )
}

export function FlagEmojiZA({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <span className={className} style={{ fontSize: '1rem' }}>
      🇿🇦
    </span>
  )
}