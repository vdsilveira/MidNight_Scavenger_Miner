"use client"

import { useEffect, useState } from "react"

interface MiningStatusProps {
  apiBase: string
}

interface MiningStatusData {
  isMining: boolean
  activeWorkers: number
  pendingAddresses: number
  totalWorkers: number
  maxConcurrent: number
  interval: number
  activeAddresses?: string[]
}

export default function MiningStatus({ apiBase }: MiningStatusProps) {
  const [status, setStatus] = useState<MiningStatusData | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const res = await fetch(`${apiBase}/wallets/mining-status`).catch(err => {
          console.error("Erro ao buscar mining status:", err)
          return { ok: false } as Response
        })

        if (res.ok) {
          try {
            const data = await res.json()
            console.log("⛏️ Mining status recebido:", data)
            setStatus(data)
            setLastUpdate(new Date())
          } catch (e) {
            console.error("Erro ao processar mining status:", e)
          }
        } else {
          console.warn("Mining status não disponível")
        }
      } catch (error) {
        console.error("❌ Erro geral ao carregar mining status:", error)
      }
    }

    loadStatus()
    const interval = setInterval(loadStatus, 3000)
    return () => clearInterval(interval)
  }, [apiBase])

  if (!status) {
    return (
      <div className="bg-[#141829] border border-[#1a1f3a] rounded-lg p-6">
        <p className="text-gray-400">Loading mining status...</p>
      </div>
    )
  }

  const statusColor = status.isMining
    ? status.activeWorkers > 0
      ? "text-[#00ff88]"
      : "text-yellow-400"
    : "text-red-500"

  const statusText = status.isMining ? (status.activeWorkers > 0 ? "⛏️ Mining Actively" : "⏸️ Waiting") : "⏹️ Stopped"

  return (
    <div className="bg-[#141829] border border-[#1a1f3a] rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-white">Mining Status</h3>
        <span className={`text-sm font-semibold ${statusColor}`}>{statusText}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#0a0e27]/50 rounded-lg p-4 border border-[#1a1f3a]">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Active Workers</p>
          <p className="text-2xl font-bold text-yellow-400">
            {status.activeWorkers} / {status.maxConcurrent}
          </p>
        </div>
        <div className="bg-[#0a0e27]/50 rounded-lg p-4 border border-[#1a1f3a]">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">In Queue</p>
          <p className="text-2xl font-bold text-orange-400">{status.pendingAddresses}</p>
        </div>
        <div className="bg-[#0a0e27]/50 rounded-lg p-4 border border-[#1a1f3a]">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Interval</p>
          <p className="text-lg font-bold text-gray-300">{status.interval}ms</p>
        </div>
        <div className="bg-[#0a0e27]/50 rounded-lg p-4 border border-[#1a1f3a]">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Total Workers</p>
          <p className="text-lg font-bold text-gray-300">{status.totalWorkers}</p>
        </div>
      </div>

      {status.activeWorkers > 0 && status.activeAddresses && status.activeAddresses.length > 0 && (
        <div className="pt-6 border-t border-[#1a1f3a]">
          <p className="text-xs text-gray-400 mb-3">⚡ {status.activeWorkers} mining address(es) right now...</p>
          <div className="flex flex-wrap gap-2">
            {(status.activeAddresses || []).slice(0, 3).map((addr, i) => (
              <span key={i} className="text-xs font-mono bg-[#0a0e27] text-gray-400 px-2 py-1 rounded">
                {addr.substring(0, 12)}...
              </span>
            ))}
            {status.activeAddresses && status.activeAddresses.length > 3 && (
              <span className="text-xs text-gray-500">+{status.activeAddresses.length - 3} more</span>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-6 text-right">Updated: {lastUpdate.toLocaleTimeString()}</p>
    </div>
  )
}
