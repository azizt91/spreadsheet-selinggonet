document.addEventListener('DOMContentLoaded', () => {
    // Ambil data pelanggan yang login dari sessionStorage
    const loggedInIdpl = sessionStorage.getItem('userIdpl');

    if (!loggedInIdpl) {
        alert('Sesi tidak valid, silakan login kembali.');
        window.location.href = 'index.html';
        return;
    }

    async function fetchMyData() {
        const url = `${window.AppConfig.API_BASE_URL}?action=getMyData&idpl=${loggedInIdpl}`;
        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            // Tampilkan data di halaman
            displayData(data);

        } catch (error) {
            console.error('Gagal mengambil data:', error);
            // Tampilkan pesan error di halaman
        }
    }

    function displayData(data) {
        // Tampilkan nama di header
        document.getElementById('nama-pelanggan').textContent = data.profil.NAMA;

        // Tampilkan info profil
        const infoContainer = document.getElementById('info-pelanggan');
        infoContainer.innerHTML = `
            <h3>Profil Anda</h3>
            <p><strong>ID Pelanggan:</strong> ${data.profil.IDPL}</p>
            <p><strong>Paket:</strong> ${data.profil.PAKET}</p>
            <p><strong>Status:</strong> ${data.profil.STATUS}</p>
        `;

        // Tampilkan tagihan yang belum lunas
        const tagihanContainer = document.getElementById('tagihan-pelanggan');
        let tagihanHtml = '<h3>Tagihan Belum Lunas</h3>';
        if (data.tagihan.length > 0) {
            data.tagihan.forEach(t => {
                tagihanHtml += `<p>${t['PERIODE TAGIHAN']}: <strong>${t.TAGIHAN}</strong></p>`;
            });
        } else {
            tagihanHtml += '<p>Tidak ada tagihan saat ini.</p>';
        }
        tagihanContainer.innerHTML = tagihanHtml;
    }

    fetchMyData();
});