'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAccount } from '@/lib/use-crosswire-account'
import { usePublicClient, useWalletClient } from 'wagmi'
import { parseUnits, encodePacked, keccak256, encodeFunctionData } from 'viem'
import {
  USDC_ADDRESS,
  USDC_DECIMALS,
  CROSSWIRE_CONTRACT_ADDRESS,
  getExplorerTxUrl,
} from '@/lib/arc-config'
import { crossWireRouterAbi, erc20Abi } from '@/lib/contracts'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import toast from 'react-hot-toast'
import {
  Send,
  Bot,
  User,
  Sparkles,
  Plus,
  MessageSquare,
  Clock,
  ChevronRight,
  Zap,
  Brain,
  Activity,
  FileText,
  ArrowRightLeft,
  Shield,
  Wallet,
  CalendarDays,
  TrendingUp,
  Loader2,
  CheckCircle2,
  XCircle,
  Wrench,
  ChevronDown,
  Trash2,
  RotateCcw,
  Search,
  Check,
  X,
  Sliders,
  DollarSign,
  Database,
  AlertCircle,
  RefreshCw,
  Command,
  Key,
  Bell,
  ShieldAlert,
  Cpu,
  Bookmark
} from 'lucide-react'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolName?: string
  toolResult?: string
  isStreaming?: boolean
  toolEvents?: ToolEvent[]
  suggestions?: string[]
  createdAt?: string
}

interface ToolEvent {
  type: 'tool_start' | 'tool_result'
  toolName: string
  thought?: string
  success?: boolean
  result?: string
  error?: string
  args?: any
}

interface ActionIntent {
  actionType: string
  params: {
    recipient: string
    amount: string
    purposeCode: number
    memo: string
    contractAddress: string
    usdcAddress: string
    chain: string
    chainId: number
    explorerBase: string
  }
  message: string
  complianceStatus: string
}

interface Conversation {
  id: string
  title: string
  updatedAt: string
  messages?: ChatMessage[]
  _count?: { messages: number }
}

const SUGGESTED_ACTIONS = [
  { icon: FileText, label: 'Show unpaid invoices > $10k', prompt: 'Show all unpaid invoices over $10,000', color: '#a855f7' },
  { icon: Wallet, label: 'Find due vendor payments', prompt: 'Find vendors with payments due this week', color: '#3b82f6' },
  { icon: TrendingUp, label: 'Generate treasury report', prompt: 'Generate a treasury position report', color: '#8b5cf6' },
  { icon: Shield, label: 'Review compliance risks', prompt: 'Review suspicious transactions and compliance logs', color: '#ef4444' },
  { icon: Send, label: 'Prepare payroll payments', prompt: 'Prepare payroll payments for FOSS contributors', color: '#10b981' },
  { icon: ArrowRightLeft, label: 'Convert 50k USDC to EUR', prompt: 'Convert 50,000 USDC to EURC using StableFX', color: '#f59e0b' }
]

const DEMO_WORKFLOWS = [
  { name: 'Treasury Management', prompt: 'Analyze current treasury position and recommend optimizations.' },
  { name: 'Payments Operations', prompt: 'Draft a payment request list for approved suppliers.' },
  { name: 'Invoice Automation', prompt: 'Synthesize outstanding invoices and prepare batch transactions.' },
  { name: 'Compliance Screening', prompt: 'Run OFAC sanctions checks on the last 5 recipient addresses.' },
  { name: 'FX Conversion', prompt: 'Plan hedging strategy for EURC exposure and execute conversion.' },
  { name: 'Cash Flow Forecasting', prompt: 'Project treasury runway and cash flow for the next 30 days.' }
]

const AVAILABLE_AGENTS = [
  { name: 'Treasury Agent', desc: 'Manages liquidity and treasury operations', status: 'Idle', tools: 4 },
  { name: 'Payments Agent', desc: 'Handles payment execution workflows', status: 'Monitoring', tools: 3 },
  { name: 'Compliance Agent', desc: 'Performs sanctions and risk screening', status: 'Active', tools: 2 },
  { name: 'Invoice Agent', desc: 'Reviews and processes invoices', status: 'Idle', tools: 2 },
  { name: 'FX Agent', desc: 'Analyzes and executes currency conversions', status: 'Idle', tools: 2 },
  { name: 'Analytics Agent', desc: 'Generates operational reports and insights', status: 'Syncing', tools: 3 }
]

export default function WorkspacePage() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [tempMessages, setTempMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [provider, setProvider] = useState<'deepseek' | 'openai'>('deepseek')
  const [pendingAction, setPendingAction] = useState<ActionIntent | null>(null)
  const [isSigningTx, setIsSigningTx] = useState(false)

  // Redesign state
  const [isTemporaryChat, setIsTemporaryChat] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [pinnedChatIds, setPinnedChatIds] = useState<string[]>([])
  const [editingChatId, setEditingChatId] = useState<string | null>(null)
  const [editTitleInput, setEditTitleInput] = useState('')
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [commandPaletteQuery, setCommandPaletteQuery] = useState('')
  const [showRightPanel, setShowRightPanel] = useState(true)
  const [showLeftSidebar, setShowLeftSidebar] = useState(true)

  const [approvalsQueue, setApprovalsQueue] = useState([
    {
      id: 'splits',
      name: 'FOSS Contributor Splits',
      meta: '5 wallet settlements',
      amount: '12,500 USDC',
      status: 'pending'
    },
    {
      id: 'inv-089',
      name: 'Invoice #INV-2026-089',
      meta: 'Vercel Web Hosting',
      amount: '2,400 USDC',
      status: 'pending'
    }
  ])

  const handleApproveQueueItem = async (id: string) => {
    setApprovalsQueue(prev => prev.map(item => item.id === id ? { ...item, status: 'processing' } : item))
    await new Promise(resolve => setTimeout(resolve, 1800))
    setApprovalsQueue(prev => prev.filter(item => item.id !== id))
    if (id === 'splits') {
      toast.success('Swarm splits execution approved & transaction submitted to Arc Testnet!')
    } else {
      toast.success('Vercel hosting invoice #INV-2026-089 payment completed!')
    }
  }

  const handleRejectQueueItem = async (id: string) => {
    setApprovalsQueue(prev => prev.map(item => item.id === id ? { ...item, status: 'processing' } : item))
    await new Promise(resolve => setTimeout(resolve, 1000))
    setApprovalsQueue(prev => prev.filter(item => item.id !== id))
    if (id === 'splits') {
      toast.error('Splits execution transaction rejected and canceled')
    } else {
      toast.error('Invoice payment request rejected and canceled')
    }
  }

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Group conversations by date
  const getGroupedConversations = useCallback(() => {
    const today: Conversation[] = []
    const yesterday: Conversation[] = []
    const last7Days: Conversation[] = []
    const older: Conversation[] = []

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000
    const startOf7DaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000

    const filtered = conversations.filter(conv => {
      // Filter by search query
      if (searchQuery.trim()) {
        return conv.title.toLowerCase().includes(searchQuery.toLowerCase())
      }
      return true
    })

    filtered.forEach(conv => {
      if (pinnedChatIds.includes(conv.id)) return // Skip pinned items in general groups
      const time = new Date(conv.updatedAt).getTime()
      if (time >= startOfToday) {
        today.push(conv)
      } else if (time >= startOfYesterday) {
        yesterday.push(conv)
      } else if (time >= startOf7DaysAgo) {
        last7Days.push(conv)
      } else {
        older.push(conv)
      }
    })

    return { today, yesterday, last7Days, older }
  }, [conversations, pinnedChatIds, searchQuery])

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, tempMessages, scrollToBottom])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px'
    }
  }, [input])

  // Load pinned chats from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crosswire_pinned_chats')
      if (saved) {
        setPinnedChatIds(JSON.parse(saved))
      }
    }
  }, [])

  // Load conversations list
  const loadConversations = useCallback(async () => {
    if (!address) return
    try {
      const res = await fetch(`/api/workspace/conversations?userAddress=${address}`)
      if (res.ok) {
        const data = await res.json()
        setConversations(data)
      }
    } catch (err) {
      console.error('Failed to load conversations:', err)
    }
  }, [address])

  useEffect(() => {
    if (address && isConnected) {
      loadConversations()
    }
  }, [address, isConnected, loadConversations])

  // Load a specific conversation
  const loadConversation = async (convId: string) => {
    setIsTemporaryChat(false)
    try {
      const res = await fetch(`/api/workspace/conversations/${convId}`)
      if (res.ok) {
        const data = await res.json()
        setConversationId(data.id)
        setMessages(data.messages.filter((m: ChatMessage) => m.role !== 'tool').map((m: ChatMessage) => ({
          ...m,
          toolEvents: data.messages
            .filter((tm: ChatMessage) => tm.role === 'tool' && new Date(tm.createdAt!).getTime() <= new Date(m.createdAt!).getTime() + 1000)
            .map((tm: ChatMessage) => ({
              type: 'tool_result' as const,
              toolName: tm.toolName || 'unknown',
              success: true,
              result: tm.content?.slice(0, 500)
            }))
        })))
      }
    } catch (err) {
      console.error('Failed to load conversation:', err)
      toast.error('Failed to load conversation')
    }
  }

  // Start new conversation
  const newConversation = () => {
    setIsTemporaryChat(false)
    setConversationId(null)
    setMessages([])
    setInput('')
  }

  // Toggle temporary chat mode
  const startTemporaryChat = () => {
    setIsTemporaryChat(true)
    setConversationId(null)
    setTempMessages([])
    setInput('')
    toast.success('Temporary Chat Mode Active')
  }

  // Delete conversation
  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await fetch('/api/workspace/conversations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convId })
      })
      setConversations(prev => prev.filter(c => c.id !== convId))
      if (conversationId === convId) {
        newConversation()
      }
      toast.success('Conversation archived')
    } catch (err) {
      console.error(err)
      toast.error('Failed to archive conversation')
    }
  }

  // Pin/Unpin conversation
  const togglePinConversation = (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    let updated: string[]
    if (pinnedChatIds.includes(convId)) {
      updated = pinnedChatIds.filter(id => id !== convId)
      toast.success('Conversation unpinned')
    } else {
      updated = [...pinnedChatIds, convId]
      toast.success('Conversation pinned')
    }
    setPinnedChatIds(updated)
    localStorage.setItem('crosswire_pinned_chats', JSON.stringify(updated))
  }

  // Rename conversation
  const handleRenameChat = async (id: string, newTitle: string) => {
    if (!newTitle.trim()) {
      setEditingChatId(null)
      return
    }
    try {
      const res = await fetch(`/api/workspace/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      })
      if (res.ok) {
        setConversations(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c))
        setEditingChatId(null)
        toast.success('Conversation renamed')
      } else {
        throw new Error('Rename failed')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to rename conversation')
    }
  }

  // Keyboard shortcut for CMD/CTRL+K Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(prev => !prev)
      } else if (e.key === 'Escape') {
        setCommandPaletteOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Send message
  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim()
    if (!messageText || isLoading) return

    if (!isConnected || !address) {
      toast.error('Please connect your wallet first')
      return
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageText,
      createdAt: new Date().toISOString()
    }

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      isStreaming: true,
      toolEvents: [],
      createdAt: new Date().toISOString()
    }

    if (isTemporaryChat) {
      setTempMessages(prev => [...prev, userMsg, assistantMsg])
    } else {
      setMessages(prev => [...prev, userMsg, assistantMsg])
    }
    setInput('')
    setIsLoading(true)

    try {
      const historyPayload = isTemporaryChat
        ? tempMessages.map(m => ({ role: m.role, content: m.content, toolName: m.toolName }))
        : []

      const res = await fetch('/api/workspace/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          conversationId: isTemporaryChat ? null : conversationId,
          userAddress: address,
          provider,
          isTemporary: isTemporaryChat,
          history: historyPayload
        })
      })

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`)
      }

      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          try {
            const data = JSON.parse(part.slice(6))

            switch (data.type) {
              case 'conversation':
                if (!conversationId && !isTemporaryChat) {
                  setConversationId(data.id)
                }
                break

              case 'tool_start':
                const updateToolStart = (prev: ChatMessage[]) => {
                  const updated = [...prev]
                  const lastAssistant = updated.findLast(m => m.role === 'assistant')
                  if (lastAssistant) {
                    lastAssistant.toolEvents = [
                      ...(lastAssistant.toolEvents || []),
                      {
                        type: 'tool_start',
                        toolName: data.toolName,
                        thought: data.thought,
                        args: data.args
                      }
                    ]
                  }
                  return updated
                }
                if (isTemporaryChat) {
                  setTempMessages(updateToolStart)
                } else {
                  setMessages(updateToolStart)
                }
                break

              case 'tool_result':
                const updateToolResult = (prev: ChatMessage[]) => {
                  const updated = [...prev]
                  const lastAssistant = updated.findLast(m => m.role === 'assistant')
                  if (lastAssistant && lastAssistant.toolEvents) {
                    const startIdx = [...lastAssistant.toolEvents].reverse()
                      .findIndex(e => e.type === 'tool_start' && e.toolName === data.toolName)
                    if (startIdx >= 0) {
                      const realIdx = lastAssistant.toolEvents.length - 1 - startIdx
                      lastAssistant.toolEvents[realIdx] = {
                        type: 'tool_result',
                        toolName: data.toolName,
                        thought: lastAssistant.toolEvents[realIdx].thought,
                        success: data.success,
                        result: data.result,
                        error: data.error
                      }
                    } else {
                      lastAssistant.toolEvents = [
                        ...lastAssistant.toolEvents,
                        {
                          type: 'tool_result',
                          toolName: data.toolName,
                          success: data.success,
                          result: data.result,
                          error: data.error
                        }
                      ]
                    }
                  }
                  return updated
                }
                if (isTemporaryChat) {
                  setTempMessages(updateToolResult)
                } else {
                  setMessages(updateToolResult)
                }
                break

              case 'chunk':
                const updateChunk = (prev: ChatMessage[]) => {
                  const updated = [...prev]
                  const lastAssistant = updated.findLast(m => m.role === 'assistant')
                  if (lastAssistant) {
                    lastAssistant.content = data.content
                    lastAssistant.isStreaming = false
                  }
                  return updated
                }
                if (isTemporaryChat) {
                  setTempMessages(updateChunk)
                } else {
                  setMessages(updateChunk)
                }
                break

              case 'suggestions':
                const updateSuggestions = (prev: ChatMessage[]) => {
                  const updated = [...prev]
                  const lastAssistant = updated.findLast(m => m.role === 'assistant')
                  if (lastAssistant) {
                    lastAssistant.suggestions = data.suggestions
                  }
                  return updated
                }
                if (isTemporaryChat) {
                  setTempMessages(updateSuggestions)
                } else {
                  setMessages(updateSuggestions)
                }
                break

              case 'action_required':
                setPendingAction({
                  actionType: data.actionType,
                  params: data.params,
                  message: data.message,
                  complianceStatus: data.complianceStatus
                })
                break

              case 'done':
                const updateDone = (prev: ChatMessage[]) => {
                  const updated = [...prev]
                  const lastAssistant = updated.findLast(m => m.role === 'assistant')
                  if (lastAssistant) {
                    lastAssistant.isStreaming = false
                  }
                  return updated
                }
                if (isTemporaryChat) {
                  setTempMessages(updateDone)
                } else {
                  setMessages(updateDone)
                }
                if (!isTemporaryChat) {
                  loadConversations()
                }
                break

              case 'error':
                const updateError = (prev: ChatMessage[]) => {
                  const updated = [...prev]
                  const lastAssistant = updated.findLast(m => m.role === 'assistant')
                  if (lastAssistant) {
                    lastAssistant.content = `⚠️ ${data.message}`
                    lastAssistant.isStreaming = false
                  }
                  return updated
                }
                if (isTemporaryChat) {
                  setTempMessages(updateError)
                } else {
                  setMessages(updateError)
                }
                toast.error(data.message)
                break
            }
          } catch (err) {
            console.error('Parse error:', err)
          }
        }
      }
    } catch (err: any) {
      const updateConnError = (prev: ChatMessage[]) => {
        const updated = [...prev]
        const lastAssistant = updated.findLast(m => m.role === 'assistant')
        if (lastAssistant) {
          lastAssistant.content = `⚠️ Connection error: ${err.message}`
          lastAssistant.isStreaming = false
        }
        return updated
      }
      if (isTemporaryChat) {
        setTempMessages(updateConnError)
      } else {
        setMessages(updateConnError)
      }
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle wallet signing for action_required intents
  const handleConfirmAction = async (action: ActionIntent) => {
    const isSandbox = typeof window !== 'undefined' && localStorage.getItem('crosswire_sandbox') === 'true'
    
    if (!isSandbox && (!walletClient || !address || !publicClient)) {
      toast.error('Wallet client not available. Please reconnect your wallet.')
      return
    }

    setIsSigningTx(true)
    const p = action.params

    try {
      if (isSandbox) {
        toast('Processing sandbox transaction...', { icon: '🔄' })
        await new Promise(r => setTimeout(r, 1500))
        const fakeTxHash = '0xmockwire' + Math.random().toString(16).substring(2, 10)
        const explorerUrl = `${p.explorerBase}/tx/${fakeTxHash}`
        
        const confirmMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `## ✅ Transaction Confirmed (Sandbox)\n\n| Detail | Value |\n|--------|-------|\n| **Amount** | ${p.amount} USDC |\n| **Recipient** | \`${p.recipient.slice(0, 6)}...${p.recipient.slice(-4)}\` |\n| **Network** | ${p.chain} |\n| **Tx Hash** | [\`${fakeTxHash.slice(0, 10)}...\`](${explorerUrl}) |\n| **Purpose** | ${p.memo} |\n\n🏦 Wire transfer settled on-chain via passkey signature.`,
          suggestions: ['Check updated balances', 'Send another payment', 'View transaction history'],
          createdAt: new Date().toISOString()
        }
        if (isTemporaryChat) {
          setTempMessages(prev => [...prev, confirmMsg])
        } else {
          setMessages(prev => [...prev, confirmMsg])
        }
        setPendingAction(null)
        toast.success('Transaction confirmed!')
        setIsSigningTx(false)
        return
      }

      const amountParsed = parseUnits(p.amount, USDC_DECIMALS)
      const isContractDeployed = p.contractAddress !== '0x0000000000000000000000000000000000000000'

      if (isContractDeployed) {
        toast('Step 1/2: Approving USDC spending...', { icon: '🔐' })
        const currentAllowance = await publicClient!.readContract({
          address: p.usdcAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [address!, p.contractAddress as `0x${string}`],
        }) as bigint

        if (currentAllowance < amountParsed) {
          const data = encodeFunctionData({
            abi: erc20Abi,
            functionName: 'approve',
            args: [p.contractAddress as `0x${string}`, amountParsed],
          })
          const approveHash = await walletClient!.request({
            method: 'eth_sendTransaction',
            params: [{
              from: address,
              to: p.usdcAddress as `0x${string}`,
              data,
            }]
          })
          await publicClient!.waitForTransactionReceipt({ hash: approveHash })
        }
      }

      toast('Step 2/2: Sign the wire transfer...', { icon: '✍️' })
      let hash: `0x${string}`

      if (isContractDeployed) {
        const reference = keccak256(
          encodePacked(
            ['address', 'address', 'uint256', 'uint256'],
            [address!, p.recipient as `0x${string}`, amountParsed, BigInt(Date.now())]
          )
        )

        const data = encodeFunctionData({
          abi: crossWireRouterAbi,
          functionName: 'initiateWire',
          args: [
            p.recipient as `0x${string}`,
            amountParsed,
            reference,
            p.purposeCode,
            p.memo || 'CrossWire Transfer',
          ],
        })
        hash = await walletClient!.request({
          method: 'eth_sendTransaction',
          params: [{
            from: address,
            to: p.contractAddress as `0x${string}`,
            data,
          }]
        })
      } else {
        const data = encodeFunctionData({
          abi: erc20Abi,
          functionName: 'transfer',
          args: [p.recipient as `0x${string}`, amountParsed],
        })
        hash = await walletClient!.request({
          method: 'eth_sendTransaction',
          params: [{
            from: address,
            to: p.usdcAddress as `0x${string}`,
            data,
          }]
        })
      }

      toast('Waiting for on-chain confirmation...', { icon: '⏳' })
      await publicClient!.waitForTransactionReceipt({ hash })

      const explorerUrl = `${p.explorerBase}/tx/${hash}`
      const confirmMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `## ✅ Transaction Confirmed\n\n| Detail | Value |\n|--------|-------|\n| **Amount** | ${p.amount} USDC |\n| **Recipient** | \`${p.recipient.slice(0, 6)}...${p.recipient.slice(-4)}\` |\n| **Network** | ${p.chain} |\n| **Tx Hash** | [\`${hash.slice(0, 10)}...${hash.slice(-6)}\`](${explorerUrl}) |\n| **Purpose** | ${p.memo} |\n| **Settlement** | Sub-second finality on Arc L1 |\n\n🏦 Wire transfer settled on-chain via passkey signature.`,
        suggestions: ['Check updated balances', 'Send another payment', 'View transaction history'],
        createdAt: new Date().toISOString()
      }
      if (isTemporaryChat) {
        setTempMessages(prev => [...prev, confirmMsg])
      } else {
        setMessages(prev => [...prev, confirmMsg])
      }
      setPendingAction(null)
      toast.success('Transaction confirmed on-chain!')
    } catch (err: any) {
      console.error('Transaction signing error:', err)
      const errMsg = err?.shortMessage || err?.message || 'Transaction signing failed'
      toast.error(errMsg)
      const errorChatMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `## ⚠️ Transaction Failed\n\n${errMsg}\n\nThe transaction was not executed. You can try again or modify the parameters.`,
        suggestions: ['Try again', 'Check my balance first', 'Cancel this transfer'],
        createdAt: new Date().toISOString()
      }
      if (isTemporaryChat) {
        setTempMessages(prev => [...prev, errorChatMsg])
      } else {
        setMessages(prev => [...prev, errorChatMsg])
      }
      setPendingAction(null)
    } finally {
      setIsSigningTx(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleRequestSandboxFunds = () => {
    const isSandbox = typeof window !== 'undefined' && localStorage.getItem('crosswire_sandbox') === 'true'
    if (!isSandbox) {
      toast.error(' fFaucet only available in Sandbox Mode')
      return
    }
    toast.success('Sandbox funds request submitted (+10,000 USDC)')
  }

  const activeMessages = isTemporaryChat ? tempMessages : messages
  const isEmptyState = activeMessages.length === 0
  const groups = getGroupedConversations()
  const pinnedConversations = conversations.filter(c => pinnedChatIds.includes(c.id))

  // Command palette items
  const filteredCommandItems = [
    { label: 'Search invoices', description: 'View client invoices and payment status', action: () => window.location.href = '/invoices' },
    { label: 'Search payments', description: 'Review transaction logs and audit trail', action: () => window.location.href = '/history' },
    { label: 'Create new payment', description: 'Send direct USDC wires to vendor wallets', action: () => window.location.href = '/send' },
    { label: 'Generate activity report', description: 'View volume analytics and cash flow charts', action: () => window.location.href = '/analytics' },
    { label: 'Start automated agent task', description: 'Configure recurring scheduler or autonomous rule', action: () => window.location.href = '/agents' },
    { label: 'Toggle Sandbox Mode', description: 'Switch between sandbox and production networks', action: () => {
        const current = localStorage.getItem('crosswire_sandbox') === 'true'
        localStorage.setItem('crosswire_sandbox', String(!current))
        window.dispatchEvent(new CustomEvent('crosswire_sandbox_changed'))
        toast.success(`Sandbox Mode ${!current ? 'Enabled' : 'Disabled'}`)
        setCommandPaletteOpen(false)
      }
    },
    { label: 'Start Temporary Chat', description: 'Secure private chat without database logs', action: () => {
        startTemporaryChat()
        setCommandPaletteOpen(false)
      }
    }
  ].filter(item => {
    if (!commandPaletteQuery) return true
    return item.label.toLowerCase().includes(commandPaletteQuery.toLowerCase()) || 
           item.description.toLowerCase().includes(commandPaletteQuery.toLowerCase())
  })

  return (
    <div className="layout-wrapper">
      <Sidebar />
      <div className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        <Topbar />
        
        <div className="workspace-container">
          
          {/* Conversation history sidebar panel (ChatGPT / Claude style) */}
          {showLeftSidebar && (
            <div className="workspace-conversations-panel">
              <div className="workspace-conversations-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={16} style={{ color: 'var(--text-secondary)' }} />
                  <span className="text-xs" style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                    AI Workspace
                  </span>
                </div>
                <button onClick={() => setShowLeftSidebar(false)} className="btn ghost sidebar-close-btn-workspace" title="Collapse history">
                  <X size={14} />
                </button>
              </div>

              {/* Chat Actions */}
              <div style={{ padding: '12px 12px 6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button onClick={newConversation} className="btn primary flex items-center justify-center gap-2" style={{ width: '100%', minHeight: '38px', fontSize: '13px' }}>
                  <Plus size={16} /> New Chat
                </button>
                
                <button 
                  onClick={startTemporaryChat} 
                  className={`btn ghost flex items-center justify-center gap-2 ${isTemporaryChat ? 'temp-chat-active' : ''}`}
                  style={{ width: '100%', minHeight: '38px', fontSize: '13px', border: '1px dashed var(--border)', justifyContent: 'flex-start', padding: '0 12px' }}
                >
                  <Key size={14} /> 
                  <span style={{ flex: 1, textAlign: 'left' }}>Temporary Chat</span>
                  {isTemporaryChat && <span className="badge warning">Active</span>}
                </button>
              </div>

              {/* Search conversations */}
              <div style={{ padding: '0 12px 12px', borderBottom: '1px solid var(--border)' }}>
                <div className="workspace-search-container">
                  <Search size={14} style={{ color: 'var(--text-tertiary)' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search conversations..."
                    className="workspace-search-input"
                  />
                </div>
              </div>

              {/* Conversations Lists */}
              <div className="workspace-conversations-list">
                
                {/* Pinned conversations */}
                {pinnedConversations.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div className="workspace-group-header flex items-center gap-1.5">
                      <Bookmark size={11} style={{ color: 'var(--success)' }} />
                      <span>Pinned</span>
                    </div>
                    {pinnedConversations.map(conv => (
                      <div
                        key={conv.id}
                        onClick={() => loadConversation(conv.id)}
                        className={`workspace-conversation-item ${conversationId === conv.id ? 'active' : ''}`}
                      >
                        {editingChatId === conv.id ? (
                          <input
                            type="text"
                            value={editTitleInput}
                            onChange={(e) => setEditTitleInput(e.target.value)}
                            onBlur={() => handleRenameChat(conv.id, editTitleInput)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameChat(conv.id, editTitleInput)
                              if (e.key === 'Escape') setEditingChatId(null)
                            }}
                            autoFocus
                            className="workspace-rename-input"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                              <MessageSquare size={13} style={{ flexShrink: 0, color: 'var(--text-tertiary)' }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {conv.title}
                              </span>
                            </div>
                            <div className="workspace-item-actions flex items-center gap-1">
                              <button onClick={(e) => togglePinConversation(conv.id, e)} className="workspace-action-btn" title="Unpin">
                                <Bookmark size={11} style={{ fill: 'var(--success)', color: 'var(--success)' }} />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setEditingChatId(conv.id); setEditTitleInput(conv.title) }} className="workspace-action-btn" title="Rename">
                                <Sliders size={11} />
                              </button>
                              <button onClick={(e) => deleteConversation(conv.id, e)} className="workspace-action-btn hover-danger" title="Delete">
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Date-grouped regular list */}
                {conversations.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                    No historical chats
                  </div>
                ) : (
                  <>
                    {/* TODAY */}
                    {groups.today.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <div className="workspace-group-header">Today</div>
                        {groups.today.map(conv => (
                          <div
                            key={conv.id}
                            onClick={() => loadConversation(conv.id)}
                            className={`workspace-conversation-item ${conversationId === conv.id ? 'active' : ''}`}
                          >
                            {editingChatId === conv.id ? (
                              <input
                                type="text"
                                value={editTitleInput}
                                onChange={(e) => setEditTitleInput(e.target.value)}
                                onBlur={() => handleRenameChat(conv.id, editTitleInput)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRenameChat(conv.id, editTitleInput)
                                  if (e.key === 'Escape') setEditingChatId(null)
                                }}
                                autoFocus
                                className="workspace-rename-input"
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                  <MessageSquare size={13} style={{ flexShrink: 0, color: 'var(--text-tertiary)' }} />
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {conv.title}
                                  </span>
                                </div>
                                <div className="workspace-item-actions flex items-center gap-1">
                                  <button onClick={(e) => togglePinConversation(conv.id, e)} className="workspace-action-btn" title="Pin">
                                    <Bookmark size={11} />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); setEditingChatId(conv.id); setEditTitleInput(conv.title) }} className="workspace-action-btn" title="Rename">
                                    <Sliders size={11} />
                                  </button>
                                  <button onClick={(e) => deleteConversation(conv.id, e)} className="workspace-action-btn hover-danger" title="Delete">
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* YESTERDAY */}
                    {groups.yesterday.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <div className="workspace-group-header">Yesterday</div>
                        {groups.yesterday.map(conv => (
                          <div
                            key={conv.id}
                            onClick={() => loadConversation(conv.id)}
                            className={`workspace-conversation-item ${conversationId === conv.id ? 'active' : ''}`}
                          >
                            {editingChatId === conv.id ? (
                              <input
                                type="text"
                                value={editTitleInput}
                                onChange={(e) => setEditTitleInput(e.target.value)}
                                onBlur={() => handleRenameChat(conv.id, editTitleInput)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRenameChat(conv.id, editTitleInput)
                                  if (e.key === 'Escape') setEditingChatId(null)
                                }}
                                autoFocus
                                className="workspace-rename-input"
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                  <MessageSquare size={13} style={{ flexShrink: 0, color: 'var(--text-tertiary)' }} />
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {conv.title}
                                  </span>
                                </div>
                                <div className="workspace-item-actions flex items-center gap-1">
                                  <button onClick={(e) => togglePinConversation(conv.id, e)} className="workspace-action-btn" title="Pin">
                                    <Bookmark size={11} />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); setEditingChatId(conv.id); setEditTitleInput(conv.title) }} className="workspace-action-btn" title="Rename">
                                    <Sliders size={11} />
                                  </button>
                                  <button onClick={(e) => deleteConversation(conv.id, e)} className="workspace-action-btn hover-danger" title="Delete">
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* LAST 7 DAYS */}
                    {groups.last7Days.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <div className="workspace-group-header">Last 7 Days</div>
                        {groups.last7Days.map(conv => (
                          <div
                            key={conv.id}
                            onClick={() => loadConversation(conv.id)}
                            className={`workspace-conversation-item ${conversationId === conv.id ? 'active' : ''}`}
                          >
                            {editingChatId === conv.id ? (
                              <input
                                type="text"
                                value={editTitleInput}
                                onChange={(e) => setEditTitleInput(e.target.value)}
                                onBlur={() => handleRenameChat(conv.id, editTitleInput)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRenameChat(conv.id, editTitleInput)
                                  if (e.key === 'Escape') setEditingChatId(null)
                                }}
                                autoFocus
                                className="workspace-rename-input"
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                  <MessageSquare size={13} style={{ flexShrink: 0, color: 'var(--text-tertiary)' }} />
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {conv.title}
                                  </span>
                                </div>
                                <div className="workspace-item-actions flex items-center gap-1">
                                  <button onClick={(e) => togglePinConversation(conv.id, e)} className="workspace-action-btn" title="Pin">
                                    <Bookmark size={11} />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); setEditingChatId(conv.id); setEditTitleInput(conv.title) }} className="workspace-action-btn" title="Rename">
                                    <Sliders size={11} />
                                  </button>
                                  <button onClick={(e) => deleteConversation(conv.id, e)} className="workspace-action-btn hover-danger" title="Delete">
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

              </div>
            </div>
          )}

          {/* Main operational area */}
          <div className="workspace-chat-area">
            
            {/* Main Header bar for Statuses & Controls */}
            <div className="workspace-ops-header">
              <div className="flex items-center gap-3">
                {!showLeftSidebar && (
                  <button onClick={() => setShowLeftSidebar(true)} className="btn ghost workspace-toggle-btn" title="Expand history">
                    <MessageSquare size={16} />
                  </button>
                )}
                <div className="workspace-status-badge">
                  <div className="status-dot success" />
                  <span className="text-muted">Wallets Connected: </span>
                  <span className="text-mono text-xs" style={{ color: 'var(--text-primary)' }}>
                    {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Disconnected'}
                  </span>
                </div>
                
                <div className="workspace-status-badge hidden-mobile">
                  <span className="text-muted">Active Agents: </span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>5</span>
                </div>

                <div className="workspace-status-badge hidden-mobile">
                  <span className="text-muted">Tasks pending: </span>
                  <span style={{ fontWeight: 600, color: 'var(--success)' }}>0</span>
                </div>

                <div className="workspace-status-badge">
                  <RefreshCw size={12} className="animate-spin-slow" />
                  <span style={{ fontWeight: 500, fontSize: '11px', color: 'var(--text-secondary)' }}>Live Syncing</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={handleRequestSandboxFunds} className="btn ghost text-xs flex items-center gap-1.5 px-3 min-h-0" style={{ height: '32px' }}>
                  <Zap size={13} style={{ color: 'var(--warning)' }} /> Faucet Funds
                </button>
                <button onClick={() => setCommandPaletteOpen(true)} className="btn ghost text-xs flex items-center gap-1.5 px-3 min-h-0" style={{ height: '32px' }}>
                  <Command size={13} /> CMD+K
                </button>
              </div>
            </div>

            {/* Chat messages or Empty state overview dashboard */}
            <div className="workspace-messages" ref={chatContainerRef}>
              
              {/* Temporary chat notice banner */}
              {isTemporaryChat && !isEmptyState && (
                <div className="temp-chat-notice-banner">
                  <Key size={14} />
                  <span>Temporary Chat Mode — Sensitive financial data and workspace logs are not saved in database memory.</span>
                </div>
              )}

              {isEmptyState ? (
                <div className="workspace-dashboard-overview animate-fade-in">
                  
                  {/* Hero Intro */}
                  <div className="workspace-ops-hero">
                    <div className="ops-hero-logo">
                      <Cpu size={32} />
                    </div>
                    <div>
                      <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '6px', letterSpacing: '-0.02em' }}>
                        CrossWire AI Operating System
                      </h1>
                      <p className="text-muted text-sm" style={{ margin: 0, maxWidth: '600px', lineHeight: '1.5' }}>
                        Your autonomous financial control center. Instruct the system via chat or run custom plan workflows across multi-chain balances.
                      </p>
                    </div>
                  </div>

                  {/* 1. Current Treasury Position Overview Panel */}
                  <div className="ops-treasury-panel">
                    <div className="ops-panel-header">
                      <Database size={15} style={{ color: '#3b82f6' }} />
                      <span>Current Treasury Position</span>
                      <span className="badge green" style={{ marginLeft: 'auto', fontSize: '10px' }}>USD/EUR Peaked</span>
                    </div>
                    <div className="ops-treasury-grid">
                      <div className="ops-treasury-card">
                        <span className="ops-card-label">USDC Stablecoin Reserves</span>
                        <span className="ops-card-value text-mono">$1,248,500</span>
                      </div>
                      <div className="ops-treasury-card">
                        <span className="ops-card-label">Pending Client Invoices</span>
                        <span className="ops-card-value text-mono">23</span>
                      </div>
                      <div className="ops-treasury-card">
                        <span className="ops-card-label">Due Today Settlements</span>
                        <span className="ops-card-value text-mono" style={{ color: 'var(--warning)' }}>8</span>
                      </div>
                      <div className="ops-treasury-card">
                        <span className="ops-card-label">Compliance Alerts</span>
                        <span className="ops-card-value text-mono" style={{ color: 'var(--success)' }}>0</span>
                      </div>
                      <div className="ops-treasury-card">
                        <span className="ops-card-label">FX Yield Arbitrages</span>
                        <span className="ops-card-value text-mono">3 Active</span>
                      </div>
                      <div className="ops-treasury-card">
                        <span className="ops-card-label">Operational Agents</span>
                        <span className="ops-card-value text-mono">5 Swarm</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Recent Live Activity Feed */}
                  <div className="ops-activity-feed">
                    <div className="ops-panel-header">
                      <Activity size={15} style={{ color: '#10b981' }} />
                      <span>Recent Treasury & Agent Activities</span>
                    </div>
                    <div className="ops-activity-list text-sm">
                      <div className="ops-activity-item">
                        <CheckCircle2 size={13} style={{ color: 'var(--success)' }} />
                        <span className="activity-desc">Payment settled: 1,250 USDC sent to Dev Swarm split route.</span>
                        <span className="activity-meta">2m ago • Payments Agent</span>
                      </div>
                      <div className="ops-activity-item">
                        <CheckCircle2 size={13} style={{ color: 'var(--success)' }} />
                        <span className="activity-desc">Sanctions compliance screening passed for address 0x9012...5d24.</span>
                        <span className="activity-meta">15m ago • Compliance Agent</span>
                      </div>
                      <div className="ops-activity-item">
                        <CheckCircle2 size={13} style={{ color: 'var(--success)' }} />
                        <span className="activity-desc">Treasury swap executed: 50,000 USDC converted to EURC.</span>
                        <span className="activity-meta">1h ago • FX Agent</span>
                      </div>
                      <div className="ops-activity-item">
                        <CheckCircle2 size={13} style={{ color: 'var(--success)' }} />
                        <span className="activity-desc">23 invoices synced from Stripe ERP billing database.</span>
                        <span className="activity-meta">4h ago • Invoice Agent</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. AI Capabilities Grid */}
                  <div className="ops-capabilities">
                    <div className="ops-panel-header">
                      <Brain size={15} style={{ color: '#ec4899' }} />
                      <span>Supported Workflows & Capabilities</span>
                    </div>
                    <div className="ops-capabilities-grid text-sm">
                      <div className="ops-cap-badge">✓ Send Payments</div>
                      <div className="ops-cap-badge">✓ Review Invoices</div>
                      <div className="ops-cap-badge">✓ Sanctions Screening</div>
                      <div className="ops-cap-badge">✓ Treasury Reporting</div>
                      <div className="ops-cap-badge">✓ Cash Flow Forecasts</div>
                      <div className="ops-cap-badge">✓ FX Arbitrage</div>
                      <div className="ops-cap-badge">✓ Multi-Agent Orchestration</div>
                      <div className="ops-cap-badge">✓ Ledger Reconciliation</div>
                    </div>
                  </div>

                  {/* 4. Realistic Suggested Business Prompts */}
                  <div>
                    <div className="ops-panel-header" style={{ marginBottom: '12px' }}>
                      <Zap size={14} style={{ color: 'var(--warning)' }} />
                      <span>One-Click Suggested Actions</span>
                    </div>
                    <div className="workspace-suggestions-grid">
                      {SUGGESTED_ACTIONS.map((action, i) => {
                        const Icon = action.icon
                        return (
                          <button
                            key={i}
                            onClick={() => {
                              if (isTemporaryChat) {
                                sendMessage(action.prompt)
                              } else {
                                sendMessage(action.prompt)
                              }
                            }}
                            className="workspace-suggestion-card"
                            disabled={isLoading || !isConnected}
                          >
                            <div className="workspace-suggestion-icon" style={{ color: action.color }}>
                              <Icon size={16} strokeWidth={1.5} />
                            </div>
                            <span className="workspace-suggestion-label">{action.label}</span>
                            <ChevronRight size={13} className="workspace-suggestion-arrow" />
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* 5. Demo Workflows */}
                  <div className="ops-workflows-section">
                    <div className="ops-panel-header" style={{ marginBottom: '12px' }}>
                      <Activity size={14} style={{ color: 'var(--accent)' }} />
                      <span>Standard Runbooks & Playbooks</span>
                    </div>
                    <div className="ops-workflows-grid">
                      {DEMO_WORKFLOWS.map((wf, i) => (
                        <div key={i} className="ops-wf-card" onClick={() => sendMessage(wf.prompt)}>
                          <span style={{ fontWeight: 600, fontSize: '13px', display: 'block', marginBottom: '4px' }}>{wf.name}</span>
                          <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{wf.prompt}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 6. AI Swarm Registry */}
                  <div>
                    <div className="ops-panel-header" style={{ marginBottom: '12px' }}>
                      <Sliders size={14} style={{ color: 'var(--text-secondary)' }} />
                      <span>Available Autonomous Swarm Agents</span>
                    </div>
                    <div className="ops-agents-grid">
                      {AVAILABLE_AGENTS.map((agent, i) => (
                        <div key={i} className="ops-agent-card">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`status-pulse ${agent.status.toLowerCase()}`} />
                            <span style={{ fontWeight: 600, fontSize: '13px' }}>{agent.name}</span>
                            <span className="badge text-xs" style={{ marginLeft: 'auto', padding: '1px 6px', fontWeight: 500 }}>{agent.tools} tools</span>
                          </div>
                          <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{agent.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="workspace-messages-list">
                  {activeMessages.filter(m => m.role !== 'tool').map((msg) => {
                    const isUser = msg.role === 'user'
                    const planSteps = !isUser ? parsePlan(msg.content) : null
                    
                    return (
                      <div key={msg.id} className={`workspace-message workspace-message-${msg.role}`}>
                        <div className="workspace-message-avatar">
                          {isUser ? (
                            <User size={16} strokeWidth={1.5} />
                          ) : (
                            <Bot size={16} strokeWidth={1.5} />
                          )}
                        </div>
                        <div className="workspace-message-content">
                          <div className="workspace-message-header">
                            <span className="workspace-message-author">
                              {isUser ? 'You' : 'CrossWire AI'}
                            </span>
                            {msg.createdAt && (
                              <span className="workspace-message-time">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>

                          {/* Tool execution logs */}
                          {msg.toolEvents && msg.toolEvents.length > 0 && (
                            <div className="workspace-tool-events">
                              {msg.toolEvents.map((evt, i) => (
                                <div key={i} className="workspace-tool-event">
                                  {evt.type === 'tool_start' ? (
                                    <div className="workspace-tool-event-header">
                                      <Wrench size={13} className="workspace-tool-icon-spin" />
                                      <span className="workspace-tool-name">{evt.toolName}</span>
                                      <span className="badge blue" style={{ fontSize: '9px', padding: '1px 6px' }}>running</span>
                                    </div>
                                  ) : (
                                    <div className="workspace-tool-event-header">
                                      {evt.success ? (
                                        <CheckCircle2 size={13} style={{ color: 'var(--success)' }} />
                                      ) : (
                                        <XCircle size={13} style={{ color: 'var(--danger)' }} />
                                      )}
                                      <span className="workspace-tool-name">{evt.toolName}</span>
                                      <span className={`badge ${evt.success ? 'green' : 'red'}`} style={{ fontSize: '9px', padding: '1px 6px' }}>
                                        {evt.success ? 'success' : 'failed'}
                                      </span>
                                    </div>
                                  )}
                                  {evt.thought && (
                                    <div className="workspace-tool-thought">
                                      💭 {evt.thought}
                                    </div>
                                  )}
                                  {evt.result && (
                                    <ToolResultBlock result={evt.result} />
                                  )}
                                  {evt.error && (
                                    <div className="workspace-tool-error">
                                      ⚠️ {evt.error}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Text Content */}
                          {msg.isStreaming && !msg.content ? (
                            <div className="workspace-typing-indicator">
                              <div className="workspace-typing-dot" />
                              <div className="workspace-typing-dot" />
                              <div className="workspace-typing-dot" />
                            </div>
                          ) : msg.content ? (
                            <div className="workspace-message-body">
                              <MarkdownRenderer content={msg.content} />
                            </div>
                          ) : null}

                          {/* Visual Swarm Step Planner (Checks & Flowcharts) */}
                          {planSteps && planSteps.length > 0 && (
                            <div className="workspace-interactive-planner">
                              <div className="planner-title-bar">
                                <Activity size={14} style={{ color: 'var(--warning)' }} />
                                <span>Multi-Step Swarm Execution Plan</span>
                              </div>
                              <div className="planner-steps-list">
                                {planSteps.map((step, idx) => (
                                  <div key={idx} className="planner-step-item">
                                    <div className="step-badge flex items-center justify-center">
                                      {idx < 3 ? (
                                        <Check size={12} style={{ color: 'var(--success)' }} />
                                      ) : idx === 3 ? (
                                        <Loader2 size={12} className="workspace-spin" style={{ color: 'var(--warning)' }} />
                                      ) : (
                                        <span style={{ fontSize: '10px' }}>{idx + 1}</span>
                                      )}
                                    </div>
                                    <div className="step-content">
                                      <span className="step-text text-sm">{step}</span>
                                      <span className="step-status text-xs">
                                        {idx < 3 ? 'Completed' : idx === 3 ? 'Verifying Liquidity & Sanctions...' : 'Scheduled'}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="planner-stats flex justify-between text-xs">
                                <div>Estimated time: <strong>20 seconds</strong></div>
                                <div>Swarm operations: <strong>{planSteps.length}</strong></div>
                                <div>Human verification: <strong>Required</strong></div>
                              </div>

                              <div className="planner-actions">
                                <button onClick={() => sendMessage("Approve swarm plan and execute transaction")} className="btn primary font-medium text-xs">
                                  Approve & Execute Plan
                                </button>
                                <button onClick={() => toast('Plan modification mode enabled. Adjusting step parameters...')} className="btn ghost font-medium text-xs">
                                  Modify Steps
                                </button>
                                <button onClick={() => toast.success('Execution batch canceled')} className="btn ghost hover-danger font-medium text-xs">
                                  Cancel Plan
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Follow-up suggestions */}
                          {msg.role === 'assistant' && msg.suggestions && msg.suggestions.length > 0 && !msg.isStreaming && (
                            <div className="workspace-suggestions-chips">
                              {msg.suggestions.map((sug, i) => (
                                <button
                                  key={i}
                                  onClick={() => sendMessage(sug)}
                                  className="workspace-suggestion-chip"
                                  disabled={isLoading}
                                >
                                  <Sparkles size={12} />
                                  {sug}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Action Confirmation Card */}
            {pendingAction && (
              <div className="workspace-action-card">
                <div className="workspace-action-card-header">
                  <Shield size={16} style={{ color: 'var(--warning)' }} />
                  <span style={{ fontWeight: 600, fontSize: '13px' }}>Transaction Confirmation Required</span>
                </div>
                <div className="workspace-action-card-body">
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
                    {pendingAction.message}
                  </p>
                  <div className="workspace-action-card-details">
                    <div className="workspace-action-detail">
                      <span className="workspace-action-label">Recipient</span>
                      <span className="workspace-action-value" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                        {pendingAction.params.recipient.slice(0, 6)}...{pendingAction.params.recipient.slice(-4)}
                      </span>
                    </div>
                    <div className="workspace-action-detail">
                      <span className="workspace-action-label">Amount</span>
                      <span className="workspace-action-value" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {pendingAction.params.amount} USDC
                      </span>
                    </div>
                    <div className="workspace-action-detail">
                      <span className="workspace-action-label">Network</span>
                      <span className="workspace-action-value">{pendingAction.params.chain}</span>
                    </div>
                    <div className="workspace-action-detail">
                      <span className="workspace-action-label">Purpose</span>
                      <span className="workspace-action-value">{pendingAction.params.memo}</span>
                    </div>
                    <div className="workspace-action-detail">
                      <span className="workspace-action-label">Compliance</span>
                      <span className="workspace-action-value" style={{ color: 'var(--success)' }}>
                        ✓ {pendingAction.complianceStatus === 'passed' ? 'Sanctions Cleared' : pendingAction.complianceStatus}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="workspace-action-card-actions">
                  <button
                    onClick={() => setPendingAction(null)}
                    className="btn ghost"
                    style={{ fontSize: '12px', padding: '6px 16px', minHeight: 'auto' }}
                    disabled={isSigningTx}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleConfirmAction(pendingAction)}
                    className="btn primary"
                    style={{ fontSize: '12px', padding: '6px 20px', minHeight: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}
                    disabled={isSigningTx}
                  >
                    {isSigningTx ? (
                      <>
                        <Loader2 size={14} className="workspace-spin" />
                        Signing...
                      </>
                    ) : (
                      <>
                        <Shield size={14} />
                        Confirm & Sign
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Input area */}
            <div className="workspace-input-area">
              <div className="workspace-input-controls">
                <button
                  onClick={() => setShowLeftSidebar(!showLeftSidebar)}
                  className={`workspace-input-btn ${showLeftSidebar ? 'active-panel-btn' : ''}`}
                  title="Toggle Chat History"
                >
                  <MessageSquare size={16} />
                </button>
                <button
                  onClick={() => setShowRightPanel(!showRightPanel)}
                  className={`workspace-input-btn ${showRightPanel ? 'active-panel-btn' : ''}`}
                  title="Toggle Operations Panel"
                >
                  <Sliders size={16} />
                </button>
              </div>
              
              <div className="workspace-input-wrapper">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isConnected ? "Ask CrossWire anything... (e.g. 'Pay outstanding invoices over 10k USDC' or 'Check compliance of 0x...') (⏎ to send)" : "Connect wallet to start..."}
                  disabled={isLoading || !isConnected}
                  rows={1}
                  className="workspace-input"
                />
                <div className="workspace-input-actions">
                  <div className="workspace-provider-toggle">
                    <button
                      onClick={() => setProvider('deepseek')}
                      className={`workspace-provider-btn ${provider === 'deepseek' ? 'active' : ''}`}
                      title="DeepSeek v4-flash"
                    >
                      DS
                    </button>
                    <button
                      onClick={() => setProvider('openai')}
                      className={`workspace-provider-btn ${provider === 'openai' ? 'active' : ''}`}
                      title="OpenAI gpt-4o-mini"
                    >
                      OA
                    </button>
                  </div>
                  <button
                    onClick={() => sendMessage()}
                    disabled={isLoading || !input.trim() || !isConnected}
                    className="workspace-send-btn"
                  >
                    {isLoading ? (
                      <Loader2 size={18} className="workspace-spin" />
                    ) : (
                      <Send size={18} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Trust Builders Indicators */}
            <div className="workspace-trust-builders">
              <span>✓ All critical actions require human approval</span>
              <span>• On-chain audit trail active</span>
              <span>• Sanctions screening enabled</span>
              <span>• Non-custodial security</span>
            </div>

          </div>

          {/* Right Operations Panel (ChatGPT/Stripe style) */}
          {showRightPanel && (
            <div className="workspace-right-ops-panel animate-fade-in">
              
              {/* Header */}
              <div className="right-panel-header">
                <Sliders size={14} style={{ color: 'var(--text-secondary)' }} />
                <span>Operations Dashboard</span>
                <button onClick={() => setShowRightPanel(false)} className="right-panel-close-btn" title="Hide panel">
                  <X size={14} />
                </button>
              </div>

              <div className="right-panel-scrollable">
                
                {/* 1. Pending Approvals Queue */}
                <div className="right-section">
                  <div className="section-title">
                    <Bell size={12} style={{ color: 'var(--warning)' }} />
                    <span>Pending Approvals Queue</span>
                  </div>
                  <div className="queue-list">
                    {approvalsQueue.length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
                        <CheckCircle2 size={16} className="text-emerald-500 mx-auto mb-2" />
                        Queue is empty. No approvals pending.
                      </div>
                    ) : (
                      approvalsQueue.map((item) => (
                        <div key={item.id} className="queue-card relative">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="queue-card-name">{item.name}</span>
                              <span className="queue-card-meta">{item.meta}</span>
                            </div>
                            <span className="queue-card-amount">{item.amount}</span>
                          </div>
                          <div className="flex gap-2">
                            {item.status === 'processing' ? (
                              <div className="flex-1 flex justify-center items-center py-1 text-xs" style={{ height: '28px', color: 'var(--text-secondary)' }}>
                                <Loader2 size={14} className="animate-spin mr-1.5" />
                                Processing...
                              </div>
                            ) : (
                              <>
                                <button 
                                  onClick={() => handleApproveQueueItem(item.id)} 
                                  className="btn primary flex-1 py-1 text-xs min-h-0" 
                                  style={{ height: '28px' }}
                                >
                                  Approve
                                </button>
                                <button 
                                  onClick={() => handleRejectQueueItem(item.id)} 
                                  className="btn ghost flex-1 py-1 text-xs min-h-0" 
                                  style={{ height: '28px' }}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 2. Active Agents Monitor */}
                <div className="right-section">
                  <div className="section-title">
                    <Cpu size={12} style={{ color: 'var(--success)' }} />
                    <span>Active Agents Pulse</span>
                  </div>
                  <div className="agents-mini-list text-sm">
                    <div className="agent-mini-item">
                      <div className="status-dot success animate-pulse" />
                      <span style={{ fontWeight: 500 }}>Treasury Agent</span>
                      <span className="status-desc text-xs" style={{ marginLeft: 'auto' }}>IDLE</span>
                    </div>
                    <div className="agent-mini-item">
                      <div className="status-dot success animate-pulse" />
                      <span style={{ fontWeight: 500 }}>Compliance Agent</span>
                      <span className="status-desc text-xs" style={{ marginLeft: 'auto' }}>SCANNING</span>
                    </div>
                    <div className="agent-mini-item">
                      <div className="status-dot success animate-pulse" />
                      <span style={{ fontWeight: 500 }}>FX Agent</span>
                      <span className="status-desc text-xs" style={{ marginLeft: 'auto' }}>MONITORING</span>
                    </div>
                  </div>
                </div>

                {/* 3. System Preferences & Memory */}
                <div className="right-section">
                  <div className="section-title">
                    <Sliders size={12} style={{ color: 'var(--text-secondary)' }} />
                    <span>Workspace Memory Config</span>
                  </div>
                  <div className="memory-info text-sm">
                    <div className="memory-row">
                      <span className="text-muted">Settlement Base:</span>
                      <strong className="text-mono">USDC</strong>
                    </div>
                    <div className="memory-row">
                      <span className="text-muted">Secondary Base:</span>
                      <strong className="text-mono">EURC</strong>
                    </div>
                    <div className="memory-row">
                      <span className="text-muted">Treasury Wallet:</span>
                      <strong className="text-mono">Treasury-01</strong>
                    </div>
                    <div className="memory-row">
                      <span className="text-muted">Approval Threshold:</span>
                      <strong className="text-mono">$50,000</strong>
                    </div>
                    <div className="memory-row">
                      <span className="text-muted">Compliance Rule:</span>
                      <strong className="text-mono">Enterprise OFAC</strong>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>

      {/* Global Command Palette Dialog Modal (Linear/Stripe style) */}
      {commandPaletteOpen && (
        <div className="workspace-command-dialog-overlay" onClick={() => setCommandPaletteOpen(false)}>
          <div className="workspace-command-dialog animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="command-search-bar">
              <Command size={18} style={{ color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="Type a command or page search (e.g. 'payments')..."
                value={commandPaletteQuery}
                onChange={(e) => setCommandPaletteQuery(e.target.value)}
                autoFocus
                className="command-search-input"
              />
            </div>
            
            <div className="command-results-list">
              {filteredCommandItems.length === 0 ? (
                <div className="command-empty-state">No matching commands found</div>
              ) : (
                filteredCommandItems.map((item, idx) => (
                  <div key={idx} className="command-result-item" onClick={item.action}>
                    <div className="flex flex-col">
                      <span className="command-item-label">{item.label}</span>
                      <span className="command-item-desc">{item.description}</span>
                    </div>
                    <ChevronRight size={14} className="command-item-arrow" />
                  </div>
                ))
              )}
            </div>

            <div className="command-footer">
              <span>Press <kbd>ESC</kbd> to close</span>
              <span>Use <kbd>↑</kbd> <kbd>↓</kbd> to navigate</span>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .workspace-conversations-panel {
          border-right: 1px solid var(--border);
          background: var(--bg-primary);
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
          width: 260px;
          min-width: 260px;
        }

        .sidebar-close-btn-workspace {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        }

        .sidebar-close-btn-workspace:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .workspace-search-container {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 8px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .workspace-search-input {
          background: transparent;
          border: none;
          outline: none;
          color: var(--text-primary);
          font-size: 13px;
          width: 100%;
        }

        .workspace-search-input::placeholder {
          color: var(--text-tertiary);
        }

        .workspace-group-header {
          padding: 12px 8px 6px;
          font-size: 10px;
          font-weight: 600;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .workspace-rename-input {
          background: var(--surface);
          border: 1px solid var(--border-focus);
          border-radius: 4px;
          padding: 2px 6px;
          color: var(--text-primary);
          font-size: 13px;
          width: 100%;
          outline: none;
        }

        .workspace-item-actions {
          opacity: 0;
          transition: opacity 0.15s ease;
        }

        .workspace-conversation-item:hover .workspace-item-actions {
          opacity: 1;
        }

        .workspace-action-btn {
          background: none;
          border: none;
          color: var(--text-tertiary);
          cursor: pointer;
          padding: 3px;
          border-radius: 4px;
        }

        .workspace-action-btn:hover {
          color: var(--text-primary);
          background: var(--bg-primary);
        }

        .workspace-action-btn.hover-danger:hover {
          color: var(--danger);
          background: var(--danger-bg);
        }

        .temp-chat-active {
          background: var(--warning-bg) !important;
          border-color: var(--warning) !important;
        }

        /* Message Alignment override */
        :global(.workspace-message-user) {
          flex-direction: row-reverse !important;
          justify-content: flex-start !important;
          padding-left: 64px !important;
        }

        :global(.workspace-message-user .workspace-message-content) {
          display: flex !important;
          flex-direction: column !important;
          align-items: flex-end !important;
        }

        :global(.workspace-message-user .workspace-message-body) {
          background: rgba(59, 130, 246, 0.06) !important;
          border: 1px solid rgba(59, 130, 246, 0.12) !important;
          border-radius: 12px 12px 4px 12px !important;
          padding: 10px 16px !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02) !important;
        }

        :global(.workspace-message-assistant) {
          padding-right: 64px !important;
        }

        :global(.workspace-message-assistant .workspace-message-body) {
          background: var(--surface) !important;
          border: 1px solid var(--border) !important;
          border-radius: 12px 12px 12px 4px !important;
          padding: 14px 18px !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02) !important;
        }

        /* ── Workspace Ops Header bar ── */
        .workspace-ops-header {
          height: 52px;
          min-height: 52px;
          border-bottom: 1px solid var(--border);
          background: var(--surface);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
        }

        .workspace-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          border: 1px solid var(--border);
          background: var(--bg-primary);
          padding: 4px 10px;
          border-radius: 6px;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .status-dot.success {
          background: var(--success);
          box-shadow: 0 0 8px var(--success);
        }

        .status-dot.warning {
          background: var(--warning);
          box-shadow: 0 0 8px var(--warning);
        }

        /* Temporary chat warning banner */
        .temp-chat-notice-banner {
          background: rgba(245, 158, 11, 0.06);
          border-bottom: 1px solid rgba(245, 158, 11, 0.15);
          padding: 10px 24px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          color: var(--warning);
          line-height: 1.4;
        }

        /* ── Trust builders footer ── */
        .workspace-trust-builders {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 8px 12px 14px;
          font-size: 11px;
          color: var(--text-tertiary);
          border-top: 1px solid transparent;
        }

        /* ── Right Operations Dashboard Panel ── */
        .workspace-right-ops-panel {
          width: 300px;
          min-width: 300px;
          border-left: 1px solid var(--border);
          background: var(--surface);
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }

        .right-panel-header {
          height: 52px;
          min-height: 52px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 16px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .right-panel-close-btn {
          margin-left: auto;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        }

        .right-panel-close-btn:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .right-panel-scrollable {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .right-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .section-title {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .queue-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .queue-card {
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 12px;
        }

        .queue-card-name {
          font-size: 12.5px;
          font-weight: 600;
          display: block;
          color: var(--text-primary);
        }

        .queue-card-meta {
          font-size: 11px;
          color: var(--text-tertiary);
          display: block;
        }

        .queue-card-amount {
          font-size: 12.5px;
          font-weight: 600;
          font-family: 'JetBrains Mono', monospace;
          color: var(--text-primary);
        }

        .agents-mini-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .agent-mini-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 6px;
        }

        .status-dot.success {
          background: var(--success);
        }

        .status-desc {
          font-family: 'JetBrains Mono', monospace;
          font-weight: 600;
          color: var(--success);
        }

        .memory-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 10px 12px;
        }

        .memory-row {
          display: flex;
          justify-content: space-between;
          font-size: 12.5px;
        }

        /* ── Workspace Empty State Redesign Dashboard ── */
        .workspace-dashboard-overview {
          max-width: 820px;
          margin: 0 auto;
          padding: 40px 24px;
          display: flex;
          flex-direction: column;
          gap: 28px;
          width: 100%;
        }

        .workspace-ops-hero {
          display: flex;
          align-items: center;
          gap: 16px;
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px 24px;
        }

        .ops-hero-logo {
          width: 56px;
          height: 56px;
          border-radius: 10px;
          background: var(--accent);
          color: var(--accent-text);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
        }

        .ops-panel-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
          margin-bottom: 8px;
          padding-bottom: 6px;
          border-bottom: 1px solid var(--border);
        }

        .ops-treasury-panel {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px 20px;
        }

        .ops-treasury-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 12px;
        }

        .ops-treasury-card {
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .ops-card-label {
          font-size: 11px;
          color: var(--text-tertiary);
          font-weight: 500;
        }

        .ops-card-value {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .ops-activity-feed {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px 20px;
        }

        .ops-activity-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 12px;
        }

        .ops-activity-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 0;
        }

        .activity-desc {
          color: var(--text-secondary);
          flex: 1;
        }

        .activity-meta {
          font-size: 11.5px;
          color: var(--text-tertiary);
          font-family: 'JetBrains Mono', monospace;
        }

        .ops-capabilities {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px 20px;
        }

        .ops-capabilities-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .ops-cap-badge {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 6px 12px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .ops-workflows-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .ops-wf-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .ops-wf-card:hover {
          border-color: var(--border-focus);
          background: var(--bg-secondary);
          transform: translateY(-1px);
        }

        .ops-agents-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .ops-agent-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 14px;
        }

        .status-pulse {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--success);
          box-shadow: 0 0 0 0 rgba(0, 200, 83, 0.4);
          animation: pulseStatus 2s infinite;
        }

        .status-pulse.active { background: var(--success); }
        .status-pulse.monitoring { background: #3b82f6; }
        .status-pulse.syncing { background: var(--warning); }
        .status-pulse.idle { background: var(--text-tertiary); }

        @keyframes pulseStatus {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(0, 200, 83, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 6px rgba(0, 200, 83, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(0, 200, 83, 0);
          }
        }

        /* ── Multi-step visual Planner ── */
        .workspace-interactive-planner {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          margin-top: 14px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03);
          border-left: 4px solid var(--warning);
        }

        .planner-title-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 13.5px;
          margin-bottom: 12px;
        }

        .planner-steps-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 16px;
          background: var(--bg-primary);
          padding: 12px 14px;
          border-radius: 8px;
          border: 1px solid var(--border);
        }

        .planner-step-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .step-badge {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 1px solid var(--border);
          background: var(--surface);
          flex-shrink: 0;
          font-weight: 600;
        }

        .step-content {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .step-text {
          font-weight: 500;
          color: var(--text-primary);
          line-height: 1.3;
        }

        .step-status {
          font-size: 11px;
          color: var(--text-tertiary);
          margin-top: 1px;
        }

        .planner-stats {
          border-top: 1px solid var(--border);
          padding-top: 10px;
          margin-bottom: 14px;
          color: var(--text-secondary);
        }

        .planner-actions {
          display: flex;
          gap: 8px;
        }

        .planner-actions button {
          flex: 1;
          padding: 8px 12px;
        }

        /* ── Command Palette dialog overlay ── */
        .workspace-command-dialog-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          z-index: 1000;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 15vh;
          backdrop-filter: blur(2px);
        }

        .workspace-command-dialog {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          width: 520px;
          max-width: 90%;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .command-search-bar {
          display: flex;
          align-items: center;
          padding: 14px 18px;
          border-bottom: 1px solid var(--border);
          gap: 12px;
        }

        .command-search-input {
          background: transparent;
          border: none;
          outline: none;
          color: var(--text-primary);
          font-size: 14px;
          flex: 1;
        }

        .command-search-input::placeholder {
          color: var(--text-tertiary);
        }

        .command-results-list {
          max-height: 280px;
          overflow-y: auto;
          padding: 8px;
        }

        .command-empty-state {
          padding: 24px;
          text-align: center;
          color: var(--text-secondary);
          font-size: 13.5px;
        }

        .command-result-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .command-result-item:hover {
          background: var(--bg-secondary);
        }

        .command-item-label {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .command-item-desc {
          font-size: 11.5px;
          color: var(--text-tertiary);
          margin-top: 1px;
        }

        .command-item-arrow {
          color: var(--text-tertiary);
          opacity: 0;
          transition: opacity 0.15s ease;
        }

        .command-result-item:hover .command-item-arrow {
          opacity: 1;
        }

        .command-footer {
          background: var(--bg-primary);
          padding: 10px 18px;
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          font-size: 10.5px;
          color: var(--text-tertiary);
        }

        .command-footer kbd {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 1px 5px;
          font-size: 10px;
          font-family: inherit;
          margin: 0 2px;
        }

        /* Miscellaneous utilities */
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 1024px) {
          .workspace-right-ops-panel {
            display: none !important;
          }
          .ops-treasury-grid {
            grid-template-columns: 1fr 1fr;
          }
          .ops-workflows-grid {
            grid-template-columns: 1fr;
          }
          .ops-agents-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .workspace-conversations-panel {
            display: none !important;
          }
          .workspace-ops-header {
            padding: 0 12px;
          }
          .hidden-mobile {
            display: none !important;
          }
          .ops-treasury-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}

// Minimal markdown renderer with support for lists, tables, and links
function MarkdownRenderer({ content }: { content: string }) {
  const codeBlocks: string[] = []
  let processed = content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    const placeholder = `__CODE_BLOCK_PLACEHOLDER_${codeBlocks.length}__`
    const escapedCode = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    codeBlocks.push(`<pre class="workspace-code-block"><code class="${lang || ''}">${escapedCode}</code></pre>`)
    return placeholder
  })

  processed = processed.replace(/\[([^\]]+)\]\s*\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="workspace-md-link">$1</a>')

  const lines = processed.split('\n')
  const outputLines: string[] = []
  
  let inList = false
  let listType: 'ul' | 'ol' | null = null
  let inTable = false
  let tableHeaders: string[] = []
  let tableRows: string[][] = []

  const closeList = () => {
    if (inList) {
      outputLines.push(listType === 'ul' ? '</ul>' : '</ol>')
      inList = false
      listType = null
    }
  }

  const closeTable = () => {
    if (inTable) {
      let tableHtml = '<div class="workspace-table-container"><table class="workspace-md-table">'
      if (tableHeaders.length > 0) {
        tableHtml += '<thead><tr>' + tableHeaders.map(h => `<th>${h}</th>`).join('') + '</tr></thead>'
      }
      tableHtml += '<tbody>'
      tableHtml += tableRows.map(row => '<tr>' + row.map(cell => `<td>${cell}</td>`).join('') + '</tr>').join('')
      tableHtml += '</tbody></table></div>'
      outputLines.push(tableHtml)
      inTable = false
      tableHeaders = []
      tableRows = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line.startsWith('|') && line.endsWith('|')) {
      closeList()
      inTable = true
      const cells = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
      const isSeparator = cells.every(c => c.match(/^:?-+:?$/))
      if (isSeparator) continue
      
      if (tableHeaders.length === 0 && tableRows.length === 0) {
        tableHeaders = cells
      } else {
        tableRows.push(cells)
      }
      continue
    } else {
      closeTable()
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList || listType !== 'ul') {
        closeList()
        outputLines.push('<ul class="workspace-md-ul">')
        inList = true
        listType = 'ul'
      }
      const itemText = line.substring(2)
      outputLines.push(`<li class="workspace-md-li">${itemText}</li>`)
      continue
    }

    const numMatch = line.match(/^(\d+)\.\s+(.+)$/)
    if (numMatch) {
      if (!inList || listType !== 'ol') {
        closeList()
        outputLines.push('<ol class="workspace-md-ol">')
        inList = true
        listType = 'ol'
      }
      const itemText = numMatch[2]
      outputLines.push(`<li class="workspace-md-li">${itemText}</li>`)
      continue
    }

    closeList()

    if (line.startsWith('### ')) {
      outputLines.push(`<h4 class="workspace-md-h4">${line.substring(4)}</h4>`)
    } else if (line.startsWith('## ')) {
      outputLines.push(`<h3 class="workspace-md-h3">${line.substring(3)}</h3>`)
    } else if (line.startsWith('# ')) {
      outputLines.push(`<h2 class="workspace-md-h2">${line.substring(2)}</h2>`)
    } else if (line === '---') {
      outputLines.push('<hr class="workspace-md-hr" />')
    } else if (line === '') {
      outputLines.push('<br />')
    } else {
      outputLines.push(line)
    }
  }

  closeList()
  closeTable()

  let finalHtml = outputLines.join('\n')
  finalHtml = finalHtml
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="workspace-inline-code">$1</code>')

  codeBlocks.forEach((codeBlock, idx) => {
    finalHtml = finalHtml.replace(`__CODE_BLOCK_PLACEHOLDER_${idx}__`, codeBlock)
  })

  finalHtml = finalHtml
    .replace(/<br \/>\n<br \/>/g, '</p><p class="workspace-md-p">')
    .replace(/\n\n/g, '</p><p class="workspace-md-p">')

  return (
    <div
      className="workspace-md-content"
      dangerouslySetInnerHTML={{ __html: `<p class="workspace-md-p">${finalHtml}</p>` }}
    />
  )
}

// Collapsible tool result
function ToolResultBlock({ result }: { result: string }) {
  const [expanded, setExpanded] = useState(false)

  let formatted = result
  try {
    formatted = JSON.stringify(JSON.parse(result), null, 2)
  } catch {}

  const isLong = formatted.length > 200

  return (
    <div className="workspace-tool-result">
      <button
        onClick={() => setExpanded(!expanded)}
        className="workspace-tool-result-toggle"
      >
        <ChevronDown
          size={12}
          style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        />
        <span>Result</span>
        <span className="text-muted" style={{ fontSize: '10px' }}>
          {formatted.length} chars
        </span>
      </button>
      {(expanded || !isLong) && (
        <pre className="workspace-tool-result-pre">
          {isLong ? formatted.slice(0, 800) + '\n...' : formatted}
        </pre>
      )}
    </div>
  )
}

// Helper to extract plan steps from a message
function parsePlan(content: string): string[] | null {
  if (!content) return null
  const planMatch = content.match(/(?:Plan|Steps|Execution Plan):?\s*\n((?:\d+\.\s+.*\n?)+)/i)
  if (!planMatch) return null
  
  const stepsText = planMatch[1]
  const steps = stepsText.split('\n')
    .map(line => line.replace(/^\d+\.\s+/, '').trim())
    .filter(line => line.length > 0)
    
  return steps
}
