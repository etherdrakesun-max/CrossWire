import { NextRequest } from 'next/server'
import { runAgentExecutionLoop } from '@/lib/agent-executor'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { goal, provider, userAddress } = await req.json()

    if (!goal || !userAddress) {
      return new Response(JSON.stringify({ error: 'Missing required parameters: goal and userAddress' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        try {
          // Send initial starting event
          send({ type: 'start', message: `Initializing agent executor with provider: ${provider}...` })

          // Run the execution loop
          const result = await runAgentExecutionLoop(
            goal,
            provider || 'openai',
            userAddress,
            async (stepNumber, toolName, description, reasoning, result, status) => {
              send({
                type: 'step',
                stepNumber,
                toolName,
                description,
                reasoning,
                result,
                status
              })
            }
          )

          // Send final completion event
          send({
            type: 'done',
            success: result.success,
            summary: result.summary
          })

          controller.close()
        } catch (err: any) {
          console.error('[Agent Execution API Error]:', err)
          send({
            type: 'error',
            message: err?.message || 'An unexpected error occurred during agent planning execution.'
          })
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive'
      }
    })
  } catch (err: any) {
    console.error('[Agent Execution Route Crash]:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
