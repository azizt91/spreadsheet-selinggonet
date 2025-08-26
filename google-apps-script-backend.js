// google-apps-script-backend.js

// Ganti dengan ID Spreadsheet Anda jika diperlukan
const SPREADSHEET_ID = '1t5wDtV4yATXitTjk9S2jutziUI8KAj23FOaEM2inGPM';
const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

// =================================================================
// HANDLER UTAMA UNTUK PERMINTAAN DARI APLIKASI WEB
// =================================================================

/**
 * Menangani semua permintaan GET (untuk mengambil data).
 * @param {object} e - Event object dari Apps Script.
 * @returns {ContentService} - Output JSON.
 */
function doGet(e) {
  const action = e.parameter.action;
  let data;

  try {
    switch (action) {
      case 'getPelanggan':
        data = readSheetData('DATA');
        break;
      case 'getTagihan':
        data = readSheetData('Tagihan').filter(item => 
          item.IDPL && item.IDPL.trim() !== '' && 
          item.NAMA && item.NAMA.trim() !== '' &&
          item.IDPL !== 'N/A' && item.NAMA !== 'N/A'
        );
        break;
      case 'getLunas':
        data = readSheetData('Lunas').reverse(); // Tampilkan yang terbaru di atas
        break;
      case 'getPengeluaran':
        data = readSheetData('Pengeluaran').reverse(); // Tampilkan yang terbaru di atas
        break;
      case 'getDashboardStats':
        data = getDashboardStats(e.parameter.bulan, e.parameter.tahun);
        break;
      case 'setupHeaders':
        data = setupDataSheetHeaders();
        break;
      default:
        data = { error: `Invalid GET action: ${action}` };
    }
  } catch (err) {
    data = { error: err.message, stack: err.stack };
  }
  
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Menangani semua permintaan POST (untuk mengubah data: login, tambah, update, hapus).
 * @param {object} e - Event object dari Apps Script.
 * @returns {ContentService} - Output JSON.
 */
function doPost(e) {
  let result;
  try {
    const request = JSON.parse(e.postData.contents);
    const action = request.action;

    switch (action) {
      case 'login':
        result = handleLogin(request.username, request.password);
        break;
      case 'addPelanggan':
        result = addPelanggan(request.data);
        break;
      case 'updatePelanggan':
        result = updatePelanggan(request.rowNumber, request.data);
        break;
      case 'deletePelanggan':
        result = deleteRow('DATA', request.rowNumber);
        break;
      case 'addPengeluaran':
        result = addPengeluaran(request.data);
        break;
      case 'updatePengeluaran':
        result = updatePengeluaran(request.rowNumber, request.data);
        break;
      case 'deletePengeluaran':
        result = deleteRow('Pengeluaran', request.rowNumber);
        break;
      case 'bayar':
        result = processPayment(request.rowNumber, request.rowData);
        break;
      default:
        result = { error: `Invalid POST action: ${action}` };
    }
  } catch (err) {
    result = { error: err.message, stack: err.stack };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// =================================================================
// FUNGSI-FUNGSI LOGIKA (HELPER FUNCTIONS)
// =================================================================

/**
 * Membaca semua data dari sheet yang diberikan dan mengubahnya menjadi array of objects.
 * @param {string} sheetName - Nama sheet yang akan dibaca.
 * @returns {Array<Object>} - Array berisi data dari sheet.
 */
function readSheetData(sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const range = sheet.getDataRange();
  const values = range.getValues();
  if (values.length < 2) return [];

  const headers = values.shift().map(header => header.trim()); // Ambil header dan trim spasi
  return values.map((row, index) => {
    let obj = {};
    headers.forEach((header, i) => {
      if (header) { // Hanya proses jika header tidak kosong
        obj[header] = row[i];
      }
    });
    obj.rowNumber = index + 2; // Nomor baris aktual di sheet
    return obj;
  });
}

/**
 * Menghapus satu baris dari sheet berdasarkan nomor barisnya.
 * @param {string} sheetName - Nama sheet.
 * @param {number} rowNumber - Nomor baris yang akan dihapus.
 * @returns {Object} - Pesan sukses atau error.
 */
function deleteRow(sheetName, rowNumber) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { error: `Sheet ${sheetName} tidak ditemukan.` };
    sheet.deleteRow(parseInt(rowNumber));
    return { message: `Data berhasil dihapus!` };
}

/**
 * Menangani proses login user.
 * @param {string} username - Username dari input form.
 * @param {string} password - Password dari input form.
 * @returns {Object} - Hasil login.
 */
function handleLogin(username, password) {
  if (!username || !password) {
    throw new Error('Username dan password harus diisi');
  }
  
  const data = readSheetData('DATA');
  const user = data.find(row => row.USER === username);

  if (!user) {
    throw new Error('Username atau password salah');
  }
  
  // KOREKSI: Password di spreadsheet bisa jadi angka, ubah ke string untuk perbandingan aman
  if (String(user.PASSWORD) === String(password)) {
    return { 
      message: 'Login berhasil!', 
      user: user.USER, 
      level: user.LEVEL || 'ADMIN',
      idpl: user.IDPL,
    };
  } else {
    throw new Error('Username atau password salah');
  }
}

/**
 * Ensures the DATA sheet has the correct column headers including IP STATIC / PPOE
 * Call this function to set up or verify the spreadsheet structure
 */
function setupDataSheetHeaders() {
  const sheet = ss.getSheetByName('DATA');
  const expectedHeaders = [
    'IDPL',           // Column 1
    'NAMA',           // Column 2
    'USER',           // Column 3
    'PASSWORD',       // Column 4
    'LEVEL',          // Column 5
    'KOLOM6',         // Column 6 (placeholder)
    'ALAMAT',         // Column 7
    'JENIS KELAMIN',  // Column 8
    'WHATSAPP',       // Column 9
    'PAKET',          // Column 10
    'TAGIHAN',        // Column 11
    'STATUS',         // Column 12
    'TANGGAL PASANG', // Column 13
    'JENIS PERANGKAT',// Column 14
    'IP STATIC / PPOE', // Column 15
    'FOTO'            // Column 16 - FOTO field
  ];
  
  // Check if headers need to be set up
  const currentHeaders = sheet.getRange(1, 1, 1, expectedHeaders.length).getValues()[0];
  
  // Set headers if they don't match
  let needsUpdate = false;
  for (let i = 0; i < expectedHeaders.length; i++) {
    if (!currentHeaders[i] || currentHeaders[i].toString().trim() !== expectedHeaders[i]) {
      needsUpdate = true;
      break;
    }
  }
  
  if (needsUpdate) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    console.log('Updated DATA sheet headers:', expectedHeaders);
    return { message: 'Headers updated successfully', headers: expectedHeaders };
  }
  
  return { message: 'Headers are already correct', headers: currentHeaders };
}

/**
 * Menambahkan pelanggan baru ke sheet 'DATA'.
 * @param {Object} data - Data pelanggan dari form.
 * @returns {Object} - Pesan sukses.
 */
function addPelanggan(data) {
  // Ensure headers are set up correctly first
  setupDataSheetHeaders();
  
  const sheet = ss.getSheetByName('DATA');
  const lastRow = sheet.getLastRow();
  let nextIdpl = 'CST001';
  let nextUser = 'user1';
  
  if (lastRow > 1) {
    const lastIdplCell = sheet.getRange(lastRow, 1).getValue();
    const lastUserCell = sheet.getRange(lastRow, 3).getValue();
    const lastIdNum = parseInt((lastIdplCell || 'CST000').replace('CST', ''), 10);
    nextIdpl = `CST${String(lastIdNum + 1).padStart(3, '0')}`;
    const lastUserNum = parseInt((lastUserCell || 'user0').replace('user', ''), 10);
    nextUser = `user${lastUserNum + 1}`;
  }

  // Debug: Log the IP Static data being sent
  console.log('IP Static data received:', data.ipStatic);
  
  // Automatically assign photo URL based on gender
  const fotoUrl = data.jenisKelamin === 'PEREMPUAN' 
    ? 'https://sb-admin-pro.startbootstrap.com/assets/img/illustrations/profiles/profile-1.png'
    : 'https://sb-admin-pro.startbootstrap.com/assets/img/illustrations/profiles/profile-2.png';
  
  console.log('Gender:', data.jenisKelamin, 'Photo URL assigned:', fotoUrl);
  
  // Ensure proper column order - Position 15 should be IP STATIC / PPOE, Position 16 should be FOTO
  const newRow = [
    nextIdpl,                                    // Column 1: IDPL
    data.nama,                                   // Column 2: NAMA  
    nextUser,                                    // Column 3: USER
    '1234',                                      // Column 4: PASSWORD
    'USER',                                      // Column 5: LEVEL
    '2',                                         // Column 6: (unknown column)
    data.alamat,                                 // Column 7: ALAMAT
    data.jenisKelamin,                          // Column 8: JENIS KELAMIN
    data.whatsapp,                              // Column 9: WHATSAPP
    data.paket,                                 // Column 10: PAKET
    data.tagihan,                               // Column 11: TAGIHAN
    data.status,                                // Column 12: STATUS
    new Date().toLocaleDateString('id-ID'),     // Column 13: TANGGAL PASANG
    data.jenisPerangkat,                        // Column 14: JENIS PERANGKAT
    data.ipStatic || '',                        // Column 15: IP STATIC / PPOE
    fotoUrl                                     // Column 16: FOTO (auto-assigned based on gender)
  ];
  
  // Debug: Log the complete row being added
  console.log('Adding new row:', newRow);
  
  sheet.appendRow(newRow);
  return { message: 'Pelanggan berhasil ditambahkan!' };
}

/**
 * Memperbarui data pelanggan yang ada.
 * @param {number} rowNumber - Nomor baris yang akan diupdate.
 * @param {Object} data - Data baru dari form.
 * @returns {Object} - Pesan sukses.
 */
function updatePelanggan(rowNumber, data) {
  const sheet = ss.getSheetByName('DATA');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const range = sheet.getRange(rowNumber, 1, 1, headers.length);
  const originalRow = range.getValues()[0];
  
  // Debug: Log received data and headers
  console.log('Headers:', headers);
  console.log('Update data received:', data);
  console.log('IP Static data:', data.ipStatic);
  
  // Automatically assign photo URL based on gender if gender is being updated
  if (data.jenisKelamin) {
    data.foto = data.jenisKelamin === 'PEREMPUAN' 
      ? 'https://sb-admin-pro.startbootstrap.com/assets/img/illustrations/profiles/profile-1.png'
      : 'https://sb-admin-pro.startbootstrap.com/assets/img/illustrations/profiles/profile-2.png';
    console.log('Gender updated:', data.jenisKelamin, 'Photo URL assigned:', data.foto);
  }
  
  const newRowData = headers.map((header, index) => {
    // KOREKSI: Gunakan nama properti dari frontend (`nama`, `alamat`) bukan nama kolom (`NAMA`)
    // Ini membuat kodenya lebih konsisten.
    const key = header.toLowerCase().replace(/ /g, ''); // 'JENIS KELAMIN' -> 'jeniskelamin' (disamakan dgn frontend)
    const frontendKeyMapping = {
        'nama': 'NAMA',
        'alamat': 'ALAMAT', 
        'whatsapp': 'WHATSAPP',
        'jeniskelamin': 'JENIS KELAMIN',
        'paket': 'PAKET',
        'tagihan': 'TAGIHAN',
        'status': 'STATUS',
        'jenisperangkat': 'JENIS PERANGKAT',
        'ipstatic/ppoe': 'IP STATIC / PPOE',  // Handle with and without spaces
        'ipstatic': 'IP STATIC / PPOE',       // Alternative mapping
        'foto': 'FOTO'                        // Photo field mapping
    };
    
    // Find the mapped header
    const mappedHeader = Object.keys(frontendKeyMapping).find(k => frontendKeyMapping[k] === header);
    
    // Debug: Log mapping for IP STATIC field
    if (header.includes('IP STATIC') || header.includes('PPOE')) {
      console.log('IP STATIC mapping found:', header, 'mapped to:', mappedHeader, 'value:', data[mappedHeader]);
    }
    
    return data[mappedHeader] !== undefined ? data[mappedHeader] : originalRow[index];
  });

  // Debug: Log the final row data
  console.log('Final row data:', newRowData);
  
  range.setValues([newRowData]);
  return { message: 'Data berhasil diperbarui!' };
}

/**
 * Memindahkan tagihan ke lunas dan menghapus dari tagihan.
 * @param {number} rowNumber - Nomor baris di sheet 'Tagihan'.
 * @param {Object} rowData - Data lengkap dari baris tersebut.
 * @returns {Object} - Pesan sukses.
 */
function processPayment(rowNumber, rowData) {
  const lunasSheet = ss.getSheetByName('Lunas');
  const tagihanSheet = ss.getSheetByName('Tagihan');
  
  const lunasHeaders = lunasSheet.getRange(1, 1, 1, lunasSheet.getLastColumn()).getValues()[0];
  const newLunasRow = lunasHeaders.map(header => {
    if (header === 'STATUS') return 'LUNAS';
    if (header === 'TANGGAL BAYAR') return new Date().toLocaleDateString('id-ID');
    return rowData[header] || '';
  });
  
  lunasSheet.appendRow(newLunasRow);
  tagihanSheet.deleteRow(parseInt(rowNumber));
  
  return { message: 'Pembayaran berhasil diproses!' };
}

/**
 * Menambahkan data pengeluaran baru.
 * @param {Object} data - Data pengeluaran dari form.
 * @returns {Object} - Pesan sukses.
 */
function addPengeluaran(data) {
  const sheet = ss.getSheetByName('Pengeluaran');
  const nextId = Math.random().toString(36).substring(2, 10).toUpperCase();
  const tanggalInput = new Date(data.TANGGAL);
  const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  
  const newRow = [
    nextId, 
    data.DESKRIPSI_PENGELUARAN, 
    data.JUMLAH,
    tanggalInput.toLocaleDateString('id-ID'),
    namaBulan[tanggalInput.getMonth()],
    tanggalInput.getFullYear()
  ];
  
  sheet.appendRow(newRow);
  return { message: 'Data pengeluaran berhasil ditambahkan!' };
}

/**
 * Memperbarui data pengeluaran.
 * @param {number} rowNumber - Nomor baris yang akan diupdate.
 * @param {Object} data - Data baru dari form.
 * @returns {Object} - Pesan sukses.
 */
function updatePengeluaran(rowNumber, data) {
  const sheet = ss.getSheetByName('Pengeluaran');
  const tanggalInput = new Date(data.TANGGAL);
  const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  
  // KOREKSI: Range update harus spesifik ke kolom yang diubah.
  // Kolom B sampai F adalah [DESKRIPSI, JUMLAH, TANGGAL, BULAN, TAHUN]
  const updatedValues = [
    data.DESKRIPSI_PENGELUARAN,
    data.JUMLAH,
    tanggalInput.toLocaleDateString('id-ID'),
    namaBulan[tanggalInput.getMonth()],
    tanggalInput.getFullYear()
  ];
  
  sheet.getRange(rowNumber, 2, 1, 5).setValues([updatedValues]); // Update kolom B(2) sebanyak 5 kolom
  return { message: 'Data pengeluaran berhasil diperbarui!' };
}

/**
 * Menghitung statistik untuk halaman dashboard.
 * @param {string} bulan - Filter bulan.
 * @param {string} tahun - Filter tahun.
 * @returns {Object} - Objek berisi data statistik.
 */
function getDashboardStats(bulan, tahun) {
  // Implementasi fungsi ini sudah benar di kode Anda, jadi saya salin saja.
  const pelangganData = readSheetData('DATA');
  const tagihanData = readSheetData('Tagihan');
  const lunasData = readSheetData('Lunas');
  const pengeluaranData = readSheetData('Pengeluaran');

  const isFiltering = bulan && tahun && bulan !== 'semua';
  const namaBulan = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  
  const filterByPeriode = (data) => {
    if (!isFiltering) return data;
    const filterBulanNama = namaBulan[parseInt(bulan, 10)];
    const targetPeriode = `${filterBulanNama} ${tahun}`;
    return data.filter(row => (row['PERIODE TAGIHAN'] || '').trim() === targetPeriode);
  };

  const lunasFiltered = filterByPeriode(lunasData);
  const pengeluaranFiltered = filterByPeriode(pengeluaranData);
  const unpaidInvoices = tagihanData.filter(row => row.STATUS && row.STATUS.toUpperCase() === 'BELUM LUNAS');
  
  const totalCustomers = pelangganData.length;
  const activeCustomers = pelangganData.filter(p => p.STATUS === 'AKTIF').length;
  
  const totalRevenue = lunasFiltered.reduce((sum, row) => {
    const nominal = parseFloat(String(row.TAGIHAN || '0').replace(/\D/g, ''));
    return sum + nominal;
  }, 0);

  const totalExpenses = pengeluaranFiltered.reduce((sum, row) => {
    const nominal = parseFloat(String(row.JUMLAH || '0').replace(/\D/g, ''));
    return sum + nominal;
  }, 0);

  return {
    totalCustomers,
    activeCustomers,
    inactiveCustomers: totalCustomers - activeCustomers,
    totalUnpaid: unpaidInvoices.length,
    totalPaid: lunasFiltered.length,
    totalRevenue,
    totalExpenses,
    profit: totalRevenue - totalExpenses
  };
}