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
 * Menambahkan pelanggan baru ke sheet 'DATA'.
 * @param {Object} data - Data pelanggan dari form.
 * @returns {Object} - Pesan sukses.
 */
function addPelanggan(data) {
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

  const newRow = [
    nextIdpl, data.nama, nextUser, '1234', 'USER', '2', data.alamat,
    data.jenisKelamin, data.whatsapp, data.paket, data.tagihan, data.status,
    new Date().toLocaleDateString('id-ID'), data.jenisPerangkat, data.ipStatic || '', ''
  ];
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
        'ipstatic': 'IP STATIC / PPOE'
    };
    const mappedHeader = Object.keys(frontendKeyMapping).find(k => frontendKeyMapping[k] === header);
    return data[mappedHeader] !== undefined ? data[mappedHeader] : originalRow[index];
  });

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