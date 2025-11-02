"use client"

import { useEffect, useState } from "react"
import StatsHeader from "@/components/StatsHeader"
import ChallengeInfo from "@/components/ChallengeInfo"
import DailyActivity from "@/components/DailyActivity"
import WalletCard from "@/components/WalletCard"
import MiningStatus from "@/components/MiningStatus"
import RecentActivity from "@/components/RecentActivity"
import ConsolidateButton from "@/components/ConsolidateButton"

interface Stats {
  totalWallets: number
  totalSubmissions: number
  totalNightEarned: number
  status: "connected" | "disconnected"
}

interface Challenge {
  code: string
  challenge?: {
    challenge_id: string
    difficulty: string
    day: number
    challenge_number: number
    issued_at: string
    latest_submission: string
    no_pre_mine: string
    no_pre_mine_hour: string
  }
  max_day?: number
  current_day?: number
  starts_at?: string
  next_challenge_starts_at?: string
  mining_period_ends?: string
  total_challenges?: number
}

interface Wallet {
  id: string
  address: string
  status: "mining" | "submitted" | "pending"
  submissions: number
  nightEarned: string
  lastSubmission?: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalWallets: 0,
    totalSubmissions: 0,
    totalNightEarned: 0,
    status: "disconnected",
  })
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [submittedCount, setSubmittedCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [walletFilter, setWalletFilter] = useState<"all" | "mining" | "pending" | "submitted">("all")

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsRes, challengeRes, walletsRes] = await Promise.all([
          fetch(`${API_BASE}/wallets/stats`),
          fetch(`${API_BASE}/challenge/current`),
          fetch(`${API_BASE}/wallets`),
        ])

        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData)
        }

        if (challengeRes.ok) {
          const challengeData = await challengeRes.json()
          setChallenge(challengeData)
        }

        if (walletsRes.ok) {
          const walletsData = await walletsRes.json()
          console.log("[v0] Wallets response structure:", walletsData)

          const walletsArray = Array.isArray(walletsData) ? walletsData : walletsData.wallets || []

          setWallets(walletsArray)
          setSubmittedCount(walletsArray.filter((w: Wallet) => w.status === "submitted").length)
          setPendingCount(walletsArray.filter((w: Wallet) => w.status === "pending").length)
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
      }
    }

    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [])

  const filteredWallets = walletFilter === "all" ? wallets : wallets.filter((w) => w.status === walletFilter)

  return (
    <div className="min-h-screen bg-[#0a0e27]">
      {/* Header */}
      <header className="border-b border-[#1a1f3a] bg-[#0f1533] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#00ff88] to-[#00cc6a] rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-[#0a0e27]">⛏️</span>
              </div>
              <h1 className="text-2xl font-bold text-white">Midnight Miner</h1>
            </div>
            <div className="flex items-center gap-8">
              <div className="text-right">
                <p className="text-xs text-gray-400">NIGHT Earned</p>
                <p className="text-2xl font-bold text-[#00ff88]">{stats.totalNightEarned.toFixed(6)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Status</p>
                <div className="flex items-center gap-2 justify-end mt-1">
                  <div
                    className={`w-2 h-2 rounded-full ${stats.status === "connected" ? "bg-[#00ff88]" : "bg-red-500"}`}
                  />
                  <span className={stats.status === "connected" ? "text-[#00ff88]" : "text-red-500"}>
                    {stats.status === "connected" ? "Connected" : "Disconnected"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Row */}
        <div className="mb-8">
          <StatsHeader stats={stats} />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left Column - Challenge Info */}
          <div className="lg:col-span-1">
            <ChallengeInfo challenge={challenge} submittedCount={submittedCount} pendingCount={pendingCount} />
          </div>

          {/* Right Column - Earnings & Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Earnings Card */}
            <div className="bg-[#141829] border border-[#1a1f3a] rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">Earnings</h3>
              <div className="bg-gradient-to-br from-[#1a1f3a] to-[#0a0e27] rounded-lg p-8 text-center mb-6">
                <p className="text-sm text-gray-400 mb-2">Total NIGHT Earned</p>
                <p className="text-5xl font-bold text-[#00ff88]">{stats.totalNightEarned.toFixed(6)}</p>
                <p className="text-xs text-gray-500 mt-2">Updated in real-time</p>
              </div>

              {/* Daily Activity */}
              <h4 className="text-sm font-semibold text-gray-400 mb-4">Daily Activity</h4>
              <DailyActivity challenge={challenge} />
            </div>
          </div>
        </div>

        {/* Mining Status */}
        <div className="mb-8">
          <MiningStatus apiBase={API_BASE} />
        </div>

        {/* Wallets Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Wallets</h2>
            <div className="flex gap-2">
              {[
                { label: "All", value: "all" as const },
                { label: "Submitted", value: "submitted" as const },
                { label: "Pending", value: "pending" as const },
                { label: "Mining", value: "mining" as const },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setWalletFilter(filter.value)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 ${
                    walletFilter === filter.value
                      ? "bg-[#00ff88] text-[#0a0e27] border border-[#00ff88]"
                      : "bg-transparent text-gray-400 border border-[#1a1f3a] hover:border-[#00ff88]/50 hover:text-[#00ff88]"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {filteredWallets.length === 0 ? (
            <div className="bg-[#141829] border border-[#1a1f3a] rounded-lg p-12 text-center">
              <p className="text-gray-400">
                {walletFilter === "all"
                  ? "Nenhuma carteira registrada. Use a CLI para registrar endereços."
                  : `Nenhuma carteira com status "${walletFilter}" encontrada.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredWallets.map((wallet) => (
                <WalletCard key={wallet.address} wallet={wallet} />
              ))}
            </div>
          )}
        </div>

        {/* Consolidation Section */}
        <div className="bg-gradient-to-br from-orange-500/10 via-red-500/10 to-pink-500/10 border-2 border-orange-500/30 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-2">Consolidação</h2>
          <p className="text-sm text-orange-100/80 mb-4">
            Ao final da campanha de mineração, consolide todas as soluções dos endereços derivados para o endereço
            principal
          </p>
          <ConsolidateButton />
        </div>

        {/* Recent Activity */}
        <div>
          <RecentActivity apiBase={API_BASE} />
        </div>
      </main>
    </div>
  )
}
