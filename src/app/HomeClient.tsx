'use client'

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  useAnimationFrame,
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
    const el = ref.current as HTMLElement | null
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

function TiltCard({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
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
   2) HERO IMAGE CYCLER
====================================================================================== */

const heroImages: { src: string; alt?: string }[] = [
  { src: '/images/players/Arsenal/Arsenal1.png', alt: 'Arsenal jersey' },
  { src: '/images/players/Arsenal/Arsenal2.png', alt: 'Arsenal jersey' },
  { src: '/images/players/Arsenal/Arsenal3.png', alt: 'Arsenal jersey' },
  { src: '/images/players/Arsenal/Arsenal4.png', alt: 'Arsenal jersey' },
  { src: '/images/players/Arsenal/Arsenal5.png', alt: 'Arsenal jersey' },
  { src: '/images/players/Arsenal/Arsenal6.png', alt: 'Arsenal jersey' },
  { src: '/images/players/Arsenal/Arsenal7.png', alt: 'Arsenal jersey' },
  { src: '/images/players/Arsenal/Arsenal8.png', alt: 'Arsenal jersey' },
  { src: '/images/players/Arsenal/Arsenal9.png', alt: 'Arsenal jersey' },
  { src: '/images/players/Arsenal/Arsenal10.png', alt: 'Arsenal jersey' },
  { src: '/images/players/Arsenal/Arsenal11.png', alt: 'Arsenal jersey' },
  { src: '/images/players/Arsenal/Arsenal12.png', alt: 'Arsenal jersey' },
  { src: '/images/players/AtleticoMadrid/AtleticoMadrid1.png', alt: 'Atlético Madrid jersey' },
  { src: '/images/players/AtleticoMadrid/AtleticoMadrid2.png', alt: 'Atlético Madrid jersey' },
  { src: '/images/players/AtleticoMadrid/AtleticoMadrid3.png', alt: 'Atlético Madrid jersey' },
  { src: '/images/players/AtleticoMadrid/AtleticoMadrid4.png', alt: 'Atlético Madrid jersey' },
  { src: '/images/players/AtleticoMadrid/AtleticoMadrid5.png', alt: 'Atlético Madrid jersey' },
  { src: '/images/players/AtleticoMadrid/AtleticoMadrid6.png', alt: 'Atlético Madrid jersey' },
  { src: '/images/players/Barcelona/Barcelona1.png', alt: 'Barcelona jersey' },
  { src: '/images/players/Barcelona/Barcelona2.png', alt: 'Barcelona jersey' },
  { src: '/images/players/Barcelona/Barcelona3.png', alt: 'Barcelona jersey' },
  { src: '/images/players/Barcelona/Barcelona4.png', alt: 'Barcelona jersey' },
  { src: '/images/players/Barcelona/Barcelona5.png', alt: 'Barcelona jersey' },
  { src: '/images/players/Barcelona/Barcelona6.png', alt: 'Barcelona jersey' },
  { src: '/images/players/Barcelona/Barcelona7.png', alt: 'Barcelona jersey' },
  { src: '/images/players/Barcelona/Barcelona8.png', alt: 'Barcelona jersey' },
  { src: '/images/players/Chelsea/Chelsea1.png', alt: 'Chelsea jersey' },
  { src: '/images/players/Chelsea/Chelsea2.png', alt: 'Chelsea jersey' },
  { src: '/images/players/Chelsea/Chelsea3.png', alt: 'Chelsea jersey' },
  { src: '/images/players/Chelsea/Chelsea4.png', alt: 'Chelsea jersey' },
  { src: '/images/players/Chelsea/Chelsea5.png', alt: 'Chelsea jersey' },
  { src: '/images/players/Chelsea/Chelsea6.png', alt: 'Chelsea jersey' },
  { src: '/images/players/Chelsea/Chelsea7.png', alt: 'Chelsea jersey' },
  { src: '/images/players/Chelsea/Chelsea8.png', alt: 'Chelsea jersey' },
  { src: '/images/players/Chelsea/Chelsea9.png', alt: 'Chelsea jersey' },
  { src: '/images/players/Chelsea/Chelsea10.png', alt: 'Chelsea jersey' },
  { src: '/images/players/Chelsea/Chelsea11.png', alt: 'Chelsea jersey' },
  { src: '/images/players/Chelsea/Chelsea12.png', alt: 'Chelsea jersey' },
  { src: '/images/players/Legends/Legends1.png', alt: 'Legends jersey' },
  { src: '/images/players/Liverpool/Liverpool1.png', alt: 'Liverpool jersey' },
  { src: '/images/players/Liverpool/Liverpool2.png', alt: 'Liverpool jersey' },
  { src: '/images/players/Liverpool/Liverpool3.png', alt: 'Liverpool jersey' },
  { src: '/images/players/Liverpool/Liverpool4.png', alt: 'Liverpool jersey' },
  { src: '/images/players/Liverpool/Liverpool5.png', alt: 'Liverpool jersey' },
  { src: '/images/players/Liverpool/Liverpool6.png', alt: 'Liverpool jersey' },
  { src: '/images/players/Liverpool/Liverpool7.png', alt: 'Liverpool jersey' },
  { src: '/images/players/Liverpool/Liverpool8.png', alt: 'Liverpool jersey' },
  { src: '/images/players/Liverpool/Liverpool9.png', alt: 'Liverpool jersey' },
  { src: '/images/players/Liverpool/Liverpool10.png', alt: 'Liverpool jersey' },
  { src: '/images/players/Lyon/Lyon1.png', alt: 'Lyon jersey' },
  { src: '/images/players/Lyon/Lyon2.png', alt: 'Lyon jersey' },
  { src: '/images/players/Lyon/Lyon3.png', alt: 'Lyon jersey' },
  { src: '/images/players/Lyon/Lyon4.png', alt: 'Lyon jersey' },
  { src: '/images/players/Lyon/Lyon5.png', alt: 'Lyon jersey' },
  { src: '/images/players/ManCity/ManCity1.png', alt: 'Man City jersey' },
  { src: '/images/players/ManCity/ManCity2.png', alt: 'Man City jersey' },
  { src: '/images/players/ManCity/ManCity3.png', alt: 'Man City jersey' },
  { src: '/images/players/ManCity/ManCity4.png', alt: 'Man City jersey' },
  { src: '/images/players/ManCity/ManCity5.png', alt: 'Man City jersey' },
  { src: '/images/players/ManCity/ManCity6.png', alt: 'Man City jersey' },
  { src: '/images/players/ManCity/ManCity7.png', alt: 'Man City jersey' },
  { src: '/images/players/ManCity/ManCity8.png', alt: 'Man City jersey' },
  { src: '/images/players/ManUnited/ManUnited1.png', alt: 'Man United jersey' },
  { src: '/images/players/ManUnited/ManUnited2.png', alt: 'Man United jersey' },
  { src: '/images/players/ManUnited/ManUnited3.png', alt: 'Man United jersey' },
  { src: '/images/players/ManUnited/ManUnited4.png', alt: 'Man United jersey' },
  { src: '/images/players/ManUnited/ManUnited5.png', alt: 'Man United jersey' },
  { src: '/images/players/ManUnited/ManUnited6.png', alt: 'Man United jersey' },
  { src: '/images/players/ManUnited/ManUnited7.png', alt: 'Man United jersey' },
  { src: '/images/players/ManUnited/ManUnited8.png', alt: 'Man United jersey' },
  { src: '/images/players/ManUnited/ManUnited9.png', alt: 'Man United jersey' },
  { src: '/images/players/Marselha/Marselha1.png', alt: 'Marseille jersey' },
  { src: '/images/players/Marselha/Marselha2.png', alt: 'Marseille jersey' },
  { src: '/images/players/Marselha/Marselha3.png', alt: 'Marseille jersey' },
  { src: '/images/players/Marselha/Marselha4.png', alt: 'Marseille jersey' },
  { src: '/images/players/Marselha/Marselha5.png', alt: 'Marseille jersey' },
  { src: '/images/players/Marselha/Marselha6.png', alt: 'Marseille jersey' },
  { src: '/images/players/Marselha/Marselha7.png', alt: 'Marseille jersey' },
  { src: '/images/players/Marselha/Marselha8.png', alt: 'Marseille jersey' },
  { src: '/images/players/Monaco/Monaco1.png', alt: 'Monaco jersey' },
  { src: '/images/players/Monaco/Monaco2.png', alt: 'Monaco jersey' },
  { src: '/images/players/Monaco/Monaco3.png', alt: 'Monaco jersey' },
  { src: '/images/players/Monaco/Monaco4.png', alt: 'Monaco jersey' },
  { src: '/images/players/Monaco/Monaco5.png', alt: 'Monaco jersey' },
  { src: '/images/players/Monaco/Monaco6.png', alt: 'Monaco jersey' },
  { src: '/images/players/Monaco/Monaco7.png', alt: 'Monaco jersey' },
  { src: '/images/players/Monaco/Monaco8.png', alt: 'Monaco jersey' },
  { src: '/images/players/Monaco/Monaco9.png', alt: 'Monaco jersey' },
  { src: '/images/players/Monaco/Monaco10.png', alt: 'Monaco jersey' },
  { src: '/images/players/PSG/PSG1.png', alt: 'PSG jersey' },
  { src: '/images/players/PSG/PSG2.png', alt: 'PSG jersey' },
  { src: '/images/players/PSG/PSG3.png', alt: 'PSG jersey' },
  { src: '/images/players/PSG/PSG4.png', alt: 'PSG jersey' },
  { src: '/images/players/PSG/PSG5.png', alt: 'PSG jersey' },
  { src: '/images/players/PSG/PSG6.png', alt: 'PSG jersey' },
  { src: '/images/players/PSG/PSG7.png', alt: 'PSG jersey' },
  { src: '/images/players/PSG/PSG8.png', alt: 'PSG jersey' },
  { src: '/images/players/RealMadrid/RealMadrid1.png', alt: 'Real Madrid jersey' },
  { src: '/images/players/RealMadrid/RealMadrid2.png', alt: 'Real Madrid jersey' },
  { src: '/images/players/RealMadrid/RealMadrid3.png', alt: 'Real Madrid jersey' },
  { src: '/images/players/RealMadrid/RealMadrid4.png', alt: 'Real Madrid jersey' },
  { src: '/images/players/RealMadrid/RealMadrid5.png', alt: 'Real Madrid jersey' },
  { src: '/images/players/RealMadrid/RealMadrid6.png', alt: 'Real Madrid jersey' },
  { src: '/images/players/RealMadrid/RealMadrid7.png', alt: 'Real Madrid jersey' },
  { src: '/images/players/RealMadrid/RealMadrid8.png', alt: 'Real Madrid jersey' },
  { src: '/images/players/RealMadrid/RealMadrid9.png', alt: 'Real Madrid jersey' },
  { src: '/images/players/RealMadrid/RealMadrid10.png', alt: 'Real Madrid jersey' },
  { src: '/images/players/RealMadrid/RealMadrid11.png', alt: 'Real Madrid jersey' },
  { src: '/images/players/RealMadrid/RealMadrid12.png', alt: 'Real Madrid jersey' },
  { src: '/images/players/Tottenham/Tottenham1.png', alt: 'Tottenham jersey' },
  { src: '/images/players/Tottenham/Tottenham2.png', alt: 'Tottenham jersey' },
  { src: '/images/players/Tottenham/Tottenham3.png', alt: 'Tottenham jersey' },
  { src: '/images/players/Tottenham/Tottenham4.png', alt: 'Tottenham jersey' },
  { src: '/images/players/Tottenham/Tottenham5.png', alt: 'Tottenham jersey' },
  { src: '/images/players/Tottenham/Tottenham6.png', alt: 'Tottenham jersey' },
  { src: '/images/players/Tottenham/Tottenham7.png', alt: 'Tottenham jersey' },
  { src: '/images/players/Tottenham/Tottenham8.png', alt: 'Tottenham jersey' },
  { src: '/images/players/Juventus/Juventus1.png', alt: 'Juventus jersey' },
  { src: '/images/players/Juventus/Juventus2.png', alt: 'Juventus jersey' },
  { src: '/images/players/Juventus/Juventus3.png', alt: 'Juventus jersey' },
  { src: '/images/players/Juventus/Juventus4.png', alt: 'Juventus jersey' },
  { src: '/images/players/Juventus/Juventus5.png', alt: 'Juventus jersey' },
  { src: '/images/players/Juventus/Juventus6.png', alt: 'Juventus jersey' },
  { src: '/images/players/Juventus/Juventus7.png', alt: 'Juventus jersey' },
  { src: '/images/players/Juventus/Juventus8.png', alt: 'Juventus jersey' },
  { src: '/images/players/Juventus/Juventus9.png', alt: 'Juventus jersey' },
  { src: '/images/players/Juventus/Juventus10.png', alt: 'Juventus jersey' },
  { src: '/images/players/Juventus/Juventus11.png', alt: 'Juventus jersey' },
  { src: '/images/players/Juventus/Juventus12.png', alt: 'Juventus jersey' },
  { src: '/images/players/Milan/Milan1.png', alt: 'Milan jersey' },
  { src: '/images/players/Milan/Milan2.png', alt: 'Milan jersey' },
  { src: '/images/players/Milan/Milan3.png', alt: 'Milan jersey' },
  { src: '/images/players/Milan/Milan4.png', alt: 'Milan jersey' },
  { src: '/images/players/Milan/Milan5.png', alt: 'Milan jersey' },
  { src: '/images/players/Milan/Milan6.png', alt: 'Milan jersey' },
  { src: '/images/players/Milan/Milan7.png', alt: 'Milan jersey' },
  { src: '/images/players/Milan/Milan8.png', alt: 'Milan jersey' },
  { src: '/images/players/Milan/Milan9.png', alt: 'Milan jersey' },
  { src: '/images/players/Milan/Milan10.png', alt: 'Milan jersey' },
  { src: '/images/players/Milan/Milan11.png', alt: 'Milan jersey' },
  { src: '/images/players/Milan/Milan12.png', alt: 'Milan jersey' },
  { src: '/images/players/Milan/Milan13.png', alt: 'Milan jersey' },
  { src: '/images/players/Milan/Milan14.png', alt: 'Milan jersey' },
  { src: '/images/players/Milan/Milan15.png', alt: 'Milan jersey' },
  { src: '/images/players/Milan/Milan16.png', alt: 'Milan jersey' },
  { src: '/images/players/Inter/Inter1.png', alt: 'Inter jersey' },
  { src: '/images/players/Inter/Inter2.png', alt: 'Inter jersey' },
  { src: '/images/players/Inter/Inter3.png', alt: 'Inter jersey' },
  { src: '/images/players/Inter/Inter4.png', alt: 'Inter jersey' },
  { src: '/images/players/Inter/Inter5.png', alt: 'Inter jersey' },
  { src: '/images/players/Inter/Inter6.png', alt: 'Inter jersey' },
  { src: '/images/players/Inter/Inter7.png', alt: 'Inter jersey' },
  { src: '/images/players/Inter/Inter8.png', alt: 'Inter jersey' },
  { src: '/images/players/Inter/Inter9.png', alt: 'Inter jersey' },
  { src: '/images/players/Inter/Inter10.png', alt: 'Inter jersey' },
  { src: '/images/players/Inter/Inter11.png', alt: 'Inter jersey' },
  { src: '/images/players/Roma/Roma1.png', alt: 'Roma jersey' },
  { src: '/images/players/Roma/Roma2.png', alt: 'Roma jersey' },
  { src: '/images/players/Roma/Roma3.png', alt: 'Roma jersey' },
  { src: '/images/players/Roma/Roma4.png', alt: 'Roma jersey' },
  { src: '/images/players/Roma/Roma5.png', alt: 'Roma jersey' },
  { src: '/images/players/Roma/Roma6.png', alt: 'Roma jersey' },
  { src: '/images/players/Roma/Roma7.png', alt: 'Roma jersey' },
  { src: '/images/players/Roma/Roma8.png', alt: 'Roma jersey' },
  { src: '/images/players/Napoli/Napoli1.png', alt: 'Napoli jersey' },
  { src: '/images/players/Napoli/Napoli2.png', alt: 'Napoli jersey' },
  { src: '/images/players/Napoli/Napoli3.png', alt: 'Napoli jersey' },
  { src: '/images/players/Napoli/Napoli4.png', alt: 'Napoli jersey' },
  { src: '/images/players/Napoli/Napoli5.png', alt: 'Napoli jersey' },
  { src: '/images/players/Napoli/Napoli6.png', alt: 'Napoli jersey' },
  { src: '/images/players/Napoli/Napoli7.png', alt: 'Napoli jersey' },
  { src: '/images/players/Napoli/Napoli8.png', alt: 'Napoli jersey' },
  { src: '/images/players/Bayern/Bayern1.png', alt: 'Bayern jersey' },
  { src: '/images/players/Bayern/Bayern2.png', alt: 'Bayern jersey' },
  { src: '/images/players/Bayern/Bayern3.png', alt: 'Bayern jersey' },
  { src: '/images/players/Bayern/Bayern4.png', alt: 'Bayern jersey' },
  { src: '/images/players/Bayern/Bayern5.png', alt: 'Bayern jersey' },
  { src: '/images/players/Bayern/Bayern6.png', alt: 'Bayern jersey' },
  { src: '/images/players/Bayern/Bayern7.png', alt: 'Bayern jersey' },
  { src: '/images/players/Bayern/Bayern8.png', alt: 'Bayern jersey' },
  { src: '/images/players/Bayern/Bayern9.png', alt: 'Bayern jersey' },
  { src: '/images/players/Bayern/Bayern10.png', alt: 'Bayern jersey' },
  { src: '/images/players/Bayern/Bayern11.png', alt: 'Bayern jersey' },
  { src: '/images/players/Bayern/Bayern12.png', alt: 'Bayern jersey' },
  { src: '/images/players/Bayern/Bayern13.png', alt: 'Bayern jersey' },
  { src: '/images/players/Bayern/Bayern14.png', alt: 'Bayern jersey' },
  { src: '/images/players/Bayern/Bayern15.png', alt: 'Bayern jersey' },
  { src: '/images/players/Bayern/Bayern16.png', alt: 'Bayern jersey' },
  { src: '/images/players/Bayern/Bayern17.png', alt: 'Bayern jersey' },
  { src: '/images/players/Bayern/Bayern18.png', alt: 'Bayern jersey' },
  { src: '/images/players/Bayern/Bayern19.png', alt: 'Bayern jersey' },
  { src: '/images/players/Dortmund/Dortmund1.png', alt: 'Dortmund jersey' },
  { src: '/images/players/Dortmund/Dortmund2.png', alt: 'Dortmund jersey' },
  { src: '/images/players/Dortmund/Dortmund3.png', alt: 'Dortmund jersey' },
  { src: '/images/players/Dortmund/Dortmund4.png', alt: 'Dortmund jersey' },
  { src: '/images/players/Dortmund/Dortmund5.png', alt: 'Dortmund jersey' },
  { src: '/images/players/Dortmund/Dortmund6.png', alt: 'Dortmund jersey' },
  { src: '/images/players/Dortmund/Dortmund7.png', alt: 'Dortmund jersey' },
  { src: '/images/players/Dortmund/Dortmund8.png', alt: 'Dortmund jersey' },
  { src: '/images/players/Dortmund/Dortmund9.png', alt: 'Dortmund jersey' },
  { src: '/images/players/Dortmund/Dortmund10.png', alt: 'Dortmund jersey' },
  { src: '/images/players/Dortmund/Dortmund11.png', alt: 'Dortmund jersey' },
  { src: '/images/players/Leverkusen/Leverkusen1.png', alt: 'Leverkusen jersey' },
  { src: '/images/players/Leverkusen/Leverkusen2.png', alt: 'Leverkusen jersey' },
  { src: '/images/players/Leverkusen/Leverkusen3.png', alt: 'Leverkusen jersey' },
  { src: '/images/players/Leverkusen/Leverkusen4.png', alt: 'Leverkusen jersey' },
  { src: '/images/players/Leverkusen/Leverkusen5.png', alt: 'Leverkusen jersey' },
  { src: '/images/players/Leverkusen/Leverkusen6.png', alt: 'Leverkusen jersey' },
  { src: '/images/players/Leverkusen/Leverkusen7.png', alt: 'Leverkusen jersey' },
  { src: '/images/players/Leverkusen/Leverkusen8.png', alt: 'Leverkusen jersey' },
  { src: '/images/players/Ajax/Ajax1.png', alt: 'Ajax jersey' },
  { src: '/images/players/Ajax/Ajax2.png', alt: 'Ajax jersey' },
  { src: '/images/players/Ajax/Ajax3.png', alt: 'Ajax jersey' },
  { src: '/images/players/Ajax/Ajax4.png', alt: 'Ajax jersey' },
  { src: '/images/players/Ajax/Ajax5.png', alt: 'Ajax jersey' },
  { src: '/images/players/Ajax/Ajax6.png', alt: 'Ajax jersey' },
  { src: '/images/players/Ajax/Ajax7.png', alt: 'Ajax jersey' },
  { src: '/images/players/Ajax/Ajax8.png', alt: 'Ajax jersey' },
  { src: '/images/players/Ajax/Ajax9.png', alt: 'Ajax jersey' },
  { src: '/images/players/Ajax/Ajax10.png', alt: 'Ajax jersey' },
  { src: '/images/players/Ajax/Ajax11.png', alt: 'Ajax jersey' },
  { src: '/images/players/PSV/PSV1.png', alt: 'PSV jersey' },
  { src: '/images/players/PSV/PSV2.png', alt: 'PSV jersey' },
  { src: '/images/players/PSV/PSV3.png', alt: 'PSV jersey' },
  { src: '/images/players/PSV/PSV4.png', alt: 'PSV jersey' },
  { src: '/images/players/PSV/PSV5.png', alt: 'PSV jersey' },
  { src: '/images/players/PSV/PSV6.png', alt: 'PSV jersey' },
  { src: '/images/players/PSV/PSV7.png', alt: 'PSV jersey' },
  { src: '/images/players/PSV/PSV8.png', alt: 'PSV jersey' },
  { src: '/images/players/Feyenoord/Feyenoord1.png', alt: 'Feyenoord jersey' },
  { src: '/images/players/Feyenoord/Feyenoord2.png', alt: 'Feyenoord jersey' },
  { src: '/images/players/Feyenoord/Feyenoord3.png', alt: 'Feyenoord jersey' },
  { src: '/images/players/Feyenoord/Feyenoord4.png', alt: 'Feyenoord jersey' },
  { src: '/images/players/Feyenoord/Feyenoord5.png', alt: 'Feyenoord jersey' },
  { src: '/images/players/Feyenoord/Feyenoord6.png', alt: 'Feyenoord jersey' },
  { src: '/images/players/Feyenoord/Feyenoord7.png', alt: 'Feyenoord jersey' },
  { src: '/images/players/Feyenoord/Feyenoord8.png', alt: 'Feyenoord jersey' },
  { src: '/images/players/Feyenoord/Feyenoord9.png', alt: 'Feyenoord jersey' },
]

function shuffle<T>(arr: T[]) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function HeroImageCycler({ interval = 4200 }: { interval?: number }) {
  const fade = 800

  // ordem aleatória estável por montagem
  const orderRef = useRef<number[]>([])
  if (!orderRef.current.length) {
    orderRef.current = shuffle([...Array(heroImages.length).keys()])
  }

  const ptrRef = useRef<number>(0)
  const aRef = useRef<HTMLImageElement>(null)
  const bRef = useRef<HTMLImageElement>(null)
  const frontIsARef = useRef(true)
  const timerRef = useRef<number | null>(null)

  const firstIndex = orderRef.current[0]
  const initialSrc =
    heroImages[firstIndex]?.src ??
    FALLBACK_IMG

  const playKenBurns = (img: HTMLImageElement | null, dur: number) => {
    if (!img) return
    try {
      const ox = ['center', 'left', 'right'][Math.floor(Math.random() * 3)]
      const oy = ['center', 'top', 'bottom'][Math.floor(Math.random() * 3)]
      img.style.transformOrigin = `${ox} ${oy}`
      ;(img as any).getAnimations?.forEach((a: Animation) => a.cancel())
      img.animate([{ transform: 'scale(1.03)' }, { transform: 'scale(1.0)' }], {
        duration: Math.max(1000, dur),
        easing: 'ease-out',
        fill: 'forwards',
      })
    } catch {}
  }

  const load = (src: string) =>
    new Promise<void>((resolve) => {
      const i = new Image()
      i.onload = () => resolve()
      i.onerror = () => resolve()
      i.src = src
    })

  const swapTo = async (nextIndex: number) => {
    const nextSrc = heroImages[nextIndex]?.src || FALLBACK_IMG
    await load(nextSrc)

    const frontIsA = frontIsARef.current
    const front = frontIsA ? aRef.current : bRef.current
    const back = frontIsA ? bRef.current : aRef.current
    if (!front || !back) return

    back.src = nextSrc
    back.style.transitionDuration = `${fade}ms`
    // forçar reflow
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    back.offsetHeight
    back.classList.add('is-visible')
    front.classList.remove('is-visible')
    playKenBurns(back, interval - fade)
    frontIsARef.current = !frontIsA
  }

  useEffect(() => {
    let killed = false

    if (aRef.current) {
      playKenBurns(aRef.current, interval - fade)
    }

    const tick = async () => {
      if (killed) return

      ptrRef.current = (ptrRef.current + 1) % orderRef.current.length
      if (ptrRef.current === 0) {
        orderRef.current = shuffle(orderRef.current)
      }
      const nextIdx = orderRef.current[ptrRef.current]
      await swapTo(nextIdx)

      if (!killed) {
        timerRef.current = window.setTimeout(tick, interval) as any
      }
    }

    timerRef.current = window.setTimeout(tick, interval) as any

    return () => {
      killed = true
      if (timerRef.current != null) window.clearTimeout(timerRef.current)
    }
  }, [interval])

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_80%_-10%,rgba(59,130,246,0.18),transparent_60%)]" />

      {/* camada A já começa visível com imagem aleatória */}
      <img
        ref={aRef}
        className="hero-layer is-visible"
        src={initialSrc}
        alt=""
        decoding="async"
        onError={(e: any) => {
          const img = e.currentTarget as HTMLImageElement
          if ((img as any)._fallbackApplied) return
          ;(img as any)._fallbackApplied = true
          img.src = FALLBACK_IMG
        }}
      />

      {/* camada B começa vazia e entra nas trocas seguintes */}
      <img
        ref={bRef}
        className="hero-layer"
        src=""
        alt=""
        decoding="async"
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
          transform: scale(1);
          transition-property: opacity, transform;
          transition-timing-function: ease-in-out;
          transition-duration: 800ms;
          will-change: opacity, transform;
        }
        .hero-layer.is-visible {
          opacity: 1;
        }
      `}</style>
    </div>
  )
}

/* ======================================================================================
   4) HIGHLIGHT SPACES
====================================================================================== */

type HighlightSpace = {
  key: 'adult' | 'kids' | 'retro' | 'concept'
  label: string
  href: string
  img: string
  alt?: string
  subtitle?: string
}

const highlightSpaces: HighlightSpace[] = [
  {
    key: 'adult',
    label: 'Adult',
    href: '/products?group=adult',
    img: '/images/spaces/adult.png',
    alt: 'Adult Collection',
    subtitle: 'Sizes S–2XL',
  },
  {
    key: 'kids',
    label: 'Kids',
    href: '/products?group=kids',
    img: '/images/spaces/kids.png',
    alt: 'Kids Collection',
    subtitle: 'Ages 2–13',
  },
  {
    key: 'retro',
    label: 'Retro',
    href: '/products?group=retro',
    img: '/images/spaces/retro.png',
    alt: 'Retro Collection',
    subtitle: 'Timeless classics',
  },
  {
    key: 'concept',
    label: 'Concept Kits',
    href: '/products?group=concept-kits',
    img: '/images/spaces/concept.png',
    alt: 'Concept Kits',
    subtitle: 'Original designs',
  },
]

function ImageSpaces() {
  return (
    <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {highlightSpaces.map((s) => (
        <motion.a
          key={s.key}
          href={s.href}
          whileHover={{ y: -4 }}
          className="group relative overflow-hidden rounded-3xl ring-1 ring-black/5"
        >
          <div className="relative aspect-[16/10] sm:aspect-[5/6]">
            <img
              src={s.img}
              alt={s.alt || s.label}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement
                if ((img as any)._fallbackApplied) return
                ;(img as any)._fallbackApplied = true
                img.src = FALLBACK_IMG
                img.style.objectPosition = 'center'
              }}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <div className="flex items-end justify-between gap-2">
                <div>
                  <h3 className="text-white font-semibold tracking-tight">
                    {s.label}
                  </h3>
                  {s.subtitle && (
                    <p className="text-white/80 text-xs">{s.subtitle}</p>
                  )}
                </div>
                <div className="shrink-0 rounded-full bg-white/90 p-2 backdrop-blur-sm ring-1 ring-black/5 group-hover:bg-white transition">
                  <ArrowRight className="h-4 w-4 text-blue-700" />
                </div>
              </div>
            </div>
          </div>
        </motion.a>
      ))}
    </div>
  )
}

/* ======================================================================================
   Helpers for products
====================================================================================== */

const SALE_MAP_EUR: Record<number, number> = {
  29.99: 70,
  34.99: 100,
  39.99: 120,
  44.99: 150,
  49.99: 165,
  59.99: 200,
  69.99: 230,
}

const SALE_MAP_CENTS: Record<number, number> = Object.fromEntries(
  Object.entries(SALE_MAP_EUR).map(([k, v]) => [
    Math.round(parseFloat(k) * 100),
    Math.round(v * 100),
  ])
) as Record<number, number>

function formatEurFromCents(cents: number | null | undefined) {
  if (cents == null) return ''
  const value = (cents / 100).toFixed(2)
  const withComma = value.replace('.', ',')
  return `${withComma} €`
}

type HomeProduct = any

function getProductImage(p: HomeProduct): string {
  return (
    p.imageUrls?.[0] ??
    p.imageUrls?.[0]?.url ??
    p.mainImage ??
    p.mainImageUrl ??
    p.mainImageURL ??
    p.image ??
    p.imageUrl ??
    p.imageURL ??
    p.coverImage ??
    p.coverImageUrl ??
    p.coverImageURL ??
    p.cardImage ??
    p.cardImageUrl ??
    p.cardImageURL ??
    p.listImage ??
    p.listImageUrl ??
    p.listImageURL ??
    p.gridImage ??
    p.gridImageUrl ??
    p.gridImageURL ??
    p.heroImage ??
    p.heroImageUrl ??
    p.heroImageURL ??
    p.primaryImage ??
    p.primaryImageUrl ??
    p.primaryImageURL ??
    p.thumbnail ??
    p.thumbnailUrl ??
    p.thumbnailURL ??
    p.thumb ??
    p.thumbUrl ??
    p.thumbURL ??
    p.picture ??
    p.pictureUrl ??
    p.pictureURL ??
    p.photo ??
    p.photoUrl ??
    p.photoURL ??
    p.img ??
    p.imgUrl ??
    p.imgURL ??
    p.url ??
    p.src ??
    p.gallery?.[0]?.url ??
    p.gallery?.[0]?.imageUrl ??
    p.gallery?.[0]?.imageURL ??
    p.images?.[0]?.url ??
    p.images?.[0]?.imageUrl ??
    p.images?.[0]?.imageURL ??
    p.productImages?.[0]?.url ??
    p.productImages?.[0]?.imageUrl ??
    p.productImages?.[0]?.imageURL ??
    p.media?.[0]?.url ??
    p.media?.[0]?.imageUrl ??
    p.media?.[0]?.imageURL ??
    FALLBACK_IMG
  )
}

function getProductPricing(p: HomeProduct) {
  const priceCents: number | null =
    typeof p.basePrice === 'number'
      ? p.basePrice
      : typeof p.priceCents === 'number'
      ? p.priceCents
      : typeof p.price === 'number'
      ? Math.round(p.price * 100)
      : null

  let compareAtCents: number | null =
    typeof p.compareAtPriceCents === 'number'
      ? p.compareAtPriceCents
      : typeof p.compareAtPrice === 'number'
      ? Math.round(p.compareAtPrice * 100)
      : null

  if (!compareAtCents && priceCents != null) {
    const mapped = SALE_MAP_CENTS[priceCents]
    if (mapped) compareAtCents = mapped
  }

  const hasDiscount =
    priceCents != null && compareAtCents != null && compareAtCents > priceCents

  const discountPercent = hasDiscount
    ? Math.round(((compareAtCents! - priceCents!) / compareAtCents!) * 100)
    : null

  return { priceCents, compareAtCents, hasDiscount, discountPercent }
}

function normalizeName(p: HomeProduct): string {
  return ((p.name ?? '') as string).toUpperCase()
}

function hasTerm(p: HomeProduct, term: string): boolean {
  return normalizeName(p).includes(term.toUpperCase())
}

function isPlayerVersion(p: HomeProduct): boolean {
  return hasTerm(p, 'PLAYER VERSION')
}

function isLongSleeve(p: HomeProduct): boolean {
  return hasTerm(p, 'LONG SLEEVE')
}

function isRetro(p: HomeProduct): boolean {
  return hasTerm(p, 'RETRO')
}

/* ---------- Product Card ---------- */

function ProductCard({ product }: { product: HomeProduct }) {
  const href = `/products/${product.slug ?? product.id}`

  const imgSrc = getProductImage(product)
  const { priceCents, compareAtCents, hasDiscount, discountPercent } =
    getProductPricing(product)

  const team = (product.team ?? product.club ?? product.clubName ?? '') as string

  return (
    <motion.a
      href={href}
      whileHover={{ y: -6 }}
      className="group product-hover transition rounded-3xl overflow-hidden bg-white ring-1 ring-black/5 flex flex-col hover:ring-blue-200 hover:shadow-lg min-w-[50%] max-w-[50%] sm:min-w-[240px] sm:max-w-[240px] md:min-w-[260px] md:max-w-[260px]"
    >
      <div className="relative h-[200px] sm:h-[260px] md:h-[320px] bg-slate-50">
        <img
          src={imgSrc}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement
            if ((img as any)._fallbackApplied) return
            ;(img as any)._fallbackApplied = true
            img.src = FALLBACK_IMG
          }}
        />
        {discountPercent != null && (
          <div className="absolute left-2 top-2 sm:left-3 sm:top-3 rounded-full bg-red-600 px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-semibold text-white shadow">
            -{discountPercent}%
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col px-2 py-2 sm:px-4 sm:py-3">
        {team && (
          <div className="text-[9px] sm:text-[11px] font-semibold tracking-[0.16em] text-blue-700 uppercase">
            {team}
          </div>
        )}
        <h3 className="mt-0.5 sm:mt-1 text-[11px] sm:text-[15px] font-semibold leading-snug line-clamp-2">
          {product.name}
        </h3>

        <div className="mt-2 sm:mt-3 flex items-baseline gap-1 sm:gap-2">
          {hasDiscount && (
            <span className="text-[10px] sm:text-xs text-gray-400 line-through">
              {formatEurFromCents(compareAtCents)}
            </span>
          )}
          <span className="text-sm sm:text-lg font-semibold text-blue-800">
            {formatEurFromCents(priceCents)}
          </span>
        </div>

        <div className="mt-2 sm:mt-4 flex items-center text-[11px] sm:text-sm text-blue-700">
          View product
          <ArrowRight className="ml-1 h-3 w-3" />
        </div>
      </div>
    </motion.a>
  )
}

/* ---------- Marquee com animação infinita suave ---------- */

function ProductMarquee({ products }: { products: HomeProduct[] }) {
  if (!products.length) return null

  const duplicated = useMemo(() => [...products, ...products], [products])

  const trackRef = useRef<HTMLDivElement | null>(null)
  const baseWidthRef = useRef<number>(0)
  const x = useMotionValue(0)
  const lastXRef = useRef(0)

  useEffect(() => {
    const el = trackRef.current
    if (!el) return

    const measure = () => {
      const full = el.scrollWidth
      baseWidthRef.current = full / 2
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [duplicated])

  useAnimationFrame((_, delta) => {
    const base = baseWidthRef.current
    if (!base) return

    const speedPxPerSec = 60
    const move = (speedPxPerSec * delta) / 1000

    let next = lastXRef.current - move
    if (next <= -base) {
      next += base
    }

    x.set(next)
    lastXRef.current = next
  })

  return (
    <div className="relative -mx-4 sm:mx-0 overflow-hidden">
      <div className="py-3">
        <motion.div ref={trackRef} style={{ x }} className="flex gap-2 sm:gap-4">
          {duplicated.map((p, i) => (
            <ProductCard key={`${p.id ?? p.slug ?? i}-${i}`} product={p} />
          ))}
        </motion.div>
      </div>
    </div>
  )
}

/* ======================================================================================
   5) PAGE
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

  const techSpecs = [
    'ULTRA-SOFT',
    'AERO-MESH',
    'COOL-DRY',
    'PRO STITCH',
    'HYPER PRINT',
    'ALL-DAY COMFORT',
    'GHOST-SEAM',
    'NANO INK',
    'STREET-EDITION',
    'EASY-WEAR',
  ]

  const [homeProducts, setHomeProducts] = useState<HomeProduct[]>([])
  const [loadingHomeProducts, setLoadingHomeProducts] = useState(true)

  useEffect(() => {
    let cancelled = false

    const loadProducts = async () => {
      try {
        const res = await fetch('/api/home-products?limit=120', {
          cache: 'no-store',
        })
        if (!res.ok) throw new Error('Failed to load home products')
        const data = await res.json()
        const list = Array.isArray(data?.products)
          ? data.products
          : Array.isArray(data)
          ? data
          : []

        if (!cancelled) setHomeProducts(list)
      } catch (err) {
        console.error(err)
        if (!cancelled) setHomeProducts([])
      } finally {
        if (!cancelled) setLoadingHomeProducts(false)
      }
    }

    loadProducts()
    return () => {
      cancelled = true
    }
  }, [])

  const categories = useMemo(() => {
    if (!homeProducts.length) return null

    const base = shuffle(homeProducts)

    const filterJerseys = (p: HomeProduct) => {
      const n = normalizeName(p)
      if (!n) return false
      if (isPlayerVersion(p)) return false
      if (isLongSleeve(p)) return false
      if (isRetro(p)) return false
      if (n.includes('SET')) return false
      if (n.includes('SHORTS')) return false
      if (n.includes('TRACKSUIT')) return false
      if (n.includes('CROP TOP')) return false
      if (n.includes('KIT')) return false
      return true
    }

    const mk = (fn: (p: HomeProduct) => boolean) => shuffle(base.filter(fn))

    return {
      currentSeason: mk(
        (p) => hasTerm(p, '25/26') && !isPlayerVersion(p) && !isRetro(p)
      ),
      jerseys: mk(filterJerseys),
      longSleeve: mk((p) => isLongSleeve(p) && !isPlayerVersion(p) && !isRetro(p)),
      playerVersion: mk((p) => isPlayerVersion(p) && !isLongSleeve(p) && !isRetro(p)),
      playerVersionLongSleeve: mk(
        (p) => isPlayerVersion(p) && isLongSleeve(p) && !isRetro(p)
      ),
      retro: mk((p) => isRetro(p) && !isLongSleeve(p) && !isPlayerVersion(p)),
      retroLongSleeve: mk(
        (p) => isRetro(p) && isLongSleeve(p) && !isPlayerVersion(p)
      ),
      conceptKits: mk(
        (p) => hasTerm(p, 'CONCEPT KIT') && !isRetro(p) && !isPlayerVersion(p)
      ),
      preMatch: mk(
        (p) => hasTerm(p, 'PRE-MATCH') && !isRetro(p) && !isPlayerVersion(p)
      ),
      trainingSleeveless: mk(
        (p) =>
          hasTerm(p, 'TRAINING SLEEVELESS SET') &&
          !isRetro(p) &&
          !isPlayerVersion(p)
      ),
      trainingTracksuit: mk(
        (p) =>
          hasTerm(p, 'TRAINING TRACKSUIT') &&
          !isRetro(p) &&
          !isPlayerVersion(p)
      ),
      kidsKits: mk(
        (p) => hasTerm(p, 'KIDS KIT') && !isRetro(p) && !isPlayerVersion(p)
      ),
      cropTops: mk(
        (p) => hasTerm(p, 'CROP TOP') && !isRetro(p) && !isPlayerVersion(p)
      ),
    }
  }, [homeProducts])

  type CategoryKey = keyof NonNullable<typeof categories>

  const CATEGORY_UI: {
    key: CategoryKey
    title: string
    subtitle?: string
    href: string
    group: string
  }[] = [
    // Jerseys
    {
      key: 'currentSeason',
      title: 'Current season 25/26',
      subtitle: 'Latest club & national-team drops (non-player version)',
      href: '/products/current-season-25-26',
      group: 'Jerseys',
    },
    {
      key: 'jerseys',
      title: 'Jerseys (short sleeve)',
      subtitle: 'Standard short-sleeve jerseys (non-player version)',
      href: '/products/jerseys',
      group: 'Jerseys',
    },
    {
      key: 'longSleeve',
      title: 'Long Sleeve Jerseys',
      subtitle: 'Non-player long-sleeve jerseys',
      href: '/products/long-sleeve-jerseys',
      group: 'Jerseys',
    },
    {
      key: 'playerVersion',
      title: 'Player Version Jerseys',
      subtitle: 'On-pitch fit, short sleeve',
      href: '/products/player-version-jerseys',
      group: 'Jerseys',
    },
    {
      key: 'playerVersionLongSleeve',
      title: 'Player Version Long Sleeve Jerseys',
      subtitle: 'On-pitch fit, long sleeve',
      href: '/products/player-version-long-sleeve-jerseys',
      group: 'Jerseys',
    },

    // Retro
    {
      key: 'retro',
      title: 'Retro Jerseys',
      subtitle: 'Throwback legends from classic seasons',
      href: '/products/retro-jerseys',
      group: 'Retro',
    },
    {
      key: 'retroLongSleeve',
      title: 'Retro Long Sleeve Jerseys',
      subtitle: 'Retro designs with long sleeves',
      href: '/products/retro-long-sleeve-jerseys',
      group: 'Retro',
    },

    // Concept & Special
    {
      key: 'conceptKits',
      title: 'Concept Kits',
      subtitle: 'Original concept designs',
      href: '/products/concept-kits',
      group: 'Concept & Special',
    },
    {
      key: 'preMatch',
      title: 'Pre-Match Jerseys',
      subtitle: 'Warm-up and pre-game tops',
      href: '/products/pre-match-jerseys',
      group: 'Concept & Special',
    },

    // Training
    {
      key: 'trainingSleeveless',
      title: 'Training Sleeveless Sets',
      subtitle: 'Tank + shorts training sets',
      href: '/products/training-sleeveless-sets',
      group: 'Training',
    },
    {
      key: 'trainingTracksuit',
      title: 'Training Tracksuits',
      subtitle: 'Full training sets (top & pants)',
      href: '/products/training-tracksuits',
      group: 'Training',
    },

    // Kids & Woman
    {
      key: 'kidsKits',
      title: 'Kids Kits',
      subtitle: 'Full sets for kids',
      href: '/products/kids-kits',
      group: 'Kids & Woman',
    },
    {
      key: 'cropTops',
      title: 'Crop Tops',
      subtitle: 'Stylish cropped tops',
      href: '/products/crop-tops',
      group: 'Kids & Woman',
    },
  ]

  const GROUP_ORDER = [
    'Jerseys',
    'Retro',
    'Concept & Special',
    'Training',
    'Kids & Woman',
  ]

  return (
    <div className="min-h-screen">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <motion.div
          style={{ y: y2 }}
          className="pointer-events-none absolute -top-40 right-[-10%] h-96 w-96 rounded-full blur-3xl opacity-30 bg-blue-300"
        />
        <motion.div
          style={{ y: y1 }}
          className="pointer-events-none absolute -top-20 left-[-10%] h-[28rem] w-[28rem] rounded-full blur-3xl opacity-30 bg-cyan-300"
        />

        <Spotlight>
          <motion.div
            style={{ opacity: opacityHero }}
            className="container-fw py-20 sm:py-28"
          >
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <h1 className="mt-4 text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
                  Authentic &amp; Concept Football Jerseys
                </h1>
                <p className="mt-4 text-gray-600 max-w-prose">
                  We sell existing club and national-team jerseys, as well as original
                  concept jerseys, made to order with reliable worldwide tracked
                  shipping.
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <MagneticButton href="/products">
                    Browse products <ArrowRight className="h-4 w-4" />
                  </MagneticButton>
                </div>

                <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  {[
                    { Icon: Truck, t: 'Worldwide shipping' },
                    { Icon: BadgePercent, t: 'Fair pricing' },
                    { Icon: Shield, t: 'Secure checkout' },
                    { Icon: Globe2, t: 'English Support' },
                  ].map(({ Icon, t }) => (
                    <div
                      key={t}
                      className="flex items-center gap-2 rounded-xl border glass px-3 py-2"
                    >
                      <Icon className="h-4 w-4 text-blue-600" />
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              </div>

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

        {/* tech marquee */}
        <section className="relative border-y bg-white overflow-hidden">
          <div className="w-full py-3">
            <div className="marquee-track flex gap-6 whitespace-nowrap">
              {[...techSpecs, ...techSpecs].map((b, i) => (
                <div
                  key={`${b}-${i}`}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-50/90 px-4 py-1.5 text-[11px] font-semibold tracking-[0.22em] uppercase text-slate-600 ring-1 ring-black/5 shadow-sm"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <span>{b}</span>
                </div>
              ))}
            </div>
          </div>

          <style jsx>{`
            .marquee-track {
              animation: marquee-x 26s linear infinite;
            }

            @keyframes marquee-x {
              0% {
                transform: translateX(0%);
              }
              100% {
                transform: translateX(-50%);
              }
            }
          `}</style>
        </section>

        {/* PROMO IMAGE PEQUENA LOGO A SEGUIR AO MARQUEE */}
        <section className="w-full flex justify-center bg-white px-4 py-4">
          <div className="w-full max-w-[520px] flex flex-col items-center gap-2">
            <p className="text-[11px] sm:text-xs font-medium tracking-[0.16em] uppercase text-slate-500">
              Special Promotion
            </p>
            <div className="relative overflow-hidden rounded-2xl ring-1 ring-black/5 bg-slate-900/5">
              <img
                src="/images/promos/home-promo.png"
                alt="Special Promotion"
                className="w-full h-auto object-cover"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement
                  if ((img as any)._fallbackApplied) return
                  ;(img as any)._fallbackApplied = true
                  img.src = FALLBACK_IMG
                }}
              />
            </div>
          </div>
        </section>
      </section>

      {/* HIGHLIGHTS + PRODUCTS */}
      <section id="products" className="container-fw section-gap">
        <div className="flex items-end justify-between mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Highlights</h2>
          <a href="/products" className="text-sm text-blue-700 hover:underline">
            See all →
          </a>
        </div>

        <ImageSpaces />

        <div className="h-2 sm:h-3" />

        <div className="relative">
          <div className="rounded-3xl bg-gradient-to-b from-slate-50 via-white to-slate-50 ring-1 ring-black/5 p-4 sm:p-6">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">
                  <BadgePercent className="h-3 w-3" />
                  Curated selection
                </div>
                <h3 className="mt-3 text-xl sm:text-2xl font-bold tracking-tight">
                  Some of our products
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-gray-500 max-w-md">
                  Horizontally-scrolling selections for each product type. Everything
                  appears in a fully random order on every page load.
                </p>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-1">
                <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-red-600">
                  Up to -70% vs original prices
                </span>
              </div>
            </div>

            {loadingHomeProducts && (
              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, row) => (
                  <div key={row} className="space-y-2">
                    <div className="h-4 w-40 rounded-full bg-slate-200/70" />
                    <div className="h-3 w-64 rounded-full bg-slate-100/80" />
                    <div className="relative -mx-4 sm:mx-0 overflow-hidden">
                      <div className="py-3">
                        <div className="flex gap-2 sm:gap-4">
                          {Array.from({ length: 8 }).map((__, i) => (
                            <div
                              key={i}
                              className="min-w-[50%] max-w-[50%] sm:min-w-[240px] sm:max-w-[240px] md:min-w-[260px] md:max-w-[260px] h-[200px] sm:h-[260px] md:h-[320px] rounded-3xl bg-gradient-to-br from-slate-100 via-slate-50 to-white animate-pulse"
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loadingHomeProducts && categories && (
              <div className="space-y-10">
                {GROUP_ORDER.map((groupLabel) => {
                  const groupItems = CATEGORY_UI.filter(
                    (c) =>
                      c.group === groupLabel &&
                      categories[c.key] &&
                      categories[c.key]!.length
                  )

                  if (!groupItems.length) return null

                  return (
                    <div key={groupLabel} className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
                          {groupLabel}
                        </h3>
                      </div>

                      <div className="space-y-8">
                        {groupItems.map(({ key, title, subtitle, href }) => {
                          const list = categories[key]
                          if (!list || !list.length) return null

                          return (
                            <div key={key} className="space-y-3">
                              <div className="flex items-baseline justify-between gap-2">
                                <div>
                                  <h4 className="text-lg sm:text-xl font-semibold tracking-tight">
                                    {title}
                                  </h4>
                                  {subtitle && (
                                    <p className="text-xs sm:text-sm text-gray-500">
                                      {subtitle}
                                    </p>
                                  )}
                                </div>
                                <a
                                  href={href}
                                  className="text-xs sm:text-sm text-blue-700 hover:underline"
                                >
                                  View all →
                                </a>
                              </div>

                              <ProductMarquee products={list} />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {!loadingHomeProducts && (!categories || homeProducts.length === 0) && (
              <p className="text-sm text-gray-500">
                No products to show here yet. Please check the full catalog.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="bg-white/70 border-y">
        <motion.div
          style={{ boxShadow: sectionShadow as any }}
          className="container-fw section-gap"
        >
          <div className="grid lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Shirt className="h-5 w-5 text-blue-600" />,
                t: 'Choose an authentic jersey',
                s: 'Select an existing club or national-team shirt.',
              },
              {
                icon: <MousePointer2 className="h-5 w-5 text-blue-600" />,
                t: 'Pick a design',
                s: 'Explore concepts and choose your favorite.',
              },
              {
                icon: <Send className="h-5 w-5 text-blue-600" />,
                t: 'Made-to-order',
                s: 'Produced on demand with wonderful quality.',
              },
              {
                icon: <Truck className="h-5 w-5 text-blue-600" />,
                t: 'Global shipping',
                s: 'Worldwide delivery in 5–7 business days, with tracking on every order.',
              },
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

      <br />
      <br />
      <br />

      {/* CTA */}
      <section className="container-fw pb-20">
        <TiltCard>
          <div className="grid md:grid-cols-2 gap-6 items-center p-8">
            <div>
              <h3 className="text-2xl font-bold">
                Choose your next jersey with confidence
              </h3>
              <p className="mt-2 text-gray-600">
                Discover authentic club and national-team kits alongside our original
                concept designs, then pick your next favorite.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" /> Name & number
                  personalization
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-600" /> Secure payments via
                  Stripe
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" /> Economy shipping with
                  tracking
                </li>
              </ul>
            </div>
            <div className="flex md:justify-end items-center gap-3">
              <MagneticButton href="/products">
                Get started <Zap className="h-4 w-4" />
              </MagneticButton>
              <a href="#faq" className="btn-outline">
                See frequently <br />
                asked questions
              </a>
            </div>
          </div>
        </TiltCard>
      </section>

      {/* GUARANTEES */}
      <section className="bg-white/70 border-y">
        <div className="container-fw section-gap grid md:grid-cols-4 gap-6">
          {[
            {
              Icon: ShieldCheck,
              title: '14-day guarantee',
              desc: 'Size/fit exchange within 14 days (policy applies).',
            },
            {
              Icon: CreditCard,
              title: 'Secure checkout',
              desc: 'Visa, Mastercard, American Express, PayPal, Amazon Pay, Multibanco (PT), Revolut Pay, Klarna, Satispay, Link, all processed securely via Stripe.',
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

      {/* FAQ */}
      <section id="faq" className="container-fw pb-24 pt-16">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">
          Frequently asked questions
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            {
              q: 'How long does shipping take?',
              a: 'It takes 5–7 business days, with tracking code on every order.',
            },
            { q: 'Can I personalize name and number?', a: 'Yes!' },
            {
              q: 'Which payment methods are accepted?',
              a: 'Visa, Mastercard, American Express, PayPal, Amazon Pay, Multibanco (PT), Revolut Pay, Klarna, Satispay, and MB Way.',
            },
            {
              q: 'How can I track my order?',
              a: 'Once your order has been shipped, you will receive an email with your tracking code and a link to track it online. You can track your order at any time through 17track.net or on your national postal website. All orders include worldwide tracked shipping.',
            },
            {
              q: 'Which countries do you ship to?',
              a: 'We ship worldwide. Delivery times vary by destination.',
            },
            {
              q: 'How do I pick the size?',
              a: 'We will provide a detailed size chart and measurement tips in the Size Guide page.',
            },
          ].map((f, i) => (
            <details key={i} className="group card px-5 py-4 open:shadow-md">
              <summary className="flex cursor-pointer items-center justify-between font-medium">
                {f.q}
                <span className="text-blue-600 group-open:rotate-45 transition">
                  +
                </span>
              </summary>
              <p className="mt-2 text-sm text-gray-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="container-fw pb-24">
        <TiltCard>
          <div className="grid md:grid-cols-2 gap-6 items-center p-6 sm:p-8">
            <div>
              <h3 className="text-2xl font-bold">Get launches & news</h3>
              <p className="mt-2 text-gray-600">
                Occasional discounts, pre-sales and special drops.
              </p>
            </div>
            <form
              className="flex w-full flex-col gap-3 sm:flex-row"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                required
                placeholder="Your email"
                className="w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="btn-primary w-full sm:w-auto whitespace-nowrap">
                Subscribe
              </button>
            </form>
          </div>
        </TiltCard>
      </section>
    </div>
  )
}
