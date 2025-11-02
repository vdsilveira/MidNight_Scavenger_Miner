"use client"

import { useEffect, useState } from "react"

interface RecentActivityProps {
  apiBase: string
  onNewSolution?: () => void
}

interface Solution {
  address: string
  challengeId: string
  timestamp: string
  nonce: string
}

export default function RecentActivity({ apiBase, onNewSolution }: RecentActivityProps) {
  const [solutions, setSolutions] = useState<Solution[]>([])
  const [previousCount, setPreviousCount] = useState(0)
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; timestamp: Date }>>([])

  useEffect(() => {
    const loadActivity = async () => {
      try {
        const res = await fetch(`${apiBase}/wallets/recent-activity`).catch(err => {
          console.error("Erro ao buscar recent activity:", err)
          return { ok: false } as Response
        })

        if (res.ok) {
          try {
            const data = await res.json()
            console.log("✨ Recent activity recebido:", data)
            const newSolutions = data.recentSolutions || []

            if (newSolutions.length > previousCount && previousCount > 0) {
              const newCount = newSolutions.length - previousCount
              const newNotification = {
                id: Date.now().toString(),
                message: `🎉 ${newCount} new solution(s) found and submitted!`,
                timestamp: new Date(),
              }
              setNotifications((prev) => [newNotification, ...prev.slice(0, 4)])
              if (onNewSolution) onNewSolution()

              setTimeout(() => {
                setNotifications((prev) => prev.filter((n) => n.id !== newNotification.id))
              }, 5000)
            }

            setSolutions(newSolutions)
            setPreviousCount(newSolutions.length)
          } catch (e) {
            console.error("Erro ao processar recent activity:", e)
          }
        } else {
          console.warn("Recent activity não disponível")
        }
      } catch (error) {
        console.error("❌ Erro geral ao carregar recent activity:", error)
      }
    }

    loadActivity()
    const interval = setInterval(loadActivity, 2000)
    return () => clearInterval(interval)
  }, [apiBase, previousCount, onNewSolution])

  return (
    <>
      {/* Notifications */}
      <div className="fixed top-24 right-6 z-50 space-y-2 max-w-md">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className="bg-[#00ff88] text-[#0a0e27] px-6 py-4 rounded-lg shadow-lg animate-pulse border-2 border-[#00ff88] font-bold"
          >
            <p>{notif.message}</p>
            <p className="text-xs text-[#0a0e27]/70 mt-1">{notif.timestamp.toLocaleTimeString()}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity Panel */}
      <div className="bg-[#141829] border border-[#1a1f3a] rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4">✨ Recent Activity</h3>

        {solutions.length === 0 ? (
          <p className="text-gray-400 text-sm">No solutions submitted yet...</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {solutions.slice(0, 10).map((solution, i) => {
              const timeAgo = Math.floor((Date.now() - new Date(solution.timestamp).getTime()) / 1000)
              const timeText =
                timeAgo < 60
                  ? `${timeAgo}s ago`
                  : timeAgo < 3600
                    ? `${Math.floor(timeAgo / 60)}m ago`
                    : `${Math.floor(timeAgo / 3600)}h ago`

              return (
                <div
                  key={`${solution.address}-${solution.challengeId}-${i}`}
                  className="bg-[#0a0e27]/50 rounded-lg p-4 text-sm border border-[#1a1f3a] hover:border-[#00ff88]/30 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="text-[#00ff88] font-semibold text-sm">✅ Solution Found!</p>
                      <p className="text-gray-400 font-mono text-xs mt-1">{solution.address.substring(0, 20)}...</p>
                    </div>
                    <span className="text-gray-500 text-xs">{timeText}</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#1a1f3a]">
                    <p className="text-xs text-gray-400">
                      Challenge:{" "}
                      <span className="text-gray-300 font-mono">{solution.challengeId.substring(0, 20)}...</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Nonce: <span className="text-gray-300 font-mono">{solution.nonce.substring(0, 16)}...</span>
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {solutions.length > 10 && (
          <p className="text-xs text-gray-500 mt-4 text-center">Showing 10 of {solutions.length} recent solutions</p>
        )}
      </div>
    </>
  )
}
