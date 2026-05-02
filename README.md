# Arcobaleno — Controllo Magazzino

Webapp per gestire il controllo del magazzino di Pizzeria/Ristorante Arcobaleno. Utilizzabile principalmente da iPad.

## Funzionalità

### Tab Controllo (libero)
- Lista prodotti con `Qta mancante` (tendina 0-99) e `Qta necessaria` (sola lettura)
- Righe libere a fondo lista (con tasto "+ Aggiungi linea")
- Data e ora correnti automatiche
- Campo nome controllore
- Tasto **Stampa** che lancia il dialog stampa del browser e salva il controllo nello storico
- Le quantità mancanti si azzerano automaticamente dopo la stampa

### Tab Admin (password: `Arco2026`)
- Aggiungere/modificare/eliminare prodotti
- Riordinare prodotti (frecce su/giù)
- Modificare la `Qta necessaria` di ogni prodotto
- Storico completo dei controlli stampati (espandibile)

## Stack tecnologico

- React 18 + Vite
- Supabase (database)
- Vercel (deploy)

---

## Setup Supabase

1. Crea un nuovo progetto su [supabase.com](https://supabase.com).
2. Vai in **SQL Editor** e lancia questo script per creare le tabelle:

```sql
-- Tabella prodotti
create table prodotti (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  qta_necessaria int default 0,
  ordine int default 0,
  created_at timestamptz default now()
);

-- Tabella storico controlli
create table controlli_storico (
  id uuid primary key default gen_random_uuid(),
  data_ora timestamptz default now(),
  nome_controllore text not null,
  righe jsonb not null
);

-- Abilita RLS e crea policy permissive (uso interno)
alter table prodotti enable row level security;
alter table controlli_storico enable row level security;

create policy "public read prodotti" on prodotti for select using (true);
create policy "public write prodotti" on prodotti for insert with check (true);
create policy "public update prodotti" on prodotti for update using (true);
create policy "public delete prodotti" on prodotti for delete using (true);

create policy "public read storico" on controlli_storico for select using (true);
create policy "public write storico" on controlli_storico for insert with check (true);
create policy "public delete storico" on controlli_storico for delete using (true);
```

3. Copia da **Project Settings → API**:
   - `Project URL`
   - `anon public` key

---

## Setup locale

1. Clona il repo e installa le dipendenze:
   ```bash
   npm install
   ```
2. Crea il file `.env.local` partendo da `.env.example`:
   ```
   VITE_SUPABASE_URL=https://tuoprogetto.supabase.co
   VITE_SUPABASE_ANON_KEY=la-tua-anon-key
   ```
3. Avvia in dev:
   ```bash
   npm run dev
   ```

---

## Deploy su Vercel

1. Pusha il repo su GitHub.
2. Su Vercel, crea un nuovo progetto importando il repo GitHub.
3. In **Settings → Environment Variables** aggiungi:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. Il file `vercel.json` già incluso gestisce le rewrite SPA.

---

## Note d'uso su iPad

- Aggiungi il sito alla schermata Home da Safari → "Aggiungi a Home" per averla come app fullscreen.
- La stampa via AirPrint funziona dal dialog di stampa nativo del browser.
- Tap targets dimensionati per uso touch.

## Struttura prodotti consigliata

Aggiungi i prodotti nel tab Admin nell'ordine in cui vuoi vederli nella lista (frecce ▲▼ per riordinare). Esempi: Latte, Mirtilli, Mozzarella, Pomodoro, Olio, ecc.
