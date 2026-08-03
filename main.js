import React, { useState, useEffect, useRef, useMemo } from 'https://esm.sh/react@18.2.0';
import ReactDOM from 'https://esm.sh/react-dom@18.2.0/client';
import { SEED, PHASES, TYPE_BADGE, STATUS_LABEL } from './seed.js';

const CACHE_KEY = 'macrotrama-cache';
const API_PATH = '/api/data';

function phaseColor(phaseN) {
  return PHASES.find(p => p.n === phaseN).color;
}

function syncLabel(status) {
  switch (status) {
    case 'synced': return '● sincronizzato con il cloud';
    case 'saving': return '● salvataggio...';
    case 'local-only': return '● solo su questo dispositivo (offline)';
    default: return '● caricamento...';
  }
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

function TimelineView({ entries, onOpen }) {
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
        PHASES.map(ph => {
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

function MappaView({ entries, onOpen }) {
  const [selected, setSelected] = useState(null);
  const lastTapRef = useRef({ id: null, time: 0 });

  const { positions, maxRows } = useMemo(() => {
    const byPhase = {};
    PHASES.forEach(p => { byPhase[p.n] = []; });
    entries.forEach(e => byPhase[e.phase].push(e));
    const pos = {};
    let rows = 1;
    PHASES.forEach((p, colIdx) => {
      byPhase[p.n].forEach((e, rowIdx) => {
        pos[e.id] = { x: colIdx * COL_W + COL_W / 2, y: TOP_PAD + rowIdx * ROW_H + ROW_H / 2 };
      });
      rows = Math.max(rows, byPhase[p.n].length);
    });
    return { positions: pos, maxRows: rows };
  }, [entries]);

  const width = PHASES.length * COL_W;
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
          {PHASES.map((p, i) => (
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
            const dim = isDim(e.id);
            const hi = selected === e.id || (connectedIds && connectedIds.has(e.id));
            return (
              <div key={e.id}
                className={`map-node ${dim ? 'dim' : ''} ${hi ? 'highlight' : ''}`}
                style={{ left: p.x, top: p.y, '--accent': phaseColor(e.phase) }}
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
        <div className="section-label">Backup manuale (export / import)</div>
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
  const [entries, setEntries] = useState(null);
  const [syncStatus, setSyncStatus] = useState('loading');
  const [tab, setTab] = useState('timeline');
  const [openId, setOpenId] = useState(null);
  const [dataOpen, setDataOpen] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => { load(); }, []);

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

    if (remote) {
      setEntries(remote);
      localStorage.setItem(CACHE_KEY, JSON.stringify(remote));
      setSyncStatus('synced');
    } else if (local) {
      setEntries(local);
      setSyncStatus('local-only');
      persistRemote(local);
    } else {
      setEntries(SEED);
      localStorage.setItem(CACHE_KEY, JSON.stringify(SEED));
      setSyncStatus('local-only');
      persistRemote(SEED);
    }
  }

  function persistRemote(data) {
    setSyncStatus('saving');
    fetch(API_PATH, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ data })
    }).then(res => setSyncStatus(res.ok ? 'synced' : 'local-only'))
      .catch(() => setSyncStatus('local-only'));
  }

  function mutate(next) {
    setEntries(next);
    localStorage.setItem(CACHE_KEY, JSON.stringify(next));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistRemote(next), 600);
  }

  const actions = {
    setStatus: (id, status) => mutate(entries.map(e => e.id === id ? { ...e, status } : e)),
    updateSummary: (id, summary) => mutate(entries.map(e => e.id === id ? { ...e, summary } : e)),
    updateIssue: (id, idx, patch) => mutate(entries.map(e => e.id === id
      ? { ...e, issues: e.issues.map((iss, i) => i === idx ? { ...iss, ...patch } : iss) }
      : e)),
    cycleIssueStatus: (id, idx) => {
      const entry = entries.find(e => e.id === id);
      const cur = entry.issues[idx].status;
      const next = cur === 'da_leggere' ? 'in_corso' : cur === 'in_corso' ? 'letto' : 'da_leggere';
      actions.updateIssue(id, idx, { status: next });
    },
    addIssue: (id) => mutate(entries.map(e => e.id === id
      ? { ...e, issues: [...e.issues, { n: '#' + (e.issues.length + 1), status: 'da_leggere', summary: '' }] }
      : e)),
    toggleLink: (fromId, toId, kind) => {
      const fromEntry = entries.find(e => e.id === fromId);
      const willAdd = !fromEntry[kind].includes(toId);
      mutate(entries.map(e => {
        if (e.id === fromId) return { ...e, [kind]: willAdd ? [...e[kind], toId] : e[kind].filter(x => x !== toId) };
        if (e.id === toId) return { ...e, [kind]: willAdd ? [...e[kind], fromId] : e[kind].filter(x => x !== fromId) };
        return e;
      }));
    },
    importData: (data) => mutate(data)
  };

  if (!entries) {
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
        {tab === 'timeline' && <TimelineView entries={entries} onOpen={setOpenId} />}
        {tab === 'mappa' && <MappaView entries={entries} onOpen={setOpenId} />}
        <div className="app-footer">Macrotrama v1.1.0</div>
      </main>
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
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
