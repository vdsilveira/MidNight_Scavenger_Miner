import type { Wallet } from "@/types"

interface WalletCardProps {
  wallet: Wallet
}

export default function WalletCard({ wallet }: WalletCardProps) {
  const shortAddress = `${wallet.address.substring(0, 8)}...${wallet.address.substring(wallet.address.length - 6)}`

  const getStatusConfig = () => {
    switch (wallet.status) {
      case "mining":
        return {
          bgColor: "bg-yellow-500/10",
          textColor: "text-yellow-400",
          borderColor: "border-yellow-500/30",
          label: "Mining",
          icon: (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ),
        }
      case "submitted":
        return {
          bgColor: "bg-[#00ff88]/10",
          textColor: "text-[#00ff88]",
          borderColor: "border-[#00ff88]/50",
          label: "Submitted",
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          ),
        }
      case "pending":
      default:
        return {
          bgColor: "bg-gray-500/10",
          textColor: "text-gray-400",
          borderColor: "border-gray-500/30",
          label: "Pending",
          icon: (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
          ),
        }
    }
  }

  const statusConfig = getStatusConfig()

  return (
    <div
      className="bg-[#141829] border-2 rounded-lg p-3 hover:border-[#00ff88] transition-all duration-300 hover:shadow-lg hover:shadow-[#00ff88]/20 relative group"
      style={{
        borderColor:
          statusConfig.borderColor === "border-[#00ff88]/50"
            ? "#00ff88"
            : statusConfig.borderColor === "border-yellow-500/30"
              ? "#eab308"
              : "#4b5563",
      }}
    >
      {/* Status Badge */}
      <div className="absolute top-2 right-2">
        <div
          className={`flex items-center gap-1.5 ${statusConfig.bgColor} ${statusConfig.textColor} px-2 py-1 rounded-full text-xs font-semibold border ${statusConfig.borderColor}`}
        >
          {statusConfig.icon}
          {statusConfig.label}
        </div>
      </div>

      {/* Wallet Info */}
      <div className="mt-7">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Wallet ID</p>
        <p className="text-sm font-bold font-mono text-gray-200">{wallet.id || shortAddress}</p>

        <p className="text-xs text-gray-500 uppercase tracking-wider mt-2 mb-1">Address</p>
        <p className="text-xs font-mono text-gray-400 truncate" title={wallet.address}>
          {shortAddress}
        </p>

        <div className="mt-2 pt-2 border-t border-[#1a1f3a]">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Submissions</span>
            <span className="font-bold text-white">{wallet.submissions}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500 uppercase tracking-wider">NIGHT Earned</span>
            <span className="font-bold text-[#00ff88]">{Number.parseFloat(wallet.nightEarned).toFixed(3)}</span>
          </div>

          {wallet.lastSubmission && (
            <div className="mt-2 pt-2 border-t border-[#1a1f3a]">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Last submission</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(wallet.lastSubmission).toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
