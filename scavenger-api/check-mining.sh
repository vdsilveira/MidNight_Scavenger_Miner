#!/bin/bash

# Script para verificar status de mineração

echo "🔍 Verificando Status de Mineração..."
echo ""

# Verificar status
STATUS=$(curl -s http://localhost:3002/wallets/mining-status)

if [ -z "$STATUS" ]; then
    echo "❌ Erro: API não está respondendo"
    exit 1
fi

# Parse JSON (usando jq se disponível, caso contrário usa grep)
if command -v jq &> /dev/null; then
    IS_MINING=$(echo $STATUS | jq -r '.isMining')
    ACTIVE=$(echo $STATUS | jq -r '.activeWorkers')
    PENDING=$(echo $STATUS | jq -r '.pendingAddresses')
    TOTAL=$(echo $STATUS | jq -r '.totalWorkers')
    MAX=$(echo $STATUS | jq -r '.maxConcurrent')
    INTERVAL=$(echo $STATUS | jq -r '.interval')
else
    IS_MINING=$(echo $STATUS | grep -o '"isMining":[^,]*' | grep -o '[^:]*$')
    ACTIVE=$(echo $STATUS | grep -o '"activeWorkers":[^,]*' | grep -o '[^:]*$')
    PENDING=$(echo $STATUS | grep -o '"pendingAddresses":[^,]*' | grep -o '[^:]*$')
    TOTAL=$(echo $STATUS | grep -o '"totalWorkers":[^,]*' | grep -o '[^:]*$')
    MAX=$(echo $STATUS | grep -o '"maxConcurrent":[^,]*' | grep -o '[^:]*$')
    INTERVAL=$(echo $STATUS | grep -o '"interval":[^,}]*' | grep -o '[^:]*$')
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$IS_MINING" = "true" ]; then
    echo "✅ STATUS: ⛏️  MINERANDO ATIVAMENTE"
else
    echo "❌ STATUS: ⏹️  PARADO"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Estatísticas:"
echo "   Workers Ativos:      $ACTIVE / $MAX"
echo "   Na Fila:             $PENDING"
echo "   Total Workers:       $TOTAL"
echo "   Intervalo:           ${INTERVAL}ms"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verificar soluções encontradas
STATS=$(curl -s http://localhost:3002/wallets/stats)
if command -v jq &> /dev/null; then
    SUBMISSIONS=$(echo $STATS | jq -r '.totalSubmissions')
    NIGHT=$(echo $STATS | jq -r '.totalNightEarned')
else
    SUBMISSIONS=$(echo $STATS | grep -o '"totalSubmissions":[^,]*' | grep -o '[^:]*$')
    NIGHT=$(echo $STATS | grep -o '"totalNightEarned":[^,}]*' | grep -o '[^:]*$')
fi

echo "💰 Soluções Encontradas:"
echo "   Total Submissions:   $SUBMISSIONS"
echo "   NIGHT Earned:        $NIGHT"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$ACTIVE" -gt 0 ]; then
    echo "✅ Tudo funcionando! $ACTIVE worker(s) minerando ativamente."
    if [ "$SUBMISSIONS" -gt 0 ]; then
        echo "🎉 $SUBMISSIONS solução(ões) já encontrada(s)!"
    else
        echo "⏳ Aguardando encontrar soluções..."
    fi
else
    echo "⚠️  Nenhum worker ativo. Verifique os logs da API."
fi

echo ""

