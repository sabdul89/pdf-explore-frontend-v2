import { NextResponse } from 'next/server'

export async function POST(req) {
  const body = await req.json()
  const pdfRegions = body.pdfRegions || []
  const fields = pdfRegions.flatMap((r, i) => [
    { id: `f_${i}_1`, page: r.page, x: r.x + 20, y: r.y + 40, width: Math.min(200, r.width - 40), height: 24, type: 'text', name: `field_${i}_name` },
    { id: `f_${i}_2`, page: r.page, x: r.x + 20, y: r.y + 80, width: Math.min(160, r.width - 40), height: 24, type: 'date', name: `field_${i}_date` },
  ])
  await new Promise(r => setTimeout(r, 350))
  return NextResponse.json({ fields })
}
