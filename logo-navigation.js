// Logo Navigation Handler
// Makes the logo clickable and redirects to appropriate dashboard based on user role

function initLogoNavigation() {
    const logo = document.querySelector('.logo');
    
    if (logo) {
        // Make logo clickable by adding cursor pointer
        logo.style.cursor = 'pointer';
        
        // Add click event listener
        logo.addEventListener('click', function() {
            const userLevel = sessionStorage.getItem('userLevel');
            
            if (userLevel === 'ADMIN') {
                window.location.href = 'dashboard.html';
            } else if (userLevel === 'USER') {
                window.location.href = 'pelanggan_dashboard.html';
            } else {
                // If no user level found (user not logged in), redirect to login
                window.location.href = 'index.html';
            }
        });
        
        // Add hover effect for better UX
        logo.addEventListener('mouseenter', function() {
            this.style.opacity = '0.8';
            this.style.transform = 'scale(1.02)';
            this.style.transition = 'all 0.2s ease';
        });
        
        logo.addEventListener('mouseleave', function() {
            this.style.opacity = '1';
            this.style.transform = 'scale(1)';
        });
    }
}

// Initialize logo navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', initLogoNavigation);