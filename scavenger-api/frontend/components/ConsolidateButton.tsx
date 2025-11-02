"use client"

import { useState } from "react"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"

export default function ConsolidateButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleConsolidate = async () => {
    if (
      !confirm("Are you sure you want to consolidate all solutions to the main address? This action is irreversible.")
    ) {
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`${API_BASE}/consolidation/all-to-main`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Error consolidating")
      }

      const data = await response.json()
      setResult(data)

      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (err: any) {
      setError(err.message || "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-orange-500/20 via-red-500/20 to-pink-500/20 border border-orange-500/30 rounded-lg p-6">
        <button
          onClick={handleConsolidate}
          disabled={loading}
          className={`
            w-full py-3 px-6 rounded-lg font-semibold text-sm uppercase tracking-wide
            ${loading ? "bg-gray-600 cursor-not-allowed" : "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 active:from-orange-800 active:to-red-800"}
            transition-all duration-200 text-white shadow-lg
            disabled:opacity-50 border border-orange-700/50
          `}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Consolidating...
            </span>
          ) : (
            "🔄 Consolidate All Solutions to Main Address"
          )}
        </button>

        <p className="text-xs text-orange-200 text-center mt-3">
          ⚠️ Consolidates all solutions from derived addresses to the main address (m/1852'/1815'/0'/0/0)
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">❌ Error: {error}</p>
        </div>
      )}

      {result && (
        <div className="p-4 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-lg">
          <p className="text-[#00ff88] font-semibold text-sm">✅ Consolidation Complete!</p>
          <div className="mt-2 text-xs text-gray-300 space-y-1">
            <p>Success: {result.success}</p>
            <p>Failed: {result.failed}</p>
            <p>Total: {result.total}</p>
          </div>
        </div>
      )}
    </div>
  )
}
