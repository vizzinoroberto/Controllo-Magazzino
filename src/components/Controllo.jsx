import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient.js'

export default function Controllo({ logo, negozio }) {
  const [prodotti, setProdotti] = useState([])
  const [quantitaPresente, setQuantitaPresente] = useState({}) // {prodotto_id: numero}
  const [righeLibere, setRigheLibere] = useState([
    { id: `lib-${Date.now()}`, nome: '', qtaPresente: 0, qtaNecessaria: 0 }
  ])
  const [nomeControllore, setNomeControllore] = useState('')
  const [now, setNow] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const stampaInCorso = useRef(false)
  const righeDaStampareRef = useRef([]) // dati congelati per la stampa (non reattivi)

  // Carica prodotti del negozio corrente e azzera lo stato quando si cambia negozio
  useEffect(() => {
    setQuantitaPresente({})
    setRigheLibere([{ id: `lib-${Date.now()}`, nome: '', qtaPresente: 0, qtaNecessaria: 0 }])
    loadProdotti()
  }, [negozio])

  // Aggiorna l'orologio ogni secondo
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Listener "afterprint" per azzerare le quantità dopo la stampa
  useEffect(() => {
    const handleAfterPrint = () => {
      if (stampaInCorso.current) {
        stampaInCorso.current = false
        setQuantitaPresente({})
        setRigheLibere([{ id: `lib-${Date.now()}`, nome: '', qtaPresente: 0, qtaNecessaria: 0 }])
        setNomeControllore('')
        showToast('Controllo stampato e archiviato')
      }
    }
    window.addEventListener('afterprint', handleAfterPrint)
    return () => window.removeEventListener('afterprint', handleAfterPrint)
  }, [])

  async function loadProdotti() {
    setLoading(true)
    const { data, error } = await supabase
      .from('prodotti')
      .select('*')
      .eq('negozio', negozio)
      .order('ordine', { ascending: true })

    if (error) {
      console.error(error)
      showToast('Errore caricamento prodotti')
    } else {
      setProdotti(data || [])
    }
    setLoading(false)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  function setPresente(prodId, val) {
    setQuantitaPresente((prev) => ({ ...prev, [prodId]: parseInt(val, 10) || 0 }))
  }

  function updateRigaLibera(id, field, val) {
    setRigheLibere((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, [field]: field === 'nome' ? val : parseInt(val, 10) || 0 }
          : r
      )
    )
  }

  function addRigaLibera() {
    setRigheLibere((prev) => [
      ...prev,
      { id: `lib-${Date.now()}`, nome: '', qtaPresente: 0, qtaNecessaria: 0 },
    ])
  }

  function removeRigaLibera(id) {
    setRigheLibere((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev))
  }

  function calcMancante(necessaria, presente) {
    return Math.max(0, (necessaria || 0) - (presente || 0))
  }

  function buildRigheStampa() {
    const righeProdotti = prodotti
      .filter((p) => quantitaPresente[p.id] !== undefined && calcMancante(p.qta_necessaria, quantitaPresente[p.id]) > 0)
      .map((p) => ({
        nome: p.nome,
        qta_mancante: calcMancante(p.qta_necessaria, quantitaPresente[p.id]),
        qta_necessaria: p.qta_necessaria || 0,
      }))
    const righeLibereCompilate = righeLibere
      .filter((r) => (r.nome.trim() !== '' || r.qtaNecessaria > 0) && calcMancante(r.qtaNecessaria, r.qtaPresente) > 0)
      .map((r) => ({
        nome: r.nome.trim() || '(senza nome)',
        qta_mancante: calcMancante(r.qtaNecessaria, r.qtaPresente),
        qta_necessaria: r.qtaNecessaria,
        libera: true,
      }))
    return [...righeProdotti, ...righeLibereCompilate]
  }

  async function handleStampa() {
    if (!nomeControllore.trim()) {
      showToast('Inserisci il nome del controllore')
      return
    }

    const righe = buildRigheStampa()
    righeDaStampareRef.current = righe // congela i dati prima di qualsiasi await o reset

    const dataOra = new Date().toISOString()

    const { error } = await supabase.from('controlli_storico').insert([
      {
        data_ora: dataOra,
        nome_controllore: nomeControllore.trim(),
        righe: righe,
        negozio: negozio,
      },
    ])

    if (error) {
      console.error(error)
      showToast('Errore salvataggio storico — stampa comunque')
    }

    stampaInCorso.current = true
    setTimeout(() => window.print(), 100)
  }

  const dateStr = now.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const timeStr = now.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  })

  if (loading) {
    return <div className="loading">Caricamento prodotti…</div>
  }

  return (
    <>
      {/* AREA NORMALE (nascosta in stampa) */}
      <div className="no-print">
        <div className="list-table">
          <div className="list-header">
            <div className="col-prod">Prodotto</div>
            <div className="col-num">Qta presente</div>
            <div className="col-num">Qta necessaria</div>
            <div className="col-num">Qta mancante</div>
          </div>

          {prodotti.length === 0 && (
            <div className="empty-state">
              Nessun prodotto configurato. Vai nel tab Admin per aggiungerli.
            </div>
          )}

          {prodotti.map((p) => {
            const presente = quantitaPresente[p.id] ?? (p.qta_necessaria || 0)
            const mancante = calcMancante(p.qta_necessaria, presente)
            return (
              <div className="list-row" key={p.id}>
                <div className="prod-name">{p.nome}</div>
                <select
                  className="qta-select"
                  value={presente}
                  onChange={(e) => setPresente(p.id, e.target.value)}
                >
                  {Array.from({ length: 200 }, (_, i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
                <div className="qta-fissa">{p.qta_necessaria || 0}</div>
                <div className={`qta-computed${mancante > 0 ? ' qta-computed--alert' : ''}`}>
                  {mancante}
                </div>
              </div>
            )
          })}

          {/* Righe libere */}
          {righeLibere.map((r) => {
            const mancante = calcMancante(r.qtaNecessaria, r.qtaPresente)
            return (
              <div className="list-row row-libera" key={r.id}>
                <input
                  className="prod-input"
                  type="text"
                  placeholder="Scrittura libera…"
                  value={r.nome}
                  onChange={(e) => updateRigaLibera(r.id, 'nome', e.target.value)}
                />
                <select
                  className="qta-select"
                  value={r.qtaPresente}
                  onChange={(e) => updateRigaLibera(r.id, 'qtaPresente', e.target.value)}
                >
                  {Array.from({ length: 100 }, (_, i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
                <select
                  className="qta-select"
                  value={r.qtaNecessaria}
                  onChange={(e) => updateRigaLibera(r.id, 'qtaNecessaria', e.target.value)}
                >
                  {Array.from({ length: 100 }, (_, i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
                <div className={`qta-computed${mancante > 0 ? ' qta-computed--alert' : ''}`}>
                  {mancante}
                </div>
              </div>
            )
          })}
        </div>

        <button className="add-row-btn" onClick={addRigaLibera}>
          + Aggiungi linea
        </button>

        <div className="controllo-footer">
          <div className="field-group">
            <label>Data e ora</label>
            <div className="datetime-display">
              {dateStr} — {timeStr}
            </div>
          </div>

          <div className="field-group">
            <label>Nome controllore</label>
            <input
              className="text-input"
              type="text"
              placeholder="Es. Mario Rossi"
              value={nomeControllore}
              onChange={(e) => setNomeControllore(e.target.value)}
            />
          </div>

          <button className="btn-stampa" onClick={handleStampa}>
            🖨 Stampa
          </button>
        </div>
      </div>

      {/* AREA STAMPA (visibile solo in stampa) */}
      <div className="print-only print-area">
        <div className="print-header">
          <h1>ARCOBALENO — Controllo Magazzino</h1>
          <div>Pizzeria · Ristorante</div>
          {negozio && (
            <div style={{ marginTop: 6, fontWeight: 700, fontSize: 16 }}>
              {negozio === 'centralcash' ? 'CentralCash' : 'IperTosano'}
            </div>
          )}
        </div>
        <div className="print-meta">
          <div>
            <strong>Data:</strong> {dateStr} — {timeStr}
          </div>
          <div>
            <strong>Controllore:</strong> {nomeControllore || '—'}
          </div>
        </div>
        <table className="print-table">
          <thead>
            <tr>
              <th>Prodotto</th>
              <th className="num">Qta mancante</th>
              <th className="num">Qta necessaria</th>
            </tr>
          </thead>
          <tbody>
            {righeDaStampareRef.current.map((r, idx) => (
              <tr key={idx}>
                <td>
                  {r.nome}
                  {r.libera ? ' *' : ''}
                </td>
                <td className="num">{r.qta_mancante}</td>
                <td className="num">{r.qta_necessaria}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ marginTop: 20, fontSize: 12, color: '#555' }}>
          * = riga aggiunta manualmente
        </p>
      </div>

      {toast && <div className="toast no-print">{toast}</div>}
    </>
  )
}
