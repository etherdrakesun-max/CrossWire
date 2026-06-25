'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts'
import { 
  TrendingUp, 
  Calendar, 
  FileDown, 
  Globe, 
  Users, 
  DollarSign, 
  Activity, 
  RefreshCw 
} from 'lucide-react'
import toast from 'react-hot-toast'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'
import { CHART_THEME, formatChartCurrency } from '@/lib/charts'

export default function AnalyticsPage() {
  const { address } = useAccount()
  const [range, setRange] = useState('30') // 7, 30, 90 days
  const [loading, setLoading] = useState(true)
  const [volumeData, setVolumeData] = useState<any[]>([])
  const [counterpartyData, setCounterpartyData] = useState<any[]>([])
  const [breakdownData, setBreakdownData] = useState<{ purpose: any[]; geographic: any[] }>({ purpose: [], geographic: [] })

  const fetchAnalytics = async () => {
    try {
      // Fetch time series
      const volRes = await fetch(`/api/analytics/volume?range=${range}`)
      if (volRes.ok) {
        const res = await volRes.json()
        setVolumeData(res.data)
      }

      // Fetch top counterparties
      const cpRes = await fetch(`/api/analytics/counterparties`)
      if (cpRes.ok) {
        const res = await cpRes.json()
        setCounterpartyData(res.data)
      }

      // Fetch categorizations breakdown
      const bdRes = await fetch(`/api/analytics/breakdown`)
      if (bdRes.ok) {
        const res = await bdRes.json()
        setBreakdownData({
          purpose: res.purpose || [],
          geographic: res.geographic || []
        })
      }
    } catch (err) {
      console.error('Failed to load analytics:', err)
      toast.error('Could not refresh report data')
    } finally {
      setLoading(false)
    }
  }

  // Refresh and setup polling
  useEffect(() => {
    setLoading(true)
    fetchAnalytics()

    // 10 second automated polling
    const interval = setInterval(() => {
      fetchAnalytics()
    }, 10000)

    return () => clearInterval(interval)
  }, [range])

  const handleExportCSV = () => {
    window.open(`/api/analytics/export?format=csv&range=${range}`, '_blank')
    toast.success('Auditor CSV export initiated!')
  }

  const handlePrintPDF = () => {
    window.print()
  }

  // Summarize metrics
  const totalVolume = volumeData.reduce((acc, curr) => acc + curr.volume, 0)
  const totalWires = volumeData.reduce((acc, curr) => acc + curr.wires, 0)
  const totalFees = volumeData.reduce((acc, curr) => acc + curr.fees, 0)

  return (
    <div className="layout-wrapper">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <div className="page-container animate-fade-in print:p-0">
          
          {/* Header */}
          <div className="flex justify-between items-center print:hidden" style={{ marginBottom: '24px' }}>
            <div>
              <h1 className="flex items-center gap-3">
                <TrendingUp size={32} className="text-primary" />
                Institutional Analytics & FX Reporting
              </h1>
              <p className="text-muted text-sm mt-1">
                Real-time volume tracking, counterparties volume, and purpose code breakdowns.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="capsule-select-container">
                {['7', '30', '90'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`capsule-select-btn font-semibold ${range === r ? 'active' : ''}`}
                  >
                    {r} Days
                  </button>
                ))}
              </div>
              
              <button onClick={handleExportCSV} className="btn secondary flex items-center gap-2 text-xs">
                <FileDown size={14} /> Export CSV
              </button>
              <button onClick={handlePrintPDF} className="btn primary flex items-center gap-2 text-xs">
                <FileDown size={14} /> Print PDF Statement
              </button>
            </div>
          </div>

          {/* Printable Report Title (Only visible in Print) */}
          <div className="hidden print:block text-slate-950 border-b pb-4 mb-6">
            <h1 className="text-2xl font-bold">CrossWire Audit Ledger Statement</h1>
            <p className="text-sm text-slate-500">Report Range: Last {range} Days | Generated on: {new Date().toLocaleDateString()}</p>
          </div>

          {/* Stat highlights */}
          <div className="stat-grid" style={{ marginBottom: '24px' }}>
            <div className="stat-card">
              <div className="stat-label">Total Outflow Volume</div>
              <div className="stat-value text-primary">${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div className="text-xxs text-secondary mt-1 font-semibold">USDC Settled on Arc L1</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Wire Operations</div>
              <div className="stat-value">{totalWires}</div>
              <div className="text-xxs text-secondary mt-1 font-semibold">Active ledger settlements</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Protocol Fee Revenue</div>
              <div className="stat-value text-emerald-500">${totalFees.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div className="text-xxs text-secondary mt-1 font-semibold">0.25% fee collection</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Real-time Polling</div>
              <div className="stat-value flex items-center gap-2" style={{ fontSize: '18px' }}>
                <Activity size={18} className="text-primary animate-pulse" /> Active
              </div>
              <div className="text-xxs text-secondary mt-1 font-semibold">Data updates every 10s</div>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">
              <div className="empty-state-icon animate-spin mb-4">
                <RefreshCw size={32} />
              </div>
              <div>Compiling transaction charts and ledger records...</div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              
              {/* Primary Charts Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }} className="print:block">
                
                {/* Outflow Volume Area Chart */}
                <div className="card">
                  <div className="card-header">
                    <h2>USDC Volume Outflow Trend</h2>
                  </div>
                  <div className="card-body">
                    <div style={{ height: '300px', width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={volumeData}>
                          <defs>
                            <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={CHART_THEME.primary} stopOpacity={0.4}/>
                              <stop offset="95%" stopColor={CHART_THEME.primary} stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                          <YAxis 
                            stroke="#64748b" 
                            fontSize={11} 
                            tickFormatter={formatChartCurrency} 
                          />
                          <Tooltip 
                            contentStyle={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px' }}
                            labelStyle={{ color: '#fff', fontSize: '12px' }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="volume" 
                            stroke={CHART_THEME.primary} 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorVolume)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Purpose Code Breakdown Pie */}
                <div className="card">
                  <div className="card-header">
                    <h2>Purpose Breakdown</h2>
                  </div>
                  <div className="card-body flex justify-center items-center">
                    {breakdownData.purpose.length === 0 ? (
                      <p className="text-secondary text-xs">No categorizations recorded.</p>
                    ) : (
                      <div style={{ height: '300px', width: '100%', display: 'flex', flexDirection: 'column', justifyItems: 'center' }}>
                        <div style={{ flex: 1, maxHeight: '200px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={breakdownData.purpose}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {breakdownData.purpose.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={CHART_THEME.colors[index % CHART_THEME.colors.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center mt-2 text-xxs text-secondary">
                          {breakdownData.purpose.map((entry, index) => (
                            <div key={index} className="flex items-center gap-1">
                              <span 
                                style={{ 
                                  width: '8px', 
                                  height: '8px', 
                                  borderRadius: '50%', 
                                  background: CHART_THEME.colors[index % CHART_THEME.colors.length] 
                                }}
                              />
                              <span>{entry.name} ({entry.value})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Secondary Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }} className="print:block">
                
                {/* Wires Count Bar Chart */}
                <div className="card">
                  <div className="card-header">
                    <h2>Wire Count Frequency</h2>
                  </div>
                  <div className="card-body">
                    <div style={{ height: '200px', width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={volumeData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="date" stroke="#64748b" fontSize={9} />
                          <YAxis stroke="#64748b" fontSize={10} />
                          <Tooltip 
                            contentStyle={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.05)' }} 
                          />
                          <Bar dataKey="wires" fill={CHART_THEME.secondary} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Protocol Fees Collected */}
                <div className="card">
                  <div className="card-header">
                    <h2>Protocol Fees Collected</h2>
                  </div>
                  <div className="card-body">
                    <div style={{ height: '200px', width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={volumeData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="date" stroke="#64748b" fontSize={9} />
                          <YAxis stroke="#64748b" fontSize={10} tickFormatter={formatChartCurrency} />
                          <Tooltip 
                            contentStyle={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.05)' }} 
                          />
                          <Bar dataKey="fees" fill={CHART_THEME.success} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Geographic breakdown */}
                <div className="card">
                  <div className="card-header">
                    <h2>KYC Geographic Distribution</h2>
                  </div>
                  <div className="card-body flex justify-center items-center">
                    {breakdownData.geographic.length === 0 ? (
                      <p className="text-secondary text-xs">No geo-KYC data registered.</p>
                    ) : (
                      <div style={{ height: '200px', width: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ flex: 1 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={breakdownData.geographic}
                                cx="50%"
                                cy="50%"
                                outerRadius={60}
                                dataKey="value"
                              >
                                {breakdownData.geographic.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={CHART_THEME.colors[(index + 3) % CHART_THEME.colors.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center mt-1 text-xxs text-secondary">
                          {breakdownData.geographic.map((entry, index) => (
                            <div key={index} className="flex items-center gap-1">
                              <span 
                                style={{ 
                                  width: '8px', 
                                  height: '8px', 
                                  borderRadius: '50%', 
                                  background: CHART_THEME.colors[(index + 3) % CHART_THEME.colors.length] 
                                }}
                              />
                              <span>{entry.name} ({entry.value})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Top Counterparties Table */}
              <div className="card">
                <div className="card-header">
                  <h2>Top 10 Outbound Counterparties by Volume</h2>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  {counterpartyData.length === 0 ? (
                    <p className="text-center py-6 text-secondary text-xs">No counterparty transfers recorded yet.</p>
                  ) : (
                    <table className="database-table">
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Counterparty Address</th>
                          <th>Identity Label</th>
                          <th>Total Volume (USDC)</th>
                          <th>Transfer Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {counterpartyData.map((cp, idx) => (
                          <tr key={idx} className="hover:bg-slate-900">
                            <td>
                              <span className={`badge ${idx === 0 ? 'primary' : idx === 1 ? 'info' : 'gray'}`}>
                                #{idx + 1}
                              </span>
                            </td>
                            <td className="font-mono text-xs">{cp.address}</td>
                            <td><strong>{cp.name}</strong></td>
                            <td className="text-primary font-bold">${cp.volume.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td>{cp.count} wires</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  )
}
