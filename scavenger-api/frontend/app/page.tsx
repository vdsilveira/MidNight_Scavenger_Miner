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

  const [challengeChanged, setChallengeChanged] = useState(false)
  const [lastChallengeId, setLastChallengeId] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        // ✅ Buscar todas as informações em paralelo
        const [statsRes, challengeRes, walletsRes, challengeInfoRes] = await Promise.all([
          fetch(`${API_BASE}/wallets/stats`).catch(err => {
            console.error("Erro ao buscar stats:", err)
            return { ok: false } as Response
          }),
          fetch(`${API_BASE}/challenge/current`).catch(err => {
            console.error("Erro ao buscar challenge:", err)
            return { ok: false } as Response
          }),
          fetch(`${API_BASE}/wallets`).catch(err => {
            console.error("Erro ao buscar wallets:", err)
            return { ok: false } as Response
          }),
          fetch(`${API_BASE}/wallets/challenge-info`).catch(err => {
            console.error("Erro ao buscar challenge info:", err)
            return { ok: false } as Response
          }),
        ])

        // ✅ Processar stats
        if (statsRes.ok) {
          try {
            const statsData = await statsRes.json()
            console.log("📊 Stats recebidos:", statsData)
            setStats({
              totalWallets: statsData.totalWallets || 0,
              totalSubmissions: statsData.totalSubmissions || 0,
              totalNightEarned: statsData.totalNightEarned || 0,
              status: statsData.status || "connected",
            })
          } catch (e) {
            console.error("Erro ao processar stats:", e)
            setStats(prev => ({ ...prev, status: "disconnected" }))
          }
        } else {
          console.warn("Stats não disponíveis")
          setStats(prev => ({ ...prev, status: "disconnected" }))
        }

        // ✅ Processar challenge
        if (challengeRes.ok) {
          try {
            const challengeData = await challengeRes.json()
            console.log("🎯 Challenge recebido:", challengeData)
            
            // ✅ Detectar mudança de challenge
            const currentChallengeId = challengeData.challenge?.challenge_id
            if (currentChallengeId && lastChallengeId && currentChallengeId !== lastChallengeId) {
              console.log(`🔄 CHALLENGE MUDOU! ${lastChallengeId} → ${currentChallengeId}`)
              setChallengeChanged(true)
              setTimeout(() => setChallengeChanged(false), 10000) // Remover aviso após 10s
            }
            
            if (currentChallengeId) {
              setLastChallengeId(currentChallengeId)
            }
            
            setChallenge(challengeData)
          } catch (e) {
            console.error("Erro ao processar challenge:", e)
          }
        } else {
          console.warn("Challenge não disponível")
        }

        // ✅ Processar informações de mudança de challenge
        if (challengeInfoRes.ok) {
          try {
            const challengeInfo = await challengeInfoRes.json()
            console.log("📊 Challenge info recebido:", challengeInfo)
            
            if (challengeInfo.hasChanged) {
              console.log(`🔄 Challenge mudou detectado via API: ${challengeInfo.lastChallengeId} → ${challengeInfo.currentChallengeId}`)
              setChallengeChanged(true)
              setTimeout(() => setChallengeChanged(false), 10000)
              
              // Atualizar lastChallengeId
              if (challengeInfo.currentChallengeId) {
                setLastChallengeId(challengeInfo.currentChallengeId)
              }
            }
          } catch (e) {
            console.error("Erro ao processar challenge info:", e)
          }
        }

        // ✅ Processar wallets
        if (walletsRes.ok) {
          try {
            const walletsData = await walletsRes.json()
            console.log("💼 Wallets recebidos:", walletsData)

            // ✅ Suportar diferentes formatos de resposta
            const walletsArray = Array.isArray(walletsData) 
              ? walletsData 
              : walletsData.wallets || walletsData.data || []

            console.log(`📋 Processando ${walletsArray.length} carteiras`)

            setWallets(walletsArray)
            setSubmittedCount(walletsArray.filter((w: Wallet) => w.status === "submitted").length)
            setPendingCount(walletsArray.filter((w: Wallet) => w.status === "pending").length)
          } catch (e) {
            console.error("Erro ao processar wallets:", e)
          }
        } else {
          console.warn("Wallets não disponíveis")
        }

        // ✅ Atualizar status de conexão baseado em sucesso
        setStats(prev => ({
          ...prev,
          status: statsRes.ok || challengeRes.ok || walletsRes.ok ? "connected" : "disconnected"
        }))
      } catch (error) {
        console.error("❌ Erro geral ao carregar dados:", error)
        setStats(prev => ({ ...prev, status: "disconnected" }))
      }
    }

    // ✅ Carregar imediatamente e depois a cada 5 segundos
    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [lastChallengeId]) // ✅ Incluir lastChallengeId para detectar mudanças
  
  // ✅ Verificar conexão com API periodicamente
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await fetch(`${API_BASE}/wallets/stats`, { 
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        })
        if (!res.ok) {
          console.error(`❌ API não respondeu: ${res.status} ${res.statusText}`)
          setStats(prev => ({ ...prev, status: "disconnected" }))
        }
      } catch (error) {
        console.error("❌ Erro de conexão com API:", error)
        setStats(prev => ({ ...prev, status: "disconnected" }))
      }
    }
    
    checkConnection()
    const connectionCheck = setInterval(checkConnection, 10000) // Verificar a cada 10s
    return () => clearInterval(connectionCheck)
  }, [])

  const filteredWallets = walletFilter === "all" ? wallets : wallets.filter((w) => w.status === walletFilter)

  return (
    <div className="min-h-screen bg-[#0a0e27]">
      {/* ✅ Notificação de Mudança de Challenge */}
      {challengeChanged && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-8 py-4 rounded-lg shadow-xl border-2 border-yellow-400 animate-pulse">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔄</span>
            <div>
              <p className="font-bold text-lg">Challenge Mudou!</p>
              <p className="text-sm opacity-90">
                Novo challenge detectado: {challenge?.challenge?.challenge_id || 'Carregando...'}
              </p>
            </div>
          </div>
        </div>
      )}

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
