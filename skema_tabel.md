Skema tabel di Supabase dibawah ini
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  description text NOT NULL,
  amount numeric NOT NULL,
  expense_date date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT expenses_pkey PRIMARY KEY (id)
);
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  package_id integer,
  invoice_period text NOT NULL,
  amount numeric NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'unpaid'::invoice_status,
  due_date date,
  paid_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  total_due numeric,
  amount_paid numeric DEFAULT 0,
  payment_history jsonb DEFAULT '[]'::jsonb,
  last_payment_date timestamp with time zone,
  payment_method text DEFAULT 'cash'::text,
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.packages(id),
  CONSTRAINT invoices_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.packages (
  id integer NOT NULL DEFAULT nextval('packages_id_seq'::regclass),
  package_name text NOT NULL,
  price numeric NOT NULL,
  speed_mbps integer,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT packages_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  idpl text UNIQUE,
  full_name text,
  address text,
  gender text,
  whatsapp_number text,
  role text NOT NULL DEFAULT 'USER'::text,
  photo_url text,
  status USER-DEFINED DEFAULT 'AKTIF'::customer_status,
  installation_date date,
  device_type text,
  ip_static_pppoe text,
  created_at timestamp with time zone DEFAULT now(),
  churn_date date,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);