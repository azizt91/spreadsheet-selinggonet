// pelanggan.js (Supabase Version - FINAL & COMPLETE with Event Delegation)
import { supabase } from './supabase-client.js';
import { requireRole } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
    await requireRole('ADMIN');

    // State Management
    let allPackages = [];
    let currentEditingProfileId = null;
    let lastView = 'list';
    let currentFilter = 'all';

    // DOM Selectors
    const views = { list: document.getElementById('list-view'), detail: document.getElementById('detail-view'), form: document.getElementById('form-view') };
    const customerList = document.getElementById('customer-list');
    const searchInput = document.getElementById('search-input');
    const filterButtons = { all: document.getElementById('filter-all'), active: document.getElementById('filter-active'), inactive: document.getElementById('filter-inactive') };
    const customerForm = document.getElementById('customer-form');
    const modalTitle = document.getElementById('modal-title');
    const saveBtnText = document.getElementById('save-btn-text');
    const newUserFields = document.getElementById('new-user-fields');
    const editUserFields = document.getElementById('edit-user-fields');

    // Initial Setup
    initializeEventListeners();
    checkURLParameters(); // Check for URL parameters first
    fetchInitialData();

    // URL Parameter Handler
    function checkURLParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        const statusParam = urlParams.get('status');
        
        if (statusParam) {
            // Map status parameter to filter
            if (statusParam === 'AKTIF') {
                currentFilter = 'active';
                setActiveFilterButton('active');
            } else if (statusParam === 'NONAKTIF') {
                currentFilter = 'inactive';
                setActiveFilterButton('inactive');
            }
            
            // Remove URL parameter after processing (optional)
            // window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    // Helper function to set active filter button
    function setActiveFilterButton(filterType) {
        // Reset all buttons first
        Object.values(filterButtons).forEach(btn => {
            btn.classList.remove('bg-[#683fe4]');
            btn.classList.add('bg-[#eae8f3]');
            const btnText = btn.querySelector('p');
            if (btnText) {
                btnText.classList.remove('text-white');
                btnText.classList.add('text-[#110e1b]');
            }
        });

        // Set active button
        const activeButton = filterButtons[filterType];
        if (activeButton) {
            activeButton.classList.remove('bg-[#eae8f3]');
            activeButton.classList.add('bg-[#683fe4]');
            const activeButtonText = activeButton.querySelector('p');
            if (activeButtonText) {
                activeButtonText.classList.remove('text-[#110e1b]');
                activeButtonText.classList.add('text-white');
            }
        }
    }

    // View Management
    function switchView(viewName) {
        Object.values(views).forEach(view => view.classList.add('hidden'));
        if (views[viewName]) views[viewName].classList.remove('hidden');
        window.scrollTo(0, 0);
    }

    // Event Listeners using Event Delegation
    function initializeEventListeners() {
        document.body.addEventListener('click', (event) => {
            const button = event.target.closest('button');
            if (!button) return;

            const id = button.id;

            if (id === 'back-from-form' || id === 'cancel-btn' || id === 'back-from-detail') {
                if (id !== 'back-from-detail' && confirm('Yakin ingin kembali? Perubahan yang belum disimpan akan hilang.')) {
                    switchView(lastView);
                } else if (id === 'back-from-detail') {
                    switchView('list');
                }
                return;
            }

            if (id === 'edit-customer-icon-btn') {
                handleEditFromDetailView();
                return;
            }

            if (id === 'add-customer-btn') {
                openAddForm();
                return;
            }
        });

        // Listeners for non-button elements or form submissions
        searchInput.addEventListener('input', () => fetchData());
        customerForm.addEventListener('submit', handleFormSubmit);
        
        // Churn Date Logic - Show/Hide based on status
        document.getElementById('customer-status').addEventListener('change', function() {
            const churnDateContainer = document.getElementById('churn-date-container');
            if (this.value === 'NONAKTIF') {
                churnDateContainer.classList.remove('hidden');
            } else {
                churnDateContainer.classList.add('hidden');
            }
        });
        document.getElementById('customer-package').addEventListener('change', handlePaketChange);


        // Filter buttons
        Object.keys(filterButtons).forEach(key => {
            filterButtons[key].addEventListener('click', () => {
                currentFilter = key; // Set filter yang sedang aktif

                // Loop ke semua tombol filter untuk mereset tampilannya
                Object.values(filterButtons).forEach(btn => {
                    btn.classList.remove('bg-[#683fe4]', 'text-white'); // Hapus kelas aktif
                    btn.classList.add('bg-[#eae8f3]'); // Kembalikan warna latar non-aktif
                    
                    // Ambil elemen <p> di dalam tombol
                    const textElement = btn.querySelector('p');
                    if (textElement) {
                        textElement.classList.remove('text-white'); // Hapus warna teks aktif
                        textElement.classList.add('text-[#110e1b]'); // Kembalikan warna teks non-aktif
                    }
                });

                const activeButton = filterButtons[key];
                // Terapkan kelas aktif pada tombol yang baru diklik
                activeButton.classList.remove('bg-[#eae8f3]');
                activeButton.classList.add('bg-[#683fe4]', 'text-white');
                
                // Terapkan warna teks aktif pada elemen <p> di dalamnya
                const activeText = activeButton.querySelector('p');
                if (activeText) {
                    activeText.classList.remove('text-[#110e1b]');
                    activeText.classList.add('text-white'); // Menggunakan 'text-white' yang lebih standar di Tailwind
                }

                fetchData(); // Muat ulang data sesuai filter baru
            });
        });

    }

    // Data Fetching
    async function fetchInitialData() {
        showLoading();
        await fetchPackages();
        await fetchData();
        
        // Only set "Semua" as active if no URL parameter was processed
        if (currentFilter === 'all') {
            setActiveFilterButton('all');
        }
    }

    async function fetchPackages() {
        const { data, error } = await supabase.from('packages').select('*').order('price', { ascending: true });
        if (error) {
            console.error('Error fetching packages:', error);
            return;
        }
        allPackages = data;
        populatePaketDropdown();
    }

    async function fetchData() {
        showLoading();
        const { data, error } = await supabase.rpc('get_all_customers', {
            p_filter: currentFilter,
            p_search_term: searchInput.value
        });

        if (error) {
            console.error('Error fetching profiles:', error);
            customerList.innerHTML = `<p class="text-center text-red-500 p-4">Gagal memuat data: ${error.message}</p>`;
            return;
        }
        renderCustomerList(data);
    }

    function renderCustomerList(data) {
        customerList.innerHTML = '';
        if (!data || data.length === 0) {
            customerList.innerHTML = `<p class="text-center text-gray-500 p-4">Tidak ada pelanggan ditemukan.</p>`;
            return;
        }
        data.forEach(profile => {
            const statusColor = profile.status === 'AKTIF' ? 'bg-green-500' : 'bg-red-500';
            
            // Untuk pelanggan nonaktif, tampilkan tanggal cabut. Untuk aktif, tampilkan tanggal terdaftar
            let dateInfo;
            if (profile.status === 'NONAKTIF') {
                const churnDate = profile.churn_date 
                    ? new Date(profile.churn_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                    : 'Belum diatur'; // Teks pengganti jika tanggal kosong
                dateInfo = `Cabut: ${churnDate}`;
            } else {
                const installDate = profile.installation_date ? new Date(profile.installation_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';
                dateInfo = `Terdaftar: ${installDate}`;
            }
            
            const customerItem = document.createElement('div');
            customerItem.className = "flex items-center gap-4 bg-white px-4 min-h-[72px] py-2 justify-between border-b border-gray-100 cursor-pointer hover:bg-gray-50";
            customerItem.innerHTML = `
                <div class="flex items-center gap-4 w-full">
                    <div class="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-14 w-14 shrink-0" style="background-image: url('${profile.photo_url || 'assets/login_illustration.svg'}');"></div>
                    <div class="flex flex-col justify-center overflow-hidden">
                        <p class="text-[#110e1b] text-base font-medium truncate">${profile.full_name}</p>
                        <p class="text-[#625095] text-sm">${dateInfo}</p>
                    </div>
                    <div class="shrink-0 ml-auto"><div class="flex size-7 items-center justify-center"><div class="size-3 rounded-full ${statusColor}"></div></div></div>
                </div>`;
            customerItem.addEventListener('click', () => openDetailView(profile.id));
            customerList.appendChild(customerItem);
        });
    }

    // Form & Detail View Logic
    function populatePaketDropdown() {
        const paketSelect = document.getElementById('customer-package');
        paketSelect.innerHTML = '<option value="">-- Pilih Paket --</option>';
        allPackages.forEach(pkg => {
            paketSelect.innerHTML += `<option value="${pkg.id}" data-price="${pkg.price}">${pkg.package_name} - ${pkg.speed_mbps} Mbps</option>`;
        });
    }
    
    function handlePaketChange(event) {
        const selectedOption = event.target.options[event.target.selectedIndex];
        const price = selectedOption.dataset.price || '0';
        document.getElementById('customer-bill').value = price;
    }

    function openAddForm() {
        customerForm.reset();
        currentEditingProfileId = null;
        modalTitle.textContent = 'Tambah Pelanggan';
        saveBtnText.textContent = 'Simpan';
        newUserFields.classList.remove('hidden');
        editUserFields.classList.add('hidden');
        document.getElementById('customer-email').required = true;
        document.getElementById('customer-password').required = true;
        lastView = 'list';
        switchView('form');
    }

    async function openEditForm(profile) {
        customerForm.reset();
        currentEditingProfileId = profile.id;
        modalTitle.textContent = 'Edit Pelanggan';
        saveBtnText.textContent = 'Update';
        newUserFields.classList.add('hidden');
        editUserFields.classList.remove('hidden');
        document.getElementById('customer-email').required = false;
        document.getElementById('customer-password').required = false;

        // Get user email for editing
        const { data: userEmail } = await supabase.rpc('get_user_email', { user_id: profile.id });
        
        document.getElementById('customer-name').value = profile.full_name || '';
        document.getElementById('customer-address').value = profile.address || '';
        document.getElementById('customer-whatsapp').value = profile.whatsapp_number || '';
        document.getElementById('customer-gender').value = profile.gender || '';
        document.getElementById('customer-status').value = profile.status || 'AKTIF';
        document.getElementById('customer-device').value = profile.device_type || '';
        document.getElementById('customer-ip').value = profile.ip_static_pppoe || '';
        document.getElementById('edit-customer-email').value = userEmail || '';
        document.getElementById('edit-customer-password').value = '';
        
        // Churn Date Logic - Show/Hide and populate based on status
        const churnDateContainer = document.getElementById('churn-date-container');
        const churnDateInput = document.getElementById('customer-churn-date');
        
        if (profile.status === 'NONAKTIF') {
            churnDateContainer.classList.remove('hidden');
        } else {
            churnDateContainer.classList.add('hidden');
        }
        
        // Fill churn_date if exists
        churnDateInput.value = profile.churn_date || '';
        
        const { data: invoice } = await supabase.from('invoices').select('package_id, packages(price)').eq('customer_id', profile.id).order('invoice_period', { ascending: false }).limit(1).single();
        if (invoice) {
            document.getElementById('customer-package').value = invoice.package_id;
            document.getElementById('customer-bill').value = invoice.packages ? invoice.packages.price : '0';
        }

        lastView = 'detail';
        switchView('form');
    }

    async function handleEditFromDetailView() {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentEditingProfileId).single();
        if (profile) openEditForm(profile);
    }

    async function openDetailView(profileId) {
        lastView = 'list';
        switchView('detail');
        
        // Show loading state without removing existing elements
        const profileImage = document.getElementById('detail-profile-image');
        const customerName = document.getElementById('detail-customer-name');
        const customerId = document.getElementById('detail-customer-id');
        
        if (customerName) customerName.textContent = 'Memuat...';
        if (customerId) customerId.textContent = 'Memuat...';

        const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', profileId).single();

        if (error || !profile) {
            console.error('Error fetching profile detail:', error);
            if (customerName) customerName.textContent = 'Gagal memuat data';
            if (customerId) customerId.textContent = 'Error';
            return;
        }
        
        currentEditingProfileId = profile.id;
        
        // Update profile image
        if (profileImage) {
            profileImage.style.backgroundImage = `url('${profile.photo_url || 'assets/login_illustration.svg'}')`;
        }
        
        // Update basic info
        if (customerName) customerName.textContent = profile.full_name || '-';
        if (customerId) customerId.textContent = profile.idpl || '-';

        // Get latest invoice data
        const { data: latest_invoice, error: invoiceError } = await supabase.from('invoices').select('*, packages(*)').eq('customer_id', profile.id).order('invoice_period', { ascending: false }).limit(1).single();

        // Panggil database function 'get_user_email' untuk mendapatkan email
        const { data: userEmail, error: emailError } = await supabase.rpc('get_user_email', { user_id: profile.id });
        if (emailError) console.error('Gagal mengambil email:', emailError);

        // Update individual detail fields using existing IDs
        const detailElements = {
            'detail-idpl': profile.idpl,
            'detail-nama': profile.full_name,
            'detail-alamat': profile.address,
            'detail-gender': profile.gender,
            'detail-whatsapp': profile.whatsapp_number,
            'detail-email': userEmail || '-',
            'detail-paket': latest_invoice && latest_invoice.packages ? latest_invoice.packages.package_name : '-',
            'detail-tagihan': latest_invoice && latest_invoice.packages && latest_invoice.packages.price ? 
                new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(latest_invoice.packages.price) : 
                (latest_invoice && latest_invoice.amount ? 
                    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(latest_invoice.amount) : 
                    'Belum ada tagihan'),
            'detail-status': profile.status,
            'detail-tanggal-pasang': (() => {
                if (profile.status === 'NONAKTIF') {
                    if (profile.churn_date) {
                        return new Date(profile.churn_date).toLocaleDateString('id-ID');
                    } else {
                        return 'Belum diset';
                    }
                } else {
                    return profile.installation_date ? new Date(profile.installation_date).toLocaleDateString('id-ID') : '-';
                }
            })(),
            'detail-jenis-perangkat': profile.device_type,
            'detail-ip-static': profile.ip_static_pppoe
        };
        
        // Update each detail field
        Object.entries(detailElements).forEach(([elementId, value]) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = value || '-';
            }
        });
        
        // Update label for tanggal pasang based on status
        const tanggalPasangLabel = document.evaluate("//p[contains(text(), 'TANGGAL PASANG') or contains(text(), 'TANGGAL CABUT')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        if (tanggalPasangLabel) {
            if (profile.status === 'NONAKTIF') {
                tanggalPasangLabel.textContent = 'TANGGAL CABUT';
            } else {
                tanggalPasangLabel.textContent = 'TANGGAL PASANG';
            }
        }

        // Show unpaid bills section and load bills
        const unpaidBillsSection = document.getElementById('unpaid-bills-section');
        if (unpaidBillsSection) {
            unpaidBillsSection.classList.remove('hidden');
        }
        
        loadUnpaidBills(profile.id);
    }

    async function handleFormSubmit(event) {
        event.preventDefault();
        const saveBtn = document.getElementById('save-customer-btn');
        const isEditing = !!currentEditingProfileId;

        if (isEditing) {
            if (!confirm('Yakin ingin menyimpan perubahan?')) return;
            setButtonLoading(saveBtn, true, 'Update');
            
            const statusValue = document.getElementById('customer-status').value;
            const churnDateValue = document.getElementById('customer-churn-date').value;
            const gender = document.getElementById('customer-gender').value;

            // Set photo_url based on gender (same logic as create)
            let photoUrl = null;
            if (gender === 'LAKI-LAKI') {
                photoUrl = 'https://sb-admin-pro.startbootstrap.com/assets/img/illustrations/profiles/profile-2.png';
            } else if (gender === 'PEREMPUAN') {
                photoUrl = 'https://sb-admin-pro.startbootstrap.com/assets/img/illustrations/profiles/profile-1.png';
            }

            const profileData = {
                full_name: document.getElementById('customer-name').value,
                address: document.getElementById('customer-address').value,
                whatsapp_number: document.getElementById('customer-whatsapp').value,
                gender: gender,
                status: statusValue,
                device_type: document.getElementById('customer-device').value,
                ip_static_pppoe: document.getElementById('customer-ip').value,
                photo_url: photoUrl,
                // Churn Date Logic sesuai saran Gemini AI
                churn_date: statusValue === 'NONAKTIF' ? (churnDateValue || new Date().toISOString().split('T')[0]) : null
            };

            // Update profile data
            const { error: profileError } = await supabase.from('profiles').update(profileData).eq('id', currentEditingProfileId);

            if (profileError) {
                showErrorNotification(profileError.message);
                setButtonLoading(saveBtn, false, 'Update');
                return;
            }

            // Update package if changed
            const newPackageId = document.getElementById('customer-package').value;
            const newAmount = document.getElementById('customer-bill').value;

            if (newPackageId && newAmount) {
                // Get current month invoice period
                const now = new Date();
                const currentMonthName = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(now);
                const currentYear = now.getFullYear();
                const currentPeriod = `${currentMonthName} ${currentYear}`;

                // Update current month invoice if exists, or create new one
                const { data: existingInvoice } = await supabase
                    .from('invoices')
                    .select('id')
                    .eq('customer_id', currentEditingProfileId)
                    .eq('invoice_period', currentPeriod)
                    .single();

                if (existingInvoice) {
                    // Update existing invoice
                    const { error: invoiceUpdateError } = await supabase
                        .from('invoices')
                        .update({
                            package_id: parseInt(newPackageId),
                            amount: parseFloat(newAmount),
                            total_due: parseFloat(newAmount) // TAMBAHAN: total_due sama dengan amount
                        })
                        .eq('id', existingInvoice.id);

                    if (invoiceUpdateError) {
                        console.error('Error updating invoice:', invoiceUpdateError);
                    }
                } else {
                    // Create new invoice for current month
                    const { error: invoiceCreateError } = await supabase
                        .from('invoices')
                        .insert({
                            customer_id: currentEditingProfileId,
                            package_id: parseInt(newPackageId),
                            invoice_period: currentPeriod,
                            amount: parseFloat(newAmount),
                            total_due: parseFloat(newAmount), // TAMBAHAN: total_due sama dengan amount
                            status: 'unpaid'
                        });

                    if (invoiceCreateError) {
                        console.error('Error creating invoice:', invoiceCreateError);
                    }
                }
            }

            // Update email and password if provided
            const newEmail = document.getElementById('edit-customer-email').value;
            const newPassword = document.getElementById('edit-customer-password').value;

            if (newEmail || newPassword) {
                const updateData = {};
                if (newEmail) updateData.email = newEmail;
                if (newPassword) updateData.password = newPassword;

                const { data, error: functionError } = await supabase.functions.invoke('update-user-auth', {
                    body: {
                        user_id: currentEditingProfileId,
                        update_data: updateData
                    }
                });

                if (functionError) {
                    showErrorNotification('Data pelanggan diperbarui, tapi gagal mengubah email/password: ' + functionError.message);
                } else if (data && !data.success) {
                    showErrorNotification('Gagal mengubah email/password: ' + data.message);
                } else {
                    showSuccessNotification('Data pelanggan dan kredensial berhasil diperbarui!');
                }
            } else {
                showSuccessNotification('Data pelanggan berhasil diperbarui!');
            }

            await fetchData();
            openDetailView(currentEditingProfileId);
            setButtonLoading(saveBtn, false, 'Update');

        } else {
            // Add Logic
            const genderElement = document.getElementById('customer-gender');
            const gender = genderElement.value;
            let photoUrl = '';
            
            // Set photo_url based on gender
            if (gender === 'LAKI-LAKI') {
                photoUrl = 'https://sb-admin-pro.startbootstrap.com/assets/img/illustrations/profiles/profile-2.png';
            } else if (gender === 'PEREMPUAN') {
                photoUrl = 'https://sb-admin-pro.startbootstrap.com/assets/img/illustrations/profiles/profile-1.png';
            }
            
            // Generate IDPL berurut
            let idpl = 'CST001'; // Default jika belum ada data

            try {
                // Ambil semua IDPL yang dimulai dengan CST
                const { data: customers, error: customersError } = await supabase
                    .from('profiles')
                    .select('idpl')
                    .like('idpl', 'CST%');

                if (!customersError && customers && customers.length > 0) {
                    // Extract semua nomor dan cari yang tertinggi
                    const numbers = customers
                        .map(customer => {
                            const match = customer.idpl.match(/^CST(\d+)$/);
                            return match ? parseInt(match[1], 10) : 0;
                        })
                        .filter(num => !isNaN(num));

                    if (numbers.length > 0) {
                        const highestNumber = Math.max(...numbers);
                        const nextNumber = highestNumber + 1;
                        // Format ke 3 digit dengan leading zeros
                        idpl = `CST${nextNumber.toString().padStart(3, '0')}`;
                    }
                }
            } catch (error) {
                console.error('Error getting last IDPL:', error);
                // Jika error, gunakan default CST001
            }

            console.log('Generated IDPL:', idpl);

            const customerData = {
                email: document.getElementById('customer-email').value,
                password: document.getElementById('customer-password').value,
                full_name: document.getElementById('customer-name').value,
                address: document.getElementById('customer-address').value,
                whatsapp_number: document.getElementById('customer-whatsapp').value,
                gender: gender,
                status: document.getElementById('customer-status').value,
                device_type: document.getElementById('customer-device').value,
                ip_static_pppoe: document.getElementById('customer-ip').value,
                photo_url: photoUrl,
                idpl: idpl,
                installation_date: new Date().toISOString(),
                package_id: parseInt(document.getElementById('customer-package').value),
                amount: parseFloat(document.getElementById('customer-bill').value)
            };

            if (!customerData.email || !customerData.password || !customerData.package_id) {
                showErrorNotification("Email, Password, dan Paket harus diisi.");
                return;
            }
            if (isNaN(customerData.package_id) || customerData.package_id <= 0) {
                showErrorNotification("Paket harus dipilih dengan benar.");
                return;
            }
            if (isNaN(customerData.amount) || customerData.amount <= 0) {
                showErrorNotification("Tagihan bulanan harus berupa angka yang valid.");
                return;
            }
            if (customerData.password.length < 6) {
                showErrorNotification("Password harus terdiri dari minimal 6 karakter.");
                return;
            }

            setButtonLoading(saveBtn, true, 'Simpan');

            // Debug: Log data yang akan dikirim
            console.log('Customer data to be sent:', customerData);

            const { data, error } = await supabase.functions.invoke('create-customer', { body: customerData });

            // Debug: Log response
            console.log('Supabase function response:', { data, error });

            if (error) {
                console.error('Supabase function error:', error);
                showErrorNotification(`Error: ${error.message}`);
            } else if (data && data.error) {
                console.error('Function returned error:', data.error);
                showErrorNotification(`Error: ${data.error}`);
            } else {
                showSuccessNotification(data?.message || 'Pelanggan berhasil ditambahkan!');
                await fetchData();
                switchView('list');
            }
            setButtonLoading(saveBtn, false, 'Simpan');
        }
    }

    // UI Helpers
    function showLoading() {
        customerList.innerHTML = Array(10).fill('').map(() => `<div class="skeleton-item flex items-center gap-4 bg-white px-4 min-h-[72px] py-2 justify-between border-b border-gray-100 animate-pulse"><div class="flex items-center gap-4"><div class="bg-gray-200 rounded-full h-14 w-14"></div><div class="flex flex-col justify-center gap-2"><div class="bg-gray-200 h-4 w-32 rounded"></div><div class="bg-gray-200 h-3 w-24 rounded"></div></div></div><div class="shrink-0"><div class="bg-gray-200 size-3 rounded-full"></div></div></div>`).join('');
    }

    async function loadUnpaidBills(profileId) {
        const unpaidBillsList = document.getElementById('unpaid-bills-list');
        unpaidBillsList.innerHTML = '<p class="text-sm text-gray-500 px-4">Memuat tagihan...</p>';
        
        // const { data, error } = await supabase.from('invoices').select('*').eq('customer_id', profileId).eq('status', 'unpaid');
        const { data, error } = await supabase.from('invoices').select('*, profiles!inner(*), packages(price)').eq('customer_id', profileId).eq('status', 'unpaid');

        if (error) {
            unpaidBillsList.innerHTML = `<p class="text-sm text-red-500 px-4">Gagal memuat tagihan.</p>`;
            return;
        }

        if (data.length > 0) {
            unpaidBillsList.innerHTML = '';
            data.forEach(bill => {
                unpaidBillsList.innerHTML += `
                    <div class="flex items-center gap-4 bg-[#f0eff3] px-4 min-h-[72px] py-2 justify-between rounded-lg mb-2">
                        <div class="flex flex-col justify-center">
                            <p class="text-[#110e1b] text-base font-medium">${bill.profiles.full_name || '-'}</p>
                            <p class="text-[#625095] text-sm">${bill.invoice_period || '-'}</p>
                        </div>
                        <div class="shrink-0"><p class="text-yellow-600 text-sm font-bold">${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(bill.packages ? bill.packages.price : bill.amount)}</p></div>
                    </div>`;
            });
        } else {
            unpaidBillsList.innerHTML = '<p class="text-sm text-gray-500 px-4">Tidak ada tagihan yang belum dibayar.</p>';
        }
    }
    
    function setButtonLoading(button, isLoading, originalText) {
        const span = button.querySelector('span');
        if (span) {
            button.disabled = isLoading;
            span.textContent = isLoading ? 'Memproses...' : originalText;
        }
    }

    function showSuccessNotification(message) { alert(message); }
    function showErrorNotification(message) { alert(message); }
});
