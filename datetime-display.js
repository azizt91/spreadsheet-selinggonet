// DateTime Display Module
// Displays current date and time in Indonesian format similar to the provided image

function initDateTimeDisplay() {
    const datetimeElement = document.getElementById('current-datetime');
    
    if (!datetimeElement) return;
    
    function updateDateTime() {
        const now = new Date();
        
        // Indonesian month names
        const months = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        
        // Format date components
        const day = now.getDate();
        const month = months[now.getMonth()];
        const year = now.getFullYear();
        
        // Format time components (24-hour format with seconds)
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        // Create the formatted datetime string like: "28 Agustus 2025 pukul 13.48.29 WIB"
        const formattedDateTime = `${day} ${month} ${year} pukul ${hours}.${minutes}.${seconds} WIB`;
        
        datetimeElement.textContent = formattedDateTime;
    }
    
    // Update immediately
    updateDateTime();
    
    // Update every second
    setInterval(updateDateTime, 1000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initDateTimeDisplay);