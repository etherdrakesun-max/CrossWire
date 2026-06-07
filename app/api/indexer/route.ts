import { NextResponse } from 'next/server'
import { syncEvents } from '@/lib/indexer'

export async function GET() {
  try {
    await syncEvents()
    return NextResponse.json({ success: true, message: 'Indexing complete' })
  } catch (error: any) {
    console.error('API indexer trigger error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Indexing failed' }, { status: 500 })
  }
}

export async function POST() {
  try {
    await syncEvents()
    return NextResponse.json({ success: true, message: 'Indexing complete' })
  } catch (error: any) {
    console.error('API indexer trigger error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Indexing failed' }, { status: 500 })
  }
}
