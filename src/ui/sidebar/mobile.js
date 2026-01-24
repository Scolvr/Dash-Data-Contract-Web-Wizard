/**
 * Mobile Sidebar Module
 * Handles mobile navigation drawer and sidebar toggle functionality
 */

// ═══════════════════════════════════════════════════════════════════════════
// MOBILE NAVIGATION DRAWER
// ═══════════════════════════════════════════════════════════════════════════

let mobileNavInitialized = false;

/**
 * Open mobile navigation drawer
 */
export function openMobileNav() {
  const navDrawer = document.getElementById('mobile-nav-drawer');
  const menuBtn = document.getElementById('mobile-menu-btn');

  if (navDrawer) {
    navDrawer.classList.add('is-open');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
}

/**
 * Close mobile navigation drawer
 */
export function closeMobileNav() {
  const navDrawer = document.getElementById('mobile-nav-drawer');
  const menuBtn = document.getElementById('mobile-menu-btn');

  if (navDrawer) {
    navDrawer.classList.remove('is-open');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
}

/**
 * Toggle mobile navigation drawer
 */
export function toggleMobileNav() {
  const navDrawer = document.getElementById('mobile-nav-drawer');
  if (navDrawer?.classList.contains('is-open')) {
    closeMobileNav();
  } else {
    openMobileNav();
  }
}

/**
 * Setup mobile navigation event handlers
 */
export function setupMobileNavigation() {
  if (mobileNavInitialized) return;

  const menuBtn = document.getElementById('mobile-menu-btn');
  const navDrawer = document.getElementById('mobile-nav-drawer');
  const navBackdrop = document.getElementById('mobile-nav-backdrop');
  const navClose = document.getElementById('mobile-nav-close');
  const navLinks = document.querySelectorAll('.mobile-nav-drawer__link');

  if (!menuBtn || !navDrawer) {
    console.log('[MobileNav] Elements not found, skipping initialization');
    return;
  }

  // Toggle drawer on menu button click
  menuBtn.addEventListener('click', toggleMobileNav);

  // Close on backdrop click
  if (navBackdrop) {
    navBackdrop.addEventListener('click', closeMobileNav);
  }

  // Close button
  if (navClose) {
    navClose.addEventListener('click', closeMobileNav);
  }

  // Handle nav link clicks
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;

      // Update active state
      navLinks.forEach(l => l.classList.remove('mobile-nav-drawer__link--active'));
      link.classList.add('mobile-nav-drawer__link--active');

      // Also update header nav active state
      const headerLinks = document.querySelectorAll('.global-header__link');
      headerLinks.forEach(l => {
        l.classList.toggle('global-header__link--active', l.dataset.page === page);
      });

      // Navigate to page
      if (typeof window.GlobalHeader !== 'undefined' && window.GlobalHeader.switchPage) {
        window.GlobalHeader.switchPage(page);
      }

      // Close drawer
      closeMobileNav();
    });
  });

  // Close on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navDrawer.classList.contains('is-open')) {
      closeMobileNav();
    }
  });

  // Sync with header nav when pages change
  const headerLinks = document.querySelectorAll('.global-header__link');
  headerLinks.forEach(link => {
    link.addEventListener('click', () => {
      const page = link.dataset.page;
      navLinks.forEach(l => {
        l.classList.toggle('mobile-nav-drawer__link--active', l.dataset.page === page);
      });
    });
  });

  mobileNavInitialized = true;
  console.log('[MobileNav] Mobile navigation initialized');
}

// ═══════════════════════════════════════════════════════════════════════════
// MOBILE SIDEBAR TOGGLE
// ═══════════════════════════════════════════════════════════════════════════

let mobileSidebarInitialized = false;

/**
 * Open mobile sidebar
 */
export function openMobileSidebar() {
  const sidebar = document.querySelector('.wizard-sidebar');
  const backdrop = document.querySelector('.sidebar-backdrop');

  if (sidebar) {
    sidebar.classList.add('is-open');
    if (backdrop) backdrop.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
  }
}

/**
 * Close mobile sidebar
 */
export function closeMobileSidebar() {
  const sidebar = document.querySelector('.wizard-sidebar');
  const backdrop = document.querySelector('.sidebar-backdrop');

  if (sidebar) {
    sidebar.classList.remove('is-open');
    if (backdrop) backdrop.classList.remove('is-visible');
    document.body.style.overflow = '';
  }
}

/**
 * Setup mobile sidebar toggle functionality
 */
export function setupMobileSidebar() {
  if (mobileSidebarInitialized) return;

  const sidebar = document.querySelector('.wizard-sidebar');

  if (!sidebar) {
    console.log('[MobileSidebar] Sidebar not found, skipping initialization');
    return;
  }

  // Create the floating toggle button if it doesn't exist
  let toggleBtn = document.querySelector('.mobile-sidebar-toggle');
  if (!toggleBtn) {
    toggleBtn = document.createElement('button');
    toggleBtn.className = 'mobile-sidebar-toggle';
    toggleBtn.setAttribute('aria-label', 'Open wizard steps');
    toggleBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M4 6h16M4 12h16M4 18h16"/>
      </svg>
    `;
    document.body.appendChild(toggleBtn);
  }

  // Create backdrop if it doesn't exist
  let backdrop = document.querySelector('.sidebar-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);
  }

  // Toggle button click
  toggleBtn.addEventListener('click', openMobileSidebar);

  // Backdrop click closes sidebar
  backdrop.addEventListener('click', closeMobileSidebar);

  // Close on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('is-open')) {
      closeMobileSidebar();
    }
  });

  // Close sidebar when a step is clicked (on mobile)
  const stepItems = sidebar.querySelectorAll('.wizard-path__item, .wizard-nav-item');
  stepItems.forEach(item => {
    item.addEventListener('click', () => {
      // Only close on mobile
      if (window.innerWidth <= 900) {
        closeMobileSidebar();
      }
    });
  });

  // Expose close function globally
  window.closeMobileSidebar = closeMobileSidebar;

  mobileSidebarInitialized = true;
  console.log('[MobileSidebar] Mobile sidebar toggle initialized');
}

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialize all mobile UI components
 */
export function initMobileUI() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupMobileNavigation();
      setupMobileSidebar();
    });
  } else {
    setupMobileNavigation();
    setupMobileSidebar();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GLOBAL EXPOSURE
// ═══════════════════════════════════════════════════════════════════════════

if (typeof window !== 'undefined') {
  window.MobileSidebar = {
    init: initMobileUI,
    openNav: openMobileNav,
    closeNav: closeMobileNav,
    toggleNav: toggleMobileNav,
    openSidebar: openMobileSidebar,
    closeSidebar: closeMobileSidebar
  };
}
