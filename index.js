// Navigation functions
function setupNavigation() {
    const links = document.querySelectorAll('nav a');
    links.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const page = event.target.getAttribute('href');
            loadPage(page);
        });
    });
}

function loadPage(page) {
    const mainContent = document.getElementById('main-content');
    fetch(page)
        .then(response => response.text())
        .then(html => {
            mainContent.innerHTML = html;
            // Optionally, you can initialize page-specific scripts here
            if (page === 'pages/assignments.html') {
                import('./pages/assignments.js');
            } else if (page === 'pages/sector.html') {
                import('./pages/sector.js');
            }
        })
        .catch(err => console.error('Error loading page:', err));
}

