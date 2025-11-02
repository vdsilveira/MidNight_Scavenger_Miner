import type { Stats } from "@/types"

interface StatsHeaderProps {
  stats: Stats
}

export default function StatsHeader({ stats }: StatsHeaderProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-[#141829] border border-[#1a1f3a] rounded-lg p-6 hover:border-[#00ff88]/50 transition-colors">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Wallets</p>
        <p className="text-4xl font-bold text-white">{stats.totalWallets}</p>
      </div>

      <div className="bg-[#141829] border border-[#1a1f3a] rounded-lg p-6 hover:border-[#00ff88]/50 transition-colors">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Submissions</p>
        <p className="text-4xl font-bold text-white">{stats.totalSubmissions}</p>
      </div>

      <div className="bg-[#141829] border border-[#1a1f3a] rounded-lg p-6 hover:border-[#00ff88]/50 transition-colors">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">NIGHT Earned</p>
        <p className="text-4xl font-bold text-[#00ff88]">{stats.totalNightEarned.toFixed(3)}</p>
      </div>

      <div className="bg-[#141829] border border-[#1a1f3a] rounded-lg p-6 hover:border-[#00ff88]/50 transition-colors">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Status</p>
        <div className="flex items-center gap-2 mt-2">
          <div className={`w-3 h-3 rounded-full ${stats.status === "connected" ? "bg-[#00ff88]" : "bg-red-500"}`} />
          <span className={`text-lg font-semibold ${stats.status === "connected" ? "text-[#00ff88]" : "text-red-500"}`}>
            {stats.status === "connected" ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>
    </div>
  )
}
