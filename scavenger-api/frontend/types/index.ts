export interface Stats {
  totalWallets: number
  totalSubmissions: number
  totalNightEarned: number
  status: "connected" | "disconnected"
}

export interface Challenge {
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

export interface Wallet {
  id: string
  address: string
  status: "mining" | "submitted" | "pending"
  submissions: number
  nightEarned: string
  consolidatedNightEarned: string
  lastSubmission?: string | null
  pubkey?: string
  destinationAddress?: string
}
