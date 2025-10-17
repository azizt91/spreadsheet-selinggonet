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
    let filteredInvoices = [];
    let currentFilters = {
        periode: 'all',
        status: 'all',
        paymentMethod: 'all',
        customerSearch: '',
        startDate: null,
        endDate: null
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
            const { data: invoices, error } = await supabase
                .from('invoices')
                .select(`
                    *,
                    profiles:customer_id (
                        full_name,
                        idpl
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            allInvoices = invoices || [];
            filteredInvoices = [...allInvoices];

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
        // Calculate totals
        const paid = filteredInvoices.filter(inv => inv.status === 'paid');
        const unpaid = filteredInvoices.filter(inv => inv.status === 'unpaid');
        const installment = filteredInvoices.filter(inv => inv.status === 'installment');

        const totalPendapatanValue = paid.reduce((sum, inv) => sum + (inv.total_due || 0), 0);
        const totalLunasValue = paid.reduce((sum, inv) => sum + (inv.total_due || 0), 0);
        const totalUnpaidValue = unpaid.reduce((sum, inv) => sum + (inv.amount || 0), 0);
        const totalInstallmentValue = installment.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);

        // Update DOM
        totalPendapatan.textContent = formatter.format(totalPendapatanValue);
        totalTransaksi.textContent = `${paid.length} Transaksi`;

        totalLunas.textContent = formatter.format(totalLunasValue);
        countLunas.textContent = `${paid.length} Tagihan`;

        totalUnpaid.textContent = formatter.format(totalUnpaidValue);
        countUnpaid.textContent = `${unpaid.length} Tagihan`;

        totalInstallment.textContent = formatter.format(totalInstallmentValue);
        countInstallment.textContent = `${installment.length} Tagihan`;
    }

    function updateTable() {
        if (filteredInvoices.length === 0) {
            showEmptyState();
            return;
        }

        tableContainer.classList.remove('hidden');
        emptyState.classList.add('hidden');
        dataCount.textContent = `Menampilkan ${filteredInvoices.length} data`;

        tableBody.innerHTML = '';

        filteredInvoices.forEach((invoice, index) => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50 transition-colors';

            const customerName = invoice.profiles?.full_name || 'N/A';
            const customerIdpl = invoice.profiles?.idpl || 'N/A';
            const amount = invoice.status === 'paid' ? invoice.total_due : invoice.amount;
            const statusBadge = getStatusBadge(invoice.status);
            const paidDate = invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString('id-ID') : '-';
            const paymentMethod = invoice.payment_method || '-';

            row.innerHTML = `
                <td class="px-4 py-3 whitespace-nowrap text-gray-900 font-medium">${index + 1}</td>
                <td class="px-4 py-3 text-gray-900">${customerName}</td>
                <td class="px-4 py-3 text-gray-600 text-xs">${customerIdpl}</td>
                <td class="px-4 py-3 text-gray-900">${invoice.invoice_period || '-'}</td>
                <td class="px-4 py-3 text-gray-900 font-semibold whitespace-nowrap">${formatter.format(amount || 0)}</td>
                <td class="px-4 py-3">${statusBadge}</td>
                <td class="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">${paidDate}</td>
                <td class="px-4 py-3 text-gray-600 text-xs">${paymentMethod}</td>
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
            doc.text('LAPORAN TAGIHAN', 14, 15);

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
            
            doc.text(`Total Lunas: ${formatter.format(paidTotal)}`, 14, 38);
            doc.text(`Total Belum Bayar: ${formatter.format(unpaidTotal)}`, 14, 44);
            doc.text(`Jumlah Data: ${filteredInvoices.length} tagihan`, 14, 50);

            // Prepare table data
            const tableData = filteredInvoices.map((invoice, index) => [
                index + 1,
                invoice.profiles?.full_name || 'N/A',
                invoice.profiles?.idpl || 'N/A',
                invoice.invoice_period || '-',
                formatter.format((invoice.status === 'paid' ? invoice.total_due : invoice.amount) || 0),
                getStatusText(invoice.status),
                invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString('id-ID') : '-',
                invoice.payment_method || '-'
            ]);

            // Add table
            doc.autoTable({
                startY: 58,
                head: [['No', 'Nama', 'ID', 'Periode', 'Jumlah', 'Status', 'Tgl Bayar', 'Metode']],
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
            const filename = `Laporan_Tagihan_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(filename);

            showSuccessNotification('✅ PDF berhasil diexport!');
        } catch (error) {
            console.error('Error exporting PDF:', error);
            showError('Gagal export PDF: ' + error.message);
        }
    }

    function exportToExcel() {
        try {
            // Prepare data
            const excelData = filteredInvoices.map((invoice, index) => ({
                'No': index + 1,
                'Nama Pelanggan': invoice.profiles?.full_name || 'N/A',
                'ID Pelanggan': invoice.profiles?.idpl || 'N/A',
                'Periode': invoice.invoice_period || '-',
                'Jumlah': (invoice.status === 'paid' ? invoice.total_due : invoice.amount) || 0,
                'Status': getStatusText(invoice.status),
                'Tanggal Bayar': invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString('id-ID') : '-',
                'Metode Pembayaran': invoice.payment_method || '-',
                'Total Due': invoice.total_due || 0,
                'Amount Paid': invoice.amount_paid || 0
            }));

            // Create worksheet
            const ws = XLSX.utils.json_to_sheet(excelData);

            // Set column widths
            const colWidths = [
                { wch: 5 },  // No
                { wch: 25 }, // Nama
                { wch: 15 }, // ID
                { wch: 15 }, // Periode
                { wch: 15 }, // Jumlah
                { wch: 12 }, // Status
                { wch: 15 }, // Tanggal
                { wch: 15 }, // Metode
                { wch: 15 }, // Total Due
                { wch: 15 }  // Amount Paid
            ];
            ws['!cols'] = colWidths;

            // Create workbook
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Laporan Tagihan');

            // Add summary sheet
            const summaryData = [
                { 'Keterangan': 'Total Lunas', 'Jumlah': filteredInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.total_due || 0), 0) },
                { 'Keterangan': 'Total Belum Bayar', 'Jumlah': filteredInvoices.filter(inv => inv.status === 'unpaid').reduce((sum, inv) => sum + (inv.amount || 0), 0) },
                { 'Keterangan': 'Total Cicilan', 'Jumlah': filteredInvoices.filter(inv => inv.status === 'installment').reduce((sum, inv) => sum + (inv.amount_paid || 0), 0) },
                { 'Keterangan': 'Jumlah Data', 'Jumlah': filteredInvoices.length }
            ];
            const wsSummary = XLSX.utils.json_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');

            // Save file
            const filename = `Laporan_Tagihan_${new Date().toISOString().split('T')[0]}.xlsx`;
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
