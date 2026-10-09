# Corrida 3D

Jogo de corrida no navegador feito com React + Three.js: você dirige por um mundo 3D fugindo de um monstro, desviando de carros NPC, com drift, modos de câmera, minimapa, chuva, poeira e trilha phonk.

**Jogar:** https://corrida-black.vercel.app

## Rodar localmente

```bash
npm install
npm run dev      # abre em http://localhost:5173
npm run build    # gera a versão de produção em dist/
```

## Estrutura

| Arquivo | O que faz |
|---|---|
| `src/App.jsx` | Loop do jogo, câmeras, drift, minimapa e controles |
| `src/World.js` | Geração do mundo/pista |
| `src/Car.js` | Modelo do carro do jogador |
| `src/Monster.js` | Monstro perseguidor |
| `src/NPCSystem.js` | Carros NPC e colisão |
| `src/Effects.js` | Chuva, poeira e nuvens |
| `src/AudioSystem.js` | Música de fundo (`src/assets/phonk.mp3`, 6 min em loop) |
| `src/HUD.jsx` | Interface na tela (HUD) |

Ideias e variações deste projeto: [IDEIA.md](IDEIA.md).
