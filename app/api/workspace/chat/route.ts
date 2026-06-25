import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { TOOLS, executeTool } from '@/lib/agent-executor'

const WORKSPACE_SYSTEM_PROMPT = `You are the CrossWire AI Assistant — an enterprise-grade AI treasury and payments workspace assistant.

You help corporate treasury teams manage their operations through natural language. You have access to a comprehensive toolset for:

1. **Payments**: Send USDC wire transfers, check balances, manage contacts
2. **Invoicing**: Create, view, and pay invoices  
3. **Treasury**: FX swaps between stablecoins (USDC/EURC), treasury funding
4. **Compliance**: Sanctions screening (OFAC/EU), compliance checks
5. **Scheduling**: Recurring payment management
6. **AI Agents**: Multi-agent swarm orchestration, agent registry
7. **Memory**: Persistent key-value storage for user preferences

PERSONALITY:
- Professional, concise, and action-oriented
- You speak like a seasoned treasury operations specialist
- Format responses in clean markdown with clear structure
- When executing actions, explain what you're doing and why
- Proactively suggest next steps after completing tasks
- Use tables and structured data when presenting financial info

IMPORTANT RULES:
- When the user asks to do something, determine which tool(s) to use and execute them
- Always explain the results clearly after tool execution
- If a request is ambiguous, ask for clarification before executing
- For payments, always confirm the amount and recipient before executing
- Never expose internal system details or raw error traces to users

AVAILABLE TOOLS:
${TOOLS.map(t => `- ${t.name}: ${t.description}`).join('\n')}

Connected wallet address will be provided with each message.`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { message, conversationId, userAddress, provider = 'deepseek', isTemporary = false, history = [] } = body

    if (!message || !userAddress) {
      return new Response(JSON.stringify({ error: 'Message and userAddress are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const userAddrLower = userAddress.toLowerCase()

    // Get or create conversation (skip DB operations if isTemporary)
    let conversation: any = null
    let previousMessages: any[] = []

    if (!isTemporary) {
      if (conversationId) {
        conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
          include: { messages: { orderBy: { createdAt: 'asc' }, take: 50 } }
        })
        if (!conversation) {
          return new Response(JSON.stringify({ error: 'Conversation not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          })
        }
      } else {
        // Create new conversation
        const title = message.length > 60 ? message.slice(0, 57) + '...' : message
        conversation = await prisma.conversation.create({
          data: {
            userAddress: userAddrLower,
            title,
            messages: { create: [] }
          },
          include: { messages: true }
        })
      }

      // Save user message
      await prisma.chatMessage.create({
        data: {
          conversationId: conversation.id,
          role: 'user',
          content: message
        }
      })

      previousMessages = conversation.messages.map((m: any) => ({
        role: m.role === 'tool' ? 'user' : m.role,
        content: m.role === 'tool' ? `Tool Result (${m.toolName}): ${m.content}` : m.content
      }))
    } else {
      previousMessages = history.map((m: any) => ({
        role: m.role === 'tool' ? 'user' : m.role,
        content: m.role === 'tool' ? `Tool Result (${m.toolName}): ${m.content}` : m.content
      }))
    }

    const apiKey = provider === 'deepseek' ? process.env.DEEPSEEK_API_KEY : process.env.OPENAI_API_KEY
    const apiBase = provider === 'deepseek' ? 'https://api.deepseek.com' : 'https://api.openai.com/v1'
    const modelName = provider === 'deepseek' ? 'deepseek-v4-flash' : 'gpt-4o-mini'

    if (!apiKey) {
      return new Response(JSON.stringify({ error: `API key for ${provider} not configured` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Create SSE stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        try {
          send({ type: 'conversation', id: conversation?.id || 'temporary' })

          const messages: any[] = [
            { role: 'system', content: WORKSPACE_SYSTEM_PROMPT + `\n\nConnected wallet: ${userAddrLower}` },
            ...previousMessages,
            { role: 'user', content: message }
          ]

          let iterations = 0
          const maxIterations = 6

          const jsonRoutingBlock = `

RESPONSE FORMAT — You MUST reply with a valid JSON object. Choose exactly one:

Option A — Call a tool:
{"thought": "why I need this tool", "action": {"toolName": "tool_name", "arguments": {...}}}

Option B — Final response to user (use markdown formatting):
{"thought": "summary of analysis", "response": "Your markdown formatted response to the user", "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]}

IMPORTANT: In Option B, you MUST include a "suggestions" array with 2 to 4 short follow-up action prompts that the user might want to do next. These should be contextual, actionable, and specific to what just happened. Examples: "Send 5 USDC to this address", "Check compliance for 0x...", "View my invoices", "Swap 10 USDC to EURC". Keep each suggestion under 60 characters.

Reply ONLY with a raw JSON object. Do not wrap in markdown code fences. Do not add text outside the JSON.`

          // Set the system message with JSON routing instructions upfront
          messages[0] = {
            role: 'system',
            content: WORKSPACE_SYSTEM_PROMPT + `\n\nConnected wallet: ${userAddrLower}` + jsonRoutingBlock
          }

          while (iterations < maxIterations) {
            iterations++

            const requestBody: any = {
              model: modelName,
              messages: messages.map(m => ({ role: m.role, content: m.content })),
              temperature: 0.1,
            }

            // Only use response_format for OpenAI — DeepSeek handles JSON via prompt instructions
            if (provider === 'openai') {
              requestBody.response_format = { type: 'json_object' }
            }

            const response = await fetch(`${apiBase}/chat/completions`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(requestBody)
            })

            if (!response.ok) {
              const errText = await response.text()
              throw new Error(`LLM API error ${response.status}: ${errText.slice(0, 200)}`)
            }

            const resJson = await response.json()
            const rawText = resJson.choices[0]?.message?.content || ''

            let parsed: any
            try {
              // Strip markdown code fences if DeepSeek wraps the JSON
              let cleanText = rawText.trim()
              if (cleanText.startsWith('```')) {
                cleanText = cleanText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim()
              }
              parsed = JSON.parse(cleanText)
            } catch {
              // If we can't parse JSON, treat as final response
              send({ type: 'chunk', content: rawText })
              if (!isTemporary && conversation) {
                await prisma.chatMessage.create({
                  data: {
                    conversationId: conversation.id,
                    role: 'assistant',
                    content: rawText
                  }
                })
              }
              break
            }

            if (parsed.action) {
              const toolName = parsed.action.toolName
              const toolArgs = parsed.action.arguments || parsed.action.args || parsed.action.parameters || parsed.action.params || {}
              
              send({
                type: 'tool_start',
                toolName,
                thought: parsed.thought,
                args: toolArgs
              })

              try {
                const toolResult = await executeTool(toolName, toolArgs || {}, userAddrLower)
                const resultStr = JSON.stringify(toolResult)

                // Check if this tool returned an action_required intent
                if (toolResult && toolResult.actionRequired) {
                  send({
                    type: 'tool_result',
                    toolName,
                    success: true,
                    result: resultStr.slice(0, 2000)
                  })

                  // Emit action_required event for frontend to handle user wallet signing
                  send({
                    type: 'action_required',
                    actionType: toolResult.actionType,
                    params: toolResult.params,
                    message: toolResult.message,
                    complianceStatus: toolResult.complianceStatus
                  })
                } else {
                  send({
                    type: 'tool_result',
                    toolName,
                    success: true,
                    result: resultStr.slice(0, 2000)
                  })
                }

                // Save tool execution as message
                if (!isTemporary && conversation) {
                  await prisma.chatMessage.create({
                    data: {
                      conversationId: conversation.id,
                      role: 'tool',
                      content: resultStr,
                      toolName,
                      toolResult: resultStr
                    }
                  })
                }

                // Add to context for next iteration
                messages.push({ role: 'assistant', content: rawText })
                messages.push({ role: 'user', content: `Tool "${toolName}" returned: ${resultStr}` })

              } catch (toolErr: any) {
                send({
                  type: 'tool_result',
                  toolName,
                  success: false,
                  error: toolErr.message
                })

                messages.push({ role: 'assistant', content: rawText })
                messages.push({ role: 'user', content: `Tool "${toolName}" failed with error: ${toolErr.message}` })
              }

            } else if (parsed.response) {
              send({ type: 'chunk', content: parsed.response })

              // Send follow-up suggestions if provided
              if (parsed.suggestions && Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
                send({ type: 'suggestions', suggestions: parsed.suggestions.slice(0, 4) })
              }

              if (!isTemporary && conversation) {
                await prisma.chatMessage.create({
                  data: {
                    conversationId: conversation.id,
                    role: 'assistant',
                    content: parsed.response
                  }
                })
              }
              break

            } else {
              // Unexpected format, send as-is
              const fallback = parsed.finalResponse || parsed.content || rawText
              send({ type: 'chunk', content: fallback })
              if (!isTemporary && conversation) {
                await prisma.chatMessage.create({
                  data: {
                    conversationId: conversation.id,
                    role: 'assistant',
                    content: fallback
                  }
                })
              }
              break
            }
          }

          // Update conversation title if it's new
          if (!isTemporary && !conversationId && conversation && conversation.title === 'New Conversation') {
            const titleMsg = message.length > 60 ? message.slice(0, 57) + '...' : message
            await prisma.conversation.update({
              where: { id: conversation.id },
              data: { title: titleMsg }
            })
          }

          send({ type: 'done' })
        } catch (err: any) {
          send({ type: 'error', message: err.message })
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
