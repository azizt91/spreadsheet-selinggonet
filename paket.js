// paket.js - Package Management with CRUD
import { supabase } from './supabase-client.js';
import { requireRole } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
    await requireRole('ADMIN');

    // State Management
    let allPackages = [];
    let filteredPackages = [];
    let currentEditingPackageId = null;

    // DOM Selectors
    const views = { list: document.getElementById('list-view'), form: document.getElementById('form-view') };
    const packageList = document.getElementById('package-list');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const packageForm = document.getElementById('package-form');
    const formTitle = document.getElementById('form-title');
    const saveBtnText = document.getElementById('save-btn-text');
    const backToPelangganBtn = document.getElementById('back-to-pelanggan');

    // Initial Setup
    initializeEventListeners();
    fetchPackages();

    // Event Listeners
    function initializeEventListeners() {
        // Back buttons
        backToPelangganBtn?.addEventListener('click', () => window.location.href = 'pelanggan.html');
        document.getElementById('back-from-form')?.addEventListener('click', () => {
            if (confirm('Yakin ingin kembali? Perubahan yang belum disimpan akan hilang.')) {
                switchView('list');
            }
        });
        document.getElementById('cancel-btn')?.addEventListener('click', () => {
            if (confirm('Yakin ingin membatalkan? Perubahan yang belum disimpan akan hilang.')) {
                switchView('list');
            }
        });

        // Add package button
        document.getElementById('add-package-btn')?.addEventListener('click', () => {
            currentEditingPackageId = null;
            formTitle.textContent = 'Tambah Paket';
            saveBtnText.textContent = 'Simpan';
            packageForm.reset();
            switchView('form');
        });

        // Form submit
        packageForm.addEventListener('submit', handleSubmit);

        // Search functionality
        searchInput.addEventListener('input', handleSearch);
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearSearchBtn.classList.add('hidden');
            filteredPackages = [...allPackages];
            renderPackages();
        });

        // Event delegation for edit/delete buttons
        packageList.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-package-btn');
            const deleteBtn = e.target.closest('.delete-package-btn');

            if (editBtn) {
                const packageId = parseInt(editBtn.dataset.packageId);
                handleEdit(packageId);
            } else if (deleteBtn) {
                const packageId = parseInt(deleteBtn.dataset.packageId);
                handleDelete(packageId);
            }
        });
    }

    // View Management
    function switchView(viewName) {
        Object.values(views).forEach(view => view.classList.add('hidden'));
        if (views[viewName]) views[viewName].classList.remove('hidden');
        window.scrollTo(0, 0);
    }

    // Fetch Packages
    async function fetchPackages() {
        showSkeletonLoading();
        
        try {
            const { data, error } = await supabase
                .from('packages')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            allPackages = data || [];
            filteredPackages = [...allPackages];
            renderPackages();
        } catch (error) {
            console.error('Error fetching packages:', error);
            showError('Gagal memuat data paket');
        }
    }

    // Render Packages
    function renderPackages() {
        if (filteredPackages.length === 0) {
            packageList.innerHTML = `
                <div class="flex flex-col items-center justify-center py-16 px-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64px" height="64px" fill="#d1d5db" viewBox="0 0 256 256">
                        <path d="M224,48H32A16,16,0,0,0,16,64V192a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V64A16,16,0,0,0,224,48Zm0,144H32V64H224V192ZM176,88a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,88Zm0,40a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,128Z"></path>
                    </svg>
                    <p class="text-gray-500 mt-4 text-center">
                        ${searchInput.value ? 'Paket tidak ditemukan' : 'Belum ada paket. Tambah paket baru!'}
                    </p>
                </div>
            `;
            return;
        }

        packageList.innerHTML = filteredPackages.map(pkg => createPackageCard(pkg)).join('');
    }

    // Create Package Card
    function createPackageCard(pkg) {
        const formatter = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        });

        return `
            <div class="bg-white rounded-xl shadow-sm p-4 mx-4 mb-3 hover:shadow-md transition-shadow">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <h3 class="text-[#110e1b] text-lg font-bold">${pkg.package_name}</h3>
                            <span class="inline-flex items-center bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-semibold">ID: ${pkg.id}</span>
                        </div>
                        <div class="flex items-center gap-2 mb-2">
                            <span class="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-semibold">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256">
                                    <path d="M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128C223.84,141.46,192.43,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z"></path>
                                </svg>
                                ${pkg.speed_mbps} Mbps
                            </span>
                        </div>
                        <p class="text-[#110e1b] text-2xl font-bold text-green-600">${formatter.format(pkg.price)}</p>
                        ${pkg.description ? `<p class="text-sm text-gray-600 mt-2">${pkg.description}</p>` : ''}
                    </div>
                    <div class="flex gap-2 ml-4">
                        <button class="edit-package-btn flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors" data-package-id="${pkg.id}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" fill="currentColor" viewBox="0 0 256 256">
                                <path d="M227.31,73.37,182.63,28.69a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96A16,16,0,0,0,227.31,73.37ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.69,147.31,64l24-24L216,84.69Z"></path>
                            </svg>
                        </button>
                        <button class="delete-package-btn flex items-center justify-center w-10 h-10 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors" data-package-id="${pkg.id}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" fill="currentColor" viewBox="0 0 256 256">
                                <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Handle Search
    function handleSearch() {
        const query = searchInput.value.toLowerCase().trim();
        
        if (query) {
            clearSearchBtn.classList.remove('hidden');
            filteredPackages = allPackages.filter(pkg => 
                pkg.package_name.toLowerCase().includes(query) ||
                (pkg.description && pkg.description.toLowerCase().includes(query))
            );
        } else {
            clearSearchBtn.classList.add('hidden');
            filteredPackages = [...allPackages];
        }
        
        renderPackages();
    }

    // Handle Submit
    async function handleSubmit(e) {
        e.preventDefault();
        
        const packageData = {
            package_name: document.getElementById('package-name').value.trim(),
            price: parseFloat(document.getElementById('package-price').value),
            speed_mbps: parseInt(document.getElementById('package-speed').value),
            description: document.getElementById('package-description').value.trim() || null
        };

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        saveBtnText.textContent = 'Menyimpan...';

        try {
            if (currentEditingPackageId) {
                // Update existing package
                const { error } = await supabase
                    .from('packages')
                    .update(packageData)
                    .eq('id', currentEditingPackageId);

                if (error) throw error;
                showSuccess('Paket berhasil diperbarui');
            } else {
                // Create new package
                const { error } = await supabase
                    .from('packages')
                    .insert([packageData]);

                if (error) throw error;
                showSuccess('Paket berhasil ditambahkan');
            }

            await fetchPackages();
            switchView('list');
        } catch (error) {
            console.error('Error saving package:', error);
            showError('Gagal menyimpan paket: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            saveBtnText.textContent = 'Simpan';
        }
    }

    // Handle Edit
    function handleEdit(packageId) {
        const pkg = allPackages.find(p => p.id === packageId);
        if (!pkg) return;

        currentEditingPackageId = packageId;
        formTitle.textContent = 'Edit Paket';
        saveBtnText.textContent = 'Perbarui';

        document.getElementById('package-name').value = pkg.package_name;
        document.getElementById('package-price').value = pkg.price;
        document.getElementById('package-speed').value = pkg.speed_mbps;
        document.getElementById('package-description').value = pkg.description || '';

        switchView('form');
    }

    // Handle Delete
    async function handleDelete(packageId) {
        const pkg = allPackages.find(p => p.id === packageId);
        if (!pkg) return;

        if (!confirm(`Yakin ingin menghapus paket "${pkg.package_name}"?\n\nPeringatan: Pelanggan yang menggunakan paket ini akan terpengaruh.`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('packages')
                .delete()
                .eq('id', packageId);

            if (error) throw error;

            showSuccess('Paket berhasil dihapus');
            await fetchPackages();
        } catch (error) {
            console.error('Error deleting package:', error);
            showError('Gagal menghapus paket: ' + error.message);
        }
    }

    // Skeleton Loading
    function showSkeletonLoading() {
        packageList.innerHTML = Array(3).fill(0).map(() => `
            <div class="bg-white rounded-xl shadow-sm p-4 mx-4 mb-3 animate-pulse">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="h-6 bg-gray-200 rounded w-48 mb-2"></div>
                        <div class="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                        <div class="h-8 bg-gray-200 rounded w-32 mb-2"></div>
                        <div class="h-4 bg-gray-200 rounded w-full"></div>
                    </div>
                    <div class="flex gap-2 ml-4">
                        <div class="w-10 h-10 bg-gray-200 rounded-full"></div>
                        <div class="w-10 h-10 bg-gray-200 rounded-full"></div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Notification Functions
    function showSuccess(message) {
        alert('✓ ' + message);
    }

    function showError(message) {
        alert('✗ ' + message);
    }
});
