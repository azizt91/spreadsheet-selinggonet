-- =====================================================
-- DATABASE FUNCTIONS UNTUK FITUR CICILAN PEMBAYARAN
-- Selinggonet - Functions untuk Handle Cicilan
-- =====================================================

-- FUNCTION 1: Process Installment Payment
-- Function ini akan memproses pembayaran cicilan dengan aman
CREATE OR REPLACE FUNCTION process_installment_payment(
    p_invoice_id UUID,
    p_payment_amount NUMERIC,
    p_admin_name TEXT,
    p_payment_method TEXT DEFAULT 'cash',
    p_note TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_invoice RECORD;
    new_amount_paid NUMERIC;
    new_remaining_amount NUMERIC;
    new_status TEXT;
    new_history_entry JSONB;
    current_history JSONB;
    result_message TEXT;
BEGIN
    -- Ambil data invoice saat ini
    SELECT 
        id, total_due, amount_paid, amount, status, payment_history,
        customer_id, invoice_period
    INTO current_invoice
    FROM public.invoices
    WHERE id = p_invoice_id;

    -- Validasi: Invoice harus ada
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Invoice tidak ditemukan'
        );
    END IF;

    -- Validasi: Invoice tidak boleh sudah lunas
    IF current_invoice.status = 'paid' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Invoice sudah lunas, tidak bisa dibayar lagi'
        );
    END IF;

    -- Validasi: Amount tidak boleh 0 atau negatif
    IF p_payment_amount <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Jumlah pembayaran harus lebih dari 0'
        );
    END IF;

    -- Validasi: Amount tidak boleh melebihi sisa tagihan
    IF p_payment_amount > current_invoice.amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Jumlah pembayaran melebihi sisa tagihan (Rp ' || 
                      TO_CHAR(current_invoice.amount, 'FM999,999,999') || ')'
        );
    END IF;

    -- Hitung nilai baru
    new_amount_paid := current_invoice.amount_paid + p_payment_amount;
    new_remaining_amount := current_invoice.total_due - new_amount_paid;
    
    -- Tentukan status baru
    IF new_remaining_amount <= 0 THEN
        new_status := 'paid';
        new_remaining_amount := 0; -- Pastikan tidak minus
        result_message := 'Pembayaran berhasil! Invoice telah LUNAS.';
    ELSE
        new_status := 'partially_paid';
        result_message := 'Pembayaran cicilan berhasil. Sisa tagihan: Rp ' || 
                         TO_CHAR(new_remaining_amount, 'FM999,999,999');
    END IF;

    -- Buat entri riwayat pembayaran baru
    new_history_entry := jsonb_build_object(
        'amount', p_payment_amount,
        'date', NOW(),
        'admin', p_admin_name,
        'method', p_payment_method,
        'note', p_note,
        'remaining_after_payment', new_remaining_amount
    );

    -- Gabungkan dengan riwayat yang sudah ada
    current_history := COALESCE(current_invoice.payment_history, '[]'::jsonb);
    current_history := current_history || new_history_entry;

    -- Update invoice di database
    UPDATE public.invoices
    SET 
        amount = new_remaining_amount,           -- Sisa tagihan
        amount_paid = new_amount_paid,           -- Total terbayar
        status = new_status::invoice_status,     -- Status baru
        payment_history = current_history,       -- Riwayat lengkap
        last_payment_date = NOW(),               -- Tanggal pembayaran terakhir
        payment_method = p_payment_method,       -- <-- PERBAIKAN DI SINI
        paid_at = CASE 
            WHEN new_status = 'paid' THEN NOW() 
            ELSE paid_at 
        END
    WHERE id = p_invoice_id;

    -- Return hasil sukses
    RETURN jsonb_build_object(
        'success', true,
        'message', result_message,
        'data', jsonb_build_object(
            'invoice_id', p_invoice_id,
            'payment_amount', p_payment_amount,
            'total_paid', new_amount_paid,
            'remaining_amount', new_remaining_amount,
            'new_status', new_status,
            'invoice_period', current_invoice.invoice_period
        )
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Error: ' || SQLERRM
        );
END;
$$;

-- FUNCTION 2: Get Payment History
-- Function untuk mengambil riwayat pembayaran invoice
CREATE OR REPLACE FUNCTION get_payment_history(p_invoice_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    invoice_data RECORD;
    history_result JSONB;
BEGIN
    -- Ambil data invoice dan history
    SELECT 
        id, total_due, amount_paid, amount, status, 
        payment_history, invoice_period,
        p.full_name as customer_name
    INTO invoice_data
    FROM public.invoices i
    LEFT JOIN public.profiles p ON i.customer_id = p.id
    WHERE i.id = p_invoice_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Invoice tidak ditemukan'
        );
    END IF;

    -- Format hasil
    history_result := jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'invoice_id', invoice_data.id,
            'customer_name', invoice_data.customer_name,
            'invoice_period', invoice_data.invoice_period,
            'total_due', invoice_data.total_due,
            'amount_paid', invoice_data.amount_paid,
            'remaining_amount', invoice_data.amount,
            'status', invoice_data.status,
            'payment_history', COALESCE(invoice_data.payment_history, '[]'::jsonb)
        )
    );

    RETURN history_result;
END;
$$;

-- FUNCTION 3: Get Invoices with Payment Info
-- Function untuk mengambil daftar invoice dengan info pembayaran lengkap
CREATE OR REPLACE FUNCTION get_invoices_with_payment_info(
    p_status TEXT DEFAULT 'all',
    p_customer_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    customer_id UUID,
    customer_name TEXT,
    whatsapp_number TEXT,
    invoice_period TEXT,
    total_due NUMERIC,
    amount_paid NUMERIC,
    remaining_amount NUMERIC,
    status invoice_status,
    due_date DATE,
    last_payment_date TIMESTAMP WITH TIME ZONE,
    payment_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id,
        i.customer_id,
        p.full_name as customer_name,
        p.whatsapp_number,
        i.invoice_period,
        i.total_due,
        i.amount_paid,
        i.amount as remaining_amount,
        i.status,
        i.due_date,
        i.last_payment_date,
        COALESCE(jsonb_array_length(i.payment_history), 0)::INTEGER as payment_count,
        i.created_at
    FROM public.invoices i
    LEFT JOIN public.profiles p ON i.customer_id = p.id
    WHERE 
        (p_status = 'all' OR i.status::TEXT = p_status) AND
        (p_customer_id IS NULL OR i.customer_id = p_customer_id)
    ORDER BY 
        CASE 
            WHEN i.status = 'unpaid' THEN 1
            WHEN i.status = 'partially_paid' THEN 2
            WHEN i.status = 'overdue' THEN 3
            WHEN i.status = 'paid' THEN 4
        END,
        i.created_at DESC;
END;
$$;

-- Grant permissions untuk functions
GRANT EXECUTE ON FUNCTION process_installment_payment(UUID, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_payment_history(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_invoices_with_payment_info(TEXT, UUID) TO authenticated;

-- =====================================================
-- FUNCTIONS CREATED SUCCESSFULLY
-- =====================================================
-- Functions yang telah dibuat:
-- 1. process_installment_payment() - Proses pembayaran cicilan
-- 2. get_payment_history() - Ambil riwayat pembayaran
-- 3. get_invoices_with_payment_info() - Ambil daftar invoice lengkap
-- =====================================================
