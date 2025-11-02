#!/bin/bash

echo "🧪 Testando integração AshMaize..."
echo ""

# Teste 1: Verificar se binário existe
BIN_PATH="../ce-ashmaize/target/debug/ashmaize-hash"
if [ -f "$BIN_PATH" ]; then
    echo "✅ Binário AshMaize encontrado"
else
    echo "❌ Binário não encontrado. Execute: cd ../ce-ashmaize && cargo build --package ashmaize-api --bin ashmaize-hash"
    exit 1
fi

# Teste 2: Testar com dados simples
echo ""
echo "Testando cálculo de hash..."
REQUEST='{"preimage":"test123","no_pre_mine":"fd651ac2725e3b9d804cc8b161c0709af14d6264f93e8d4afef0fd1142a3f011","difficulty":"FFFFFFFF"}'
echo "$REQUEST" | timeout 60 "$BIN_PATH" 2>&1 | head -5

echo ""
echo "✅ Teste concluído (pode demorar ~30-60s para inicializar ROM de 1GB)"

