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
    fetchInitialData();

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

            if (id === 'edit-customer-detail-btn') {
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
        document.getElementById('customer-package').addEventListener('change', handlePaketChange);

        // Filter buttons
        Object.keys(filterButtons).forEach(key => {
            filterButtons[key].addEventListener('click', () => {
                currentFilter = key;
                Object.values(filterButtons).forEach(btn => btn.classList.remove('bg-[#501ee6]', 'text-white'));
                filterButtons[key].classList.add('bg-[#501ee6]', 'text-white');
                fetchData();
            });
        });
    }

    // Data Fetching
    async function fetchInitialData() {
        showLoading();
        await fetchPackages();
        await fetchData();
        filterButtons.all.classList.add('bg-[#501ee6]', 'text-white');
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
            const installDate = profile.installation_date ? new Date(profile.installation_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';
            const customerItem = document.createElement('div');
            customerItem.className = "flex items-center gap-4 bg-white px-4 min-h-[72px] py-2 justify-between border-b border-gray-100 cursor-pointer hover:bg-gray-50";
            customerItem.innerHTML = `
                <div class="flex items-center gap-4 w-full">
                    <div class="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-14 w-14 shrink-0" style="background-image: url('${profile.photo_url || 'assets/login_illustration.svg'}');"></div>
                    <div class="flex flex-col justify-center overflow-hidden">
                        <p class="text-[#110e1b] text-base font-medium truncate">${profile.full_name}</p>
                        <p class="text-[#625095] text-sm">Terdaftar: ${installDate}</p>
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
        
        const { data: invoice } = await supabase.from('invoices').select('package_id, amount').eq('customer_id', profile.id).order('invoice_period', { ascending: false }).limit(1).single();
        if (invoice) {
            document.getElementById('customer-package').value = invoice.package_id;
            document.getElementById('customer-bill').value = invoice.amount;
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
        const { data: latest_invoice } = await supabase.from('invoices').select('*, packages(*)').eq('customer_id', profile.id).order('invoice_period', { ascending: false }).limit(1).single();

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
            'detail-tagihan': latest_invoice ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(latest_invoice.amount) : '-',
            'detail-status': profile.status,
            'detail-tanggal-pasang': profile.installation_date ? new Date(profile.installation_date).toLocaleDateString('id-ID') : '-',
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
            
            const profileData = {
                full_name: document.getElementById('customer-name').value,
                address: document.getElementById('customer-address').value,
                whatsapp_number: document.getElementById('customer-whatsapp').value,
                gender: document.getElementById('customer-gender').value,
                status: document.getElementById('customer-status').value,
                device_type: document.getElementById('customer-device').value,
                ip_static_pppoe: document.getElementById('customer-ip').value
            };

            // Update profile data
            const { error: profileError } = await supabase.from('profiles').update(profileData).eq('id', currentEditingProfileId);

            if (profileError) {
                showErrorNotification(profileError.message);
                setButtonLoading(saveBtn, false, 'Update');
                return;
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
            const customerData = {
                email: document.getElementById('customer-email').value,
                password: document.getElementById('customer-password').value,
                full_name: document.getElementById('customer-name').value,
                address: document.getElementById('customer-address').value,
                whatsapp_number: document.getElementById('customer-whatsapp').value,
                gender: document.getElementById('customer-gender').value,
                status: document.getElementById('customer-status').value,
                device_type: document.getElementById('customer-device').value,
                ip_static_pppoe: document.getElementById('customer-ip').value,
                idpl: `CST${Date.now()}`,
                installation_date: new Date().toISOString(),
                package_id: document.getElementById('customer-package').value,
                amount: document.getElementById('customer-bill').value
            };

            if (!customerData.email || !customerData.password || !customerData.package_id) {
                showErrorNotification("Email, Password, dan Paket harus diisi.");
                return;
            }
            if (customerData.password.length < 6) {
                showErrorNotification("Password harus terdiri dari minimal 6 karakter.");
                return;
            }

            setButtonLoading(saveBtn, true, 'Simpan');
            const { data, error } = await supabase.functions.invoke('create-customer', { body: customerData });

            if (error) {
                showErrorNotification(error.message);
            } else {
                showSuccessNotification(data.message || 'Pelanggan berhasil ditambahkan!');
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
        const { data, error } = await supabase.from('invoices').select('*, profiles!inner(*)').eq('customer_id', profileId).eq('status', 'unpaid');

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
                        <div class="shrink-0"><p class="text-yellow-600 text-sm font-bold">${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(bill.amount)}</p></div>
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