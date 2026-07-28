# Vai Dar Volei?

Um app estatico e rapido para responder uma pergunta: hoje da para jogar volei de praia?

O app usa a previsao horaria da Open-Meteo, avalia chuva, vento, rajadas, sensacao termica e trovoadas, escolhe a melhor janela restante de 2 a 3 horas e devolve um veredito simples: GOOD, MAYBE ou BAD.

![Screenshot do app](public/og-card.svg)

## Funcionalidades

- Localizacao por GPS do navegador ou busca manual de cidade.
- Cache local de previsao por 1 hora para evitar chamadas repetidas.
- Recalculo do melhor horario a partir da previsao salva.
- Fallback para cache antigo quando a rede falha.
- Frases bem-humoradas em portugues.
- Detalhes por hora e compartilhamento via Web Share API ou clipboard.

## Arquitetura

- `src/api`: clientes Open-Meteo e normalizacao de respostas.
- `src/domain`: modelos, pontuacao, janela de jogo, frases e veredito.
- `src/services`: geolocalizacao, localStorage, cache e compartilhamento.
- `src/utils`: helpers pequenos de data, numeros e debounce.
- `src/app.ts`: orquestracao da UI e fluxo principal.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Scripts

```bash
npm run build
npm run lint
npm run test:run
npm run test:e2e
npm run preview
```

Para e2e local, instale o Chromium do Playwright uma vez:

```bash
npx playwright install chromium
```

## Pontuacao Do Clima

Cada hora comeca em 100 pontos. O app aplica penalidades por probabilidade de chuva, precipitacao esperada, vento, rajadas e sensacao termica. Codigos WMO de trovoada 95, 96 e 99 tornam a hora insegura com score 0.

A melhor recomendacao e calculada em janelas consecutivas de 2 horas. Se a hora seguinte tiver pelo menos 60 pontos, a janela pode ser estendida para 3 horas.

## Cache

As chaves versionadas de localStorage sao:

```text
vaiDarVolei:selectedLocation:v1
vaiDarVolei:weatherCache:v1
```

Regras principais:

- Mesma localizacao e cache com menos de 1 hora: nao chama a API.
- Cache expirado: busca uma nova previsao.
- Localizacao diferente: ignora o cache anterior.
- Falha de rede com cache antigo: mostra a ultima previsao salva com aviso.

## APIs Usadas

- Open-Meteo Forecast API.
- Open-Meteo Geocoding API.
- Browser Geolocation API.
- Web Share API e Clipboard API.

## Deploy

O projeto esta configurado para GitHub Pages com GitHub Actions em `.github/workflows/pages.yml`.

O build usa `base: "/VaiDarVolei/"`, entao a URL esperada e:

```text
https://franklinjr12.github.io/VaiDarVolei/
```

## Atribuicao

Dados meteorologicos fornecidos por Open-Meteo.
