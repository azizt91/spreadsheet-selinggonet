// csv-import.js - CSV Import Module for Pelanggan
import { supabase } from './supabase-client.js';

export function initializeCSVImport(fetchDataCallback) {
    // DOM Elements
    const importBtn = document.getElementById('import-csv-btn');
    const modal = document.getElementById('csv-import-modal');
    const closeBtn = document.getElementById('close-csv-modal');
    const cancelBtn = document.getElementById('cancel-import-btn');
    const downloadTemplateBtn = document.getElementById('download-template-btn');
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('csv-file-input');
    const previewSection = document.getElementById('csv-preview-section');
    const previewTable = document.getElementById('csv-preview-table');
    const rowCountSpan = document.getElementById('csv-row-count');
    const startImportBtn = document.getElementById('start-import-btn');
    const progressSection = document.getElementById('import-progress-section');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const summarySection = document.getElementById('import-summary-section');
    const successCount = document.getElementById('success-count');
    const failedCount = document.getElementById('failed-count');
    const errorDetails = document.getElementById('error-details');

    let parsedData = [];
    
    // Event Listeners
    importBtn?.addEventListener('click', openModal);
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
    downloadTemplateBtn?.addEventListener('click', downloadTemplate);
    // File input change listener - label handles the click (mobile-friendly)
    fileInput?.addEventListener('change', handleFileSelect);
    startImportBtn?.addEventListener('click', startImport);
    
    // Drag & Drop (Desktop only)
    uploadArea?.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('border-[#683fe4]', 'bg-purple-50');
    });
    
    uploadArea?.addEventListener('dragleave', () => {
        uploadArea.classList.remove('border-[#683fe4]', 'bg-purple-50');
    });
    
    uploadArea?.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('border-[#683fe4]', 'bg-purple-50');
        const files = e.dataTransfer.files;
        
        if (files.length > 0) {
            const file = files[0];
            // Check both filename extension and MIME type
            const isCSV = file.name.toLowerCase().endsWith('.csv') || 
                         file.type === 'text/csv' || 
                         file.type === 'application/csv' ||
                         file.type === 'text/comma-separated-values' ||
                         file.type === 'text/plain';
            
            if (isCSV) {
                handleFile(file);
            } else {
                alert('Hanya file CSV yang diizinkan');
            }
        }
    });
    
    function openModal() {
        modal.classList.remove('hidden');
        resetModal();
    }
    
    function closeModal() {
        modal.classList.add('hidden');
        resetModal();
    }
    
    function resetModal() {
        fileInput.value = '';
        parsedData = [];
        previewSection.classList.add('hidden');
        progressSection.classList.add('hidden');
        summarySection.classList.add('hidden');
        startImportBtn.disabled = true;
        uploadArea.classList.remove('hidden');
    }
    
    function downloadTemplate() {
        const headers = [
            'email', 'password', 'full_name', 'address', 'whatsapp_number', 
            'gender', 'status', 'package_id', 'amount', 'installation_date',
            'latitude', 'longitude', 'device_type', 'ip_static_pppoe'
        ];
        
        const sampleData = [
            [
                'import1@selinggonet.com', 'password123', 'John Doe', 'Jl. Merdeka No 1 RT 02 RW 03 Bandung',
                '08123456789', 'LAKI-LAKI', 'AKTIF', '1', '150000', '2024-01-15',
                '-6.9174639', '107.6191228', 'ONT ZTE F609', '192.168.1.100'
            ],
            [
                'import2@selinggonet.com', 'password456', 'Jane Smith', 'Jl. Sudirman No 25 RT 01 RW 02 Jakarta',
                '08198765432', 'PEREMPUAN', 'AKTIF', '1', '150000', '2024-03-20',
                '-6.9147444', '107.6098111', 'ONT Huawei HG8245H', '192.168.1.101'
            ],
            [
                'import3@selinggonet.com', 'password789', 'Bob Wilson', 'Jl. Asia Afrika No 3 RT 05 RW 01 Surabaya',
                '08111222333', 'LAKI-LAKI', 'AKTIF', '1', '150000', '2023-12-01',
                '', '', 'Router Mikrotik RB750', ''
            ],
            [
                'import4@selinggonet.com', 'mypass2024', 'Alice Brown', 'Jl. Gatot Subroto No 12 RT 03 RW 04 Semarang',
                '08567891234', 'PEREMPUAN', 'AKTIF', '1', '150000', '2024-02-10',
                '-7.0051453', '110.4381254', 'ONT ZTE F660', '192.168.1.102'
            ],
            [
                'import5@selinggonet.com', 'secure123', 'Charlie Davis', 'Jl. Diponegoro No 88 RT 02 RW 01 Yogyakarta',
                '08234567890', 'LAKI-LAKI', 'AKTIF', '1', '150000', '2023-11-05',
                '-7.7955798', '110.3694896', 'ONT Fiberhome AN5506', '192.168.1.103'
            ]
        ];
        
        const csvContent = [
            headers.join(','),
            ...sampleData.map(row => row.join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'template_import_pelanggan.csv';
        link.click();
    }
    
    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Check both filename extension and MIME type for mobile compatibility
        const isCSV = file.name.toLowerCase().endsWith('.csv') || 
                     file.type === 'text/csv' || 
                     file.type === 'application/csv' ||
                     file.type === 'text/comma-separated-values' ||
                     file.type === 'text/plain';
        
        if (isCSV) {
            handleFile(file);
        } else {
            alert('Hanya file CSV yang diizinkan');
        }
    }
    
    function handleFile(file) {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.data.length === 0) {
                    alert('File CSV kosong');
                    return;
                }
                
                if (results.data.length > 500) {
                    alert('Maksimal 500 baris per upload');
                    return;
                }
                
                parsedData = results.data;
                displayPreview(results.data);
                uploadArea.classList.add('hidden');
                startImportBtn.disabled = false;
            },
            error: (error) => {
                alert('Error parsing CSV: ' + error.message);
            }
        });
    }
    
    function displayPreview(data) {
        const headers = Object.keys(data[0]);
        const previewData = data.slice(0, 5); // Show first 5 rows
        
        let tableHTML = '<thead class="bg-gray-50"><tr>';
        headers.forEach(header => {
            tableHTML += `<th class="px-4 py-2 text-left text-xs font-semibold text-gray-700 border-b">${header}</th>`;
        });
        tableHTML += '</tr></thead><tbody>';
        
        previewData.forEach((row, index) => {
            tableHTML += `<tr class="${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">`;
            headers.forEach(header => {
                const value = row[header] || '-';
                tableHTML += `<td class="px-4 py-2 text-xs text-gray-600 border-b">${value}</td>`;
            });
            tableHTML += '</tr>';
        });
        
        tableHTML += '</tbody>';
        previewTable.innerHTML = tableHTML;
        rowCountSpan.textContent = `${data.length} baris data`;
        previewSection.classList.remove('hidden');
    }
    
    async function startImport() {
        if (!parsedData || parsedData.length === 0) {
            alert('Tidak ada data untuk diimport');
            return;
        }
        
        // Validate data
        const { valid, errors } = validateCSVData(parsedData);
        if (!valid) {
            alert('Data tidak valid:\n' + errors.join('\n'));
            return;
        }
        
        // Hide preview, show progress
        previewSection.classList.add('hidden');
        progressSection.classList.remove('hidden');
        startImportBtn.disabled = true;
        cancelBtn.disabled = true;
        
        // Pre-generate all IDPLs to avoid race condition
        const idpls = [];
        let baseIdpl = 1;
        try {
            // Get ALL CST profiles and sort by number in JavaScript
            const { data: profiles, error: fetchError } = await supabase
                .from('profiles')
                .select('idpl')
                .like('idpl', 'CST%');
            
            if (fetchError) throw fetchError;
            
            if (profiles && profiles.length > 0) {
                // Extract numbers and find max
                const numbers = profiles
                    .map(p => parseInt(p.idpl.replace('CST', '')))
                    .filter(n => !isNaN(n));
                
                if (numbers.length > 0) {
                    const maxNumber = Math.max(...numbers);
                    baseIdpl = maxNumber + 1;
                    console.log(`[CSV Import] Last IDPL: CST${maxNumber.toString().padStart(3, '0')}, Next: CST${baseIdpl.toString().padStart(3, '0')}`);
                }
            }
        } catch (error) {
            console.warn('Error getting last IDPL, starting from CST001:', error);
        }
        
        // Generate IDPLs for all rows
        for (let i = 0; i < parsedData.length; i++) {
            idpls.push(`CST${(baseIdpl + i).toString().padStart(3, '0')}`);
        }
        
        let successfulImports = 0;
        let failedImports = 0;
        const errorMessages = [];
        
        for (let i = 0; i < parsedData.length; i++) {
            const row = parsedData[i];
            const rowNumber = i + 2; // +2 because row 1 is header, and we're 0-indexed
            const idpl = idpls[i];
            
            try {
                await importSingleCustomer(row, rowNumber, idpl);
                successfulImports++;
            } catch (error) {
                failedImports++;
                errorMessages.push(`Baris ${rowNumber}: ${error.message}`);
            }
            
            // Update progress
            const progress = ((i + 1) / parsedData.length) * 100;
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `${i + 1}/${parsedData.length}`;
            
            // Small delay to prevent rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Show summary
        progressSection.classList.add('hidden');
        summarySection.classList.remove('hidden');
        successCount.textContent = successfulImports;
        failedCount.textContent = failedImports;
        
        if (failedImports > 0) {
            errorDetails.innerHTML = errorMessages.join('<br>');
            errorDetails.classList.remove('hidden');
        }
        
        cancelBtn.disabled = false;
        cancelBtn.textContent = 'Tutup';
        
        // Refresh customer list
        if (successfulImports > 0 && fetchDataCallback) {
            await fetchDataCallback();
        }
    }
    
    function validateCSVData(data) {
        const errors = [];
        const requiredFields = ['email', 'password', 'full_name', 'address', 'whatsapp_number', 'gender', 'status', 'package_id', 'amount'];
        
        data.forEach((row, index) => {
            const rowNumber = index + 2;
            
            // Check required fields
            requiredFields.forEach(field => {
                if (!row[field] || row[field].trim() === '') {
                    errors.push(`Baris ${rowNumber}: Field ${field} tidak boleh kosong`);
                }
            });
            
            // Validate email format
            if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
                errors.push(`Baris ${rowNumber}: Format email tidak valid`);
            }
            
            // Validate password length
            if (row.password && row.password.length < 6) {
                errors.push(`Baris ${rowNumber}: Password minimal 6 karakter`);
            }
            
            // Validate gender
            if (row.gender && !['LAKI-LAKI', 'PEREMPUAN'].includes(row.gender.toUpperCase())) {
                errors.push(`Baris ${rowNumber}: Gender harus LAKI-LAKI atau PEREMPUAN`);
            }
            
            // Validate status
            if (row.status && !['AKTIF', 'NONAKTIF'].includes(row.status.toUpperCase())) {
                errors.push(`Baris ${rowNumber}: Status harus AKTIF atau NONAKTIF`);
            }
            
            // Validate numbers
            if (row.package_id && isNaN(parseInt(row.package_id))) {
                errors.push(`Baris ${rowNumber}: package_id harus berupa angka`);
            }
            
            if (row.amount && isNaN(parseFloat(row.amount))) {
                errors.push(`Baris ${rowNumber}: amount harus berupa angka`);
            }
            
            // Validate installation_date format
            if (row.installation_date && row.installation_date.trim() !== '') {
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(row.installation_date)) {
                    errors.push(`Baris ${rowNumber}: Format tanggal instalasi salah (gunakan YYYY-MM-DD)`);
                }
            }
            
            // Validate latitude/longitude if provided
            if (row.latitude && row.latitude.trim() !== '' && isNaN(parseFloat(row.latitude))) {
                errors.push(`Baris ${rowNumber}: Latitude harus berupa angka`);
            }
            
            if (row.longitude && row.longitude.trim() !== '' && isNaN(parseFloat(row.longitude))) {
                errors.push(`Baris ${rowNumber}: Longitude harus berupa angka`);
            }
        });
        
        return {
            valid: errors.length === 0,
            errors: errors.slice(0, 10) // Show max 10 errors
        };
    }
    
    async function importSingleCustomer(row, rowNumber, idpl) {
        // IDPL is pre-generated and passed as parameter
        
        // Prepare installation_date
        let installationDate = row.installation_date?.trim();
        if (installationDate) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(installationDate)) {
                installationDate = new Date().toISOString();
            } else {
                installationDate = new Date(installationDate).toISOString();
            }
        } else {
            installationDate = new Date().toISOString();
        }
        
        // Prepare location data
        const latitude = row.latitude?.trim() ? parseFloat(row.latitude) : null;
        const longitude = row.longitude?.trim() ? parseFloat(row.longitude) : null;
        
        const customerData = {
            email: row.email.trim(),
            password: row.password.trim(),
            full_name: row.full_name.trim(),
            address: row.address.trim(),
            whatsapp_number: row.whatsapp_number.trim(),
            gender: row.gender.toUpperCase(),
            status: row.status.toUpperCase(),
            device_type: row.device_type?.trim() || null,
            ip_static_pppoe: row.ip_static_pppoe?.trim() || null,
            photo_url: row.gender.toUpperCase() === 'LAKI-LAKI' 
                ? 'https://sb-admin-pro.startbootstrap.com/assets/img/illustrations/profiles/profile-2.png'
                : 'https://sb-admin-pro.startbootstrap.com/assets/img/illustrations/profiles/profile-1.png',
            installation_date: installationDate,
            package_id: parseInt(row.package_id),
            amount: parseFloat(row.amount),
            latitude: latitude,
            longitude: longitude,
            idpl: idpl // Generated IDPL
        };
        
        console.log(`[CSV Import] Row ${rowNumber} data (IDPL: ${idpl}):`, customerData);
        
        const { data, error } = await supabase.functions.invoke('create-customer', { 
            body: customerData 
        });
        
        console.log(`[CSV Import] Row ${rowNumber} response:`, { data, error });
        
        if (error) {
            // Extract more detailed error message
            console.error(`[CSV Import] Row ${rowNumber} error details:`, error);
            console.error(`[CSV Import] Full error object:`, JSON.stringify(error, null, 2));
            
            let errorMsg = 'Gagal menambahkan pelanggan';
            if (error.message) {
                errorMsg = error.message;
            }
            if (error.context?.body) {
                try {
                    const errorBody = JSON.parse(error.context.body);
                    console.error(`[CSV Import] Row ${rowNumber} error body:`, errorBody);
                    if (errorBody.error) {
                        errorMsg = errorBody.error;
                    }
                } catch (e) {
                    // Fallback to original error message
                    console.error('Failed to parse error body:', e);
                }
            }
            
            // Show alert for first error only
            if (errorMessages.length === 0) {
                alert(`ERROR Row ${rowNumber}:\n${errorMsg}\n\nCek Console (F12) untuk detail lengkap.`);
            }
            
            throw new Error(errorMsg);
        }
        
        if (data && data.error) {
            console.error(`[CSV Import] Row ${rowNumber} data error:`, data.error);
            throw new Error(data.error);
        }
        
        return data;
    }
}
