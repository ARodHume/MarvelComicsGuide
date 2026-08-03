# Brief per Claude Code — "Macrotrama" (webapp Marvel reading tracker)

## Contesto

Sono un lettore che sta seguendo un percorso personale di lettura dell'era moderna Marvel (2004–oggi), leggendo in inglese come esercizio di apprendimento linguistico. Ho già una versione prototipale di questa app come artifact Claude, ma lo storage persistente (`window.storage`, specifico degli artifact) è inaffidabile su iPad Safari — voglio quindi una **webapp vera**, ospitata su Netlify (ho già account Netlify con altre 3 app: De Rossi Tennis League, Fanta Club Manager, Grande Slam Manager — stesso schema di deploy).

Uso principalmente iPad/iPhone, nessun PC. L'app deve funzionare bene da Safari mobile.

## Cosa deve fare l'app

Un tracker di lettura per la mia "macrotrama" personale Marvel, con tre viste:

1. **Timeline**: i titoli raggruppati in 5 fasi cronologiche (2004–2010, 2011–2012, 2013–2016, 2016–2021, 2022–oggi), ciascuno mostrato come card cliccabile con badge di tipo, sottotitolo, e stato di lettura.
2. **Catalogo**: stessa lista, con ricerca testuale e filtro per stato (da leggere / in corso / letto).
3. **Mappa**: un grafo visivo con i titoli posizionati per fase (colonne), collegati da linee — linea continua rossa per collegamenti di **trama verificata**, linea tratteggiata ciano per **arco di personaggio/tema** (stesso protagonista o eco tematica, non un vero crossover). Toccando un nodo si evidenziano solo i suoi collegamenti (gli altri si affievoliscono); doppio tap apre la scheda completa. Questo è il punto più delicato: la prima versione con tutte le linee visibili insieme era illeggibile, quindi l'evidenziazione al tocco è essenziale.

Ogni titolo, aperto in una scheda/modale, mostra:
- Perché leggerlo (breve testo)
- Stato di lettura generale (da leggere / in corso / letto)
- **Se il titolo ha una struttura a "numeri" (mini-serie con albi noti)**: una lista di numeri singoli (es. Books of Doom #1–6), ciascuno con il proprio stato e il proprio riassunto testuale lungo, editabile. Pulsante "+ Aggiungi numero" per aggiungerne di nuovi liberamente (utile per run aperti senza conteggio fisso, es. Fantastic Four di Hickman).
- **Se il titolo non ha struttura a numeri** (es. eventi "basta un riassunto" come Secret Invasion): un singolo campo di testo libero per il riassunto.
- Due elenchi di collegamenti selezionabili verso altri titoli: "Collegamenti di trama" (verificati) e "Arco di personaggio/tema" (non crossover diretto) — bidirezionali (se A si collega a B, B si collega automaticamente ad A).

## Stile grafico — importante, non cambiare direzione

Estetica **pop-art fumettistico**, coerente con un altro artifact che ho ("Comic Vocab"). Elementi chiave:
- Sfondo carta chiara (`#EDEEE9`), pannelli bianchi con bordo nero spesso (3px) e ombra offset netta (5px 5px 0, colore accento variabile)
- Font: **Bangers** (titoli/display), **Archivo** (corpo testo), **JetBrains Mono** (etichette/stamp in stile timbro)
- Palette accento per le 5 fasi: verde `#2FA84F`, giallo `#F5C518`, magenta `#D6336C`, viola `#7B4FE0`, ciano `#0FA3B1`
- "Stamp" arrotondati per gli stati (letto/in corso/da leggere), badge tipo emoji (⭐ evento, 📖 run, ⚡ basta un riassunto, 🔗 diramazione collegata)
- Card leggermente "adesivo", nessun gradiente morbido o ombre sfumate — tutto netto, contrasto alto
- Mobile-first: navigazione a tab in basso (Timeline / Catalogo / Mappa), non barra laterale

**Non virare verso uno stile scuro/noir o minimal-corporate — è già stato provato e scartato dall'utente.**

## Persistenza dati — punto tecnico cruciale

**Non usare `window.storage`** (API specifica degli artifact Claude, non disponibile in una webapp normale) né `localStorage` da solo come unica fonte (va bene come cache, ma serve persistenza vera cross-dispositivo).

Usa **Netlify Blobs** (store integrato di Netlify, key-value, già disponibile sul mio account) per salvare l'intero stato come un unico JSON — niente backend/database separato da configurare. Un'unica chiave tipo `macrotrama-data` con tutto l'array di titoli.

Se possibile, aggiungi comunque un fallback di export/import manuale (copia JSON in un campo di testo) come rete di sicurezza in caso di problemi di rete.

## Dati iniziali (seed) — usa esattamente questi, già scritti e verificati

Sotto trovi l'array JavaScript completo con i 23 titoli, i loro collegamenti (`plot` = trama verificata, `thread` = arco di personaggio/tema), e la struttura `issues` per le mini-serie con conteggio noto. Includi anche i riassunti già scritti (Vendicatori Divisi, completo; Books of Doom, numeri 1 e 2 completi) esattamente come sono, non riscriverli.

```javascript
const SEED = [
  {id:"avengers-disassembled", title:"Vendicatori Divisi", subtitle:"Avengers Disassembled · 2004", phase:1, type:"evento", issuesText:"Avengers (1998) #500–503 e Avengers Finale #1", why:"Punto d'inizio ufficiale dell'era moderna. Grande tragedia che distrugge il gruppo originale.", status:"letto", plot:["childrens-crusade","vision-king"], thread:[],
   issues:[
     {n:"#500", status:"letto", summary:"Il numero 500 si apre alla Avengers Mansion: il cadavere rianimato di Jack of Hearts appare sul prato ed esplode inspiegabilmente, uccidendo Ant-Man (Scott Lang) e distruggendo metà della villa. La Visione schianta un Quinjet sul sito e attacca i sopravvissuti con un piccolo esercito di robot Ultron. She-Hulk va in preda a una furia incontrollabile e squarcia in due la Visione."},
     {n:"#501", status:"letto", summary:"Nel 501 la scena è un disastro totale: Wasp, Captain America e Captain Britain finiscono in ospedale per colpa della furia di She-Hulk. Iron Man, Hawkeye e Falcon si riuniscono per capire cosa stia succedendo, ma nessuno ha risposte."},
     {n:"#502-503", status:"letto", summary:"Nei numeri 502-503 arriva il colpo di scena: dietro il caos non c'è un supercriminale esterno, ma Wanda Maximoff, Scarlet Witch. Wanda raggiunge il proprio punto di rottura psicologica — causa scoperta solo anni dopo in Children's Crusade come conseguenza dell'influenza segreta di Dottor Destino — e il suo potere di alterare la realtà uccide Hawkeye, Ant-Man e il suo stesso ex marito, la Visione. Il Dottor Strange riesce infine a fermarla inducendola in trance."},
     {n:"Avengers Finale #1", status:"letto", summary:"Nell'epilogo, con la Mansion distrutta e diversi membri morti, il gruppo si scioglie nella formazione classica, aprendo la strada al rilancio come New Avengers."}
   ]},

  {id:"books-of-doom", title:"Books of Doom", subtitle:"2005 · Ed Brubaker", phase:1, type:"run", issuesText:"Books of Doom #1–6", why:"Fondamenta sul personaggio di Victor von Doom prima che domini la scena politica Marvel.", status:"in_corso", plot:["unthinkable"], thread:["secret-wars","infamous-iron-man","one-world-under-doom"],
   issues:[
     {n:"#1", status:"letto", summary:"Un giornalista intervista Doctor Doom sul suo passato, raccogliendo testimonianze di ex membri del suo clan zingaro d'infanzia.\n\nLa madre Cynthia, manipolata da un demone e piena di sete di vendetta contro gli uomini del Barone, lancia un incantesimo che uccide tutti i soldati di un villaggio — uccidendo però senza saperlo anche ogni bambino del villaggio. Viene uccisa da un soldato quando si rende conto di cosa ha fatto.\n\nAl funerale, il campo zingaro cerca di bandire il piccolo Victor e suo padre Werner. Victor li minaccia di diventare come sua madre se li cacciano, e gli zingari cedono. Victor cresce solitario, con Valeria come unica amica costante.\n\nI soldati del Barone chiedono a Werner di curare la moglie morente del Barone; fallisce, e il Barone lo incolpa. Padre e figlio fuggono nella notte; il quinto giorno, intrappolati dal freddo, Werner dà la giacca al figlio e muore assiderato scaldandolo con il proprio corpo.\n\nVictor viene salvato dagli zingari, trova la scatola di incantesimi della madre e inizia a studiare magia e tecnologia. Dopo aver ucciso un uomo del Barone per scappare, un Generale americano gli offre di studiare negli USA — Victor accetta."},
     {n:"#2", status:"letto", summary:"Victor von Doom è ora in America, iscritto all'università (Empire State University) e, in segreto, al lavoro per l'esercito americano, in un contesto simil-Guerra Fredda.\n\nIncontra per la prima volta Reed Richards durante una lezione, mentre discute animatamente con un professore sul viaggio nel tempo. I primi tre anni scorrono senza grandi eventi, finché Victor non partecipa a una festa e inizia una relazione con una ragazza, che poi tenta di uccidere dopo che lei lo ha reso emotivamente vulnerabile — si ferma solo grazie a un flashback della madre. Un testimone lascia intendere che l'esercito abbia insabbiato tutto.\n\nÈ il periodo del suo miglior lavoro tecnico: il prototipo della piattaforma temporale e i primi proto-Doombot. Reed esamina i suoi appunti senza notare, questa volta, l'errore di calcolo. Victor riesce, secondo la sua versione, a contattare davvero sua madre all'Inferno (e Mefisto), prima che l'esperimento esploda — sfigurandolo.\n\nVictor viene espulso e, prima di partire, distrugge da remoto ogni sua invenzione rimasta nelle mani dell'esercito. Lascia gli Stati Uniti senza una meta precisa."},
     {n:"#3", status:"da_leggere", summary:""},
     {n:"#4", status:"da_leggere", summary:""},
     {n:"#5", status:"da_leggere", summary:""},
     {n:"#6", status:"da_leggere", summary:""}
   ]},

  {id:"childrens-crusade", title:"The Children's Crusade", subtitle:"2010–2012", phase:1, type:"diramazione", issuesText:"The Children's Crusade #1–9", why:"Rivela il ruolo nascosto di Dottor Destino nella manipolazione di Wanda durante Disassembled. Il legame con House of M resta invece deliberatamente ambiguo nel finale della serie.", status:"da_leggere", plot:["avengers-disassembled","house-of-m"], thread:[], issues:null},

  {id:"house-of-m", title:"House of M", subtitle:"2005", phase:1, type:"evento", issuesText:"House of M #1–8", why:"Riscrive il mondo e cancella quasi tutti i mutanti con \"No more mutants\".", status:"da_leggere", plot:["childrens-crusade"], thread:["hoxpox"], issues:null},

  {id:"civil-war", title:"Civil War", subtitle:"2006", phase:1, type:"evento", issuesText:"Civil War #1–7", why:"Spartiacque fondamentale tra Captain America e Iron Man.", status:"da_leggere", plot:["brand-new-day"], thread:["civil-war-ii"], issues:null},

  {id:"brand-new-day", title:"Spider-Man: Brand New Day", subtitle:"2008", phase:1, type:"run", issuesText:"Amazing Spider-Man #546+", why:"Si incastra subito dopo Civil War. Spider-Man urbano, inglese colloquiale.", status:"da_leggere", plot:["civil-war"], thread:[], issues:[]},

  {id:"secret-invasion", title:"Secret Invasion", subtitle:"2008", phase:1, type:"riassunto", issuesText:"—", why:"Gli Skrull infiltrati tra gli eroi per anni. L'eroe dell'ultimo secondo è Norman Osborn.", status:"da_leggere", plot:["siege"], thread:[], issues:null},

  {id:"siege", title:"Siege – L'Assedio", subtitle:"2010", phase:1, type:"evento", issuesText:"Siege #1–4", why:"Norman Osborn al potere coi Dark Avengers. Caduta spettacolare ad Asgard.", status:"da_leggere", plot:["secret-invasion","fall-of-hulks"], thread:[], issues:null},

  {id:"ff-hickman", title:"Fantastic Four (Hickman)", subtitle:"2009–2012", phase:2, type:"run", issuesText:"Fantastic Four (1998) #570+", why:"Ridefinisce la \"famiglia\" Marvel e costruisce la rivalità moderna con Dottor Doom.", status:"da_leggere", plot:["hickman-avengers","secret-wars","fall-of-hulks"], thread:["ff-ryan-north"], issues:[]},

  {id:"avx", title:"Avengers vs. X-Men", subtitle:"2012", phase:2, type:"riassunto", issuesText:"—", why:"La Forza Fenice torna sulla Terra. Ciclope uccide Xavier sotto il suo effetto.", status:"da_leggere", plot:[], thread:[], issues:null},

  {id:"hawkeye-fraction", title:"Hawkeye (Fraction)", subtitle:"2012", phase:2, type:"run", issuesText:"Hawkeye (2012) #1–22", why:"Pausa relax dai grandi eventi cosmici: divertente, dialoghi brevi.", status:"da_leggere", plot:[], thread:[], issues:null},

  {id:"hickman-avengers", title:"Avengers & New Avengers (Hickman)", subtitle:"2013–2015", phase:3, type:"evento", issuesText:"New Avengers #1–33 / Avengers #1–44", why:"Saga delle \"Incursioni\" tra universi. Base diretta di Avengers: Doomsday.", status:"da_leggere", plot:["ff-hickman","secret-wars"], thread:[], issues:[]},

  {id:"secret-wars", title:"Secret Wars", subtitle:"2015", phase:3, type:"evento", issuesText:"Secret Wars #1–9", why:"Il Multiverso crolla. Doom salva la realtà e si proclama Dio di Battleworld.", status:"da_leggere", plot:["hickman-avengers","ff-hickman","infamous-iron-man"], thread:["books-of-doom","triumph-torment"], issues:null},

  {id:"infamous-iron-man", title:"Infamous Iron Man", subtitle:"2016", phase:3, type:"run", issuesText:"Infamous Iron Man #1–12", why:"Dopo Secret Wars, Victor von Doom cerca la redenzione con l'armatura di Iron Man.", status:"da_leggere", plot:["secret-wars"], thread:["books-of-doom"], issues:null},

  {id:"civil-war-ii", title:"Civil War II", subtitle:"2016", phase:4, type:"riassunto", issuesText:"—", why:"Gli eroi litigano sul prevedere i crimini futuri.", status:"da_leggere", plot:[], thread:["civil-war"], issues:null},

  {id:"secret-empire", title:"Secret Empire", subtitle:"2017", phase:4, type:"riassunto", issuesText:"—", why:"Un Capitan America \"riscritto\" prende il controllo degli USA per l'Hydra.", status:"da_leggere", plot:[], thread:[], issues:null},

  {id:"hoxpox", title:"House of X / Powers of X", subtitle:"2019", phase:4, type:"evento", issuesText:"House of X #1–6 + Powers of X #1–6", why:"Hickman rivoluziona gli X-Men: nazione mutante indipendente su Krakoa.", status:"da_leggere", plot:[], thread:["house-of-m"], issues:[]},

  {id:"ff-ryan-north", title:"Fantastic Four (Ryan North)", subtitle:"2022–in corso", phase:5, type:"run", issuesText:"Fantastic Four (2022) #1+", why:"Storie autoconclusive fresche, moderne e accessibili in inglese.", status:"da_leggere", plot:[], thread:["ff-hickman"], issues:[]},

  {id:"blood-hunt", title:"Blood Hunt", subtitle:"2024", phase:5, type:"evento", issuesText:"Blood Hunt #1–5", why:"Notte eterna dei vampiri. Dottor Strange cede il titolo di Stregone Supremo a Doom.", status:"da_leggere", plot:["one-world-under-doom"], thread:[], issues:null},

  {id:"one-world-under-doom", title:"One World Under Doom", subtitle:"2025–2026", phase:5, type:"evento", issuesText:"One World Under Doom #1–9", why:"La grande saga attuale: Doom, Stregone Supremo, unifica la Terra sotto il suo pugno di ferro.", status:"da_leggere", plot:["blood-hunt"], thread:["books-of-doom"], issues:null},

  {id:"unthinkable", title:"Unthinkable", subtitle:"2004–2005 · Mark Waid", phase:1, type:"run", issuesText:"Fantastic Four (1998) #67–70", why:"Doom torna dopo essere stato dato per morto e si immerge nella magia oscura — il preludio diretto alla versione di Doom raccontata in Books of Doom.", status:"da_leggere", plot:["books-of-doom"], thread:[], issues:null},

  {id:"triumph-torment", title:"Triumph and Torment", subtitle:"1989 · Doctor Strange & Doctor Doom", phase:1, type:"diramazione", issuesText:"Graphic novel unico", why:"Doom si allea con Strange per salvare l'anima della madre: un episodio che rivela la sua complessità morale. Arco di personaggio, non collegamento di trama diretto.", status:"da_leggere", plot:[], thread:["secret-wars"], issues:null},

  {id:"vision-king", title:"Vision", subtitle:"2015–2016 · Tom King", phase:3, type:"run", issuesText:"Vision (2015) #1–12", why:"Dopo Disassembled, la Visione tenta di costruirsi una famiglia sintetica in un sobborgo americano. Premio Eisner, considerato essenziale per capire WandaVision.", status:"da_leggere", plot:["avengers-disassembled"], thread:[], issues:null},

  {id:"fall-of-hulks", title:"Fall of the Hulks / World War Hulks", subtitle:"2009–2010", phase:1, type:"riassunto", issuesText:"—", why:"Spiega il legame di Destino con l'Intelligencia e come arriva allo stato in cui lo troviamo all'inizio di Fantastic Four di Hickman.", status:"da_leggere", plot:["siege","ff-hickman"], thread:[], issues:null}
];

// Per le mini-serie con issues:null ma conteggio noto, genera i placeholder così:
function makeIssues(count, prefix){
  return Array.from({length:count}, (_,i)=>({ n: (prefix||'#')+(i+1), status:'da_leggere', summary:'' }));
}
// Applica: childrens-crusade→9, house-of-m→8, civil-war→7, siege→4,
// secret-wars→9, infamous-iron-man→12, hawkeye-fraction→22, blood-hunt→5,
// one-world-under-doom→9, unthinkable→4, vision-king→12
// (secret-invasion, avx, civil-war-ii, secret-empire, triumph-torment, fall-of-hulks
// restano con issues:null → si usa un singolo campo di riassunto libero, non la lista numeri)
```

## Struttura logica riassuntiva del modello dati

Ogni titolo (`entry`):
- `id` (string, univoco)
- `title`, `subtitle` (string)
- `phase` (1–5)
- `type`: `evento` | `run` | `riassunto` | `diramazione`
- `issuesText` (string informativa, es. "Books of Doom #1–6")
- `why` (string, perché leggerlo)
- `status`: `da_leggere` | `in_corso` | `letto` (stato generale, manuale)
- `plot`: array di id — collegamenti di trama **verificati**, bidirezionali
- `thread`: array di id — collegamenti di arco personaggio/tema, bidirezionali, NON crossover diretto
- `issues`: `null` (nessun tracking a numeri, usa `summary` libero) **oppure** array di `{n, status, summary}` (anche vuoto `[]` per run aperti da popolare manualmente)
- `summary`: string, usato solo quando `issues` è `null`

## Cosa NON fare

- Non inventare nuovi collegamenti tra titoli senza dirmelo — quelli attuali sono stati verificati con ricerche specifiche, e falsi collegamenti aggiunti in passato hanno già causato confusione
- Non cambiare la palette/font in stile diverso da quello pop-art descritto sopra
- Non usare `window.storage` o assumere un contesto artifact — questa è una webapp standalone

## Deploy

Deploy su Netlify, stesso account già usato per le mie altre 3 app.
