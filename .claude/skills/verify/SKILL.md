---
name: verify
description: Come verificare a runtime una modifica a Macrotrama (SPA statica React+Babel, persistenza Netlify Blobs via function) — serve locale + Playwright su Edge di sistema, viewport mobile e desktop.
---

# Verifica runtime di Macrotrama

App statica (index.html + main.js JSX compilato nel browser + seed.js + style.css), nessun backend proprio: persistenza su Netlify Blobs tramite `netlify/functions/data.js` (endpoint `/api/data`).

## Build check (veloce, non sostituisce la verifica)
```powershell
npx --yes esbuild main.js --bundle --loader:.js=jsx --external:https://esm.sh/* --outfile=out_check.js --log-level=warning; Remove-Item out_check.js
```

## Serve locale
```powershell
npx --yes serve -l 8321 --no-clipboard .   # in background; ascolta su 0.0.0.0
```
In locale senza `netlify dev` la funzione `/api/data` non esiste: la GET risponde 404, l'app lo intercetta e passa in automatico alla cache `localStorage` / ai dati seed (indicatore "solo su questo dispositivo"). **È il comportamento atteso**, non un bug — ignora i 404 su `/api/data` nei log.

## Drive con Playwright (usa l'Edge installato, niente download browser)
- `npm i playwright-core` in una cartella scratch, poi `chromium.launch({ channel: 'msedge', headless: true })`.
- Viewport: mobile `390x844`, desktop `1400x900` (non ci sono breakpoint di layout critici oltre alle card grid, ma la Mappa va controllata su entrambi per via dello scroll orizzontale).
- Nessun login: l'app non ha autenticazione.
- Selettori utili: card `.card`, apertura scheda `.modal-sheet` / `.modal-title`, tab bottom nav `.bottom-nav button` filtrato per testo (**non** usare `getByText(..., {exact:true})` sui tab, il bottone contiene anche l'icona emoji quindi il testo esatto non combacia mai), sezioni fase `.phase-section`, ricerca `.search-input`, filtro stato `.filter-chip` con `{ hasText: 'Letto' }` ecc., nodi mappa `.map-node`, classe di attenuazione `.map-node.dim`, pulsante dati header `.app-header button` con `{ hasText: 'Dati' }`, indicatore sync `.sync-indicator`.
- Raccogliere `pageerror` e `console error`; ignorare i 404 di `/api/data` e favicon in locale.

## Flussi che vale la pena guidare
1. **Timeline**: conta le card (24 su dati seed), apri una card, verifica titolo nel modale.
2. **Catalogo**: ricerca testuale + filtro stato, verifica che il conteggio cali coerentemente.
3. **Mappa**: conta i nodi, tocca un nodo → verifica che gli altri prendano classe `dim` (evidenziazione), tocca di nuovo lo stesso nodo entro ~400ms → deve aprirsi il modale di dettaglio (doppio tap).
4. **Modale dettaglio**: cambio stato generale, per titoli con `issues` verifica lista numeri + pulsante "+ Aggiungi numero"; per titoli senza (`issues: null`) verifica il campo riassunto libero; collegamenti (checkbox) devono restare bidirezionali — spuntando A→B, controllare che anche B→A risulti spuntato riaprendo la scheda di B.
5. **Dati**: apri il pannello "💾 Dati", verifica l'indicatore di sync e l'export JSON.

## Gotcha
- `netlify.toml` ha `publish = "."`, nessun build step: il push su `main` pubblica su Netlify così com'è, senza compilazione.
- La funzione Blobs (`netlify/functions/data.js`) funziona solo sul sito Netlify reale (o con `netlify dev` collegato al sito) — in locale puro resta sempre in modalità "solo locale", per design (rete di sicurezza del brief).
- Mai pushare su `main` solo per "provare" la sync col cloud: usare `netlify dev` se serve verificare la funzione prima del deploy.
