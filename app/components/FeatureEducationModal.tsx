'use client'

import React from 'react'
import { Sparkles, BrainCircuit, LayoutGrid, Send, BookOpen, FileText, Calendar, ArrowRightLeft, Rows, Coins, Briefcase, TrendingUp, History, ShieldCheck, Blocks, HelpCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface FeatureEducation {
  title: string
  description: string
  example: string
  docsUrl: string
}

export const FEATURE_EDUCATIONS: Record<string, FeatureEducation> = {
  '/workspace': {
    title: 'Smart Transaction Assistant',
    description: 'This is where you talk directly with a virtual assistant to execute transactions using natural language. Instead of filling out complicated forms, just type what you want as if messaging a colleague. The assistant understands your intent, prepares the transaction, and displays it for your final confirmation.',
    example: 'You can type "Check my wallet balances and send 10 USDC to our marketing partner" to complete it in seconds.',
    docsUrl: '/faq'
  },
  '/agents': {
    title: 'Automated Assistants Manager',
    description: 'This page helps you set up virtual assistants that work independently. These assistants operate around the clock to monitor your wallets, track prices, or execute recurring transfers based on rules you define. This saves you from performing repetitive manual checks every day.',
    example: 'You can activate an assistant to automatically swap currencies when rates are favorable, or send balance reports every morning.',
    docsUrl: '/faq'
  },
  '/dashboard': {
    title: 'Business Activity Overview',
    description: 'This page gives you a comprehensive view of your business financial health. You can quickly track incoming and outgoing money, review recent activities, and check requests waiting for your approval without opening multiple spreadsheets.',
    example: 'If you need to know how much money came in today or which invoices are still unpaid, you can check here instantly.',
    docsUrl: '/faq'
  },
  '/send': {
    title: 'Direct Money Transfer',
    description: 'A fast and secure tool to send money to anyone globally. Just enter the receiver\'s address and the amount. Transactions happen instantly with minimal fees, allowing you to settle bills or transfer funds without using traditional banks.',
    example: 'Use this feature when you need to make urgent payments to overseas vendors and want them to receive funds immediately.',
    docsUrl: '/faq'
  },
  '/contacts': {
    title: 'Partner Address Book',
    description: 'Keep record of contact details and wallet addresses of customers, partners, or employees. Managing your directory makes transfers much faster and prevents mistakes like typing a wrong address which could lead to loss of funds.',
    example: 'Save a supplier as "Vendor A" with their address so that you can select them from a list next time instead of copy-pasting.',
    docsUrl: '/faq'
  },
  '/invoices': {
    title: 'Payment Request Billing',
    description: 'Create and send professional payment requests to your clients. Your clients can pay directly through these bills, which helps you manage your revenue easily and automatically updates the status when the money arrives in your account.',
    example: 'After finishing a project, you can generate a 100 USDC invoice and send the link to your client for a one-click payment.',
    docsUrl: '/faq'
  },
  '/schedules': {
    title: 'Scheduled Future Transfers',
    description: 'Schedule automatic money transfers to be executed in the future. You can set up recurring payments like employee salaries or monthly office rent, and the system handles them on time so you don\'t have to remember them.',
    example: 'Set up a recurring payment on the 25th of every month to automatically pay salaries to your remote staff.',
    docsUrl: '/faq'
  },
  '/bridge': {
    title: 'Network Transfer & Funding',
    description: 'Move your funds between different digital networks to match specific payment requirements. This ensures you always have the necessary balance in the right place to pay your bills with the lowest fees and fastest speed.',
    example: 'If you have funds on the main network but need them on a faster network to pay lower fees, use this feature to move them.',
    docsUrl: '/faq'
  },
  '/batch': {
    title: 'Mass Multi-Payment',
    description: 'Send money to dozens or hundreds of people at the same time with a single confirmation. This saves you an immense amount of time and transaction fees compared to manually sending payments one by one.',
    example: 'If you have 50 employees who need to receive bonuses at the end of the month, upload a list here to pay all of them at once.',
    docsUrl: '/faq'
  },
  '/treasury': {
    title: 'Fund Manager & Currency Swap',
    description: 'Manage your money reserves and exchange between different digital currencies (like digital Dollars and digital Euros) at stable rates. This helps your business protect asset value and trade with partners in various countries.',
    example: 'Swap 1,000 digital Dollars into digital Euros to pay a supplier located in Europe without using high-cost bank brokers.',
    docsUrl: '/faq'
  },
  '/agents/jobs': {
    title: 'Secure Middleman Payments',
    description: 'Protect the interests of both you and your service provider by holding project funds in a secure middleman account. The money is only released to the provider once the agreed milestones are successfully completed and verified.',
    example: 'When hiring a designer, project funds are safely held until they deliver the final files and you confirm you are satisfied.',
    docsUrl: '/faq'
  },
  '/analytics': {
    title: 'Cash Flow Analytics',
    description: 'Visual charts showing your business spending habits, revenue trends, and money transfer history over time. This helps you make smarter financial decisions and optimize your operating budgets.',
    example: 'See which month you spent the most money or which partner received the highest volume of transfers in the last quarter.',
    docsUrl: '/faq'
  },
  '/history': {
    title: 'Official Transaction Log',
    description: 'A detailed and permanent log of all transactions executed. This is your official record book for accounting, exporting tax files, or providing payment proofs to auditors whenever needed.',
    example: 'Search for a payment made to a partner last month to download a receipt and send it to them for verification.',
    docsUrl: '/faq'
  },
  '/compliance': {
    title: 'Safety & Security Screening',
    description: 'Check the safety and risk level of wallet addresses before and after sending money. This automatically flags suspicious accounts and blocks bad actors, ensuring your business stays safe and fully follows legal rules.',
    example: 'Before receiving a large payment from a new client, scan their wallet address here to verify that the source of funds is clean.',
    docsUrl: '/faq'
  },
  '/integrations': {
    title: 'System & App Connections',
    description: 'Connect your financial account with other business apps or banks. This automates data sharing, eliminates manual data entry, and bridges workflows between different platforms to keep your business records in sync.',
    example: 'Connect your account to your accounting software so that every transaction automatically records without any typing.',
    docsUrl: '/faq'
  }
}

const FEATURE_ICONS: Record<string, any> = {
  '/workspace': Sparkles,
  '/agents': BrainCircuit,
  '/dashboard': LayoutGrid,
  '/send': Send,
  '/contacts': BookOpen,
  '/invoices': FileText,
  '/schedules': Calendar,
  '/bridge': ArrowRightLeft,
  '/batch': Rows,
  '/treasury': Coins,
  '/agents/jobs': Briefcase,
  '/analytics': TrendingUp,
  '/history': History,
  '/compliance': ShieldCheck,
  '/integrations': Blocks
}

interface FeatureEducationModalProps {
  pathname: string
  config: FeatureEducation
  onClose: () => void
  onNeverShowAgain: () => void
}

export default function FeatureEducationModal({ pathname, config, onClose, onNeverShowAgain }: FeatureEducationModalProps) {
  const router = useRouter()
  const IconComponent = FEATURE_ICONS[pathname] || HelpCircle

  const handleLearnMore = () => {
    router.push(config.docsUrl)
    onClose()
  }

  return (
    <div className="edu-modal-content">
      {/* Icon Header */}
      <div className="edu-modal-icon-container">
        <IconComponent size={32} className="edu-modal-icon animate-pulse-subtle" />
      </div>

      {/* Meta Label */}
      <div className="edu-modal-badge text-mono text-xs">
        FEATURE ONBOARDING
      </div>

      {/* Title */}
      <h3 className="edu-modal-title">
        {config.title}
      </h3>

      {/* Description */}
      <p className="edu-modal-description">
        {config.description}
      </p>

      {/* Real-world Example Card */}
      <div className="edu-modal-example-card">
        <span className="edu-modal-example-label">💡 Practical Example:</span>
        <p className="edu-modal-example-text">{config.example}</p>
      </div>

      {/* Actions */}
      <div className="edu-modal-actions">
        <button onClick={onClose} className="btn primary edu-btn">
          Got it
        </button>
        <button onClick={handleLearnMore} className="btn ghost edu-btn">
          View detailed guide
        </button>
      </div>

      <button onClick={onNeverShowAgain} className="edu-never-show-btn">
        Don't show this again
      </button>

      <style jsx>{`
        .edu-modal-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          color: var(--text-primary);
        }

        .edu-modal-icon-container {
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.25);
          width: 64px;
          height: 64px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          box-shadow: 0 8px 16px -4px rgba(59, 130, 246, 0.2);
        }

        :global(.edu-modal-icon) {
          color: #3b82f6;
        }

        .edu-modal-badge {
          background: var(--bg-secondary);
          color: var(--text-secondary);
          border: 1px solid var(--border);
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 600;
          letter-spacing: 0.05em;
          margin-bottom: 12px;
        }

        .edu-modal-title {
          font-size: 20px;
          font-weight: 600;
          font-family: 'Outfit', 'Inter Tight', sans-serif;
          letter-spacing: -0.02em;
          margin: 0 0 12px 0;
        }

        .edu-modal-description {
          font-size: 13.5px;
          line-height: 1.55;
          color: var(--text-secondary);
          margin: 0 0 20px 0;
        }

        .edu-modal-example-card {
          background: var(--bg-secondary);
          border: 1px dashed var(--border);
          border-radius: 8px;
          padding: 14px 16px;
          width: 100%;
          text-align: left;
          margin-bottom: 24px;
        }

        .edu-modal-example-label {
          font-size: 12px;
          font-weight: 600;
          color: #3b82f6;
          display: block;
          margin-bottom: 4px;
        }

        .edu-modal-example-text {
          font-size: 12.5px;
          line-height: 1.45;
          color: var(--text-primary);
          margin: 0;
          font-style: italic;
        }

        .edu-modal-actions {
          display: flex;
          gap: 12px;
          width: 100%;
          margin-bottom: 16px;
        }

        :global(.edu-btn) {
          flex: 1;
          height: 38px;
          font-size: 13px !important;
          font-weight: 500;
        }

        .edu-never-show-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-size: 11.5px;
          text-decoration: underline;
          cursor: pointer;
          transition: color 0.15s ease;
          padding: 4px 8px;
        }

        .edu-never-show-btn:hover {
          color: var(--text-primary);
        }

        .animate-pulse-subtle {
          animation: pulseSubtle 2s infinite ease-in-out;
        }

        @keyframes pulseSubtle {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.95;
          }
        }
      `}</style>
    </div>
  )
}
