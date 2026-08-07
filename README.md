# LiftWEB Studio — Business Tracker (V1)

A simple, fast, beautiful internal tool to manage LiftWEB Studio's NFC stand
business: orders, clients, products, expenses, inventory, and invoices —
built to run entirely on free-tier infrastructure.

## Stack

- React (Vite) + Tailwind CSS v4 + React Router + Framer Motion
- Supabase (Postgres + Auth) — free tier
- Recharts for dashboard charts
- jsPDF + jspdf-autotable for invoices
- Deploy target: Vercel (free)

## 1. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** and run the contents of `supabase/schema.sql`.
   This creates every table (`clients`, `products`, `orders`, `order_items`,
   `expenses`, `inventory`, `invoices`, `settings`), seeds the 5 inventory
   rows and a default settings row, and turns on Row Level Security so only
   your logged-in account can read/write data.
3. Go to **Authentication → Users** and manually create your one admin
   user (email + password). This app is single-admin — no public sign-up
   screen is included on purpose.
4. Go to **Project Settings → API** and copy your **Project URL** and
   **anon public key**.

## 2. Configure the app

```bash
cp .env.example .env
```

Fill in `.env`:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

## 3. Run locally

```bash
npm install
npm run dev
```

Visit the printed local URL and sign in with the admin user you created in
Supabase.

## 4. Add your product catalog

Once logged in, go to **Products** and add your three products (Small NFC
Stand, Large NFC Stand, NFC Card) with their selling price and cost
breakdown. The app calculates manufacturing cost, profit, and margin % for
you automatically — everywhere those numbers are used (Products, Orders,
Dashboard).

## 5. Deploy to Vercel (free)

1. Push this project to a GitHub repo.
2. Import it in [vercel.com](https://vercel.com).
3. Add the two environment variables from your `.env` in the Vercel
   project settings.
4. Deploy. Vercel auto-detects Vite.

## How the numbers work

- **Manufacturing Cost** = Stand + Printing + NFC Tag + 3M Sticker + Other
  cost, all set per product in **Products**.
- **Profit** = Selling Price − Manufacturing Cost (per product), and
  Subtotal − Cost (per order).
- **Remaining** = Grand Total − Advance Paid, and **Payment Status**
  (Pending / Partial / Paid) is derived from that automatically.
- **Inventory** decreases automatically the moment an order's status is
  changed to **Delivered** — it looks at each line item's linked
  inventory item and subtracts the ordered quantity once.
- **Invoices** are generated on demand from an order: the first time you
  download/print/share an order's invoice, a permanent invoice number is
  assigned (using the prefix + counter from **Settings**) and reused after
  that.

## Project structure

```
src/
  components/
    layout/      Sidebar, Topbar, Layout shell
    ui/          Card, Button, Modal, Table, Badge, Toast, Skeletons, EmptyState...
  context/       AuthContext (Supabase session), ToastContext
  lib/           supabase client, calc.js (all money math), format.js, invoice.js (PDF)
  pages/         Dashboard, Orders, Clients, Products, Expenses, Inventory, Invoices, Settings
  routes/        ProtectedRoute
supabase/
  schema.sql     Full DB schema, seed data, RLS policies
```

## Deliberately not included (V1)

Employee roles, CRM, QR generator, NFC landing pages, WhatsApp API,
GST/tax handling, and complex reporting are left out on purpose to keep
this fast and simple to run day-to-day. These are natural additions for a
V2 once the daily workflow is proven out.
