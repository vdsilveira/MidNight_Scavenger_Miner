"use client"

import type { Challenge } from "@/types"
import { useEffect, useState } from "react"

interface ChallengeInfoProps {
  challenge: Challenge | null
  submittedCount?: number
  pendingCount?: number
}

export default function ChallengeInfo({ challenge, submittedCount = 0, pendingCount = 0 }: ChallengeInfoProps) {
  const [timeToNext, setTimeToNext] = useState<string>("0m 0s")

  useEffect(() => {
    if (!challenge?.next_challenge_starts_at) return

    const updateTimer = () => {
      const now = new Date().getTime()
      const next = new Date(challenge.next_challenge_starts_at!).getTime()
      const diff = Math.max(0, next - now)

      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setTimeToNext(`${minutes}m ${seconds}s`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [challenge?.next_challenge_starts_at])

  if (!challenge || challenge.code !== "active") {
    return (
      <div className="bg-[#141829] border border-[#1a1f3a] rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4">Current Challenge</h3>
        <p className="text-gray-400">
          {challenge?.code === "before"
            ? `Mining starts at ${new Date(challenge.starts_at!).toLocaleString()}`
            : "Mining is not active"}
        </p>
      </div>
    )
  }

  const challengeData = challenge.challenge!

  return (
    <div className="bg-[#141829] border border-[#1a1f3a] rounded-lg p-6 sticky top-20">
      <h3 className="text-lg font-bold text-white mb-6">Current Challenge</h3>

      <div className="space-y-6">
        <div className="bg-[#0a0e27]/50 rounded-lg p-4 border border-[#1a1f3a]">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Challenge ID</p>
          <p className="text-xl font-mono text-[#00ff88] break-all">{challengeData.challenge_id}</p>
        </div>

        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Difficulty</p>
          <p className="text-2xl font-mono text-yellow-400">{challengeData.difficulty}</p>
        </div>

        <div className="bg-gradient-to-br from-[#00ff88]/20 to-[#00cc6a]/10 rounded-lg p-4 border border-[#00ff88]/30">
          <p className="text-xs text-gray-400 mb-1">Next Challenge In</p>
          <p className="text-3xl font-bold text-[#00ff88]">{timeToNext}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#0a0e27]/50 rounded-lg p-4 border border-[#1a1f3a]">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Submitted</p>
            <p className="text-3xl font-bold text-[#00ff88]">{submittedCount}</p>
          </div>
          <div className="bg-[#0a0e27]/50 rounded-lg p-4 border border-[#1a1f3a]">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Pending</p>
            <p className="text-3xl font-bold text-yellow-400">{pendingCount}</p>
          </div>
        </div>

        <div className="pt-6 border-t border-[#1a1f3a]">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Day / Number</p>
          <p className="text-lg text-white">
            <span className="font-bold">Day {challengeData.day}</span> #{challengeData.challenge_number}
          </p>
          <p className="text-xs text-gray-400 mt-2">Issued: {new Date(challengeData.issued_at).toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  )
}
