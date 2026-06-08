/* ============================================
   MAIN.JS - Navigation & Page Switching
   ============================================
   Handles:
   - Sidebar collapse/expand toggle
   - Page navigation/switching
   - Keyboard navigation
   - Mobile sidebar toggle
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
  // Elements
  const sidebar = document.querySelector('.sidebar');
  const sidebarToggle = document.querySelector('.sidebar-toggle');
  const navLinks = document.querySelectorAll('.nav-link');
  const pages = document.querySelectorAll('.page');
  
  // Mobile overlay (create if not exists)
  let overlay = document.querySelector('.sidebar-overlay');
  if (!overlay && window.innerWidth <= 768) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
  }
  
  /* ----- SIDEBAR TOGGLE ----- */
  function toggleSidebar() {
    sidebar.classList.toggle('collapsed');
    
    // Mobile handling
    if (window.innerWidth <= 768) {
      sidebar.classList.toggle('open');
      overlay?.classList.toggle('visible');
    }
    
    // Save state to localStorage
    const isCollapsed = sidebar.classList.contains('collapsed');
    localStorage.setItem('sidebarCollapsed', isCollapsed);
  }
  
  sidebarToggle?.addEventListener('click', toggleSidebar);
  overlay?.addEventListener('click', toggleSidebar);
  
  /* ----- PAGE SWITCHING ----- */
  function switchPage(pageId) {
    // Hide all pages
    pages.forEach(page => {
      page.classList.remove('active');
    });
    
    // Show target page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
      targetPage.classList.add('active');
    }
    
    // Update nav links
    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.dataset.page === pageId) {
        link.classList.add('active');
      }
    });
    
    // Close mobile sidebar on switch
    if (window.innerWidth <= 768) {
      sidebar.classList.remove('open');
      overlay?.classList.remove('visible');
    }
    
    // Save current page to localStorage
    localStorage.setItem('currentPage', pageId);
    
    // Update URL hash (optional)
    window.location.hash = pageId;
  }
  
  // Add click handlers to nav links
  navLinks.forEach(link => {
    link.addEventListener('click', function() {
      const pageId = this.dataset.page;
      if (pageId) {
        switchPage(pageId);
      }
    });
  });
  
  /* ----- INITIALIZE STATE ----- */
  
  // Restore sidebar state
  const savedSidebarState = localStorage.getItem('sidebarCollapsed');
  if (savedSidebarState === 'true') {
    sidebar.classList.add('collapsed');
  }
  
  // Restore current page or use hash
  let currentPage = localStorage.getItem('currentPage');
  
  // Check URL hash first
  if (window.location.hash) {
    const hashPage = window.location.hash.replace('#', '');
    if (document.getElementById(hashPage)) {
      currentPage = hashPage;
    }
  }
  
  // Default to first page if none saved
  if (!currentPage) {
    const firstPage = pages[0]?.id || 'home';
    currentPage = firstPage;
  }
  
  switchPage(currentPage);
  
  /* ----- KEYBOARD NAVIGATION ----- */
  document.addEventListener('keydown', function(e) {
    // Ctrl+B to toggle sidebar
    if (e.ctrlKey && e.key === 'b') {
      e.preventDefault();
      toggleSidebar();
    }
    
    // Arrow keys for page navigation
    const pageArray = Array.from(pages);
    const currentIndex = pageArray.findIndex(p => p.classList.contains('active'));
    
    if (e.altKey && e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % pageArray.length;
      switchPage(pageArray[nextIndex].id);
    } else if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + pageArray.length) % pageArray.length;
      switchPage(pageArray[prevIndex].id);
    }
  });
  
  /* ----- HANDLE RESIZE ----- */
  window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
      sidebar.classList.remove('open');
      overlay?.classList.remove('visible');
    }
  });
});