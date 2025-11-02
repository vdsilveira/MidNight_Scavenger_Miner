use ashmaize::{Rom, RomGenerationType, hash};
use serde::{Deserialize, Serialize};
use std::io::{self, BufRead};

#[derive(Deserialize)]
struct HashRequest {
    preimage: String,
    no_pre_mine: String,
    difficulty: String,
}

#[derive(Serialize)]
struct HashResponse {
    hash: String,
    meets_difficulty: bool,
}

fn main() {
    let stdin = io::stdin();
    for line in stdin.lock().lines() {
        let line = line.unwrap();
        if line.trim().is_empty() {
            continue;
        }

        match serde_json::from_str::<HashRequest>(&line) {
            Ok(request) => {
                let result = compute_hash(&request);
                println!("{}", serde_json::to_string(&result).unwrap());
            }
            Err(e) => {
                eprintln!("Error parsing request: {}", e);
                std::process::exit(1);
            }
        }
    }
}

fn compute_hash(request: &HashRequest) -> HashResponse {
    // Configuração conforme documento Midnight Scavenger Mine API V3
    const NB_LOOPS: u32 = 8;
    const NB_INSTRS: u32 = 256;
    const PRE_SIZE: usize = 16777216; // 16MB
    const MIXING_NUMBERS: usize = 4;
    const ROM_SIZE: usize = 1073741824; // 1GB

    // Converter no_pre_mine de hex para bytes
    let rom_seed = hex::decode(&request.no_pre_mine).expect("Invalid hex in no_pre_mine");

    // Criar ROM usando TwoStep conforme especificação
    let gen_type = RomGenerationType::TwoStep {
        pre_size: PRE_SIZE,
        mixing_numbers: MIXING_NUMBERS,
    };

    let rom = Rom::new(&rom_seed, gen_type, ROM_SIZE);

    // Converter preimage para bytes
    let preimage_bytes = request.preimage.as_bytes();

    // Calcular hash AshMaize
    let digest = hash(preimage_bytes, &rom, NB_LOOPS, NB_INSTRS);

    // Converter para hex
    let hash_hex = hex::encode(&digest);

    // Verificar se atende à dificuldade
    let meets_difficulty = check_difficulty(&hash_hex, &request.difficulty);

    HashResponse {
        hash: hash_hex,
        meets_difficulty,
    }
}

fn check_difficulty(hash: &str, difficulty: &str) -> bool {
    // Pegar os primeiros 4 bytes (8 caracteres hex) do hash
    if hash.len() < 8 || difficulty.len() != 8 {
        return false;
    }

    let hash_prefix = &hash[0..8];
    let hash_num = u32::from_str_radix(hash_prefix, 16).unwrap_or(0);
    let difficulty_num = u32::from_str_radix(difficulty, 16).unwrap_or(0);

    // A dificuldade especifica quais bits devem ser zero
    // Os bits zero são os que estão em 0 na dificuldade
    let zero_mask = (!difficulty_num) & 0xFFFFFFFF;

    // Verificar se os bits que devem ser zero são realmente zero
    (hash_num & zero_mask) == 0
}

