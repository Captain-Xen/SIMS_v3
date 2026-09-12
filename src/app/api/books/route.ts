import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const books = await db.book.findMany({ orderBy: { title: 'asc' } })
  return NextResponse.json({
    books: books.map((b: any) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      isbn: b.isbn,
      category: b.category,
      copies: b.copies,
      available: b.available,
      shelf: b.shelf,
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role === 'Student') return NextResponse.json({ error: 'Staff only' }, { status: 403 })
  const body = await req.json()
  const book = await db.book.create({
    data: {
      title: body.title,
      author: body.author,
      isbn: body.isbn || null,
      category: body.category || 'General',
      copies: Number(body.copies) || 1,
      available: Number(body.copies) || 1,
      shelf: body.shelf || null,
    },
  })
  return NextResponse.json({ ok: true, id: book.id })
}
