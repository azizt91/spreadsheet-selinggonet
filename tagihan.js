// document.addEventListener('DOMContentLoaded', () => {
//     // ===============================================
//     // State Management & Global Variables
//     // ===============================================
//     const API_BASE_URL = window.AppConfig.API_BASE_URL;
//     const API_TAGIHAN_URL = `${API_BASE_URL}?action=getTagihan`;
//     const API_LUNAS_URL = `${API_BASE_URL}?action=getLunas`;
//     const API_BAYAR_URL = API_BASE_URL;
//     let unpaidData = [];
//     let paidData = [];
//     let currentTab = 'unpaid'; // 'unpaid' or 'paid'

//     // ===============================================
//     // DOM Element Selectors
//     // ===============================================
//     const invoiceList = document.getElementById('invoice-list');
//     const searchInput = document.getElementById('search-input');
//     const unpaidTab = document.getElementById('unpaid-tab');
//     const paidTab = document.getElementById('paid-tab');
//     const addInvoiceBtn = document.getElementById('add-invoice-btn');

//     // ===============================================
//     // Initial Setup
//     // ===============================================
//     initializeEventListeners();
//     fetchData();
//     checkUrlFilters();

//     // ===============================================
//     // Event Listeners Setup
//     // ===============================================
//     function initializeEventListeners() {
//         searchInput.addEventListener('input', renderList);
//         unpaidTab.addEventListener('click', () => switchTab('unpaid'));
//         paidTab.addEventListener('click', () => switchTab('paid'));
        
//         // **PERBAIKAN:** Menambahkan satu event listener terpusat untuk semua klik di daftar tagihan
//         invoiceList.addEventListener('click', handleInvoiceListClick);

//         if (addInvoiceBtn) {
//             addInvoiceBtn.addEventListener('click', handleCreateInvoices);
//         }
//     }

//     // ===============================================
//     // Main Data Fetch & Display Logic
//     // ===============================================
//     async function fetchData() {
//         showLoading('Memuat data tagihan...');
//         try {
//             const [unpaidRes, paidRes] = await Promise.all([
//                 fetch(API_TAGIHAN_URL),
//                 fetch(API_LUNAS_URL)
//             ]);

//             if (!unpaidRes.ok || !paidRes.ok) {
//                 throw new Error('Gagal mengambil data dari server');
//             }

//             const unpaidRawData = await unpaidRes.json();
//             const paidRawData = await paidRes.json();

//             unpaidData = Array.isArray(unpaidRawData) ? unpaidRawData.filter(item => item && item.IDPL && item.NAMA) : [];
//             paidData = Array.isArray(paidRawData) ? paidRawData.filter(item => item && item.IDPL && item.NAMA) : [];

//             // Urutkan data berdasarkan tanggal (terbaru dulu)
//             unpaidData.sort((a, b) => new Date(b['TANGGAL PASANG'] || 0) - new Date(a['TANGGAL PASANG'] || 0));
//             paidData.sort((a, b) => new Date(b['TANGGAL BAYAR'] || 0) - new Date(a['TANGGAL BAYAR'] || 0));

//             renderList();
//         } catch (error) {
//             console.error('Error fetching data:', error);
//             invoiceList.innerHTML = `<p class="text-center text-red-500 p-4">Gagal memuat data: ${error.message}</p>`;
//             unpaidData = [];
//             paidData = [];
//         } finally {
//             hideLoading();
//         }
//     }

//     function switchTab(tab) {
//         currentTab = tab;
//         if (tab === 'unpaid') {
//             unpaidTab.classList.add('active');
//             paidTab.classList.remove('active');
//             if (addInvoiceBtn) addInvoiceBtn.style.display = 'flex';
//         } else {
//             paidTab.classList.add('active');
//             unpaidTab.classList.remove('active');
//             if (addInvoiceBtn) addInvoiceBtn.style.display = 'none';
//         }
//         renderList();
//     }

//     function renderList() {
//         invoiceList.innerHTML = '';
//         const searchTerm = searchInput.value.toLowerCase();
//         const data = currentTab === 'unpaid' ? unpaidData : paidData;

//         if (!Array.isArray(data)) {
//             invoiceList.innerHTML = `<p class="text-center text-red-500 p-4">Error: Data format tidak valid</p>`;
//             return;
//         }

//         const filteredData = data.filter(item => {
//             if (!item) return false;
//             return (item.NAMA && item.NAMA.toLowerCase().includes(searchTerm)) ||
//                    (item['PERIODE TAGIHAN'] && item['PERIODE TAGIHAN'].toLowerCase().includes(searchTerm));
//         });

//         if (filteredData.length === 0) {
//             invoiceList.innerHTML = `<p class="text-center text-gray-500 p-4">Tidak ada tagihan ditemukan.</p>`;
//             return;
//         }

//         const formatter = new Intl.NumberFormat('id-ID', {
//             style: 'currency',
//             currency: 'IDR',
//             minimumFractionDigits: 0
//         });

//         filteredData.forEach(item => {
//             if (!item) return;

//             const amount = item.TAGIHAN ? formatter.format(String(item.TAGIHAN).replace(/[^0-9]/g, '')) : 'N/A';
//             const period = item['PERIODE TAGIHAN'] || 'Periode tidak tersedia';
//             const customerName = item.NAMA || 'Nama tidak tersedia';
//             const rowNumber = item.rowNumber || ''; // **PERBAIKAN:** Ambil rowNumber

//             const invoiceDiv = document.createElement('div');
//             invoiceDiv.className = 'flex items-center gap-4 bg-[#f9f8fb] px-4 min-h-[72px] py-2 justify-between border-b border-gray-200';

//             if (currentTab === 'unpaid') {
//                 invoiceDiv.innerHTML = `
//                     <div class="flex flex-col justify-center">
//                         <p class="text-[#110e1b] text-base font-medium leading-normal line-clamp-1">${customerName}</p>
//                         <p class="text-[#625095] text-sm font-normal leading-normal line-clamp-2">${period}</p>
//                     </div>
//                     <div class="shrink-0 flex gap-2">
//                         <button class="whatsapp-btn flex items-center justify-center w-8 h-8 bg-green-500 hover:bg-green-600 rounded-lg transition-colors" title="Kirim WhatsApp" data-row-number="${rowNumber}">
//                             <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/></svg>
//                         </button>
//                         <button class="mark-paid-btn flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-8 px-4 bg-[#eae8f3] text-[#110e1b] text-sm font-medium leading-normal w-fit" data-row-number="${rowNumber}">
//                             <span class="truncate">Mark as Paid</span>
//                         </button>
//                     </div>
//                 `;
//             } else {
//                 invoiceDiv.innerHTML = `
//                     <div class="flex flex-col justify-center">
//                         <p class="text-[#110e1b] text-base font-medium leading-normal line-clamp-1">${customerName}</p>
//                         <p class="text-[#625095] text-sm font-normal leading-normal line-clamp-2">${period}</p>
//                     </div>
//                     <div class="shrink-0">
//                         <p class="text-[#110e1b] text-base font-normal leading-normal">${amount}</p>
//                     </div>
//                 `;
//             }
//             invoiceList.appendChild(invoiceDiv);
//         });
//     }

//     // **PERBAIKAN:** Fungsi terpusat untuk menangani klik tombol
//     function handleInvoiceListClick(event) {
//         const button = event.target.closest('button');
//         if (!button) return;

//         const rowNumber = button.dataset.rowNumber;
//         if (!rowNumber) return;

//         const targetItem = unpaidData.find(item => item.rowNumber == rowNumber);
//         if (!targetItem) {
//             showErrorNotification('Data tagihan tidak ditemukan.');
//             return;
//         }

//         if (button.classList.contains('mark-paid-btn')) {
//             markAsPaid(targetItem);
//         } else if (button.classList.contains('whatsapp-btn')) {
//             sendWhatsAppMessage(targetItem);
//         }
//     }

//     // ===============================================
//     // Mark as Paid Functionality
//     // ===============================================
//     async function markAsPaid(invoice) {
//         if (!invoice || !invoice.rowNumber) {
//             showErrorNotification('Error: Data tagihan tidak lengkap.');
//             return;
//         }

//         const customerName = invoice.NAMA || 'pelanggan ini';
//         if (!confirm(`Tandai tagihan ${customerName} sebagai lunas?`)) return;

//         showPaymentLoading();

//         try {
//             const response = await fetch(API_BAYAR_URL, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'text/plain;charset=utf-8' },
//                 body: JSON.stringify({
//                     action: 'bayar',
//                     rowNumber: invoice.rowNumber,
//                     rowData: invoice
//                 })
//             });

//             if (!response.ok) {
//                 const errorData = await response.json();
//                 throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
//             }

//             const result = await response.json();
//             if (result.error) {
//                 throw new Error(result.error);
//             }

//             hidePaymentLoading();
//             showSuccessNotification(result.message || 'Tagihan berhasil ditandai sebagai lunas');
//             fetchData(); // Refresh data

//         } catch (error) {
//             console.error('Error marking as paid:', error);
//             hidePaymentLoading();
//             showErrorNotification(`Error: ${error.message}`);
//         }
//     }

//     // ===============================================
//     // WhatsApp Message Function
//     // ===============================================
//     function sendWhatsAppMessage(rowData) {
//         if (!rowData) {
//             showErrorNotification('Data pelanggan tidak valid untuk mengirim WhatsApp');
//             return;
//         }
        
//         const customerName = rowData.NAMA || 'Pelanggan';
//         const customerId = rowData.IDPL || '';
//         const whatsappNumber = rowData.WHATSAPP || '';
//         const billAmount = rowData.TAGIHAN || '';
//         const billPeriod = rowData['PERIODE TAGIHAN'] || '';
        
//         if (!whatsappNumber) {
//             alert('Nomor WhatsApp pelanggan tidak tersedia!');
//             return;
//         }
        
//         const message = `Informasi Tagihan WiFi Anda\n\nHai Bapak/Ibu ${customerName},\nID Pelanggan: ${customerId}\n\nInformasi tagihan Bapak/Ibu bulan ini adalah:\nJumlah Tagihan: ${billAmount}\nPeriode Tagihan: ${billPeriod}\n\nBayar tagihan Anda di salah satu rekening di bawah ini:\n• Seabank 901307925714 An. TAUFIQ AZIZ\n• BCA 3621053653 An. TAUFIQ AZIZ\n• BSI 7211806138 An. TAUFIQ AZIZ\n• Dana 089609497390 An. TAUFIQ AZIZ\n\nTerima kasih atas kepercayaan Anda menggunakan layanan kami.\n_____________________________\n*Ini adalah pesan otomatis. Jika telah membayar tagihan, abaikan pesan ini.`;
        
//         let cleanedNumber = String(whatsappNumber).replace(/[^0-9+]/g, '');
        
//         if (!cleanedNumber.startsWith('+') && !cleanedNumber.startsWith('62')) {
//             cleanedNumber = cleanedNumber.startsWith('0') ? '62' + cleanedNumber.substring(1) : '62' + cleanedNumber;
//         }
        
//         const encodedMessage = encodeURIComponent(message);
//         const whatsappUrl = `https://wa.me/${cleanedNumber}?text=${encodedMessage}`;
        
//         window.open(whatsappUrl, '_blank');
//         showSuccessNotification(`Pesan WhatsApp untuk ${customerName} telah dibuka!`);
//     }

//     // ===============================================
//     // URL Filter Check Function
//     // ===============================================
//     function checkUrlFilters() {
//         const urlParams = new URLSearchParams(window.location.search);
//         const filterBulan = urlParams.get('bulan');
//         const filterTahun = urlParams.get('tahun');
        
//         if (filterBulan && filterTahun && filterBulan !== 'semua') {
//             const namaBulan = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
//             const filterBulanNama = namaBulan[parseInt(filterBulan, 10)];
//             const targetPeriode = `${filterBulanNama} ${filterTahun}`;
            
//             searchInput.placeholder = `Disaring: ${targetPeriode}`;
//             searchInput.disabled = true;
//         }
//     }
    
//     // ===============================================
//     // Create Invoices Functionality
//     // ===============================================
//     async function handleCreateInvoices() {
//         const currentMonthName = new Date().toLocaleString('id-ID', { month: 'long' });
//         if (!confirm(`Apakah Anda yakin ingin membuat tagihan untuk bulan ${currentMonthName}? Proses ini akan dijalankan untuk semua pelanggan aktif yang belum memiliki tagihan bulan ini.`)) {
//             return;
//         }
    
//         showPaymentLoading('Membuat tagihan bulanan...');
    
//         try {
//             const response = await fetch(API_BASE_URL, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'text/plain;charset=utf-8' },
//                 body: JSON.stringify({
//                     action: 'createInvoices'
//                 })
//             });
//             const result = await response.json();
    
//             hidePaymentLoading();
    
//             if (result.error) {
//                 throw new Error(result.error);
//             }
    
//             showSuccessNotification(result.message);
//             fetchData(); // Reload data to show new invoices
//         } catch (error) {
//             hidePaymentLoading();
//             console.error('Error creating invoices:', error);
//             showErrorNotification(`Gagal membuat tagihan: ${error.message}`);
//         }
//     }
    
//     // ===============================================
//     // Skeleton Loading & Notification Functions
//     // ===============================================
//     function showLoading() {
//         invoiceList.innerHTML = '';
//         for (let i = 0; i < 5; i++) {
//             const skeletonItem = document.createElement('div');
//             skeletonItem.className = 'skeleton-item flex items-center gap-4 bg-[#f9f8fb] px-4 min-h-[72px] py-2 justify-between border-b border-gray-200';
//             skeletonItem.innerHTML = `
//                 <div class="flex flex-col justify-center flex-1 gap-2">
//                     <div class="skeleton-line h-4 bg-gray-300 rounded w-3/4"></div>
//                     <div class="skeleton-line h-3 bg-gray-300 rounded w-1/2"></div>
//                 </div>
//                 <div class="shrink-0 flex gap-2">
//                     <div class="skeleton-button w-8 h-8 bg-gray-300 rounded-lg"></div>
//                     <div class="skeleton-button w-20 h-8 bg-gray-300 rounded-lg"></div>
//                 </div>
//             `;
//             invoiceList.appendChild(skeletonItem);
//         }
        
//         if (!document.getElementById('skeleton-styles')) {
//             const style = document.createElement('style');
//             style.id = 'skeleton-styles';
//             style.textContent = `@keyframes skeleton-loading { 0% { background-position: -200px 0; } 100% { background-position: calc(200px + 100%) 0; } } .skeleton-line, .skeleton-button { background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200px 100%; animation: skeleton-loading 1.5s infinite; } .skeleton-item { pointer-events: none; }`;
//             document.head.appendChild(style);
//         }
//     }

//     function hideLoading() {
//         const skeletonItems = document.querySelectorAll('.skeleton-item');
//         skeletonItems.forEach(item => item.remove());
//     }
    
//     function showPaymentLoading(text = 'Memproses...') {
//         const loadingOverlay = document.createElement('div');
//         loadingOverlay.id = 'payment-loading-overlay';
//         loadingOverlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;`;
//         loadingOverlay.innerHTML = `<div style="background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);"><div class="loading-spinner" style="border: 4px solid #f3f3f3; border-top: 4px solid #683fe4; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 10px;"></div><div>${text}</div></div>`;
        
//         if (!document.getElementById('payment-loading-styles')) {
//             const style = document.createElement('style');
//             style.id = 'payment-loading-styles';
//             style.textContent = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
//             document.head.appendChild(style);
//         }
//         document.body.appendChild(loadingOverlay);
//     }

//     function hidePaymentLoading() {
//         const loadingOverlay = document.getElementById('payment-loading-overlay');
//         if (loadingOverlay) loadingOverlay.remove();
//     }
    
//     function showSuccessNotification(message) {
//         showNotification(message, '#28a745', '✓');
//     }
    
//     function showErrorNotification(message) {
//         showNotification(message, '#dc3545', '⚠');
//     }
    
//     function showNotification(message, bgColor, icon) {
//         const notification = document.createElement('div');
//         notification.style.cssText = `position: fixed; top: 20px; right: 20px; background-color: ${bgColor}; color: white; padding: 15px 20px; border-radius: 8px; z-index: 1002; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2); animation: slideInRight 0.3s ease;`;
//         notification.innerHTML = `<div style="display: flex; align-items: center; gap: 10px;"><span>${icon}</span><span>${message}</span></div>`;
        
//         if (!document.getElementById('notification-styles')) {
//             const style = document.createElement('style');
//             style.id = 'notification-styles';
//             style.textContent = `@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }`;
//             document.head.appendChild(style);
//         }

//         document.body.appendChild(notification);
        
//         setTimeout(() => {
//             if (notification.parentNode) {
//                 notification.style.animation = 'slideOutRight 0.3s ease forwards';
//                 notification.addEventListener('animationend', () => notification.remove());
//             }
//         }, 3000);
//     }
// });

document.addEventListener('DOMContentLoaded', () => {
    // ===============================================
    // State Management & Global Variables
    // ===============================================
    const API_BASE_URL = window.AppConfig.API_BASE_URL;
    const API_TAGIHAN_URL = `${API_BASE_URL}?action=getTagihan`;
    const API_LUNAS_URL = `${API_BASE_URL}?action=getLunas`;
    const API_BAYAR_URL = API_BASE_URL;
    let unpaidData = [];
    let paidData = [];
    let currentTab = 'unpaid'; // 'unpaid' or 'paid'

    // ===============================================
    // DOM Element Selectors
    // ===============================================
    const invoiceList = document.getElementById('invoice-list');
    const searchInput = document.getElementById('search-input');
    const unpaidTab = document.getElementById('unpaid-tab');
    const paidTab = document.getElementById('paid-tab');
    const addInvoiceBtn = document.getElementById('add-invoice-btn');

    // ===============================================
    // Initial Setup
    // ===============================================
    initializeEventListeners();
    fetchData(); // Fungsi ini sekarang juga menangani filter

    // ===============================================
    // Event Listeners Setup
    // ===============================================
    function initializeEventListeners() {
        searchInput.addEventListener('input', renderList);
        unpaidTab.addEventListener('click', () => switchTab('unpaid'));
        
        // Mengubah tab "Paid" menjadi link ke halaman lunas.html
        paidTab.addEventListener('click', () => {
            window.location.href = 'lunas.html';
        });
        
        invoiceList.addEventListener('click', handleInvoiceListClick);

        if (addInvoiceBtn) {
            addInvoiceBtn.addEventListener('click', handleCreateInvoices);
        }
    }

    // ===============================================
    // Main Data Fetch & Display Logic (DENGAN PERBAIKAN)
    // ===============================================
    async function fetchData() {
        showLoading('Memuat data tagihan...');
        try {
            // **PERBAIKAN DIMULAI DI SINI**
            const urlParams = new URLSearchParams(window.location.search);
            const filterBulan = urlParams.get('bulan');
            const filterTahun = urlParams.get('tahun');
            const isFiltering = filterBulan && filterTahun && filterBulan !== 'semua';

            // Hanya fetch data yang relevan untuk halaman ini
            const unpaidRes = await fetch(API_TAGIHAN_URL);
            if (!unpaidRes.ok) throw new Error('Gagal mengambil data tagihan');
            
            let unpaidRawData = await unpaidRes.json();
            if (!Array.isArray(unpaidRawData)) throw new TypeError('Format data tagihan tidak valid');

            // Proses filter jika ada parameter dari URL
            if (isFiltering) {
                const namaBulan = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
                const filterBulanNama = namaBulan[parseInt(filterBulan, 10)];
                const targetPeriode = `${filterBulanNama} ${filterTahun}`;
                
                // Filter data mentah berdasarkan periode yang dipilih
                unpaidData = unpaidRawData.filter(row => {
                    const periodeData = (row['PERIODE TAGIHAN'] || '').trim().replace(/^'/, '');
                    return periodeData === targetPeriode;
                });

                // Set placeholder dan nonaktifkan search bar
                searchInput.placeholder = `Disaring: ${targetPeriode}`;
                searchInput.disabled = true;

            } else {
                // Jika tidak ada filter, gunakan semua data
                unpaidData = unpaidRawData.filter(item => item && item.IDPL && item.NAMA);
            }
            // **PERBAIKAN SELESAI**

            // Urutkan data berdasarkan tanggal (terbaru dulu)
            unpaidData.sort((a, b) => new Date(b['TANGGAL PASANG'] || 0) - new Date(a['TANGGAL PASANG'] || 0));
            
            // Karena ini halaman tagihan, kita mulai dengan tab 'unpaid'
            switchTab('unpaid');

        } catch (error) {
            console.error('Error fetching data:', error);
            invoiceList.innerHTML = `<p class="text-center text-red-500 p-4">Gagal memuat data: ${error.message}</p>`;
            unpaidData = [];
        } finally {
            hideLoading();
        }
    }

    function switchTab(tab) {
        currentTab = tab;
        if (tab === 'unpaid') {
            unpaidTab.classList.add('active');
            paidTab.classList.remove('active');
            if (addInvoiceBtn) addInvoiceBtn.style.display = 'flex';
        } else {
            // Logika untuk tab 'paid' jika diperlukan di masa depan
            paidTab.classList.add('active');
            unpaidTab.classList.remove('active');
            if (addInvoiceBtn) addInvoiceBtn.style.display = 'none';
        }
        renderList();
    }

    function renderList() {
        invoiceList.innerHTML = '';
        const searchTerm = searchInput.value.toLowerCase();
        
        // Di halaman ini, kita hanya menampilkan 'unpaidData'
        const data = unpaidData;

        if (!Array.isArray(data)) {
            invoiceList.innerHTML = `<p class="text-center text-red-500 p-4">Error: Format data tidak valid</p>`;
            return;
        }

        const filteredData = data.filter(item => {
            if (!item) return false;
            // Hanya filter jika search bar tidak dinonaktifkan
            if (searchInput.disabled) return true;
            return (item.NAMA && item.NAMA.toLowerCase().includes(searchTerm)) ||
                   (item['PERIODE TAGIHAN'] && item['PERIODE TAGIHAN'].toLowerCase().includes(searchTerm));
        });

        if (filteredData.length === 0) {
            invoiceList.innerHTML = `<p class="text-center text-gray-500 p-4">Tidak ada tagihan ditemukan.</p>`;
            return;
        }

        const formatter = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        });

        filteredData.forEach(item => {
            if (!item) return;

            const period = item['PERIODE TAGIHAN'] || 'Periode tidak tersedia';
            const customerName = item.NAMA || 'Nama tidak tersedia';
            const rowNumber = item.rowNumber || '';

            const invoiceDiv = document.createElement('div');
            invoiceDiv.className = 'flex items-center gap-4 bg-[#f9f8fb] px-4 min-h-[72px] py-2 justify-between border-b border-gray-200';

            invoiceDiv.innerHTML = `
                <div class="flex flex-col justify-center">
                    <p class="text-[#110e1b] text-base font-medium leading-normal line-clamp-1">${customerName}</p>
                    <p class="text-[#625095] text-sm font-normal leading-normal line-clamp-2">${period}</p>
                </div>
                <div class="shrink-0 flex gap-2">
                    <button class="whatsapp-btn flex items-center justify-center w-8 h-8 bg-green-500 hover:bg-green-600 rounded-lg transition-colors" title="Kirim WhatsApp" data-row-number="${rowNumber}">
                        <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/></svg>
                    </button>
                    <button class="mark-paid-btn flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-8 px-4 bg-[#eae8f3] text-[#110e1b] text-sm font-medium leading-normal w-fit" data-row-number="${rowNumber}">
                        <span class="truncate">LUNAS</span>
                    </button>
                </div>
            `;
            invoiceList.appendChild(invoiceDiv);
        });
    }

    // (Sisa kode dari sini ke bawah tetap sama, tidak perlu diubah)

    function handleInvoiceListClick(event) {
        const button = event.target.closest('button');
        if (!button) return;

        const rowNumber = button.dataset.rowNumber;
        if (!rowNumber) return;

        const targetItem = unpaidData.find(item => item.rowNumber == rowNumber);
        if (!targetItem) {
            showErrorNotification('Data tagihan tidak ditemukan.');
            return;
        }

        if (button.classList.contains('mark-paid-btn')) {
            markAsPaid(targetItem);
        } else if (button.classList.contains('whatsapp-btn')) {
            sendWhatsAppMessage(targetItem);
        }
    }

    async function markAsPaid(invoice) {
        if (!invoice || !invoice.rowNumber) {
            showErrorNotification('Error: Data tagihan tidak lengkap.');
            return;
        }

        const customerName = invoice.NAMA || 'pelanggan ini';
        if (!confirm(`Tandai tagihan ${customerName} sebagai lunas?`)) return;

        showPaymentLoading();

        try {
            const response = await fetch(API_BAYAR_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'bayar',
                    rowNumber: invoice.rowNumber,
                    rowData: invoice
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.error) {
                throw new Error(result.error);
            }

            hidePaymentLoading();
            showSuccessNotification(result.message || 'Tagihan berhasil ditandai sebagai lunas');
            fetchData(); // Refresh data

        } catch (error) {
            console.error('Error marking as paid:', error);
            hidePaymentLoading();
            showErrorNotification(`Error: ${error.message}`);
        }
    }

    function sendWhatsAppMessage(rowData) {
        if (!rowData) {
            showErrorNotification('Data pelanggan tidak valid untuk mengirim WhatsApp');
            return;
        }
        
        const customerName = rowData.NAMA || 'Pelanggan';
        const customerId = rowData.IDPL || '';
        const whatsappNumber = rowData.WHATSAPP || '';
        const billAmount = rowData.TAGIHAN || '';
        const billPeriod = rowData['PERIODE TAGIHAN'] || '';
        
        if (!whatsappNumber) {
            alert('Nomor WhatsApp pelanggan tidak tersedia!');
            return;
        }
        
        const message = `Informasi Tagihan WiFi Anda\n\nHai Bapak/Ibu ${customerName},\nID Pelanggan: ${customerId}\n\nInformasi tagihan Bapak/Ibu bulan ini adalah:\nJumlah Tagihan: ${billAmount}\nPeriode Tagihan: ${billPeriod}\n\nBayar tagihan Anda di salah satu rekening di bawah ini:\n• Seabank 901307925714 An. TAUFIQ AZIZ\n• BCA 3621053653 An. TAUFIQ AZIZ\n• BSI 7211806138 An. TAUFIQ AZIZ\n• Dana 089609497390 An. TAUFIQ AZIZ\n\nTerima kasih atas kepercayaan Anda menggunakan layanan kami.\n_____________________________\n*Ini adalah pesan otomatis. Jika telah membayar tagihan, abaikan pesan ini.`;
        
        let cleanedNumber = String(whatsappNumber).replace(/[^0-9+]/g, '');
        
        if (!cleanedNumber.startsWith('+') && !cleanedNumber.startsWith('62')) {
            cleanedNumber = cleanedNumber.startsWith('0') ? '62' + cleanedNumber.substring(1) : '62' + cleanedNumber;
        }
        
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${cleanedNumber}?text=${encodedMessage}`;
        
        window.open(whatsappUrl, '_blank');
        showSuccessNotification(`Pesan WhatsApp untuk ${customerName} telah dibuka!`);
    }

    // Fungsi ini tidak diperlukan lagi karena logikanya sudah pindah ke fetchData
    // function checkUrlFilters() { ... }
    
    async function handleCreateInvoices() {
        const currentMonthName = new Date().toLocaleString('id-ID', { month: 'long' });
        if (!confirm(`Apakah Anda yakin ingin membuat tagihan untuk bulan ${currentMonthName}? Proses ini akan dijalankan untuk semua pelanggan aktif yang belum memiliki tagihan bulan ini.`)) {
            return;
        }
    
        showPaymentLoading('Membuat tagihan bulanan...');
    
        try {
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'createInvoices'
                })
            });
            const result = await response.json();
    
            hidePaymentLoading();
    
            if (result.error) {
                throw new Error(result.error);
            }
    
            showSuccessNotification(result.message);
            fetchData(); // Reload data to show new invoices
        } catch (error) {
            hidePaymentLoading();
            console.error('Error creating invoices:', error);
            showErrorNotification(`Gagal membuat tagihan: ${error.message}`);
        }
    }
    
    function showLoading() {
        invoiceList.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const skeletonItem = document.createElement('div');
            skeletonItem.className = 'skeleton-item flex items-center gap-4 bg-[#f9f8fb] px-4 min-h-[72px] py-2 justify-between border-b border-gray-200';
            skeletonItem.innerHTML = `
                <div class="flex flex-col justify-center flex-1 gap-2">
                    <div class="skeleton-line h-4 bg-gray-300 rounded w-3/4"></div>
                    <div class="skeleton-line h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
                <div class="shrink-0 flex gap-2">
                    <div class="skeleton-button w-8 h-8 bg-gray-300 rounded-lg"></div>
                    <div class="skeleton-button w-20 h-8 bg-gray-300 rounded-lg"></div>
                </div>
            `;
            invoiceList.appendChild(skeletonItem);
        }
        
        if (!document.getElementById('skeleton-styles')) {
            const style = document.createElement('style');
            style.id = 'skeleton-styles';
            style.textContent = `@keyframes skeleton-loading { 0% { background-position: -200px 0; } 100% { background-position: calc(200px + 100%) 0; } } .skeleton-line, .skeleton-button { background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200px 100%; animation: skeleton-loading 1.5s infinite; } .skeleton-item { pointer-events: none; }`;
            document.head.appendChild(style);
        }
    }

    function hideLoading() {
        const skeletonItems = document.querySelectorAll('.skeleton-item');
        skeletonItems.forEach(item => item.remove());
    }
    
    function showPaymentLoading(text = 'Memproses...') {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'payment-loading-overlay';
        loadingOverlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;`;
        loadingOverlay.innerHTML = `<div style="background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);"><div class="loading-spinner" style="border: 4px solid #f3f3f3; border-top: 4px solid #683fe4; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 10px;"></div><div>${text}</div></div>`;
        
        if (!document.getElementById('payment-loading-styles')) {
            const style = document.createElement('style');
            style.id = 'payment-loading-styles';
            style.textContent = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
            document.head.appendChild(style);
        }
        document.body.appendChild(loadingOverlay);
    }

    function hidePaymentLoading() {
        const loadingOverlay = document.getElementById('payment-loading-overlay');
        if (loadingOverlay) loadingOverlay.remove();
    }
    
    function showSuccessNotification(message) {
        showNotification(message, '#28a745', '✓');
    }
    
    function showErrorNotification(message) {
        showNotification(message, '#dc3545', '⚠');
    }
    
    function showNotification(message, bgColor, icon) {
        const notification = document.createElement('div');
        notification.style.cssText = `position: fixed; top: 20px; right: 20px; background-color: ${bgColor}; color: white; padding: 15px 20px; border-radius: 8px; z-index: 1002; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2); animation: slideInRight 0.3s ease;`;
        notification.innerHTML = `<div style="display: flex; align-items: center; gap: 10px;"><span>${icon}</span><span>${message}</span></div>`;
        
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }`;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease forwards';
                notification.addEventListener('animationend', () => notification.remove());
            }
        }, 3000);
    }
});
