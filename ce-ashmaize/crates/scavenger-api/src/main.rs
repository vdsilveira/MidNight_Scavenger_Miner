mod api;
mod models;
mod services;
mod storage;

use axum::{
    extract::Path,
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use tower_http::cors::{Any, CorsLayer};
use std::sync::Arc;

use api::handlers;
use storage::Storage;

#[tokio::main]
async fn main() {
    // Inicializar o storage
    let storage = Arc::new(Storage::new());
    
    // Configurar CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Configurar rotas
    let app = Router::new()
        .route("/TandC", get(handlers::get_terms_and_conditions))
        .route("/TandC/:version", get(handlers::get_terms_and_conditions_versioned))
        .route("/register/:address/:signature/:pubkey", post(handlers::register_address))
        .route("/challenge", get(handlers::get_challenge))
        .route("/solution/:address/:challenge_id/:nonce", post(handlers::submit_solution))
        .route("/donate_to/:destination_address/:original_address/:signature", post(handlers::donate_to))
        .route("/work_to_star_rate", get(handlers::get_work_to_star_rate))
        .layer(cors)
        .with_state(storage);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .unwrap();
    
    println!("🚀 Servidor Scavenger Mine API rodando em http://0.0.0.0:3000");
    
    axum::serve(listener, app).await.unwrap();
}

