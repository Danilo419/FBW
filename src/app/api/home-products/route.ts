// src/app/api/home-products/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const ABS_MAX_TAKE = 50000 // “quase infinito” mas com proteção (podes aumentar se quiseres)

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const limitParamRaw = (searchParams.get('limit') ?? '').trim()

    const wantsAll =
      limitParamRaw.toLowerCase() === 'all' ||
      limitParamRaw.toLowerCase() === 'infinite' ||
      limitParamRaw.toLowerCase() === 'infinity'

    let take: number | undefined

    if (wantsAll) {
      // conta e busca tudo (com um teto de segurança)
      const total = await prisma.product.count()
      take = Math.min(total, ABS_MAX_TAKE)
    } else {
      const n = Number(limitParamRaw || '40')
      const safe = Number.isFinite(n) ? Math.floor(n) : 40
      // aqui NÃO há limite 80/120 — só um teto gigante de segurança
      take = Math.min(Math.max(safe, 1), ABS_MAX_TAKE)
    }

    // Tenta com orderBy createdAt (se existir); se não existir, faz fallback sem orderBy
    let products: any[] = []
    try {
      products = await prisma.product.findMany({
        take,
        orderBy: { createdAt: 'desc' as any },
      })
    } catch {
      products = await prisma.product.findMany({
        take,
      })
    }

    // Se pediu "all", devolve TODOS (baralhados)
    // Se pediu número, devolve esse número (baralhado), mas sem “pegar só 2” por causa de pool curta
    const shuffled = shuffle(products)

    if (wantsAll) {
      return NextResponse.json({ products: shuffled })
    }

    const limit = Math.min(take ?? 40, shuffled.length)
    const selected = shuffled.slice(0, limit)

    return NextResponse.json({ products: selected })
  } catch (err) {
    console.error('Error in /api/home-products:', err)
    return NextResponse.json(
      { products: [], error: 'Failed to load products' },
      { status: 500 }
    )
  }
}
