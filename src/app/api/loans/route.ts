import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

// GET loans (all for staff, own for students)
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const where = session.role === 'Student' ? { userId: session.id } : {}
  const loans = await db.loan.findMany({
    where,
    include: { book: true, user: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({
    loans: loans.map((l: any) => ({
      id: l.id,
      bookId: l.bookId,
      bookTitle: l.book?.title ?? '',
      bookAuthor: l.book?.author ?? '',
      userId: l.userId,
      userName: l.user?.name ?? '',
      borrowDate: l.borrowDate,
      dueDate: l.dueDate,
      returnDate: l.returnDate,
      status: l.status,
    })),
  })
}

// POST: borrow a book
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { bookId } = await req.json()
  const book = await db.book.findUnique({ where: { id: bookId } })
  if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 })
  if (book.available <= 0) return NextResponse.json({ error: 'No copies available' }, { status: 409 })
  const today = new Date()
  const borrowDate = today.toISOString().slice(0, 10)
  const dueDate = new Date(today.getTime() + 14 * 86400000).toISOString().slice(0, 10)
  const loan = await db.loan.create({ data: { bookId, userId: session.id, borrowDate, dueDate, status: 'Borrowed' } })
  await db.book.update({ where: { id: bookId }, data: { available: book.available - 1 } })
  await db.notification.create({ data: { userId: session.id, title: 'Book borrowed', body: `You borrowed "${book.title}". Due ${dueDate}.`, type: 'info' } })
  return NextResponse.json({ ok: true, id: loan.id })
}
