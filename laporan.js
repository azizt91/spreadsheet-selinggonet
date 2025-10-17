// laporan.js - Comprehensive Reports Module
import { supabase } from './supabase-client.js';
import { requireRole } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Laporan page loaded');

    // Check authentication
    try {
        const user = await requireRole('ADMIN');
        if (!user) {
            console.log('Authentication failed');
            return;
        }
    } catch (error) {
        console.error('Authentication error:', error);
        return;
    }

    // Global variables
    let allInvoices = [];
    let allExpenses = [];
    let filteredInvoices = [];
    let filteredExpenses = [];
    let combinedData = []; // Gabungan invoices dan expenses untuk display
    let currentFilters = {
        periode: 'all',
        status: 'all',
        paymentMethod: 'all',
        customerSearch: '',
        startDate: null,
        endDate: null,
        includeExpenses: true // Toggle untuk include/exclude expenses
    };

    // DOM Elements
    const backBtn = document.getElementById('back-btn');
    const filterBtn = document.getElementById('filter-btn');
    const filterModal = document.getElementById('filter-modal');
    const closeFilterModal = document.getElementById('close-filter-modal');
    const periodeFilter = document.getElementById('periode-filter');
    const customDateRange = document.getElementById('custom-date-range');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const statusFilter = document.getElementById('status-filter');
    const paymentMethodFilter = document.getElementById('payment-method-filter');
    const customerSearch = document.getElementById('customer-search');
    const resetFilterBtn = document.getElementById('reset-filter-btn');
    const applyFilterBtn = document.getElementById('apply-filter-btn');
    const filterBadge = document.getElementById('filter-badge');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    const exportExcelBtn = document.getElementById('export-excel-btn');
    const loadingState = document.getElementById('loading-state');
    const tableContainer = document.getElementById('table-container');
    const tableBody = document.getElementById('table-body');
    const emptyState = document.getElementById('empty-state');
    const dataCount = document.getElementById('data-count');

    // Summary elements
    const totalPendapatan = document.getElementById('total-pendapatan');
    const totalTransaksi = document.getElementById('total-transaksi');
    const totalLunas = document.getElementById('total-lunas');
    const countLunas = document.getElementById('count-lunas');
    const totalUnpaid = document.getElementById('total-unpaid');
    const countUnpaid = document.getElementById('count-unpaid');
    const totalInstallment = document.getElementById('total-installment');
    const countInstallment = document.getElementById('count-installment');
    const totalPengeluaran = document.getElementById('total-pengeluaran');
    const countPengeluaran = document.getElementById('count-pengeluaran');

    // Currency formatter
    const formatter = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    });

    // ============================================
    // Event Listeners
    // ============================================

    backBtn.addEventListener('click', () => {
        window.history.back();
    });

    filterBtn.addEventListener('click', () => {
        filterModal.classList.remove('hidden');
    });

    closeFilterModal.addEventListener('click', () => {
        filterModal.classList.add('hidden');
    });

    // Close modal when clicking outside
    filterModal.addEventListener('click', (e) => {
        if (e.target === filterModal) {
            filterModal.classList.add('hidden');
        }
    });

    periodeFilter.addEventListener('change', () => {
        if (periodeFilter.value === 'custom') {
            customDateRange.classList.remove('hidden');
        } else {
            customDateRange.classList.add('hidden');
        }
    });

    resetFilterBtn.addEventListener('click', () => {
        resetFilters();
    });

    applyFilterBtn.addEventListener('click', () => {
        applyFilters();
        filterModal.classList.add('hidden');
    });

    exportPdfBtn.addEventListener('click', () => {
        exportToPDF();
    });

    exportExcelBtn.addEventListener('click', () => {
        exportToExcel();
    });

    // ============================================
    // Data Fetching
    // ============================================

    async function fetchData() {
        try {
            showLoading();

            // Fetch all invoices with customer profiles
            const { data: invoices, error: invoiceError } = await supabase
                .from('invoices')
                .select(`
                    *,
                    profiles:customer_id (
                        full_name,
                        idpl
                    )
                `)
                .order('created_at', { ascending: false });

            if (invoiceError) throw invoiceError;

            // Fetch all expenses
            const { data: expenses, error: expenseError } = await supabase
                .from('expenses')
                .select('*')
                .order('expense_date', { ascending: false });

            if (expenseError) throw expenseError;

            allInvoices = invoices || [];
            allExpenses = expenses || [];
            filteredInvoices = [...allInvoices];
            filteredExpenses = [...allExpenses];

            console.log(`Loaded ${allInvoices.length} invoices and ${allExpenses.length} expenses`);

            updateDisplay();
            hideLoading();

        } catch (error) {
            console.error('Error fetching data:', error);
            hideLoading();
            showError('Gagal memuat data: ' + error.message);
        }
    }

    // ============================================
    // Filtering Functions
    // ============================================

    function applyFilters() {
        // Get filter values
        currentFilters.periode = periodeFilter.value;
        currentFilters.status = statusFilter.value;
        currentFilters.paymentMethod = paymentMethodFilter.value;
        currentFilters.customerSearch = customerSearch.value.trim().toLowerCase();
        currentFilters.startDate = startDateInput.value;
        currentFilters.endDate = endDateInput.value;

        // Start with all invoices
        filteredInvoices = [...allInvoices];

        // Apply periode filter
        if (currentFilters.periode !== 'all') {
            filteredInvoices = filteredInvoices.filter(invoice => {
                const createdDate = new Date(invoice.created_at);
                const now = new Date();

                switch (currentFilters.periode) {
                    case 'bulan-ini':
                        return createdDate.getMonth() === now.getMonth() && 
                               createdDate.getFullYear() === now.getFullYear();
                    case 'bulan-lalu':
                        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                        return createdDate.getMonth() === lastMonth.getMonth() && 
                               createdDate.getFullYear() === lastMonth.getFullYear();
                    case '3-bulan':
                        const threeMonthsAgo = new Date(now.setMonth(now.getMonth() - 3));
                        return createdDate >= threeMonthsAgo;
                    case '6-bulan':
                        const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 6));
                        return createdDate >= sixMonthsAgo;
                    case 'tahun-ini':
                        return createdDate.getFullYear() === now.getFullYear();
                    case 'custom':
                        if (currentFilters.startDate && currentFilters.endDate) {
                            const start = new Date(currentFilters.startDate);
                            const end = new Date(currentFilters.endDate);
                            end.setHours(23, 59, 59); // Include the whole end date
                            return createdDate >= start && createdDate <= end;
                        }
                        return true;
                    default:
                        return true;
                }
            });
        }

        // Apply status filter
        if (currentFilters.status !== 'all') {
            filteredInvoices = filteredInvoices.filter(invoice => 
                invoice.status === currentFilters.status
            );
        }

        // Apply payment method filter
        if (currentFilters.paymentMethod !== 'all') {
            filteredInvoices = filteredInvoices.filter(invoice => {
                if (invoice.status === 'paid' || invoice.status === 'installment') {
                    const method = invoice.payment_method?.toLowerCase() || '';
                    return method.includes(currentFilters.paymentMethod.toLowerCase());
                }
                return false;
            });
        }

        // Apply customer search filter
        if (currentFilters.customerSearch) {
            filteredInvoices = filteredInvoices.filter(invoice => {
                const customerName = invoice.profiles?.full_name?.toLowerCase() || '';
                const customerIdpl = invoice.profiles?.idpl?.toLowerCase() || '';
                return customerName.includes(currentFilters.customerSearch) || 
                       customerIdpl.includes(currentFilters.customerSearch);
            });
        }

        // ============================================
        // Filter expenses by periode (same logic as invoices)
        // ============================================
        filteredExpenses = [...allExpenses];

        if (currentFilters.periode !== 'all') {
            filteredExpenses = filteredExpenses.filter(expense => {
                const expenseDate = new Date(expense.expense_date);
                const now = new Date();

                switch (currentFilters.periode) {
                    case 'bulan-ini':
                        return expenseDate.getMonth() === now.getMonth() && 
                               expenseDate.getFullYear() === now.getFullYear();
                    case 'bulan-lalu':
                        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                        return expenseDate.getMonth() === lastMonth.getMonth() && 
                               expenseDate.getFullYear() === lastMonth.getFullYear();
                    case '3-bulan':
                        const threeMonthsAgo = new Date(now.setMonth(now.getMonth() - 3));
                        return expenseDate >= threeMonthsAgo;
                    case '6-bulan':
                        const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 6));
                        return expenseDate >= sixMonthsAgo;
                    case 'tahun-ini':
                        return expenseDate.getFullYear() === now.getFullYear();
                    case 'custom':
                        if (currentFilters.startDate && currentFilters.endDate) {
                            const start = new Date(currentFilters.startDate);
                            const end = new Date(currentFilters.endDate);
                            end.setHours(23, 59, 59);
                            return expenseDate >= start && expenseDate <= end;
                        }
                        return true;
                    default:
                        return true;
                }
            });
        }

        updateDisplay();
        updateFilterBadge();
    }

    function resetFilters() {
        periodeFilter.value = 'all';
        statusFilter.value = 'all';
        paymentMethodFilter.value = 'all';
        customerSearch.value = '';
        startDateInput.value = '';
        endDateInput.value = '';
        customDateRange.classList.add('hidden');

        currentFilters = {
            periode: 'all',
            status: 'all',
            paymentMethod: 'all',
            customerSearch: '',
            startDate: null,
            endDate: null
        };

        filteredInvoices = [...allInvoices];
        updateDisplay();
        updateFilterBadge();
    }

    function updateFilterBadge() {
        const activeFilters = Object.values(currentFilters).filter(val => 
            val && val !== 'all' && val !== ''
        ).length;

        if (activeFilters > 0) {
            filterBadge.textContent = activeFilters;
            filterBadge.classList.remove('hidden');
        } else {
            filterBadge.classList.add('hidden');
        }
    }

    // ============================================
    // Display Functions
    // ============================================

    function updateDisplay() {
        updateSummary();
        updateTable();
    }

    function updateSummary() {
        // Calculate totals for invoices
        const paid = filteredInvoices.filter(inv => inv.status === 'paid');
        const unpaid = filteredInvoices.filter(inv => inv.status === 'unpaid');
        const installment = filteredInvoices.filter(inv => inv.status === 'installment');

        const totalPendapatanValue = paid.reduce((sum, inv) => sum + (inv.total_due || 0), 0);
        const totalLunasValue = paid.reduce((sum, inv) => sum + (inv.total_due || 0), 0);
        const totalUnpaidValue = unpaid.reduce((sum, inv) => sum + (inv.amount || 0), 0);
        const totalInstallmentValue = installment.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);

        // Calculate totals for expenses
        const totalPengeluaranValue = filteredExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);

        // Update DOM
        totalPendapatan.textContent = formatter.format(totalPendapatanValue);
        totalTransaksi.textContent = `${paid.length} Transaksi`;

        totalLunas.textContent = formatter.format(totalLunasValue);
        countLunas.textContent = `${paid.length} Tagihan`;

        totalUnpaid.textContent = formatter.format(totalUnpaidValue);
        countUnpaid.textContent = `${unpaid.length} Tagihan`;

        totalInstallment.textContent = formatter.format(totalInstallmentValue);
        countInstallment.textContent = `${installment.length} Tagihan`;

        totalPengeluaran.textContent = formatter.format(totalPengeluaranValue);
        countPengeluaran.textContent = `${filteredExpenses.length} Pengeluaran`;
    }

    function updateTable() {
        // Combine invoices and expenses
        combinedData = [];

        // Add invoices with type 'income'
        filteredInvoices.forEach(invoice => {
            combinedData.push({
                type: 'income',
                date: invoice.paid_at || invoice.created_at,
                customerName: invoice.profiles?.full_name || 'N/A',
                customerIdpl: invoice.profiles?.idpl || 'N/A',
                description: invoice.invoice_period || '-',
                amount: invoice.status === 'paid' ? invoice.total_due : invoice.amount,
                status: invoice.status,
                paymentMethod: invoice.payment_method || '-',
                data: invoice
            });
        });

        // Add expenses with type 'expense'
        filteredExpenses.forEach(expense => {
            combinedData.push({
                type: 'expense',
                date: expense.expense_date,
                customerName: '-',
                customerIdpl: '-',
                description: expense.description || '-',
                amount: parseFloat(expense.amount) || 0,
                status: 'expense',
                paymentMethod: '-',
                data: expense
            });
        });

        // Sort by date (newest first)
        combinedData.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (combinedData.length === 0) {
            showEmptyState();
            return;
        }

        tableContainer.classList.remove('hidden');
        emptyState.classList.add('hidden');
        dataCount.textContent = `Menampilkan ${combinedData.length} data (${filteredInvoices.length} pendapatan, ${filteredExpenses.length} pengeluaran)`;

        tableBody.innerHTML = '';

        combinedData.forEach((item, index) => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50 transition-colors';

            const statusBadge = item.type === 'expense' ? 
                '<span class="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">Pengeluaran</span>' : 
                getStatusBadge(item.status);

            const displayDate = new Date(item.date).toLocaleDateString('id-ID');
            const amountText = item.type === 'expense' ? 
                `<span class="text-purple-600">-${formatter.format(item.amount)}</span>` : 
                `<span class="text-green-600">+${formatter.format(item.amount)}</span>`;

            row.innerHTML = `
                <td class="px-4 py-3 whitespace-nowrap text-gray-900 font-medium">${index + 1}</td>
                <td class="px-4 py-3 text-gray-900">${item.customerName}</td>
                <td class="px-4 py-3 text-gray-600 text-xs">${item.customerIdpl}</td>
                <td class="px-4 py-3 text-gray-900">${item.description}</td>
                <td class="px-4 py-3 font-semibold whitespace-nowrap">${amountText}</td>
                <td class="px-4 py-3">${statusBadge}</td>
                <td class="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">${displayDate}</td>
                <td class="px-4 py-3 text-gray-600 text-xs">${item.paymentMethod}</td>
            `;

            tableBody.appendChild(row);
        });
    }

    function getStatusBadge(status) {
        const badges = {
            'paid': '<span class="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">Lunas</span>',
            'unpaid': '<span class="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">Belum Bayar</span>',
            'installment': '<span class="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full">Cicilan</span>'
        };
        return badges[status] || '<span class="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full">Unknown</span>';
    }

    function showLoading() {
        loadingState.classList.remove('hidden');
        tableContainer.classList.add('hidden');
        emptyState.classList.add('hidden');
    }

    function hideLoading() {
        loadingState.classList.add('hidden');
    }

    function showEmptyState() {
        emptyState.classList.remove('hidden');
        tableContainer.classList.add('hidden');
        dataCount.textContent = 'Menampilkan 0 data';
    }

    function showError(message) {
        alert(message);
    }

    // ============================================
    // Export Functions
    // ============================================

    function exportToPDF() {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Add title
            doc.setFontSize(18);
            doc.setFont(undefined, 'bold');
            doc.text('LAPORAN KEUANGAN', 14, 15);

            // Add date
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 22);

            // Add summary
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.text('RINGKASAN:', 14, 32);
            
            doc.setFont(undefined, 'normal');
            const paidTotal = filteredInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.total_due || 0), 0);
            const unpaidTotal = filteredInvoices.filter(inv => inv.status === 'unpaid').reduce((sum, inv) => sum + (inv.amount || 0), 0);
            const installmentTotal = filteredInvoices.filter(inv => inv.status === 'installment').reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);
            const expenseTotal = filteredExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
            const netIncome = paidTotal - expenseTotal;
            
            doc.text(`Total Pendapatan (Lunas): ${formatter.format(paidTotal)}`, 14, 38);
            doc.text(`Total Pengeluaran: ${formatter.format(expenseTotal)}`, 14, 44);
            doc.text(`Pendapatan Bersih: ${formatter.format(netIncome)}`, 14, 50);
            doc.text(`Total Belum Bayar: ${formatter.format(unpaidTotal)}`, 14, 56);
            doc.text(`Jumlah Data: ${filteredInvoices.length} tagihan, ${filteredExpenses.length} pengeluaran`, 14, 62);

            // Prepare table data from combinedData
            const tableData = combinedData.map((item, index) => {
                const displayDate = new Date(item.date).toLocaleDateString('id-ID');
                const amountStr = formatter.format(item.amount);
                const statusStr = item.type === 'expense' ? 'Pengeluaran' : getStatusText(item.status);
                
                return [
                    index + 1,
                    item.customerName,
                    item.customerIdpl,
                    item.description,
                    item.type === 'expense' ? `-${amountStr}` : `+${amountStr}`,
                    statusStr,
                    displayDate,
                    item.paymentMethod
                ];
            });

            // Add table
            doc.autoTable({
                startY: 70,
                head: [['No', 'Nama', 'ID', 'Keterangan', 'Jumlah', 'Status', 'Tanggal', 'Metode']],
                body: tableData,
                theme: 'striped',
                headStyles: {
                    fillColor: [104, 63, 228],
                    textColor: 255,
                    fontStyle: 'bold'
                },
                styles: {
                    fontSize: 8,
                    cellPadding: 2
                },
                columnStyles: {
                    0: { cellWidth: 10 },
                    4: { halign: 'right' }
                }
            });

            // Save PDF
            const filename = `Laporan_Keuangan_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(filename);

            showSuccessNotification('✅ PDF berhasil diexport!');
        } catch (error) {
            console.error('Error exporting PDF:', error);
            showError('Gagal export PDF: ' + error.message);
        }
    }

    function exportToExcel() {
        try {
            // Prepare data from combinedData
            const excelData = combinedData.map((item, index) => {
                const displayDate = new Date(item.date).toLocaleDateString('id-ID');
                const amount = item.amount || 0;
                const statusStr = item.type === 'expense' ? 'Pengeluaran' : getStatusText(item.status);
                
                return {
                    'No': index + 1,
                    'Tipe': item.type === 'expense' ? 'Pengeluaran' : 'Pendapatan',
                    'Nama Pelanggan': item.customerName,
                    'ID Pelanggan': item.customerIdpl,
                    'Keterangan': item.description,
                    'Jumlah': item.type === 'expense' ? -amount : amount,
                    'Status': statusStr,
                    'Tanggal': displayDate,
                    'Metode Pembayaran': item.paymentMethod
                };
            });

            // Create worksheet
            const ws = XLSX.utils.json_to_sheet(excelData);

            // Set column widths
            const colWidths = [
                { wch: 5 },  // No
                { wch: 12 }, // Tipe
                { wch: 25 }, // Nama
                { wch: 15 }, // ID
                { wch: 30 }, // Keterangan
                { wch: 15 }, // Jumlah
                { wch: 12 }, // Status
                { wch: 15 }, // Tanggal
                { wch: 15 }  // Metode
            ];
            ws['!cols'] = colWidths;

            // Create workbook
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Laporan Keuangan');

            // Add summary sheet
            const paidTotal = filteredInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.total_due || 0), 0);
            const unpaidTotal = filteredInvoices.filter(inv => inv.status === 'unpaid').reduce((sum, inv) => sum + (inv.amount || 0), 0);
            const installmentTotal = filteredInvoices.filter(inv => inv.status === 'installment').reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);
            const expenseTotal = filteredExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
            const netIncome = paidTotal - expenseTotal;

            const summaryData = [
                { 'Keterangan': 'Total Pendapatan (Lunas)', 'Jumlah': paidTotal },
                { 'Keterangan': 'Total Pengeluaran', 'Jumlah': expenseTotal },
                { 'Keterangan': 'Pendapatan Bersih', 'Jumlah': netIncome },
                { 'Keterangan': 'Total Belum Bayar', 'Jumlah': unpaidTotal },
                { 'Keterangan': 'Total Cicilan', 'Jumlah': installmentTotal },
                { 'Keterangan': 'Jumlah Tagihan', 'Jumlah': `${filteredInvoices.length} tagihan` },
                { 'Keterangan': 'Jumlah Pengeluaran', 'Jumlah': `${filteredExpenses.length} pengeluaran` }
            ];
            const wsSummary = XLSX.utils.json_to_sheet(summaryData);
            wsSummary['!cols'] = [{ wch: 30 }, { wch: 20 }];
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');

            // Save file
            const filename = `Laporan_Keuangan_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, filename);

            showSuccessNotification('✅ Excel berhasil diexport!');
        } catch (error) {
            console.error('Error exporting Excel:', error);
            showError('Gagal export Excel: ' + error.message);
        }
    }

    function getStatusText(status) {
        const statusMap = {
            'paid': 'Lunas',
            'unpaid': 'Belum Bayar',
            'installment': 'Cicilan'
        };
        return statusMap[status] || 'Unknown';
    }

    function showSuccessNotification(message) {
        // Simple notification (you can enhance this)
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // ============================================
    // Initialize
    // ============================================

    await fetchData();
});
