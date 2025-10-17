-- Create payment_methods table for storing bank/payment accounts
-- Dynamic & flexible payment methods management

CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Payment Method Details
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_holder TEXT NOT NULL,
    
    -- Display & Status
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for payment_methods table
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read active payment methods
CREATE POLICY "Anyone can read active payment methods"
ON payment_methods FOR SELECT
USING (is_active = true);

-- Policy: Authenticated users can read all payment methods (including inactive)
CREATE POLICY "Authenticated users can read all payment methods"
ON payment_methods FOR SELECT
USING (auth.role() = 'authenticated');

-- Policy: Only authenticated users can insert payment methods
CREATE POLICY "Authenticated users can insert payment methods"
ON payment_methods FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Policy: Only authenticated users can update payment methods
CREATE POLICY "Authenticated users can update payment methods"
ON payment_methods FOR UPDATE
USING (auth.role() = 'authenticated');

-- Policy: Only authenticated users can delete payment methods
CREATE POLICY "Authenticated users can delete payment methods"
ON payment_methods FOR DELETE
USING (auth.role() = 'authenticated');

-- Insert default payment methods (existing 4 banks)
INSERT INTO payment_methods (bank_name, account_number, account_holder, sort_order, is_active) VALUES
('SeaBank', '901307925714', 'TAUFIQ AZIZ', 1, true),
('BCA', '3621053653', 'TAUFIQ AZIZ', 2, true),
('BSI', '7211806138', 'TAUFIQ AZIZ', 3, true),
('DANA', '089609497390', 'TAUFIQ AZIZ', 4, true)
ON CONFLICT (id) DO NOTHING;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_payment_methods_active ON payment_methods(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_payment_methods_sort ON payment_methods(sort_order ASC);

-- Verify
SELECT id, bank_name, account_number, account_holder, sort_order, is_active, created_at 
FROM payment_methods 
ORDER BY sort_order ASC;
