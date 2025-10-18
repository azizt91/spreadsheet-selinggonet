-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  app_name text NOT NULL DEFAULT 'Selinggonet'::text,
  app_short_name text NOT NULL DEFAULT 'Selinggonet'::text,
  app_description text DEFAULT 'Sistem manajemen pelanggan ISP'::text,
  app_tagline text DEFAULT 'Kelola pelanggan dengan mudah'::text,
  logo_url text NOT NULL DEFAULT 'assets/logo_192x192.png'::text,
  favicon_url text NOT NULL DEFAULT 'assets/logo_192x192.png'::text,
  icon_192_url text DEFAULT 'assets/logo_192x192.png'::text,
  icon_512_url text DEFAULT 'assets/logo_512x512.png'::text,
  whatsapp_number text DEFAULT '6281914170701'::text,
  support_email text DEFAULT 'support@selinggonet.com'::text,
  office_address text DEFAULT ''::text,
  offline_payment_name text DEFAULT 'Bapak Karsadi dan Ibu Sopiyah'::text,
  offline_payment_address text DEFAULT 'Dukuh Sekiyong RT 04/RW 07, Desa Pamutih'::text,
  qris_image_url text DEFAULT 'assets/qris.jpeg'::text,
  show_qris boolean DEFAULT true,
  theme_color text DEFAULT '#6a5acd'::text,
  background_color text DEFAULT '#f8f9fe'::text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT app_settings_pkey PRIMARY KEY (id)
);
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
CREATE TABLE public.notification_reads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL,
  user_id uuid NOT NULL,
  read_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notification_reads_pkey PRIMARY KEY (id),
  CONSTRAINT notification_reads_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id),
  CONSTRAINT notification_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  recipient_role text,
  recipient_user_id uuid,
  url text,
  created_at timestamp with time zone DEFAULT now(),
  type text,
  data jsonb DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES public.profiles(id)
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
CREATE TABLE public.payment_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_holder text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT payment_methods_pkey PRIMARY KEY (id)
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
  package_id integer,
  latitude numeric,
  longitude numeric,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT profiles_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.packages(id)
);
CREATE TABLE public.whatsapp_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value text,
  is_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT whatsapp_settings_pkey PRIMARY KEY (id)
);