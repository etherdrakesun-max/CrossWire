import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { executeProgrammaticTransfer } from '@/lib/dev-wallet'
import { calculateNextRunAt } from '@/lib/scheduler'

export async function POST(req: NextRequest) {
  try {
    const now = new Date()

    // 1. Fetch active schedules that are due for execution
    const dueSchedules = await prisma.schedule.findMany({
      where: {
        status: 'ACTIVE',
        nextRunAt: {
          lte: now
        },
        OR: [
          { endDate: null },
          { endDate: { gte: now } }
        ]
      }
    })

    console.log(`⏰ Cron scheduler execution started. Found ${dueSchedules.length} due wires.`)

    const results = []

    for (const schedule of dueSchedules) {
      let success = false
      let txHash = null
      let wireId = null
      let errorMsg = null

      // First attempt
      try {
        const transferResult = await executeProgrammaticTransfer({
          recipient: schedule.recipient,
          amount: schedule.amount,
          memo: schedule.memo,
          purposeCode: schedule.purposeCode,
          ownerAddr: schedule.ownerAddr
        })

        if (transferResult.success) {
          success = true
          txHash = transferResult.txHash
          wireId = transferResult.wireId || null
        } else {
          errorMsg = transferResult.error || 'Transfer failed'
        }
      } catch (err: any) {
        errorMsg = err.message || 'EVM execution failed'
      }

      // Retry once if failed
      if (!success) {
        console.log(`⚠️ Schedule ${schedule.id} first attempt failed: "${errorMsg}". Retrying once...`)
        try {
          const retryResult = await executeProgrammaticTransfer({
            recipient: schedule.recipient,
            amount: schedule.amount,
            memo: schedule.memo,
            purposeCode: schedule.purposeCode,
            ownerAddr: schedule.ownerAddr
          })

          if (retryResult.success) {
            success = true
            txHash = retryResult.txHash
            wireId = retryResult.wireId || null
            errorMsg = null // clear error
          } else {
            errorMsg = `Retry failed: ${retryResult.error || 'Transfer failed'}`
          }
        } catch (retryErr: any) {
          errorMsg = `Retry error: ${retryErr.message || 'EVM execution failed'}`
        }
      }

      // 2. Record execution history
      const execution = await prisma.execution.create({
        data: {
          scheduleId: schedule.id,
          txHash,
          wireId,
          status: success ? 'SUCCESS' : 'FAILED',
          error: errorMsg
        }
      })

      // 3. Update schedule to its next run date or mark COMPLETED
      let nextStatus = 'ACTIVE'
      const nextRun = calculateNextRunAt(
        schedule.frequency,
        schedule.dayOfWeek,
        schedule.dayOfMonth,
        schedule.nextRunAt
      )

      if (schedule.endDate && nextRun.getTime() > schedule.endDate.getTime()) {
        nextStatus = 'COMPLETED'
      }

      await prisma.schedule.update({
        where: { id: schedule.id },
        data: {
          status: nextStatus,
          nextRunAt: nextRun
        }
      })

      results.push({
        scheduleId: schedule.id,
        executionId: execution.id,
        status: success ? 'SUCCESS' : 'FAILED',
        txHash,
        error: errorMsg
      })
    }

    return NextResponse.json({
      processed: dueSchedules.length,
      results
    })
  } catch (err: any) {
    console.error('Scheduler execution API route crash:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
