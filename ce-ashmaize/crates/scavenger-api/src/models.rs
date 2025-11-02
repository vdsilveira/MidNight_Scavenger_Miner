use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize)]
pub struct TermsAndConditionsResponse {
    pub version: String,
    pub content: String,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RegistrationReceipt {
    pub preimage: String,
    pub signature: String,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RegisterResponse {
    pub registration_receipt: RegistrationReceipt,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Challenge {
    pub challenge_id: String,
    pub day: u32,
    pub challenge_number: u32,
    pub issued_at: DateTime<Utc>,
    pub latest_submission: DateTime<Utc>,
    pub difficulty: String,
    pub no_pre_mine: String,
    pub no_pre_mine_hour: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChallengeResponse {
    pub code: String,
    pub challenge: Option<Challenge>,
    pub mining_period_ends: Option<DateTime<Utc>>,
    pub max_day: Option<u32>,
    pub total_challenges: Option<u32>,
    pub current_day: Option<u32>,
    pub next_challenge_starts_at: Option<DateTime<Utc>>,
    pub starts_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CryptoReceipt {
    pub preimage: String,
    pub timestamp: DateTime<Utc>,
    pub signature: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SolutionResponse {
    pub crypto_receipt: CryptoReceipt,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DonateResponse {
    pub status: String,
    pub message: String,
    pub donation_id: String,
    pub original_address: String,
    pub destination_address: String,
    pub timestamp: DateTime<Utc>,
    #[serde(rename = "solutions_consolidated")]
    pub solutions_consolidated: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub message: String,
    pub error: String,
    pub status_code: u16,
}

#[derive(Debug, Clone)]
pub struct RegisteredAddress {
    pub address: String,
    pub pubkey: String,
    pub signature: String,
    pub registered_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct SubmittedSolution {
    pub address: String,
    pub challenge_id: String,
    pub nonce: String,
    pub preimage: String,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct Donation {
    pub donation_id: String,
    pub original_address: String,
    pub destination_address: String,
    pub created_at: DateTime<Utc>,
}

