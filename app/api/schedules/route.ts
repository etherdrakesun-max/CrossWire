import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateNextRunAt } from '@/lib/scheduler'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const ownerAddr = searchParams.get('ownerAddr')

    if (!ownerAddr) {
      return NextResponse.json({ error: 'Missing ownerAddr param' }, { status: 400 })
    }

    const schedules = await prisma.schedule.findMany({
      where: {
        ownerAddr: ownerAddr.toLowerCase(),
      },
      include: {
        executions: {
          orderBy: { executedAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(schedules)
  } catch (err: any) {
    console.error('Failed to fetch schedules:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      ownerAddr,
      recipient,
      amount,
      frequency,
      dayOfWeek,
      dayOfMonth,
      startDate,
      endDate,
      purposeCode = 1,
      memo = ''
    } = body

    if (!ownerAddr || !recipient || !amount || !frequency || !startDate) {
      return NextResponse.json({ error: 'Missing required schedule fields' }, { status: 400 })
    }

    const startDateTime = new Date(startDate)
    const endDateTime = endDate ? new Date(endDate) : null

    // Calculate initial nextRunAt date
    const nextRunAt = calculateNextRunAt(
      frequency,
      dayOfWeek !== undefined ? Number(dayOfWeek) : null,
      dayOfMonth !== undefined ? Number(dayOfMonth) : null,
      startDateTime
    )

    const schedule = await prisma.schedule.create({
      data: {
        ownerAddr: ownerAddr.toLowerCase(),
        recipient: recipient.toLowerCase(),
        amount: String(amount),
        frequency,
        dayOfWeek: dayOfWeek !== undefined ? Number(dayOfWeek) : null,
        dayOfMonth: dayOfMonth !== undefined ? Number(dayOfMonth) : null,
        startDate: startDateTime,
        endDate: endDateTime,
        nextRunAt,
        purposeCode: Number(purposeCode),
        memo,
        status: 'ACTIVE'
      }
    })

    return NextResponse.json(schedule)
  } catch (err: any) {
    console.error('Failed to create schedule:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 })
    }

    const currentSchedule = await prisma.schedule.findUnique({
      where: { id: Number(id) }
    })

    if (!currentSchedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    let nextRunAt = currentSchedule.nextRunAt

    // If schedule is resumed, re-calculate the next run date relative to now
    if (status === 'ACTIVE' && currentSchedule.status === 'PAUSED') {
      nextRunAt = calculateNextRunAt(
        currentSchedule.frequency,
        currentSchedule.dayOfWeek,
        currentSchedule.dayOfMonth,
        new Date()
      )
    }

    const updated = await prisma.schedule.update({
      where: { id: Number(id) },
      data: {
        status,
        nextRunAt
      }
    })

    return NextResponse.json(updated)
  } catch (err: any) {
    console.error('Failed to update schedule status:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing id param' }, { status: 400 })
    }

    await prisma.schedule.delete({
      where: { id: Number(id) }
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Failed to delete schedule:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
