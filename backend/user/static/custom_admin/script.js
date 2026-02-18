document.addEventListener('DOMContentLoaded', function () {

    // ------------------------------------------------------------------
    // Login Page Logic
    // ------------------------------------------------------------------
    const loginForm = document.getElementById('loginForm');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    if (loginForm && togglePasswordBtn && passwordInput) {
        // Toggle Password Visibility
        togglePasswordBtn.addEventListener('click', function () {
            // Get current type
            const isPassword = passwordInput.getAttribute('type') === 'password';

            // Switch type
            passwordInput.setAttribute('type', isPassword ? 'text' : 'password');

            // Switch Icon
            const icon = this.querySelector('i');
            if (isPassword) {
                // Was password (now text), show "slash" (meaning 'hide') or 'open eye'?
                // Usually: 'eye' = show password. 'eye-slash' = hide password.
                // Initial state: Type=password, Icon='eye' (Show).
                // Click -> Type=text, Icon='eye-slash' (Hide).
                icon.classList.remove('bi-eye');
                icon.classList.add('bi-eye-slash');
            } else {
                // Was text (now password), show 'eye'.
                icon.classList.remove('bi-eye-slash');
                icon.classList.add('bi-eye');
            }
        });

        // Form Validation & Submission Mock - REMOVED for Django Implementation
        // Handled in index.html inline script to support Django URLs and CSRF
    }

    // ------------------------------------------------------------------
    // Dashboard Logic
    // ------------------------------------------------------------------

    // Initialize Bootstrap Tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Sidebar Toggle for Mobile
    const sidebar = document.getElementById('sidebar');
    const mobileToggle = document.getElementById('mobileSidebarToggle');
    const closeSidebar = document.getElementById('closeSidebar');
    const mainContent = document.getElementById('mainContent');

    if (sidebar && mobileToggle) {
        mobileToggle.addEventListener('click', function () {
            sidebar.classList.add('show');
        });

        closeSidebar.addEventListener('click', function () {
            sidebar.classList.remove('show');
        });

        // Close sidebar when clicking outside on mobile (simple implementation)
        document.addEventListener('click', function (event) {
            const isClickInsideSidebar = sidebar.contains(event.target);
            const isClickInsideToggle = mobileToggle.contains(event.target);

            if (!isClickInsideSidebar && !isClickInsideToggle && sidebar.classList.contains('show')) {
                sidebar.classList.remove('show');
            }
        });
    }

    // ------------------------------------------------------------------
    // Search Functionality
    // ------------------------------------------------------------------
    const searchInput = document.getElementById('searchInput');
    const userTableBody = document.getElementById('userTableBody');

    if (searchInput && userTableBody) {
        searchInput.addEventListener('keyup', function () {
            const filter = this.value.toLowerCase();
            const rows = userTableBody.getElementsByTagName('tr');

            for (let i = 0; i < rows.length; i++) {
                // Find the name column (usually the first one with .fw-medium or just the first td)
                const nameCol = rows[i].querySelector('.fw-medium') || rows[i].getElementsByTagName('td')[0];

                if (nameCol) {
                    const txtValue = nameCol.textContent || nameCol.innerText;
                    if (txtValue.toLowerCase().indexOf(filter) > -1) {
                        rows[i].style.display = "";
                    } else {
                        rows[i].style.display = "none";
                    }
                }
            }
        });
    }

    // ------------------------------------------------------------------
    // Dynamic Stats Logic
    // ------------------------------------------------------------------
    function updateStats() {
        const totalEl = document.getElementById('totalUsers');
        const activeEl = document.getElementById('activeUsers');
        const pendingEl = document.getElementById('pendingRequests');

        // Count rows in current table
        let currentTableCount = 0;
        if (userTableBody) {
            currentTableCount = userTableBody.getElementsByTagName('tr').length;
        }

        // Determine if we are on Dashboard or Users page
        const isDashboard = document.querySelector('title').textContent.includes('Dashboard');
        const isUsersPage = document.querySelector('title').textContent.includes('Users');

        if (isUsersPage) {
            // We are on Users page (Approved Users)
            localStorage.setItem('approvedCount', currentTableCount);

            // If we have stat cards on this page (dashboard.html sidebar nav implies separate pages, but good to be safe)
            // Visual update for testing if user copied cards here, but mostly for localStorage
        }

        if (isDashboard) {
            // We are on Dashboard (Pending Users)
            // This table contains "Pending" requests
            const pendingCount = currentTableCount;
            // Get Approved count from storage (default to 3 if not set, matching mock data size)
            const approvedCount = parseInt(localStorage.getItem('approvedCount')) || 3;
            const totalCount = pendingCount + approvedCount;

            if (totalEl) totalEl.textContent = totalCount;
            if (activeEl) activeEl.textContent = approvedCount;
            if (pendingEl) pendingEl.textContent = pendingCount;

            // Also update the "Pending Requests" text in the stats card if needed, currently done via IDs

            // Update "Showing X of Y users" footer if exists
            const footerText = document.querySelector('.card-footer .small.text-muted');
            if (footerText) {
                footerText.textContent = `Showing ${pendingCount} pending requests`;
            }
        }
    }

    // Run stats update on load
    updateStats();

    // Re-run on action (like delete)
    // We can hook into the existing click listener or use a MutationObserver. 
    // For simplicity, we'll update the existing click listener to call updateStats()

    // Table Action Button Handlers (Mock logic)
    // Table Action Button Handlers (Mock logic) - REMOVED
    // Real logic is handled via inline scripts in dashboard.html and users.html

});
