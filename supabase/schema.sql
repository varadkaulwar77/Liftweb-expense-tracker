-- ============================================================
-- LiftWEB Studio Business Tracker — Database Schema (V1)
-- Run this in the Supabase SQL editor for a fresh project.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- settings (single row table)
-- ------------------------------------------------------------
create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  business_name text not null default 'LiftWEB Studio',
  logo_url text,
  phone text,
  email text,
  default_small_stand_price numeric(10,2) default 0,
  default_large_stand_price numeric(10,2) default 0,
  default_nfc_card_price numeric(10,2) default 0,
  invoice_prefix text default 'LWS',
  invoice_counter integer default 0,
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------
-- clients
-- ------------------------------------------------------------
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  owner_name text,
  phone text,
  address text,
  google_review_link text,
  instagram text,
  notes text,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- products (catalog: Small NFC Stand, Large NFC Stand, NFC Card, ...)
-- ------------------------------------------------------------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  inventory_key text, -- links to inventory.item_key, e.g. 'small_stand'
  selling_price numeric(10,2) not null default 0,
  stand_cost numeric(10,2) not null default 0,
  printing_cost numeric(10,2) not null default 0,
  nfc_tag_cost numeric(10,2) not null default 0,
  sticker_cost numeric(10,2) not null default 0,
  other_cost numeric(10,2) not null default 0,
  active boolean default true,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- orders
-- ------------------------------------------------------------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique,
  client_id uuid references clients(id) on delete set null,
  status text not null default 'Confirmed'
    check (status in ('Confirmed','Delivered')),
  advance_paid numeric(10,2) not null default 0,
  extra_charges numeric(10,2) not null default 0,
  payment_status text not null default 'Pending'
    check (payment_status in ('Pending','Partial','Paid')),
  notes text,
  order_date date not null default current_date,
  delivered_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------
-- order_items (line items per order)
-- ------------------------------------------------------------
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null, -- snapshot in case product is edited later
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(10,2) not null default 0,   -- snapshot of selling price
  unit_cost numeric(10,2) not null default 0,    -- snapshot of manufacturing cost
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- expenses
-- ------------------------------------------------------------
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  category text not null
    check (category in ('Printing','NFC Tags','Small Stands','Large Stands','3M Sticker','NFC Cards','Packaging Box','Travel','Others')),
  description text,
  amount numeric(10,2) not null default 0,
  quantity integer, -- pieces purchased, only set for stock-buying categories; auto-added to inventory
  expense_date date not null default current_date,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- inventory (only tracked items)
-- ------------------------------------------------------------
create table if not exists inventory (
  id uuid primary key default gen_random_uuid(),
  item_key text unique not null check (item_key in ('small_stand','large_stand','nfc_tag','sticker','nfc_card','packaging_box')),
  item_name text not null,
  quantity integer not null default 0,
  low_stock_threshold integer default 5,
  updated_at timestamptz default now()
);

insert into inventory (item_key, item_name, quantity)
values
  ('small_stand', 'Small Stands', 0),
  ('large_stand', 'Large Stands', 0),
  ('nfc_tag', 'NFC Tags', 0),
  ('sticker', '3M Stickers', 0),
  ('nfc_card', 'NFC Cards', 0),
  ('packaging_box', 'Packaging Boxes', 0)
on conflict (item_key) do nothing;

insert into settings (business_name)
select 'LiftWEB Studio'
where not exists (select 1 from settings);

-- ------------------------------------------------------------
-- invoices (generated per order)
-- ------------------------------------------------------------
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  invoice_number text unique not null,
  issued_at timestamptz default now()
);

-- ------------------------------------------------------------
-- Helpful indexes
-- ------------------------------------------------------------
create index if not exists idx_orders_client on orders(client_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_order_items_order on order_items(order_id);
create index if not exists idx_expenses_date on expenses(expense_date);

-- ------------------------------------------------------------
-- updated_at trigger helper
-- ------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_orders_updated_at on orders;
create trigger trg_orders_updated_at
before update on orders
for each row execute function set_updated_at();

-- ============================================================
-- Row Level Security
-- Single admin user model: any authenticated user (you, the
-- studio owner) has full access. No public/anon access.
-- ============================================================
alter table clients enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table expenses enable row level security;
alter table inventory enable row level security;
alter table settings enable row level security;
alter table invoices enable row level security;

drop policy if exists "authenticated full access" on clients;
create policy "authenticated full access" on clients
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on products;
create policy "authenticated full access" on products
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on orders;
create policy "authenticated full access" on orders
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on order_items;
create policy "authenticated full access" on order_items
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on expenses;
create policy "authenticated full access" on expenses
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on inventory;
create policy "authenticated full access" on inventory
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on settings;
create policy "authenticated full access" on settings
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access" on invoices;
create policy "authenticated full access" on invoices
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');