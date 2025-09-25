// src/app/HomeClient.tsx
'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'framer-motion'
import {
  ArrowRight,
  Shield,
  Send,
  Truck,
  BadgePercent,
  Globe2,
  Zap,
  MousePointer2,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  Package,
  HeartHandshake,
  Clock,
  Shirt,
} from 'lucide-react'

/* ======================================================================================
   1) REUSABLE PIECES
====================================================================================== */

const FALLBACK_IMG = '/images/players/RealMadrid/RealMadrid12.png'

/** Spotlight that follows the cursor */
function Spotlight({
  className = '',
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top })
  }, [])
  return (
    <div onMouseMove={onMouseMove} className={`relative overflow-hidden ${className}`}>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(600px circle at ${pos.x}px ${pos.y}px, rgba(41,152,255,0.18), transparent 60%)`,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  )
}

/** Magnetic button (leans towards the cursor) */
function MagneticButton({
  children,
  className = '',
  href,
  onClick,
}: {
  children: React.ReactNode
  className?: string
  href?: string
  onClick?: () => void
}) {
  const ref = useRef<HTMLAnchorElement | HTMLButtonElement | null>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 300, damping: 20 })
  const springY = useSpring(y, { stiffness: 300, damping: 20 })

  const handleMouseMove = (e: React.MouseEvent) => {
    const el = ref.current as HTMLElement
    if (!el) return
    const rect = el.getBoundingClientRect()
    const mx = e.clientX - rect.left - rect.width / 2
    const my = e.clientY - rect.top - rect.height / 2
    x.set(mx * 0.3)
    y.set(my * 0.3)
  }
  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  const Comp: any = href ? 'a' : 'button'
  return (
    <motion.div style={{ x: springX, y: springY }}>
      <Comp
        ref={ref as any}
        href={href}
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`btn-primary ${className}`}
      >
        {children}
      </Comp>
    </motion.div>
  )
}

/** 3D tilt card with glow */
function TiltCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const [t, setT] = useState({ rx: 0, ry: 0 })
  const [glow, setGlow] = useState({ x: 50, y: 50 })

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    const rx = (py - 0.5) * 10
    const ry = (0.5 - px) * 10
    setT({ rx, ry })
    setGlow({ x: px * 100, y: py * 100 })
  }

  return (
    <motion.div
      onMouseMove={onMouseMove}
      onMouseLeave={() => setT({ rx: 0, ry: 0 })}
      style={{ transform: `perspective(900px) rotateX(${t.rx}deg) rotateY(${t.ry}deg)` }}
      className={`card ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 hover:opacity-100 transition"
        style={{
          background: `radial-gradient(650px circle at ${glow.x}% ${glow.y}%, rgba(41,152,255,0.25), transparent 45%)`,
        }}
      />
      {children}
    </motion.div>
  )
}

/* ======================================================================================
   2) HERO IMAGE CYCLER (random order, sem flash, Ken Burns, preload)
   >>> Corrigido de forma robusta: 2 camadas, preload e cross-fade por CSS.
====================================================================================== */

const heroImages: { src: string; alt: string }[] = [
  { src: '/images/players/Arsenal/Arsenal1.png', alt: 'image' },
  { src: '/images/players/Arsenal/Arsenal2.png', alt: 'image' },
  { src: '/images/players/Arsenal/Arsenal3.png', alt: 'image' },
  { src: '/images/players/Arsenal/Arsenal4.png', alt: 'image' },
  { src: '/images/players/Arsenal/Arsenal5.png', alt: 'image' },
  { src: '/images/players/Arsenal/Arsenal6.png', alt: 'image' },
  { src: '/images/players/Arsenal/Arsenal7.png', alt: 'image' },
  { src: '/images/players/Arsenal/Arsenal8.png', alt: 'image' },
  { src: '/images/players/Arsenal/Arsenal9.png', alt: 'image' },
  { src: '/images/players/Arsenal/Arsenal10.png', alt: 'image' },
  { src: '/images/players/Arsenal/Arsenal11.png', alt: 'image' },
  { src: '/images/players/Arsenal/Arsenal12.png', alt: 'image' },
  { src: '/images/players/AtleticoMadrid/AtleticoMadrid1.png', alt: 'image' },
  { src: '/images/players/AtleticoMadrid/AtleticoMadrid2.png', alt: 'image' },
  { src: '/images/players/AtleticoMadrid/AtleticoMadrid3.png', alt: 'image' },
  { src: '/images/players/AtleticoMadrid/AtleticoMadrid4.png', alt: 'image' },
  { src: '/images/players/AtleticoMadrid/AtleticoMadrid5.png', alt: 'image' },
  { src: '/images/players/AtleticoMadrid/AtleticoMadrid6.png', alt: 'image' },
  { src: '/images/players/Barcelona/Barcelona1.png', alt: 'image' },
  { src: '/images/players/Barcelona/Barcelona2.png', alt: 'image' },
  { src: '/images/players/Barcelona/Barcelona3.png', alt: 'image' },
  { src: '/images/players/Barcelona/Barcelona4.png', alt: 'image' },
  { src: '/images/players/Barcelona/Barcelona5.png', alt: 'image' },
  { src: '/images/players/Barcelona/Barcelona6.png', alt: 'image' },
  { src: '/images/players/Barcelona/Barcelona7.png', alt: 'image' },
  { src: '/images/players/Barcelona/Barcelona8.png', alt: 'image' },
  { src: '/images/players/Chelsea/Chelsea1.png', alt: 'image' },
  { src: '/images/players/Chelsea/Chelsea2.png', alt: 'image' },
  { src: '/images/players/Chelsea/Chelsea3.png', alt: 'image' },
  { src: '/images/players/Chelsea/Chelsea4.png', alt: 'image' },
  { src: '/images/players/Chelsea/Chelsea5.png', alt: 'image' },
  { src: '/images/players/Chelsea/Chelsea6.png', alt: 'image' },
  { src: '/images/players/Chelsea/Chelsea7.png', alt: 'image' },
  { src: '/images/players/Chelsea/Chelsea8.png', alt: 'image' },
  { src: '/images/players/Chelsea/Chelsea9.png', alt: 'image' },
  { src: '/images/players/Chelsea/Chelsea10.png', alt: 'image' },
  { src: '/images/players/Chelsea/Chelsea11.png', alt: 'image' },
  { src: '/images/players/Chelsea/Chelsea12.png', alt: 'image' },
  { src: '/images/players/Legends/Legends1.png', alt: 'image' },
  { src: '/images/players/Liverpool/Liverpool1.png', alt: 'image' },
  { src: '/images/players/Liverpool/Liverpool2.png', alt: 'image' },
  { src: '/images/players/Liverpool/Liverpool3.png', alt: 'image' },
  { src: '/images/players/Liverpool/Liverpool4.png', alt: 'image' },
  { src: '/images/players/Liverpool/Liverpool5.png', alt: 'image' },
  { src: '/images/players/Liverpool/Liverpool6.png', alt: 'image' },
  { src: '/images/players/Liverpool/Liverpool7.png', alt: 'image' },
  { src: '/images/players/Liverpool/Liverpool8.png', alt: 'image' },
  { src: '/images/players/Liverpool/Liverpool9.png', alt: 'image' },
  { src: '/images/players/Liverpool/Liverpool10.png', alt: 'image' },
  { src: '/images/players/Lyon/Lyon1.png', alt: 'image' },
  { src: '/images/players/Lyon/Lyon2.png', alt: 'image' },
  { src: '/images/players/Lyon/Lyon3.png', alt: 'image' },
  { src: '/images/players/Lyon/Lyon4.png', alt: 'image' },
  { src: '/images/players/Lyon/Lyon5.png', alt: 'image' },
  { src: '/images/players/ManCity/ManCity1.png', alt: 'image' },
  { src: '/images/players/ManCity/ManCity2.png', alt: 'image' },
  { src: '/images/players/ManCity/ManCity3.png', alt: 'image' },
  { src: '/images/players/ManCity/ManCity4.png', alt: 'image' },
  { src: '/images/players/ManCity/ManCity5.png', alt: 'image' },
  { src: '/images/players/ManCity/ManCity6.png', alt: 'image' },
  { src: '/images/players/ManCity/ManCity7.png', alt: 'image' },
  { src: '/images/players/ManCity/ManCity8.png', alt: 'image' },
  { src: '/images/players/ManUnited/ManUnited1.png', alt: 'image' },
  { src: '/images/players/ManUnited/ManUnited2.png', alt: 'image' },
  { src: '/images/players/ManUnited/ManUnited3.png', alt: 'image' },
  { src: '/images/players/ManUnited/ManUnited4.png', alt: 'image' },
  { src: '/images/players/ManUnited/ManUnited5.png', alt: 'image' },
  { src: '/images/players/ManUnited/ManUnited6.png', alt: 'image' },
  { src: '/images/players/ManUnited/ManUnited7.png', alt: 'image' },
  { src: '/images/players/ManUnited/ManUnited8.png', alt: 'image' },
  { src: '/images/players/ManUnited/ManUnited9.png', alt: 'image' },
  { src: '/images/players/Marselha/Marselha1.png', alt: 'image' },
  { src: '/images/players/Marselha/Marselha2.png', alt: 'image' },
  { src: '/images/players/Marselha/Marselha3.png', alt: 'image' },
  { src: '/images/players/Marselha/Marselha4.png', alt: 'image' },
  { src: '/images/players/Marselha/Marselha5.png', alt: 'image' },
  { src: '/images/players/Marselha/Marselha6.png', alt: 'image' },
  { src: '/images/players/Marselha/Marselha7.png', alt: 'image' },
  { src: '/images/players/Marselha/Marselha8.png', alt: 'image' },
  { src: '/images/players/Monaco/Monaco1.png', alt: 'image' },
  { src: '/images/players/Monaco/Monaco2.png', alt: 'image' },
  { src: '/images/players/Monaco/Monaco3.png', alt: 'image' },
  { src: '/images/players/Monaco/Monaco4.png', alt: 'image' },
  { src: '/images/players/Monaco/Monaco5.png', alt: 'image' },
  { src: '/images/players/Monaco/Monaco6.png', alt: 'image' },
  { src: '/images/players/Monaco/Monaco7.png', alt: 'image' },
  { src: '/images/players/Monaco/Monaco8.png', alt: 'image' },
  { src: '/images/players/Monaco/Monaco9.png', alt: 'image' },
  { src: '/images/players/Monaco/Monaco10.png', alt: 'image' },
  { src: '/images/players/PSG/PSG1.png', alt: 'image' },
  { src: '/images/players/PSG/PSG2.png', alt: 'image' },
  { src: '/images/players/PSG/PSG3.png', alt: 'image' },
  { src: '/images/players/PSG/PSG4.png', alt: 'image' },
  { src: '/images/players/PSG/PSG5.png', alt: 'image' },
  { src: '/images/players/PSG/PSG6.png', alt: 'image' },
  { src: '/images/players/PSG/PSG7.png', alt: 'image' },
  { src: '/images/players/PSG/PSG8.png', alt: 'image' },
  { src: '/images/players/RealMadrid/RealMadrid1.png', alt: 'image' },
  { src: '/images/players/RealMadrid/RealMadrid2.png', alt: 'image' },
  { src: '/images/players/RealMadrid/RealMadrid3.png', alt: 'image' },
  { src: '/images/players/RealMadrid/RealMadrid4.png', alt: 'image' },
  { src: '/images/players/RealMadrid/RealMadrid5.png', alt: 'image' },
  { src: '/images/players/RealMadrid/RealMadrid6.png', alt: 'image' },
  { src: '/images/players/RealMadrid/RealMadrid7.png', alt: 'image' },
  { src: '/images/players/RealMadrid/RealMadrid8.png', alt: 'image' },
  { src: '/images/players/RealMadrid/RealMadrid9.png', alt: 'image' },
  { src: '/images/players/RealMadrid/RealMadrid10.png', alt: 'image' },
  { src: '/images/players/RealMadrid/RealMadrid11.png', alt: 'image' },
  { src: '/images/players/RealMadrid/RealMadrid12.png', alt: 'image' },
  { src: '/images/players/Tottenham/Tottenham1.png', alt: 'image' },
  { src: '/images/players/Tottenham/Tottenham2.png', alt: 'image' },
  { src: '/images/players/Tottenham/Tottenham3.png', alt: 'image' },
  { src: '/images/players/Tottenham/Tottenham4.png', alt: 'image' },
  { src: '/images/players/Tottenham/Tottenham5.png', alt: 'image' },
  { src: '/images/players/Tottenham/Tottenham6.png', alt: 'image' },
  { src: '/images/players/Tottenham/Tottenham7.png', alt: 'image' },
  { src: '/images/players/Tottenham/Tottenham8.png', alt: 'image' },
  { src: '/images/players/Juventus/Juventus1.png', alt: 'image' },
  { src: '/images/players/Juventus/Juventus2.png', alt: 'image' },
  { src: '/images/players/Juventus/Juventus3.png', alt: 'image' },
  { src: '/images/players/Juventus/Juventus4.png', alt: 'image' },
  { src: '/images/players/Juventus/Juventus5.png', alt: 'image' },
  { src: '/images/players/Juventus/Juventus6.png', alt: 'image' },
  { src: '/images/players/Juventus/Juventus7.png', alt: 'image' },
  { src: '/images/players/Juventus/Juventus8.png', alt: 'image' },
  { src: '/images/players/Juventus/Juventus9.png', alt: 'image' },
  { src: '/images/players/Juventus/Juventus10.png', alt: 'image' },
  { src: '/images/players/Juventus/Juventus11.png', alt: 'image' },
  { src: '/images/players/Juventus/Juventus12.png', alt: 'image' },
  { src: '/images/players/Milan/Milan1.png', alt: 'image' },
  { src: '/images/players/Milan/Milan2.png', alt: 'image' },
  { src: '/images/players/Milan/Milan3.png', alt: 'image' },
  { src: '/images/players/Milan/Milan4.png', alt: 'image' },
  { src: '/images/players/Milan/Milan5.png', alt: 'image' },
  { src: '/images/players/Milan/Milan6.png', alt: 'image' },
  { src: '/images/players/Milan/Milan7.png', alt: 'image' },
  { src: '/images/players/Milan/Milan8.png', alt: 'image' },
  { src: '/images/players/Milan/Milan9.png', alt: 'image' },
  { src: '/images/players/Milan/Milan10.png', alt: 'image' },
  { src: '/images/players/Milan/Milan11.png', alt: 'image' },
  { src: '/images/players/Milan/Milan12.png', alt: 'image' },
  { src: '/images/players/Milan/Milan13.png', alt: 'image' },
  { src: '/images/players/Milan/Milan14.png', alt: 'image' },
  { src: '/images/players/Milan/Milan15.png', alt: 'image' },
  { src: '/images/players/Milan/Milan16.png', alt: 'image' },
  { src: '/images/players/Inter/Inter1.png', alt: 'image' },
  { src: '/images/players/Inter/Inter2.png', alt: 'image' },
  { src: '/images/players/Inter/Inter3.png', alt: 'image' },
  { src: '/images/players/Inter/Inter4.png', alt: 'image' },
  { src: '/images/players/Inter/Inter5.png', alt: 'image' },
  { src: '/images/players/Inter/Inter6.png', alt: 'image' },
  { src: '/images/players/Inter/Inter7.png', alt: 'image' },
  { src: '/images/players/Inter/Inter8.png', alt: 'image' },
  { src: '/images/players/Inter/Inter9.png', alt: 'image' },
  { src: '/images/players/Inter/Inter10.png', alt: 'image' },
  { src: '/images/players/Inter/Inter11.png', alt: 'image' },
  { src: '/images/players/Roma/Roma1.png', alt: 'image' },
  { src: '/images/players/Roma/Roma2.png', alt: 'image' },
  { src: '/images/players/Roma/Roma3.png', alt: 'image' },
  { src: '/images/players/Roma/Roma4.png', alt: 'image' },
  { src: '/images/players/Roma/Roma5.png', alt: 'image' },
  { src: '/images/players/Roma/Roma6.png', alt: 'image' },
  { src: '/images/players/Roma/Roma7.png', alt: 'image' },
  { src: '/images/players/Roma/Roma8.png', alt: 'image' },
  { src: '/images/players/Napoli/Napoli1.png', alt: 'image' },
  { src: '/images/players/Napoli/Napoli2.png', alt: 'image' },
  { src: '/images/players/Napoli/Napoli3.png', alt: 'image' },
  { src: '/images/players/Napoli/Napoli4.png', alt: 'image' },
  { src: '/images/players/Napoli/Napoli5.png', alt: 'image' },
  { src: '/images/players/Napoli/Napoli6.png', alt: 'image' },
  { src: '/images/players/Napoli/Napoli7.png', alt: 'image' },
  { src: '/images/players/Napoli/Napoli8.png', alt: 'image' },
  { src: '/images/players/Bayern/Bayern1.png', alt: 'image' },
  { src: '/images/players/Bayern/Bayern2.png', alt: 'image' },
  { src: '/images/players/Bayern/Bayern3.png', alt: 'image' },
  { src: '/images/players/Bayern/Bayern4.png', alt: 'image' },
  { src: '/images/players/Bayern/Bayern5.png', alt: 'image' },
  { src: '/images/players/Bayern/Bayern6.png', alt: 'image' },
  { src: '/images/players/Bayern/Bayern7.png', alt: 'image' },
  { src: '/images/players/Bayern/Bayern8.png', alt: 'image' },
  { src: '/images/players/Bayern/Bayern9.png', alt: 'image' },
  { src: '/images/players/Bayern/Bayern10.png', alt: 'image' },
  { src: '/images/players/Bayern/Bayern11.png', alt: 'image' },
  { src: '/images/players/Bayern/Bayern12.png', alt: 'image' },
  { src: '/images/players/Bayern/Bayern13.png', alt: 'image' },
  { src: '/images/players/Bayern/Bayern14.png', alt: 'image' },
  { src: '/images/players/Bayern/Bayern15.png', alt: 'image' },
  { src: '/images/players/Bayern/Bayern16.png', alt: 'image' },
  { src: '/images/players/Bayern/Bayern17.png', alt: 'image' },
  { src: '/images/players/Bayern/Bayern18.png', alt: 'image' },
  { src: '/images/players/Bayern/Bayern19.png', alt: 'image' },
  { src: '/images/players/Dortmund/Dortmund1.png', alt: 'image' },
  { src: '/images/players/Dortmund/Dortmund2.png', alt: 'image' },
  { src: '/images/players/Dortmund/Dortmund3.png', alt: 'image' },
  { src: '/images/players/Dortmund/Dortmund4.png', alt: 'image' },
  { src: '/images/players/Dortmund/Dortmund5.png', alt: 'image' },
  { src: '/images/players/Dortmund/Dortmund6.png', alt: 'image' },
  { src: '/images/players/Dortmund/Dortmund7.png', alt: 'image' },
  { src: '/images/players/Dortmund/Dortmund8.png', alt: 'image' },
  { src: '/images/players/Dortmund/Dortmund9.png', alt: 'image' },
  { src: '/images/players/Dortmund/Dortmund10.png', alt: 'image' },
  { src: '/images/players/Dortmund/Dortmund11.png', alt: 'image' },
  { src: '/images/players/Leverkusen/Leverkusen1.png', alt: 'image' },
  { src: '/images/players/Leverkusen/Leverkusen2.png', alt: 'image' },
  { src: '/images/players/Leverkusen/Leverkusen3.png', alt: 'image' },
  { src: '/images/players/Leverkusen/Leverkusen4.png', alt: 'image' },
  { src: '/images/players/Leverkusen/Leverkusen5.png', alt: 'image' },
  { src: '/images/players/Leverkusen/Leverkusen6.png', alt: 'image' },
  { src: '/images/players/Leverkusen/Leverkusen7.png', alt: 'image' },
  { src: '/images/players/Leverkusen/Leverkusen8.png', alt: 'image' },
  { src: '/images/players/Ajax/Ajax1.png', alt: 'image' },
  { src: '/images/players/Ajax/Ajax2.png', alt: 'image' },
  { src: '/images/players/Ajax/Ajax3.png', alt: 'image' },
  { src: '/images/players/Ajax/Ajax4.png', alt: 'image' },
  { src: '/images/players/Ajax/Ajax5.png', alt: 'image' },
  { src: '/images/players/Ajax/Ajax6.png', alt: 'image' },
  { src: '/images/players/Ajax/Ajax7.png', alt: 'image' },
  { src: '/images/players/Ajax/Ajax8.png', alt: 'image' },
  { src: '/images/players/Ajax/Ajax9.png', alt: 'image' },
  { src: '/images/players/Ajax/Ajax10.png', alt: 'image' },
  { src: '/images/players/Ajax/Ajax11.png', alt: 'image' },
  { src: '/images/players/PSV/PSV1.png', alt: 'image' },
  { src: '/images/players/PSV/PSV2.png', alt: 'image' },
  { src: '/images/players/PSV/PSV3.png', alt: 'image' },
  { src: '/images/players/PSV/PSV4.png', alt: 'image' },
  { src: '/images/players/PSV/PSV5.png', alt: 'image' },
  { src: '/images/players/PSV/PSV6.png', alt: 'image' },
  { src: '/images/players/PSV/PSV7.png', alt: 'image' },
  { src: '/images/players/PSV/PSV8.png', alt: 'image' },
  { src: '/images/players/Feyenoord/Feyenoord1.png', alt: 'image' },
  { src: '/images/players/Feyenoord/Feyenoord2.png', alt: 'image' },
  { src: '/images/players/Feyenoord/Feyenoord3.png', alt: 'image' },
  { src: '/images/players/Feyenoord/Feyenoord4.png', alt: 'image' },
  { src: '/images/players/Feyenoord/Feyenoord5.png', alt: 'image' },
  { src: '/images/players/Feyenoord/Feyenoord6.png', alt: 'image' },
  { src: '/images/players/Feyenoord/Feyenoord7.png', alt: 'image' },
  { src: '/images/players/Feyenoord/Feyenoord8.png', alt: 'image' },
  { src: '/images/players/Feyenoord/Feyenoord9.png', alt: 'image' },
]

function shuffle<T>(arr: T[]) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * NOVO: 2 camadas <img>, preload antes de trocar, cross-fade por CSS e Ken Burns via WAAPI.
 * Mantém a mesma API (interval) e o resto do ficheiro intacto.
 */
function HeroImageCycler({ interval = 4200 }: { interval?: number }) {
  const fade = 800 // duração do cross-fade
  const orderRef = useRef<number[]>(shuffle([...Array(heroImages.length).keys()]))
  const ptrRef = useRef<number>(0)

  const aRef = useRef<HTMLImageElement>(null)
  const bRef = useRef<HTMLImageElement>(null)
  const frontIsARef = useRef(true)
  const timerRef = useRef<number | null>(null)
  const [booted, setBooted] = useState(false)

  const playKenBurns = (img: HTMLImageElement | null, dur: number) => {
    if (!img) return
    try {
      const ox = ['center', 'left', 'right'][Math.floor(Math.random() * 3)]
      const oy = ['center', 'top', 'bottom'][Math.floor(Math.random() * 3)]
      img.style.transformOrigin = `${ox} ${oy}`
      ;(img as any).getAnimations?.().forEach((a: Animation) => a.cancel())
      img.animate(
        [
          { transform: 'scale(1.04)', filter: 'blur(3px)' },
          { transform: 'scale(1.0)', filter: 'blur(0px)' },
        ],
        { duration: Math.max(1000, dur), easing: 'ease-out', fill: 'forwards' }
      )
    } catch {}
  }

  const loadImage = (src: string) =>
    new Promise<void>((resolve) => {
      const img = new Image()
      img.onload = () => resolve()
      img.onerror = () => resolve()
      img.src = src
    })

  const swapTo = async (nextIndex: number) => {
    const nextSrc = heroImages[nextIndex]?.src || FALLBACK_IMG
    await loadImage(nextSrc)

    const frontIsA = frontIsARef.current
    const front = frontIsA ? aRef.current : bRef.current
    const back = frontIsA ? bRef.current : aRef.current
    if (!front || !back) return

    back.src = nextSrc
    back.alt = heroImages[nextIndex]?.alt || 'image'
    back.style.transitionDuration = `${fade}ms`
    // força reflow
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    back.offsetHeight

    back.classList.add('is-visible')
    front.classList.remove('is-visible')

    playKenBurns(back, interval - fade)
    frontIsARef.current = !frontIsA
  }

  useEffect(() => {
    let killed = false

    const start = async () => {
      // preparar duas primeiras
      const i0 = orderRef.current[ptrRef.current]
      const i1 = orderRef.current[(ptrRef.current + 1) % orderRef.current.length]

      if (aRef.current) {
        aRef.current.src = heroImages[i0]?.src || FALLBACK_IMG
        aRef.current.alt = heroImages[i0]?.alt || 'image'
        aRef.current.classList.add('is-visible')
        playKenBurns(aRef.current, interval - fade)
      }
      if (bRef.current) {
        bRef.current.src = heroImages[i1]?.src || FALLBACK_IMG
        bRef.current.alt = heroImages[i1]?.alt || 'image'
        bRef.current.classList.remove('is-visible')
      }
      setBooted(true)

      // o próximo passo começará em i1
      ptrRef.current = (ptrRef.current + 1) % orderRef.current.length

      const tick = async () => {
        if (killed) return
        // avança ponteiro e rebaralha quando volta ao início
        ptrRef.current = (ptrRef.current + 1) % orderRef.current.length
        if (ptrRef.current === 0) orderRef.current = shuffle(orderRef.current)
        const nextIdx = orderRef.current[ptrRef.current]
        await swapTo(nextIdx)
        timerRef.current = window.setTimeout(tick, interval) as any
      }

      timerRef.current = window.setTimeout(tick, interval) as any
    }

    start()

    return () => {
      killed = true
      if (timerRef.current != null) window.clearTimeout(timerRef.current)
    }
  }, [interval])

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-3xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_80%_-10%,rgba(59,130,246,0.18),transparent_60%)]" />

      {!booted && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-100 to-slate-50" />
      )}

      <img
        ref={aRef}
        className="hero-layer"
        src=""
        alt=""
        onError={(e: any) => {
          const img = e.currentTarget as HTMLImageElement
          if ((img as any)._fallbackApplied) return
          ;(img as any)._fallbackApplied = true
          img.src = FALLBACK_IMG
        }}
      />
      <img
        ref={bRef}
        className="hero-layer"
        src=""
        alt=""
        onError={(e: any) => {
          const img = e.currentTarget as HTMLImageElement
          if ((img as any)._fallbackApplied) return
          ;(img as any)._fallbackApplied = true
          img.src = FALLBACK_IMG
        }}
      />

      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-black/5" />

      <style jsx>{`
        .hero-layer {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0;
          transition-property: opacity, transform, filter;
          transition-timing-function: ease-in-out;
          will-change: opacity, transform, filter;
        }
        .hero-layer.is-visible {
          opacity: 1;
        }
      `}</style>
    </div>
  )
}

/* ======================================================================================
   3) MOCK DATA — LOCAL IMAGENS (cards)
====================================================================================== */
type Product = {
  id: string
  name: string
  price: number
  img: string
  tag?: string
}
const products: Product[] = [
  { id: 'kit-aurora',  name: 'Aurora Kit (concept)',  price: 59.9, img: '/images/products/aurora.jpg',  tag: 'New' },
  { id: 'street-pro',  name: 'Street Pro (concept)',  price: 54.9, img: '/images/products/street-pro.jpg', tag: 'Best-seller' },
  { id: 'cosmos',      name: 'Cosmos (concept)',      price: 64.9, img: '/images/products/cosmos.jpg' },
  { id: 'voltage',     name: 'Voltage (concept)',     price: 49.9, img: '/images/products/voltage.jpg' },
  { id: 'cobalt',      name: 'Cobalt (concept)',      price: 52.9, img: '/images/products/cobalt.jpg' },
  { id: 'nebula',      name: 'Nebula (limited)',      price: 67.9, img: '/images/products/nebula.jpg', tag: 'Limited' },
  { id: 'wave',        name: 'Wave (concept)',        price: 57.5, img: '/images/products/wave.jpg' },
  { id: 'onyx',        name: 'Onyx (concept)',        price: 62.0, img: '/images/products/onyx.jpg' },
]
const eur = (v: number) => v.toLocaleString('en-US', { style: 'currency', currency: 'EUR' })

/* ======================================================================================
   4) PAGE
====================================================================================== */
export default function Home() {
  const { scrollY } = useScroll()
  const START = 420
  const SPAN = 560

  const y1 = useTransform(scrollY, [0, START + SPAN], [0, -80])
  const y2 = useTransform(scrollY, [0, START + SPAN], [0, -140])
  const opacityHero = useTransform(scrollY, [0, START, START + SPAN], [1, 1, 0.18])

  const velocity = useVelocity(scrollY)
  const showShadow = useTransform(velocity, [0, 100], [0, 1])
  const shadowSpring = useSpring(showShadow, { stiffness: 200, damping: 30 })
  const sectionShadow = useTransform(shadowSpring, (v) =>
    v > 0.2 ? '0 10px 30px -15px rgba(2,8,23,0.12)' : 'none'
  )

  return (
    <div className="min-h-screen">
      {/* =================== HERO =================== */}
      <section className="relative overflow-hidden">
        <motion.div style={{ y: y2 }} className="pointer-events-none absolute -top-40 right-[-10%] h-96 w-96 rounded-full blur-3xl opacity-30 bg-blue-300" />
        <motion.div style={{ y: y1 }} className="pointer-events-none absolute -top-20 left-[-10%] h-[28rem] w-[28rem] rounded-full blur-3xl opacity-30 bg-cyan-300" />

        <Spotlight>
          <motion.div style={{ opacity: opacityHero }} className="container-fw py-20 sm:py-28">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              {/* left copy */}
              <div>
                <h1 className="mt-4 text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
                  Authentic &amp; Concept Football Jerseys
                </h1>
                <p className="mt-4 text-gray-600 max-w-prose">
                  We sell existing club and national-team jerseys, as well as original concept jerseys — made to order with reliable worldwide tracked shipping.
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <MagneticButton href="/products">
                    Browse products <ArrowRight className="h-4 w-4" />
                  </MagneticButton>
                </div>

                {/* trust badges */}
                <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  {[
                    { Icon: Truck, t: 'Worldwide shipping' },
                    { Icon: BadgePercent, t: 'Fair pricing' },
                    { Icon: Shield, t: 'Secure checkout' },
                    { Icon: Globe2, t: 'Support English' },
                  ].map(({ Icon, t }) => (
                    <div key={t} className="flex items-center gap-2 rounded-xl border glass px-3 py-2">
                      <Icon className="h-4 w-4 text-blue-600" />
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* right mockup com animação pro */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="relative"
              >
                <TiltCard className="shadow-glow overflow-hidden">
                  <HeroImageCycler interval={4200} />
                </TiltCard>
              </motion.div>
            </div>
          </motion.div>
        </Spotlight>

        {/* marquee of tech specs */}
        <div className="relative border-y bg-white">
          <div className="container-fw py-4 overflow-hidden">
            <div className="flex gap-12 animate-marquee whitespace-nowrap opacity-60">
              {['ULTRA-FIT','AERO-MESH','COOL-DRY','PRO STITCH','HYPER PRINT','GHOST-SEAM','NANO INK','STREET-EDITION'].map((b) => (
                <span key={b} className="text-xs tracking-widest">{b}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =================== HIGHLIGHTS =================== */}
      <section id="products" className="container-fw section-gap">
        <div className="flex items-end justify-between mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Highlights</h2>
          <a href="/products" className="text-sm text-blue-700 hover:underline">See all →</a>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((p) => (
            <motion.a
              key={p.id}
              href={`/products/${p.id}`}
              whileHover={{ y: -6 }}
              className="group product-hover transition"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-3xl">
                <img
                  src={p.img}
                  alt={p.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => {
                    const img = e.currentTarget
                    if ((img as any)._fallbackApplied) return
                    ;(img as any)._fallbackApplied = true
                    img.src = FALLBACK_IMG
                  }}
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />
                {p.tag && (
                  <span className="absolute left-3 top-3 badge bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                    {p.tag}
                  </span>
                )}
                <motion.div initial={{ opacity: 0, y: 10 }} whileHover={{ opacity: 1, y: 0 }} className="absolute bottom-3 left-3 right-3">
                  <div className="flex items-center justify-between text-white">
                    <span className="text-sm">Add to cart</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </motion.div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold tracking-tight">{p.name}</h3>
                  <span className="text-blue-700 font-semibold">{eur(p.price)}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">Affordable tracked shipping</p>
              </div>
            </motion.a>
          ))}
        </div>
      </section>

      {/* =================== HOW IT WORKS =================== */}
      <section id="how" className="bg-white/70 border-y">
        <motion.div style={{ boxShadow: sectionShadow as any }} className="container-fw section-gap">
          <div className="grid lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Shirt className="h-5 w-5 text-blue-600" />,
                t: 'Choose an authentic jersey',
                s: 'Select an existing club or national-team shirt.',
              },
              { icon: <MousePointer2 className="h-5 w-5 text-blue-600" />, t: 'Pick a design', s: 'Explore concepts and choose your favorite.' },
              { icon: <Send className="h-5 w-5 text-blue-600" />, t: 'Made-to-order', s: 'Produced on demand with wonderful quality.' },
              { icon: <Truck className="h-5 w-5 text-blue-600" />, t: 'Global shipping', s: 'Economy option (15–30 days) and tracking on every order.' },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: i * 0.1 }}
                className="group card p-6 hover:shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-blue-50 p-2">{f.icon}</div>
                  <h3 className="font-semibold">{f.t}</h3>
                </div>
                <p className="mt-2 text-sm text-gray-600">{f.s}</p>
                <div className="mt-4 h-1 rounded bg-gradient-to-r from-blue-600 to-cyan-400 w-0 group-hover:w-full transition-all" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* =================== REVIEWS =================== */}
      <section id="reviews" className="container-fw section-gap">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">Community reviews</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="card p-6">
              <div className="flex items-center gap-2 text-yellow-500 mb-2">
                {'★★★★★'.split('').map((_, ix) => (
                  <span key={ix}>★</span>
                ))}
              </div>
              <p className="text-sm text-gray-700">
                Amazing quality and perfect cut. Worth the wait with economy shipping. Recommend!
              </p>
              <div className="mt-4 text-xs text-gray-500">— Customer #{i}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* =================== CTA =================== */}
      <section className="container-fw pb-20">
        <TiltCard>
          <div className="grid md:grid-cols-2 gap-6 items-center p-8">
            <div>
              <h3 className="text-2xl font-bold">Choose your next jersey with confidence</h3>
              <p className="mt-2 text-gray-600">
                Discover authentic club and national-team kits alongside our original concept designs — then pick your next favorite.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600"/> Name & number personalization</li>
                <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue-600"/> Secure payments via Stripe</li>
                <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-amber-600"/> Economy shipping with tracking</li>
              </ul>
            </div>
            <div className="flex md:justify-end items-center gap-3">
              <MagneticButton href="/products">
                Get started <Zap className="h-4 w-4" />
              </MagneticButton>
              <a href="#faq" className="btn-outline">
                See frequently <br />asked questions
              </a>
            </div>
          </div>
        </TiltCard>
      </section>

      {/* =================== EXTRA: GUARANTEES =================== */}
      <section className="bg-white/70 border-y">
        <div className="container-fw section-gap grid md:grid-cols-4 gap-6">
          {[
            { Icon: ShieldCheck, title: '14-day guarantee', desc: 'Size/fit exchange within 14 days (policy applies).' },
            {
              Icon: CreditCard,
              title: 'Secure checkout',
              desc: 'Visa, Mastercard, American Express, PayPal, Amazon Pay, Multibanco (PT), Revolut Pay, Klarna, Satispay, Link — processed securely via Stripe.',
            },
            {
              Icon: Package,
              title: 'On-demand production',
              desc: 'Incredible stitching and print quality.',
            },
            {
              Icon: HeartHandshake,
              title: 'Dedicated support',
              desc: 'Dedicated support in English via email and Instagram.',
            },
          ].map((f, i) => (
            <div key={i} className="group card p-5 hover:shadow-xl">
              <div className="flex items-center gap-3">
                <f.Icon className="h-5 w-5 text-blue-600" />
                <div className="font-semibold">{f.title}</div>
              </div>
              <p className="mt-2 text-sm text-gray-600">{f.desc}</p>
              <div className="mt-4 h-1 rounded bg-gradient-to-r from-blue-600 to-cyan-400 w-0 group-hover:w-full transition-all" />
            </div>
          ))}
        </div>
      </section>

      {/* =================== FAQ =================== */}
      <section id="faq" className="container-fw pb-24 pt-16">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">Frequently asked questions</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { q: 'How long does economy shipping take?', a: 'Usually 15–30 days, with tracking code on every order.' },
            { q: 'Can I personalize name and number?', a: 'Yes!' },
            {
              q: 'Which payment methods are accepted?',
              a: 'Visa, Mastercard, American Express, PayPal, Amazon Pay, Multibanco (PT), Revolut Pay, Klarna, Satispay, and MB Way.',
            },
            { q: 'What if the size does not fit?', a: 'You can exchange within the first 14 days (policy applies).' },
            { q: 'Which countries do you ship to?', a: 'We ship worldwide. Delivery times vary by destination.' },
            { q: 'How do I pick the size?', a: 'We will provide a detailed size chart and measurement tips.' },
          ].map((f, i) => (
            <details key={i} className="group card px-5 py-4 open:shadow-md">
              <summary className="flex cursor-pointer items-center justify-between font-medium">
                {f.q}
                <span className="text-blue-600 group-open:rotate-45 transition">+</span>
              </summary>
              <p className="mt-2 text-sm text-gray-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* =================== NEWSLETTER =================== */}
      <section className="container-fw pb-24">
        <TiltCard>
          <div className="grid md:grid-cols-2 gap-6 items-center p-8">
            <div>
              <h3 className="text-2xl font-bold">Get launches & news</h3>
              <p className="mt-2 text-gray-600">Occasional discounts, pre-sales and special drops.</p>
            </div>
            <form className="flex w-full gap-3" onSubmit={(e)=>e.preventDefault()}>
              <input
                type="email"
                required
                placeholder="Your email"
                className="flex-1 rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="btn-primary">Subscribe</button>
            </form>
          </div>
        </TiltCard>
      </section>
    </div>
  )
}
