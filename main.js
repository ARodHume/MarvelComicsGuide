import React, { useState, useEffect, useRef, useMemo } from 'https://esm.sh/react@18.2.0';
import ReactDOM from 'https://esm.sh/react-dom@18.2.0/client';
import { SEED, DEFAULT_PHASES, PALETTE, TYPE_BADGE, STATUS_LABEL } from './seed.js';

const CACHE_KEY = 'macrotrama-cache';
const API_PATH = '/api/data';

function phaseColor(phases, phaseN) {
  const p = phases.find(p => p.n === phaseN);
  return p ? p.color : '#111111';
}

function syncLabel(status) {
  switch (status) {
    case 'synced': return '● sincronizzato con il cloud';
    case 'saving': return '● salvataggio...';
    case 'local-only': return '● solo su questo dispositivo (offline)';
    default: return '● caricamento...';
  }
}

function slugify(s) {
  const base = s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return base || 'titolo';
}

function uniqueId(base, existingIds) {
  let id = base, i = 2;
  while (existingIds.includes(id)) { id = `${base}-${i}`; i++; }
  return id;
}

// ---------- Presentational pieces ----------

function EntryCard({ entry, color, onOpen }) {
  return (
    <div className="card" style={{ '--accent': color }} onClick={() => onOpen(entry.id)}>
      <div className="card-title">{entry.title}</div>
      <div className="card-subtitle">{entry.subtitle}</div>
      <div className="card-footer">
        <span className="badge-type">{TYPE_BADGE[entry.type]}</span>
        <span className={`stamp stamp-${entry.status}`}>{STATUS_LABEL[entry.status]}</span>
      </div>
    </div>
  );
}

function TimelineView({ entries, phases, onOpen }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('tutti');

  const filtered = entries.filter(e => {
    const haystack = (e.title + ' ' + e.subtitle + ' ' + e.why).toLowerCase();
    const matchesQuery = !query || haystack.includes(query.toLowerCase());
    const matchesFilter = filter === 'tutti' || e.status === filter;
    return matchesQuery && matchesFilter;
  });

  return (
    <div>
      <div className="catalog-controls">
        <input
          className="search-input"
          placeholder="Cerca un titolo..."
          value={query}
          onChange={ev => setQuery(ev.target.value)}
        />
        <div className="filter-row">
          {['tutti', 'da_leggere', 'in_corso', 'letto'].map(f => (
            <button
              key={f}
              className={`filter-chip ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}>
              {f === 'tutti' ? 'Tutti' : STATUS_LABEL[f]}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="empty-state">Nessun titolo trovato.</div>
      ) : (
        phases.map(ph => {
          const items = filtered.filter(e => e.phase === ph.n);
          if (!items.length) return null;
          return (
            <div className="phase-section" key={ph.n}>
              <div className="phase-heading">
                <span className="dot" style={{ background: ph.color }}></span>
                <h2>Fase {ph.n}</h2>
                <span className="years">{ph.label}</span>
              </div>
              <div className="card-grid">
                {items.map(e => <EntryCard key={e.id} entry={e} color={ph.color} onOpen={onOpen} />)}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

const COL_W = 200, ROW_H = 118, TOP_PAD = 40;

function MappaView({ entries, phases, onOpen }) {
  const [selected, setSelected] = useState(null);
  const lastTapRef = useRef({ id: null, time: 0 });

  const { positions, maxRows } = useMemo(() => {
    const byPhase = {};
    phases.forEach(p => { byPhase[p.n] = []; });
    entries.forEach(e => { if (byPhase[e.phase]) byPhase[e.phase].push(e); });
    const pos = {};
    let rows = 1;
    phases.forEach((p, colIdx) => {
      byPhase[p.n].forEach((e, rowIdx) => {
        pos[e.id] = { x: colIdx * COL_W + COL_W / 2, y: TOP_PAD + rowIdx * ROW_H + ROW_H / 2 };
      });
      rows = Math.max(rows, byPhase[p.n].length);
    });
    return { positions: pos, maxRows: rows };
  }, [entries, phases]);

  const width = phases.length * COL_W;
  const height = TOP_PAD + maxRows * ROW_H + 30;

  const selectedEntry = selected ? entries.find(e => e.id === selected) : null;
  const connectedIds = selectedEntry ? new Set([...selectedEntry.plot, ...selectedEntry.thread]) : null;

  function isDim(id) {
    if (!selected) return false;
    return id !== selected && !connectedIds.has(id);
  }

  function handleNodeClick(id) {
    const now = Date.now();
    const last = lastTapRef.current;
    if (last.id === id && now - last.time < 400) {
      lastTapRef.current = { id: null, time: 0 };
      onOpen(id);
      return;
    }
    lastTapRef.current = { id, time: now };
    setSelected(prev => prev === id ? null : id);
  }

  const lines = [];
  const seen = new Set();
  entries.forEach(e => {
    e.plot.forEach(toId => {
      const key = [e.id, toId].sort().join('|') + '|plot';
      if (seen.has(key) || !positions[toId]) return;
      seen.add(key);
      lines.push({ a: e.id, b: toId, kind: 'plot' });
    });
    e.thread.forEach(toId => {
      const key = [e.id, toId].sort().join('|') + '|thread';
      if (seen.has(key) || !positions[toId]) return;
      seen.add(key);
      lines.push({ a: e.id, b: toId, kind: 'thread' });
    });
  });

  return (
    <div>
      <div className="map-hint">Tocca un titolo per evidenziare i collegamenti · doppio tap per aprire la scheda</div>
      <div className="map-wrap" onClick={ev => { if (ev.target === ev.currentTarget) setSelected(null); }}>
        <div style={{ position: 'relative', width, height }}>
          {phases.map((p, i) => (
            <div key={p.n} className="map-column-label" style={{ left: i * COL_W + COL_W / 2 }}>{p.label}</div>
          ))}
          <svg className="map-svg-layer" width={width} height={height}>
            {lines.map((l, i) => {
              const a = positions[l.a], b = positions[l.b];
              const active = selected && (l.a === selected || l.b === selected);
              const dimmed = selected && !active;
              return (
                <line key={i}
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={l.kind === 'plot' ? '#E3242B' : '#0FA3B1'}
                  strokeWidth={active ? 2.5 : 1.5}
                  strokeDasharray={l.kind === 'thread' ? '5,4' : undefined}
                  opacity={dimmed ? 0.12 : 0.85}
                />
              );
            })}
          </svg>
          {entries.map(e => {
            const p = positions[e.id];
            if (!p) return null;
            const dim = isDim(e.id);
            const hi = selected === e.id || (connectedIds && connectedIds.has(e.id));
            return (
              <div key={e.id}
                className={`map-node ${dim ? 'dim' : ''} ${hi ? 'highlight' : ''}`}
                style={{ left: p.x, top: p.y, '--accent': phaseColor(phases, e.phase) }}
                onClick={ev => { ev.stopPropagation(); handleNodeClick(e.id); }}>
                <div className="title">{e.title}</div>
                <div>{TYPE_BADGE[e.type]} {STATUS_LABEL[e.status]}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DetailModal({ entry, entries, onClose, actions }) {
  const others = entries.filter(e => e.id !== entry.id);

  return (
    <div className="modal-backdrop" onClick={ev => { if (ev.target === ev.currentTarget) onClose(); }}>
      <div className="modal-sheet">
        <button className="modal-close" onClick={onClose} aria-label="Chiudi">×</button>
        <div className="modal-title">{entry.title}</div>
        <div className="modal-subtitle">{TYPE_BADGE[entry.type]} {entry.subtitle} · {entry.issuesText}</div>

        <div className="section-label">Perché leggerlo</div>
        <div className="why-box">{entry.why}</div>

        <div className="section-label">Stato di lettura</div>
        <div className="status-row">
          {['da_leggere', 'in_corso', 'letto'].map(s => (
            <button key={s}
              className={`status-btn ${entry.status === s ? 'active-' + s : ''}`}
              onClick={() => actions.setStatus(entry.id, s)}>
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        {entry.issues ? (
          <>
            <div className="section-label">Numeri</div>
            {entry.issues.map((iss, idx) => (
              <div className="issue-row" key={idx}>
                <div className="issue-row-head">
                  <span className="issue-n">{iss.n}</span>
                  <button className={`stamp stamp-${iss.status}`}
                    onClick={() => actions.cycleIssueStatus(entry.id, idx)}>
                    {STATUS_LABEL[iss.status]}
                  </button>
                </div>
                <textarea className="issue-summary" placeholder="Riassunto..."
                  defaultValue={iss.summary}
                  onBlur={ev => actions.updateIssue(entry.id, idx, { summary: ev.target.value })} />
              </div>
            ))}
            <button className="add-issue-btn" onClick={() => actions.addIssue(entry.id)}>+ Aggiungi numero</button>
          </>
        ) : (
          <>
            <div className="section-label">Riassunto</div>
            <textarea className="free-summary" placeholder="Riassunto..."
              defaultValue={entry.summary || ''}
              onBlur={ev => actions.updateSummary(entry.id, ev.target.value)} />
          </>
        )}

        <div className="section-label">Collegamenti di trama</div>
        <div className="link-list">
          {others.map(o => (
            <label className="link-item" key={o.id}>
              <input type="checkbox" checked={entry.plot.includes(o.id)}
                onChange={() => actions.toggleLink(entry.id, o.id, 'plot')} />
              <span>{o.title}</span>
            </label>
          ))}
        </div>

        <div className="section-label">Arco di personaggio/tema</div>
        <div className="link-list">
          {others.map(o => (
            <label className="link-item" key={o.id}>
              <input type="checkbox" checked={entry.thread.includes(o.id)}
                onChange={() => actions.toggleLink(entry.id, o.id, 'thread')} />
              <span>{o.title}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function NewEntryModal({ phases, existingIds, onClose, onCreate }) {
  const lastPhase = phases[phases.length - 1];
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [phaseChoice, setPhaseChoice] = useState(String(lastPhase.n));
  const [newPhaseLabel, setNewPhaseLabel] = useState('');
  const [type, setType] = useState('run');
  const [issuesText, setIssuesText] = useState('');
  const [why, setWhy] = useState('');
  const [hasIssues, setHasIssues] = useState(false);
  const [error, setError] = useState('');

  function submit() {
    if (!title.trim()) { setError('Il titolo è obbligatorio.'); return; }

    let phaseN = phaseChoice === 'new' ? null : Number(phaseChoice);
    let newPhase = null;
    if (phaseChoice === 'new') {
      if (!newPhaseLabel.trim()) { setError("Indica un'etichetta per la nuova fase (es. gli anni)."); return; }
      const nextN = Math.max(...phases.map(p => p.n)) + 1;
      newPhase = { n: nextN, label: newPhaseLabel.trim(), color: PALETTE[(nextN - 1) % PALETTE.length] };
      phaseN = nextN;
    }

    const id = uniqueId(slugify(title), existingIds);
    const entry = {
      id,
      title: title.trim(),
      subtitle: subtitle.trim(),
      phase: phaseN,
      type,
      issuesText: issuesText.trim() || '—',
      why: why.trim(),
      status: 'da_leggere',
      plot: [],
      thread: [],
      issues: hasIssues ? [] : null,
      ...(hasIssues ? {} : { summary: '' })
    };
    onCreate(entry, newPhase);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={ev => { if (ev.target === ev.currentTarget) onClose(); }}>
      <div className="modal-sheet">
        <button className="modal-close" onClick={onClose} aria-label="Chiudi">×</button>
        <div className="modal-title">Nuovo titolo</div>

        <div className="section-label">Titolo</div>
        <input className="search-input" value={title} onChange={ev => setTitle(ev.target.value)} placeholder="Es. Ultimatum" />

        <div className="section-label">Sottotitolo</div>
        <input className="search-input" value={subtitle} onChange={ev => setSubtitle(ev.target.value)} placeholder="Es. 2027 · Autore" />

        <div className="section-label">Fase</div>
        <select className="search-input" value={phaseChoice} onChange={ev => setPhaseChoice(ev.target.value)}>
          {phases.map(p => <option key={p.n} value={p.n}>Fase {p.n} · {p.label}</option>)}
          <option value="new">+ Nuova fase (successiva)</option>
        </select>
        {phaseChoice === 'new' && (
          <input className="search-input" style={{ marginTop: 8 }}
            value={newPhaseLabel} onChange={ev => setNewPhaseLabel(ev.target.value)}
            placeholder="Etichetta nuova fase, es. 2027–2028" />
        )}

        <div className="section-label">Tipo</div>
        <select className="search-input" value={type} onChange={ev => setType(ev.target.value)}>
          <option value="evento">⭐ Evento</option>
          <option value="run">📖 Run</option>
          <option value="riassunto">⚡ Basta un riassunto</option>
          <option value="diramazione">🔗 Diramazione collegata</option>
        </select>

        <div className="section-label">Numeri (informativo)</div>
        <input className="search-input" value={issuesText} onChange={ev => setIssuesText(ev.target.value)} placeholder="Es. Titolo #1–6" />

        <div className="section-label">Perché leggerlo</div>
        <textarea className="free-summary" value={why} onChange={ev => setWhy(ev.target.value)} />

        <div className="section-label">Struttura</div>
        <div className="status-row">
          <button className={`status-btn ${!hasIssues ? 'active-letto' : ''}`} onClick={() => setHasIssues(false)}>Riassunto unico</button>
          <button className={`status-btn ${hasIssues ? 'active-letto' : ''}`} onClick={() => setHasIssues(true)}>Elenco numeri</button>
        </div>

        {error && <div className="sync-indicator" style={{ color: '#D6336C', marginTop: 10 }}>{error}</div>}

        <button className="btn btn-primary" style={{ marginTop: 16, width: '100%' }} onClick={submit}>Crea titolo</button>
      </div>
    </div>
  );
}

function DataModal({ entries, syncStatus, onClose, onImport }) {
  const [text, setText] = useState(() => JSON.stringify(entries, null, 2));
  const [msg, setMsg] = useState('');

  function doImport() {
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error('il JSON deve essere un array');
      onImport(parsed);
      setMsg('Importato.');
    } catch (e) {
      setMsg('JSON non valido: ' + e.message);
    }
  }

  return (
    <div className="modal-backdrop" onClick={ev => { if (ev.target === ev.currentTarget) onClose(); }}>
      <div className="modal-sheet">
        <button className="modal-close" onClick={onClose} aria-label="Chiudi">×</button>
        <div className="modal-title">Dati</div>
        <div className="modal-subtitle sync-indicator">{syncLabel(syncStatus)}</div>
        <div className="section-label">Backup manuale (export / import titoli)</div>
        <div className="export-import-box">
          <textarea value={text} onChange={ev => setText(ev.target.value)} />
          <div className="status-row">
            <button className="btn" onClick={() => setText(JSON.stringify(entries, null, 2))}>Aggiorna export</button>
            <button className="btn btn-primary" onClick={doImport}>Importa</button>
          </div>
          {msg && <div className="sync-indicator">{msg}</div>}
        </div>
      </div>
    </div>
  );
}

// ---------- App ----------

function App() {
  const [appData, setAppData] = useState(null); // { entries, phases }
  const [syncStatus, setSyncStatus] = useState('loading');
  const [tab, setTab] = useState('timeline');
  const [openId, setOpenId] = useState(null);
  const [dataOpen, setDataOpen] = useState(false);
  const [newEntryOpen, setNewEntryOpen] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => { load(); }, []);

  function normalize(d) {
    if (!d) return null;
    if (Array.isArray(d)) return { entries: d, phases: DEFAULT_PHASES };
    return { entries: d.entries || [], phases: (d.phases && d.phases.length) ? d.phases : DEFAULT_PHASES };
  }

  async function load() {
    let remote = null;
    try {
      const res = await fetch(API_PATH);
      if (res.ok) {
        const json = await res.json();
        remote = json.data || null;
      }
    } catch (e) { /* offline o funzione non ancora deployata */ }

    let local = null;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) local = JSON.parse(raw);
    } catch (e) { /* cache corrotta, ignora */ }

    const remoteWasLegacyArray = Array.isArray(remote);
    const remoteN = normalize(remote);
    const localN = normalize(local);

    if (remoteN) {
      apply(remoteN, 'synced', remoteWasLegacyArray);
    } else if (localN) {
      apply(localN, 'local-only', true);
    } else {
      apply({ entries: SEED, phases: DEFAULT_PHASES }, 'local-only', true);
    }
  }

  function apply(next, status, shouldPush) {
    setAppData(next);
    localStorage.setItem(CACHE_KEY, JSON.stringify(next));
    setSyncStatus(status);
    if (shouldPush) persistRemote(next);
  }

  function persistRemote(next) {
    setSyncStatus('saving');
    fetch(API_PATH, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ data: next })
    }).then(res => setSyncStatus(res.ok ? 'synced' : 'local-only'))
      .catch(() => setSyncStatus('local-only'));
  }

  // updater: either a full { entries, phases } object, or a function (prev => next).
  // Using the functional setState form keeps back-to-back mutate() calls (e.g. add a
  // phase and an entry in the same click) atomic instead of racing on stale closures.
  function mutate(updater) {
    setAppData(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      localStorage.setItem(CACHE_KEY, JSON.stringify(next));
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => persistRemote(next), 600);
      return next;
    });
  }

  const entries = appData ? appData.entries : null;
  const phases = appData ? appData.phases : null;

  const actions = {
    setStatus: (id, status) => mutate(prev => ({ ...prev, entries: prev.entries.map(e => e.id === id ? { ...e, status } : e) })),
    updateSummary: (id, summary) => mutate(prev => ({ ...prev, entries: prev.entries.map(e => e.id === id ? { ...e, summary } : e) })),
    updateIssue: (id, idx, patch) => mutate(prev => ({
      ...prev,
      entries: prev.entries.map(e => e.id === id
        ? { ...e, issues: e.issues.map((iss, i) => i === idx ? { ...iss, ...patch } : iss) }
        : e)
    })),
    cycleIssueStatus: (id, idx) => {
      const entry = entries.find(e => e.id === id);
      const cur = entry.issues[idx].status;
      const next = cur === 'da_leggere' ? 'in_corso' : cur === 'in_corso' ? 'letto' : 'da_leggere';
      actions.updateIssue(id, idx, { status: next });
    },
    addIssue: (id) => mutate(prev => ({
      ...prev,
      entries: prev.entries.map(e => e.id === id
        ? { ...e, issues: [...e.issues, { n: '#' + (e.issues.length + 1), status: 'da_leggere', summary: '' }] }
        : e)
    })),
    toggleLink: (fromId, toId, kind) => mutate(prev => {
      const fromEntry = prev.entries.find(e => e.id === fromId);
      const willAdd = !fromEntry[kind].includes(toId);
      return {
        ...prev,
        entries: prev.entries.map(e => {
          if (e.id === fromId) return { ...e, [kind]: willAdd ? [...e[kind], toId] : e[kind].filter(x => x !== toId) };
          if (e.id === toId) return { ...e, [kind]: willAdd ? [...e[kind], fromId] : e[kind].filter(x => x !== fromId) };
          return e;
        })
      };
    }),
    importData: (importedEntries) => mutate(prev => ({ ...prev, entries: importedEntries })),
    createEntry: (entry, newPhase) => mutate(prev => ({
      entries: [...prev.entries, entry],
      phases: newPhase ? [...prev.phases, newPhase] : prev.phases
    }))
  };

  if (!appData) {
    return <div className="empty-state">Caricamento...</div>;
  }

  const openEntry = openId ? entries.find(e => e.id === openId) : null;

  return (
    <>
      <header className="app-header">
        <div>
          <h1>Macrotrama</h1>
          <div className="tagline">Marvel reading tracker</div>
        </div>
        <button className="btn" onClick={() => setDataOpen(true)}>💾 Dati</button>
      </header>
      <main className="app-main">
        {tab === 'timeline' && <TimelineView entries={entries} phases={phases} onOpen={setOpenId} />}
        {tab === 'mappa' && <MappaView entries={entries} phases={phases} onOpen={setOpenId} />}
        <div className="app-footer">Macrotrama v1.2.0</div>
      </main>
      <button className="fab" onClick={() => setNewEntryOpen(true)} aria-label="Nuovo titolo">+</button>
      <nav className="bottom-nav">
        <button className={tab === 'timeline' ? 'active' : ''} onClick={() => setTab('timeline')}>
          <span className="icon">🕒</span>Timeline
        </button>
        <button className={tab === 'mappa' ? 'active' : ''} onClick={() => setTab('mappa')}>
          <span className="icon">🕸️</span>Mappa
        </button>
      </nav>
      {openEntry && <DetailModal entry={openEntry} entries={entries} onClose={() => setOpenId(null)} actions={actions} />}
      {dataOpen && <DataModal entries={entries} syncStatus={syncStatus} onClose={() => setDataOpen(false)} onImport={actions.importData} />}
      {newEntryOpen && (
        <NewEntryModal
          phases={phases}
          existingIds={entries.map(e => e.id)}
          onClose={() => setNewEntryOpen(false)}
          onCreate={actions.createEntry}
        />
      )}
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
