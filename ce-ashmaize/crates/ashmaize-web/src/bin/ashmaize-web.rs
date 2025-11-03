use ashmaize::validate; // função que você já tenha no crate principal
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
        let input = line.unwrap();
        let req: HashRequest = serde_json::from_str(&input).unwrap();

        // Aqui você chama a função do crate principal
        let (hash, meets_difficulty) = validate(&req.preimage, &req.no_pre_mine, &req.difficulty);

        let resp = HashResponse { hash, meets_difficulty };
        println!("{}", serde_json::to_string(&resp).unwrap());
    }
}
