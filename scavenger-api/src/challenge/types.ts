export interface Challenge {
  challenge_id: string;
  day: number;
  challenge_number: number;
  issued_at: string;
  latest_submission: string;
  difficulty: string;
  no_pre_mine: string;
  no_pre_mine_hour: string;
}

export interface ChallengeResponse {
  code: 'active' | 'before' | 'after';
  challenge?: Challenge;
  mining_period_ends?: string;
  max_day?: number;
  total_challenges?: number;
  current_day?: number;
  next_challenge_starts_at?: string;
  starts_at?: string;
}