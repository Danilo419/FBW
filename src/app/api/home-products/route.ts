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
    const limitParam = searchParams.get('limit')

    // limite pedido pelo cliente (HomeClient), default 40, mas nunca > 80
    const limit = Math.min(Math.max(Number(limitParam) || 40, 1), 80)

    // Busca produtos da BD
    const products = await prisma.product.findMany({
      take: Math.max(limit * 3, limit), // pega mais para poder baralhar
      orderBy: {
        createdAt: 'desc', // se não tiveres createdAt, remove esta linha
      },
      // NÃO temos include aqui porque não existe relação "images" no teu modelo
    })

    // Baralha para que não sejam sempre os mesmos
    const shuffled = shuffle(products)
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
