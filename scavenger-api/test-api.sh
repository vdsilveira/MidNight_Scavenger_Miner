#!/bin/bash

echo "🧪 Testando Scavenger Mine API..."
echo ""

BASE_URL="http://localhost:3000"

# Teste 1: GET /TandC
echo "1️⃣  Testando GET /TandC..."
RESPONSE=$(curl -s "$BASE_URL/TandC")
if echo "$RESPONSE" | grep -q "version"; then
    echo "✅ GET /TandC: OK"
else
    echo "❌ GET /TandC: FALHOU"
fi
echo ""

# Teste 2: GET /challenge
echo "2️⃣  Testando GET /challenge..."
RESPONSE=$(curl -s "$BASE_URL/challenge")
if echo "$RESPONSE" | grep -q "code"; then
    echo "✅ GET /challenge: OK"
    echo "   Resposta: $(echo "$RESPONSE" | jq -r '.code' 2>/dev/null || echo 'N/A')"
else
    echo "❌ GET /challenge: FALHOU"
fi
echo ""

# Teste 3: GET /work_to_star_rate
echo "3️⃣  Testando GET /work_to_star_rate..."
RESPONSE=$(curl -s "$BASE_URL/work_to_star_rate")
if echo "$RESPONSE" | grep -q "\[\]" || echo "$RESPONSE" | grep -q "^\["; then
    echo "✅ GET /work_to_star_rate: OK"
else
    echo "❌ GET /work_to_star_rate: FALHOU"
fi
echo ""

# Teste 4: POST /register (simulado - vai falhar validação)
echo "4️⃣  Testando POST /register..."
RESPONSE=$(curl -s -X POST "$BASE_URL/register/test_address/test_sig/test_pubkey1234567890123456789012345678901234567890123456789012345678901234")
if echo "$RESPONSE" | grep -q "error\|message"; then
    echo "✅ POST /register: Endpoint responde (esperado falhar validação)"
else
    echo "⚠️  POST /register: Resposta inesperada"
fi
echo ""

echo "📊 Resumo:"
echo "✅ API está respondendo!"
echo "⚠️  Nota: Validação de assinaturas Cardano e AshMaize estão simuladas"
echo ""
echo "Para testes completos, você precisa:"
echo "1. Integrar AshMaize real (WASM)"
echo "2. Integrar validação Cardano real"

