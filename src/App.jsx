import { useState } from 'react'
import Controllo from './components/Controllo.jsx'
import Admin from './components/Admin.jsx'

const LOGO_BASE64 = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2M4MTAyZSIvPjx0ZXh0IHg9IjUwIiB5PSI2MCIgZm9udC1mYW1pbHk9InNlcmlmIiBmb250LXNpemU9IjUwIiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkE8L3RleHQ+PC9zdmc+'

const NEGOZI = [
  { id: 'centralcash', label: 'CentralCash' },
  { id: 'ipertosano', label: 'IperTosano' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('controllo')
  const [adminAuth, setAdminAuth] = useState(false)
  const [activeNegozio, setActiveNegozio] = useState('centralcash')

  const showSubTabs = activeTab === 'controllo' || (activeTab === 'admin' && adminAuth)

  return (
    <div className="app">
      <header className="header no-print">
        <h1>ARCOBALENO · Controllo Magazzino</h1>
        <div className="subtitle">Pizzeria · Ristorante</div>
      </header>

      <nav className="tabs no-print">
        <button
          className={`tab ${activeTab === 'controllo' ? 'active' : ''}`}
          onClick={() => setActiveTab('controllo')}
        >
          Controllo
        </button>
        <button
          className={`tab ${activeTab === 'admin' ? 'active' : ''}`}
          onClick={() => setActiveTab('admin')}
        >
          Admin
        </button>
      </nav>

      {showSubTabs && (
        <nav className="subtabs no-print">
          {NEGOZI.map((n) => (
            <button
              key={n.id}
              className={`subtab ${activeNegozio === n.id ? 'active' : ''}`}
              onClick={() => setActiveNegozio(n.id)}
            >
              {n.label}
            </button>
          ))}
        </nav>
      )}

      {activeTab === 'controllo' && <Controllo logo={LOGO_BASE64} negozio={activeNegozio} />}
      {activeTab === 'admin' && (
        <Admin
          isAuth={adminAuth}
          onAuth={() => setAdminAuth(true)}
          onLogout={() => { setAdminAuth(false) }}
          negozio={activeNegozio}
        />
      )}
    </div>
  )
}
