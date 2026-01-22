// src/app/api/home-products/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    /**
     * Quantos produtos devolver para a Home.
     * A Home depois filtra por categorias.
     *
     * Recomendo:
     *  - 120 → ok
     *  - 200 → excelente variedade
     *  - 300 → máximo razoável
     */
    const rawLimit = searchParams.get('limit')
    const limit = Math.min(
      Math.max(parseInt(rawLimit || '200', 10), 1),
      300
    )

    /**
     * ⚠️ IMPORTANTE
     * Isto faz RANDOM **NO BANCO**
     * ou seja, escolhe a partir de TODO o catálogo
     */
    const products = await prisma.$queryRaw<any[]>`
      SELECT
        "id",
        "name",
        "slug",
        "basePrice",
        "priceCents",
        "price",
        "compareAtPriceCents",
        "compareAtPrice",
        "team",
        "club",
        "clubName",
        "imageUrls",
        "mainImage",
        "mainImageUrl",
        "coverImage",
        "thumbnail",
        "createdAt"
      FROM "Product"
      ORDER BY RANDOM()
      LIMIT ${limit};
    `

    return NextResponse.json(
      { products },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    )
  } catch (err) {
    console.error('Error in /api/home-products:', err)
    return NextResponse.json(
      { products: [] },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    )
  }
}
