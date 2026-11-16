# Sinapse — Lógica Diária

App mobile-first para treinar raciocínio lógico, casos de borda, trace de código (**Python** e **C#**), simulação de Live Code e integração com **Codewars**.

- **Meta diária:** `1` acerto garante o **Check Diário ✅** (mantém a ofensiva); `2` completam a **Dose Dupla ⚡**. Também aceita registro rápido de **Hipótese × Causa Real** de bugs do trabalho e sincronização automática com o **Codewars**.
- **Modos:**
  - **Hoje:** Dupla do Dia + Desafio Inédito gerado por data + Simulador **Live Code (3m)** + **Kata do Dia** conectado à API do Codewars.
  - **Lab:** 6 simuladores interativos (Tigela do Vovô / MPC, Jarros 5L & 3L, 8 Moedas, 3 Interruptores, Fluxo Atômico e Busca Binária).
  - **Explorar:** 36 desafios filtráveis, Trilha Codewars (`8 → 6 kyu`) com rascunho de lógica e Cola Rápida **Python ⇄ C#**.
- **App:** publicado via GitHub Pages ou Vercel a partir deste repositório (inclui `/api/codewars.js` como proxy opcional na Vercel).
- **Dados:** sincronizados no repositório **privado** `daviml/logica-dados` (`dados.json`), usando a API do GitHub.

## Conectar um aparelho (sincronização GitHub)

1. Crie um **Fine-grained Personal Access Token** no GitHub dando acesso **apenas** ao repositório `daviml/logica-dados`, com permissão **Contents: Read and write**.
2. Abra o app → aba **Progresso** → **Sincronizar com GitHub**.
3. Informe o repositório `daviml/logica-dados` e cole o token (ou o **Código de conexão** copiado de outro aparelho).

## Instalar no celular (PWA)

Abra o endereço publicado no Chrome/Safari → menu **⋮** (ou **Compartilhar**) → **Instalar app** / **Adicionar à tela inicial**.
