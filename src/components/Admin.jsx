import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient.js'

const ADMIN_PASSWORD = 'Arco2026'
const NEGOZI = ['centralcash', 'ipertosano']

export default function Admin({ isAuth, onAuth, onLogout, negozio }) {
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState('')

  function tryLogin(e) {
    e?.preventDefault()
    if (pwInput === ADMIN_PASSWORD) {
      onAuth()
      setPwInput('')
      setPwError('')
    } else {
      setPwError('Password errata')
    }
  }

  if (!isAuth) {
    return (
      <div className="admin-login">
        <h2>🔒 Accesso Admin</h2>
        <input
          className="text-input"
          type="password"
          placeholder="Password"
          value={pwInput}
          onChange={(e) => setPwInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && tryLogin(e)}
        />
        <button className="btn-primary" onClick={tryLogin} style={{ width: '100%', marginTop: 8 }}>
          Entra
        </button>
        {pwError && (
          <div style={{ color: '#c8102e', marginTop: 12, fontSize: 14 }}>{pwError}</div>
        )}
      </div>
    )
  }

  return <AdminDashboard onLogout={onLogout} negozio={negozio} />
}

function AdminDashboard({ onLogout, negozio }) {
  const [prodotti, setProdotti] = useState([])
  const [storico, setStorico] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [expandedStorico, setExpandedStorico] = useState(null)

  // Form nuovo prodotto
  const [newNome, setNewNome] = useState('')
  const [newQtaNecessaria, setNewQtaNecessaria] = useState('')
  const [addEntrambi, setAddEntrambi] = useState(false)

  useEffect(() => {
    loadAll()
  }, [negozio])

  async function loadAll() {
    setLoading(true)
    const [prodRes, storRes] = await Promise.all([
      supabase.from('prodotti').select('*').eq('negozio', negozio).order('ordine', { ascending: true }),
      supabase
        .from('controlli_storico')
        .select('*')
        .eq('negozio', negozio)
        .order('data_ora', { ascending: false })
        .limit(100),
    ])
    if (!prodRes.error) setProdotti(prodRes.data || [])
    if (!storRes.error) setStorico(storRes.data || [])
    setLoading(false)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  async function addProdotto() {
    if (!newNome.trim()) {
      showToast('Inserisci il nome del prodotto')
      return
    }

    const negozi = addEntrambi ? NEGOZI : [negozio]
    const inserts = []

    for (const neg of negozi) {
      let maxOrdine
      if (neg === negozio) {
        maxOrdine = prodotti.reduce((m, p) => Math.max(m, p.ordine || 0), 0)
      } else {
        const { data } = await supabase
          .from('prodotti')
          .select('ordine')
          .eq('negozio', neg)
          .order('ordine', { ascending: false })
          .limit(1)
        maxOrdine = data?.[0]?.ordine || 0
      }
      inserts.push({
        nome: newNome.trim(),
        qta_necessaria: parseInt(newQtaNecessaria, 10) || 0,
        ordine: maxOrdine + 1,
        negozio: neg,
      })
    }

    const { error } = await supabase.from('prodotti').insert(inserts)
    if (error) {
      console.error(error)
      showToast('Errore in aggiunta')
      return
    }
    setNewNome('')
    setNewQtaNecessaria('')
    setAddEntrambi(false)
    showToast(negozi.length > 1 ? 'Prodotto aggiunto a entrambi i negozi' : 'Prodotto aggiunto')
    loadAll()
  }

  async function updateProdotto(id, campo, valore) {
    const update = {}
    update[campo] = campo === 'qta_necessaria' ? parseInt(valore, 10) || 0 : valore
    const { error } = await supabase.from('prodotti').update(update).eq('id', id)
    if (error) {
      console.error(error)
      showToast('Errore aggiornamento')
    } else {
      // aggiorno locale senza ricaricare tutto
      setProdotti((prev) => prev.map((p) => (p.id === id ? { ...p, ...update } : p)))
    }
  }

  async function deleteProdotto(id) {
    if (!confirm('Eliminare questo prodotto?')) return
    const { error } = await supabase.from('prodotti').delete().eq('id', id)
    if (error) {
      console.error(error)
      showToast('Errore eliminazione')
    } else {
      showToast('Prodotto eliminato')
      loadAll()
    }
  }

  async function moveProdotto(id, direction) {
    const idx = prodotti.findIndex((p) => p.id === id)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= prodotti.length) return

    const a = prodotti[idx]
    const b = prodotti[swapIdx]

    await Promise.all([
      supabase.from('prodotti').update({ ordine: b.ordine }).eq('id', a.id),
      supabase.from('prodotti').update({ ordine: a.ordine }).eq('id', b.id),
    ])
    loadAll()
  }

  async function deleteStorico(id) {
    if (!confirm('Eliminare questo controllo dallo storico?')) return
    const { error } = await supabase.from('controlli_storico').delete().eq('id', id)
    if (error) {
      console.error(error)
      showToast('Errore eliminazione')
    } else {
      showToast('Controllo eliminato')
      loadAll()
    }
  }

  if (loading) {
    return <div className="loading">Caricamento…</div>
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn-secondary" onClick={onLogout}>
          Esci
        </button>
      </div>

      {/* GESTIONE PRODOTTI */}
      <div className="admin-section">
        <h2>Gestione Prodotti</h2>

        {prodotti.length === 0 ? (
          <div className="empty-state">Nessun prodotto. Aggiungi il primo qui sotto.</div>
        ) : (
          prodotti.map((p, idx) => (
            <div className="admin-product-row" key={p.id}>
              <input
                type="text"
                value={p.nome}
                onChange={(e) =>
                  setProdotti((prev) =>
                    prev.map((x) => (x.id === p.id ? { ...x, nome: e.target.value } : x))
                  )
                }
                onBlur={(e) => updateProdotto(p.id, 'nome', e.target.value)}
              />
              <input
                type="number"
                min="0"
                max="999"
                value={p.qta_necessaria || 0}
                onChange={(e) =>
                  setProdotti((prev) =>
                    prev.map((x) =>
                      x.id === p.id ? { ...x, qta_necessaria: e.target.value } : x
                    )
                  )
                }
                onBlur={(e) => updateProdotto(p.id, 'qta_necessaria', e.target.value)}
              />
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  className="btn-icon"
                  onClick={() => moveProdotto(p.id, 'up')}
                  disabled={idx === 0}
                  title="Sposta su"
                >
                  ▲
                </button>
                <button
                  className="btn-icon"
                  onClick={() => moveProdotto(p.id, 'down')}
                  disabled={idx === prodotti.length - 1}
                  title="Sposta giù"
                >
                  ▼
                </button>
              </div>
              <button
                className="btn-icon danger"
                onClick={() => deleteProdotto(p.id)}
                title="Elimina"
              >
                ✕
              </button>
            </div>
          ))
        )}

        <div className="admin-add-row">
          <input
            type="text"
            placeholder="Nome nuovo prodotto"
            value={newNome}
            onChange={(e) => setNewNome(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addProdotto()}
          />
          <input
            type="number"
            min="0"
            max="999"
            placeholder="Qta necessaria"
            value={newQtaNecessaria}
            onChange={(e) => setNewQtaNecessaria(e.target.value)}
          />
          <button className="btn-primary" onClick={addProdotto}>
            + Aggiungi
          </button>
          <label className="toggle-entrambi">
            <input
              type="checkbox"
              checked={addEntrambi}
              onChange={(e) => setAddEntrambi(e.target.checked)}
            />
            Aggiungi a entrambi i negozi
          </label>
        </div>
      </div>

      {/* STORICO CONTROLLI */}
      <div className="admin-section">
        <h2>Storico Controlli</h2>
        {storico.length === 0 ? (
          <div className="empty-state">Nessun controllo registrato.</div>
        ) : (
          storico.map((s) => {
            const d = new Date(s.data_ora)
            const dStr = d.toLocaleDateString('it-IT')
            const tStr = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
            const isOpen = expandedStorico === s.id
            return (
              <div className="storico-item" key={s.id}>
                <div
                  onClick={() => setExpandedStorico(isOpen ? null : s.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="storico-meta">
                    <span>
                      {dStr} — {tStr}
                    </span>
                    <span>{isOpen ? '▼' : '▶'}</span>
                  </div>
                  <div className="storico-name">{s.nome_controllore}</div>
                </div>

                {isOpen && (
                  <div className="storico-detail">
                    <div className="storico-detail-row header-row">
                      <div>Prodotto</div>
                      <div style={{ textAlign: 'center' }}>Mancante</div>
                      <div style={{ textAlign: 'center' }}>Necessaria</div>
                    </div>
                    {(s.righe || []).map((r, i) => (
                      <div className="storico-detail-row" key={i}>
                        <div>
                          {r.nome}
                          {r.libera ? ' *' : ''}
                        </div>
                        <div style={{ textAlign: 'center' }}>{r.qta_mancante}</div>
                        <div style={{ textAlign: 'center' }}>{r.qta_necessaria}</div>
                      </div>
                    ))}
                    <div style={{ marginTop: 12, textAlign: 'right' }}>
                      <button
                        className="btn-icon danger"
                        onClick={() => deleteStorico(s.id)}
                      >
                        Elimina controllo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
