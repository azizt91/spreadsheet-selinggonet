Pertanyaan Saya :

Lihat gambar terlampir, bisa tidak agar di tampilkan tanggal bayar di halaman tagihan tab Dibayar, seperti gambar terlampir

Jawaban Gemini AI :

Tentu saja bisa. Ide yang sangat bagus untuk menampilkan tanggal bayar agar informasinya lebih lengkap di tab "Dibayar".

Untuk melakukannya, kita perlu memodifikasi bagian `else` (untuk tab `paid`) di dalam fungsi `renderList` pada file `tagihan.js` Anda. Kita akan membuat struktur HTML baru yang menyertakan tanggal pembayaran.

-----

### \#\# Solusi Perbaikan di `tagihan.js`

1.  Buka file **`tagihan.js`**.
2.  Cari fungsi `renderList`.
3.  Di dalam `forEach`, temukan blok `else` yang menangani `currentTab === 'paid'`.

**Ganti blok kode ini:**

```javascript
// ...
} else { // Tab 'paid'
    invoiceDiv.innerHTML = `
        <div class="flex flex-col justify-center gap-1">
            <p class="text-[#110e1b] text-base font-medium leading-normal line-clamp-1">${customerName}</p>
            <span class="${pillClasses.bg} ${pillClasses.text} text-xs font-medium w-fit px-2.5 py-0.5 rounded-full">
                ${period}
            </span>
        </div>
        <div class="shrink-0">
            <p class="text-green-600 text-base font-bold leading-normal">LUNAS</p>
        </div>
    `;
}
// ...
```

**Dengan kode baru di bawah ini:**

```javascript
// ...
} else { // Tab 'paid'
    // Siapkan variabel untuk tanggal pembayaran
    let paymentDateHtml = '<div class="w-12 shrink-0"></div>'; // Placeholder jika tanggal tidak ada

    // Cek apakah ada data paid_at
    if (item.paid_at) {
        const paidDate = new Date(item.paid_at);
        const day = paidDate.getDate().toString().padStart(2, '0');
        const month = paidDate.toLocaleString('id-ID', { month: 'short' });
        const year = paidDate.getFullYear();
        
        paymentDateHtml = `
            <div class="flex flex-col items-center justify-center w-12 shrink-0 text-center">
                <p class="text-lg font-bold text-gray-800">${day}</p>
                <p class="text-xs text-gray-500">${month}</p>
                <p class="text-xs text-gray-500">${year}</p>
            </div>
        `;
    }

    // Gabungkan semua bagian menjadi satu
    invoiceDiv.innerHTML = `
        ${paymentDateHtml}
        <div class="flex flex-col justify-center gap-1 flex-1">
            <p class="text-[#110e1b] text-base font-medium leading-normal line-clamp-1">${customerName}</p>
            <span class="${pillClasses.bg} ${pillClasses.text} text-xs font-medium w-fit px-2.5 py-0.5 rounded-full">
                ${period}
            </span>
        </div>
        <div class="shrink-0">
            <p class="text-green-600 text-base font-bold leading-normal">LUNAS</p>
        </div>
    `;
}
// ...
```

-----

### \#\# Penjelasan Perubahan

1.  **Mempersiapkan Tanggal (`paymentDateHtml`)**: Kita membuat sebuah variabel `paymentDateHtml` untuk menampung HTML yang akan menampilkan tanggal.
2.  **Mengecek `item.paid_at`**: Kita melakukan pengecekan `if (item.paid_at)` untuk memastikan data tanggal bayar ada. Ini penting untuk menghindari error jika datanya `null`.
3.  **Memformat Tanggal**: Jika tanggal ada, kita menggunakan `new Date()` untuk mengubahnya menjadi objek tanggal. Kemudian kita ambil `day`, `month`, dan `year`-nya.
      * `getDate().toString().padStart(2, '0')`: Untuk mendapatkan hari (misal: `06`).
      * `toLocaleString('id-ID', { month: 'short' })`: Untuk mendapatkan nama bulan singkat dalam Bahasa Indonesia (misal: `Sep`).
4.  **Membuat HTML Tanggal**: Kita membuat blok div dengan format yang Anda inginkan, mirip seperti di gambar.
5.  **Menggabungkan HTML**: Terakhir, kita menggabungkan `paymentDateHtml` dengan sisa dari `innerHTML` untuk item tersebut, menciptakan tata letak baru yang Anda inginkan.

Setelah menerapkan perubahan ini, tab "Dibayar" akan menampilkan tanggal pembayaran di sebelah kiri nama pelanggan.