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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    /**
     * Quantos produtos devolver ao client.
     * A Home depois filtra por categorias.
     */
    const rawLimit = searchParams.get('limit')
    const limit = Math.min(Math.max(parseInt(rawLimit || '200', 10), 1), 300)

    /**
     * Para não devolver sempre os mesmos:
     * - buscamos uma janela maior (pool)
     * - escolhendo um "skip" aleatório dentro do total
     * - depois baralhamos e cortamos para "limit"
     */
    const total = await prisma.product.count()

    if (!total) {
      return NextResponse.json(
        { products: [] },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } }
      )
    }

    // quantos vamos buscar antes de baralhar (pool)
    const pool = Math.min(Math.max(limit * 8, limit), 2000)

    // escolher um ponto aleatório do catálogo para variar de verdade
    const maxSkip = Math.max(total - pool, 0)
    const skip = maxSkip > 0 ? Math.floor(Math.random() * (maxSkip + 1)) : 0

    // orderBy por id para termos ordem estável (não interessa porque vamos baralhar)
    const products = await prisma.product.findMany({
      skip,
      take: pool,
      orderBy: { id: 'desc' },
    })

    const selected = shuffle(products).slice(0, limit)

    return NextResponse.json(
      { products: selected },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (err) {
    console.error('Error in /api/home-products:', err)

    // aqui eu devolvo 500 para tu veres o erro no Network tab
    return NextResponse.json(
      { products: [], error: 'Failed to load products' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  }
}
