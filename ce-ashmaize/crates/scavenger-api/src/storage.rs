use std::collections::HashMap;
use std::sync::RwLock;
use chrono::Utc;
use uuid::Uuid;

use crate::models::{RegisteredAddress, SubmittedSolution, Donation};

pub struct Storage {
    registered_addresses: RwLock<HashMap<String, RegisteredAddress>>,
    solutions: RwLock<HashMap<String, Vec<SubmittedSolution>>>, // address -> solutions
    donations: RwLock<HashMap<String, Donation>>, // original_address -> donation
}

impl Storage {
    pub fn new() -> Self {
        Self {
            registered_addresses: RwLock::new(HashMap::new()),
            solutions: RwLock::new(HashMap::new()),
            donations: RwLock::new(HashMap::new()),
        }
    }

    pub fn register_address(
        &self,
        address: String,
        pubkey: String,
        signature: String,
    ) -> Result<(), String> {
        let mut addresses = self.registered_addresses.write().unwrap();
        
        if addresses.contains_key(&address) {
            return Err("Address already registered".to_string());
        }

        addresses.insert(
            address.clone(),
            RegisteredAddress {
                address,
                pubkey,
                signature,
                registered_at: Utc::now(),
            },
        );

        Ok(())
    }

    pub fn is_registered(&self, address: &str) -> bool {
        let addresses = self.registered_addresses.read().unwrap();
        addresses.contains_key(address)
    }

    pub fn get_pubkey(&self, address: &str) -> Option<String> {
        let addresses = self.registered_addresses.read().unwrap();
        addresses.get(address).map(|r| r.pubkey.clone())
    }

    pub fn add_solution(
        &self,
        address: String,
        challenge_id: String,
        nonce: String,
        preimage: String,
    ) {
        let mut solutions = self.solutions.write().unwrap();
        
        solutions
            .entry(address.clone())
            .or_insert_with(Vec::new)
            .push(SubmittedSolution {
                address,
                challenge_id,
                nonce,
                preimage,
                timestamp: Utc::now(),
            });
    }

    pub fn get_solutions_for_address(&self, address: &str) -> Vec<SubmittedSolution> {
        let solutions = self.solutions.read().unwrap();
        solutions.get(address).cloned().unwrap_or_default()
    }

    pub fn get_all_solutions(&self) -> HashMap<String, Vec<SubmittedSolution>> {
        let solutions = self.solutions.read().unwrap();
        solutions.clone()
    }

    pub fn create_donation(
        &self,
        original_address: String,
        destination_address: String,
    ) -> Result<String, String> {
        let mut donations = self.donations.write().unwrap();
        
        // Verificar se já existe uma doação ativa
        if donations.contains_key(&original_address) {
            let existing = donations.get(&original_address).unwrap();
            if existing.destination_address != destination_address {
                return Err("Address already has an active donation assignment".to_string());
            }
        }

        let donation_id = Uuid::new_v4().to_string();
        
        donations.insert(
            original_address.clone(),
            Donation {
                donation_id: donation_id.clone(),
                original_address,
                destination_address,
                created_at: Utc::now(),
            },
        );

        Ok(donation_id)
    }

    pub fn get_donation(&self, original_address: &str) -> Option<Donation> {
        let donations = self.donations.read().unwrap();
        donations.get(original_address).cloned()
    }

    pub fn get_destination_address(&self, address: &str) -> String {
        // Se o endereço tem uma doação, retorna o endereço de destino
        if let Some(donation) = self.get_donation(address) {
            // Verificar se o endereço de destino também tem uma doação (consolidar)
            if let Some(dest_donation) = self.get_donation(&donation.destination_address) {
                return dest_donation.destination_address;
            }
            return donation.destination_address;
        }
        address.to_string()
    }

    pub fn get_consolidated_solutions(&self, address: &str) -> u32 {
        let destination = self.get_destination_address(address);
        let solutions = self.solutions.read().unwrap();
        
        // Contar soluções do endereço de destino consolidado
        let mut count = 0;
        for (addr, sols) in solutions.iter() {
            let addr_dest = self.get_destination_address(addr);
            if addr_dest == destination {
                count += sols.len() as u32;
            }
        }
        
        count
    }
}

