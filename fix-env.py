#!/usr/bin/env python3
"""
Script para corrigir o arquivo .env removendo duplicatas e linhas malformadas
"""

import re

# Ler o arquivo .env
with open('.env', 'r') as f:
    content = f.read()

# Remover duplicatas da variável HOTMART_WEBHOOK_HOTTOK
lines = content.split('\n')
seen_hottok = False
new_lines = []

for line in lines:
    # Verificar se é a linha HOTMART_WEBHOOK_HOTTOK
    if 'HOTMART_WEBHOOK_HOTTOK=' in line or 'HOTMART_WEBHOOK_HOTTOK"' in line:
        if not seen_hottok:
            # Corrigir e adicionar a primeira ocorrência
            fixed_line = 'HOTMART_WEBHOOK_HOTTOK="Xc5G6TCcgSnrJkK7sV9ODil6Pbdqnpd177896e-6abe-4eed-85fa-e46c42a9f253"'
            new_lines.append(fixed_line)
            seen_hottok = True
        # Ignorar duplicatas
        continue
    
    # Corrigir linhas concatenadas
    if '==' in line and 'HOTMART_WEBHOOK_HOTTOK' in line:
        # Separar as duas variáveis
        parts = re.split(r'(=="[^"]*")', line)
        for i, part in enumerate(parts):
            if i == 0:  # Primeira parte (até == ")
                new_lines.append(part + '==')
            elif i == 1:  # Conteúdo entre aspas
                new_lines.append('HOTMART_BASIC="' + part.strip('"='))
            else:  # HOTMART_WEBHOOK_HOTTOK
                if not seen_hottok:
                    new_lines.append('HOTMART_WEBHOOK_HOTTOK="Xc5G6TCcgSnrJkK7sV9ODil6Pbdqnpd177896e-6abe-4eed-85fa-e46c42a9f253"')
                    seen_hottok = True
        continue
    
    # Adicionar linha normal
    new_lines.append(line)

# Adicionar HOTMART_WEBHOOK_HOTTOK se não foi adicionado
if not seen_hottok:
    new_lines.append('HOTMART_WEBHOOK_HOTTOK="Xc5G6TCcgSnrJkK7sV9ODil6Pbdqnpd177896e-6abe-4eed-85fa-e46c42a9f253"')

# Escrever o arquivo corrigido
with open('.env', 'w') as f:
    f.write('\n'.join(new_lines))

print("✅ Arquivo .env corrigido com sucesso!")
print("\nVerificando HOTMART_WEBHOOK_HOTTOK:")
with open('.env', 'r') as f:
    for line in f:
        if 'HOTMART_WEBHOOK_HOTTOK' in line:
            print(f"   {line.strip()}")

