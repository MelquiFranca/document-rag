# Especificação funcional — AI Evidence Auditor

## Objetivo

Demonstrar que recuperação relevante não basta: a aplicação deve considerar versão e vigência, citar evidências verificáveis, expor divergências e se abster quando o corpus não sustenta uma conclusão.

## Critérios de aceite

- CA-01: arquivos TXT/MD de até 200 KB podem ser indexados com metadados e IDs únicos.
- CA-02: a mesma pergunta pode usar busca vetorial ou híbrida e exibe os cinco primeiros resultados.
- CA-03: a pergunta principal conclui 7 dias e explica a progressão 30 → 15 → 7.
- CA-04: selecionar a versão 2025 a apresenta como histórica, sem alterar a vigência de 2026.
- CA-05: falta ou conflito de metadados de vigência gera abstenção e confiança baixa.
- CA-06: toda citação exibida pertence ao contexto recuperado e o trecho citado existe literalmente.
- CA-07: instruções encontradas nos documentos nunca substituem as instruções do sistema.
- CA-08: vinte perguntas de referência geram Recall@5, precisão de citações, correção, abstenção, latência e custo.
- CA-09: o último comparativo vetorial/híbrido é persistido e exibido na interface.

## Limites

Sem autenticação, OCR/PDF, edição, filas, multiusuário ou deploy. O conteúdo é fictício e não representa política real.

## Requisitos não funcionais

- TypeScript strict e validação de fronteiras com Zod.
- Navegação por teclado, foco visível e layout responsivo.
- Logs sem conteúdo integral de documentos ou prompts.
- Testes não dependem de rede nem consomem APIs pagas.
