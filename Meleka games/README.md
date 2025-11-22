
# TurnoLink – Jogo por Turnos via Link

Este é um protótipo de jogo por turnos projetado para funcionar no navegador.  
Após o jogador realizar seu turno, o jogo gera um **link contendo o estado atual da partida**, permitindo que o próximo jogador continue exatamente de onde parou.

---

## 🎮 Como Jogar

1. Abra o jogo hospedado (Netlify ou GitHub Pages).
2. Realize suas jogadas.
3. Clique em **Finalizar Turno**.
4. O jogo irá gerar um **link único** contendo o estado da partida.
5. Envie esse link para o próximo jogador.
6. O próximo jogador abre o link e continua o turno.

---

## 🌐 Hospedagem (Netlify / GitHub Pages)

### ✔ Netlify
- Basta enviar o arquivo **index.html** para o Netlify.
- Ou conectar o repositório do GitHub ao Netlify.
- Como não existe build, use:
  - **Build command:** *(deixe em branco)*
  - **Publish directory:** `./`

### ✔ GitHub Pages
- Coloque o arquivo **index.html** na raiz do repositório.
- Vá em **Settings > Pages** e habilite Pages usando a branch `main`.

---

## 🔧 Estrutura do Projeto

```
index.html   → Arquivo principal do jogo
README.md    → Documentação do projeto
```

Este projeto não possui dependências externas.  
Todo o jogo roda em HTML + CSS + JavaScript puro.

---

## 🔗 Como o sistema de link funciona

O jogo exporta o estado interno (tabuleiro, jogadas, logs, etc.) em formato codificado.  
Esse estado é anexado na URL como parâmetros:

```
https://seusite.netlify.app/?state=XYZ123&log=ABC789
```

Quando outro jogador abre o link, o jogo lê os parâmetros e reconstrói o estado.

---

## 🛠 Atualizações Futuras (opcional)

- Minificação do HTML
- Compressão do estado do jogo
- Validação de link
- Sistema de autenticação por jogador

---

Projeto criado por Edson e desenvolvido para testes de mecânica de jogo por turnos.
