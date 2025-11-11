 // Navigation menu handlers for index.html
 (function() {
    const navToggle = document.querySelector('#index-navigation .nav-toggle');
    const navMenu = document.querySelector('#index-navigation .nav-menu');
    
    if (navToggle && navMenu) {
      // Toggle menu on button click
      navToggle.addEventListener('click', () => {
        const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
        navToggle.setAttribute('aria-expanded', !isExpanded);
        navMenu.setAttribute('aria-hidden', isExpanded);
      });
      
      // Close menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
          navToggle.setAttribute('aria-expanded', 'false');
          navMenu.setAttribute('aria-hidden', 'true');
        }
      });
      
      // Close menu with Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && navMenu.getAttribute('aria-hidden') === 'false') {
          navToggle.setAttribute('aria-expanded', 'false');
          navMenu.setAttribute('aria-hidden', 'true');
        }
      });
      
      // Close menu when clicking on a link (mobile only)
      navMenu.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' && window.innerWidth <= 767) {
          navToggle.setAttribute('aria-expanded', 'false');
          navMenu.setAttribute('aria-hidden', 'true');
        }
      });
    }
  })();

  // Smooth scroll animation for navigation links
  // Handles clicks on menu links to scroll smoothly to target sections
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a.nav-link[href^="#"]');
    if (!link) return;
    
    const targetId = link.getAttribute('href').substring(1);
    if (!targetId) return;
    
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      e.preventDefault();
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  // Update active menu item based on visible section
  // Marks the menu link as active when its corresponding section is at the top of the viewport
  function updateActiveMenuItem() {
    const sections = document.querySelectorAll('main section[id^="section"]');
    const navLinks = document.querySelectorAll('#index-navigation a[href^="#"]');
    
    if (sections.length === 0 || navLinks.length === 0) return;
    
    // Offset for fixed navigation in desktop
    const offset = window.innerWidth >= 768 ? 100 : 50;
    const scrollPosition = window.scrollY + offset;
    
    let activeSection = null;
    
    // Find the section that is currently at or just above the top of viewport
    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const sectionTop = section.offsetTop;
      
      // If section top is at or above the scroll position, it's a candidate
      if (sectionTop <= scrollPosition) {
        // Check if section is still visible (not scrolled past)
        if (rect.bottom > offset) {
          activeSection = section;
        }
      }
    });
    
    // If we're at the very top, use the first section
    if (window.scrollY < 50 && sections.length > 0) {
      activeSection = sections[0];
    }
    
    // If no section found, use the first one
    if (!activeSection && sections.length > 0) {
      activeSection = sections[0];
    }
    
    // Update active class on menu links
    navLinks.forEach((link) => {
      const targetId = link.getAttribute('href').substring(1);
      if (activeSection && activeSection.id === targetId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }
  
  // Update on scroll
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(updateActiveMenuItem, 10);
  }, { passive: true });
  
  // Update on page load
  updateActiveMenuItem();

  // Parallax effect for sections
  // Creates parallax effect with background layer moving slower, normal content, and foreground layer moving faster
  function initParallax() {
    const sections = document.querySelectorAll('main section[id^="section"]');
    
    if (sections.length === 0) return;
    
    function updateParallax() {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const backgroundLayer = section.querySelector('.parallax-background');
        const foregroundLayer = section.querySelector('.parallax-foreground');
        
        // Calculate scroll position relative to section start
        const sectionTop = section.offsetTop;
        const scrollPosition = scrollY - sectionTop;
        
        // Apply parallax if section is visible or just scrolled past
        if (rect.bottom > -windowHeight && rect.top < windowHeight * 2) {
          // Background layer moves slower (0.5x speed) - moves down slower
          if (backgroundLayer) {
            const backgroundOffset = scrollPosition * 0.5;
            backgroundLayer.style.transform = `translateY(${backgroundOffset}px)`;
          }
          
          // Foreground layer moves faster (1.5x speed) - moves up faster
          // Ensure foreground starts from bottom when section enters viewport
          if (foregroundLayer) {
            // Calculate position based on how far the section has been scrolled
            // When section first enters viewport, foreground should be at bottom
            // As we scroll, it moves up faster than normal scroll
            const sectionHeight = section.offsetHeight;
            // Base offset to start foreground from bottom (50% of section height)
            const baseOffset = sectionHeight * 0.5;
            // Apply parallax movement
            const parallaxMovement = scrollPosition * -1.5;
            // Combine both: start from bottom, then move up with parallax
            const foregroundOffset = baseOffset + parallaxMovement;
            foregroundLayer.style.transform = `translateY(${foregroundOffset}px)`;
          }
        } else {
          // Reset transforms when section is far out of viewport
          if (backgroundLayer) {
            backgroundLayer.style.transform = 'translateY(0px)';
          }
          if (foregroundLayer) {
            const sectionHeight = section.offsetHeight;
            const baseOffset = sectionHeight * 0.5;
            foregroundLayer.style.transform = `translateY(${baseOffset}px)`;
          }
        }
      });
    }
    
    // Update on scroll with throttling
    let parallaxTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(parallaxTimeout);
      parallaxTimeout = setTimeout(updateParallax, 10);
    }, { passive: true });
    
    // Initial update
    updateParallax();
  }
  
  // Initialize parallax when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initParallax);
  } else {
    initParallax();
  }

  // Add .active class to lureka-caricatura image when page is fully loaded
  // This triggers the animation defined in CSS (margin-left transition)
  function activateCaricatura() {
    const caricatura = document.querySelector('.lureka-caricatura');
    if (caricatura) {
      caricatura.classList.add('active');
    }
  }

  // Initialize caricatura animation when page and all resources are fully loaded
  // Using window.load ensures images are loaded before adding the active class
  if (document.readyState === 'complete') {
    // Page already loaded
    activateCaricatura();
  } else {
    // Wait for page to fully load (including images)
    window.addEventListener('load', activateCaricatura);
  }

  // Video popup functionality
  // Handles clicks on elements with data-video attribute to show video in popup
  function initVideoPopup() {
    const veloPopup = document.querySelector('.velo-popup');
    const videoPopup = document.querySelector('.video-popup');
    const videoPlayer = document.querySelector('#video-player');
    const closeVideoBtn = document.querySelector('.js-close-video-popup');
    
    if (!veloPopup || !videoPopup || !videoPlayer) return;
    
    // Function to open video popup
    function openVideoPopup(videoSrc) {
      if (!videoSrc) return;
      
      // Set video source
      videoPlayer.src = videoSrc;
      videoPlayer.load();
      
      // Show popup
      veloPopup.classList.add('active', 'has-video-popup');
      veloPopup.setAttribute('aria-hidden', 'false');
      videoPopup.classList.add('active');
      videoPopup.setAttribute('aria-hidden', 'false');
      
      // Focus on close button for accessibility
      if (closeVideoBtn) {
        setTimeout(() => {
          closeVideoBtn.focus();
        }, 100);
      }
      
      // Play video
      videoPlayer.play().catch(err => {
        console.log('Error playing video:', err);
      });
    }
    
    // Handle clicks on elements with data-video attribute
    document.addEventListener('click', (e) => {
      const videoTrigger = e.target.closest('[data-video]');
      if (!videoTrigger) return;
      
      const videoSrc = videoTrigger.getAttribute('data-video');
      if (!videoSrc) return;
      
      e.preventDefault();
      openVideoPopup(videoSrc);
    });
    
    // Handle keyboard events (Enter and Space) on elements with data-video
    document.addEventListener('keydown', (e) => {
      const videoTrigger = e.target.closest('[data-video]');
      if (!videoTrigger) return;
      
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const videoSrc = videoTrigger.getAttribute('data-video');
        if (videoSrc) {
          openVideoPopup(videoSrc);
        }
      }
    });
    
    // Close video popup function
    function closeVideoPopup() {
      if (videoPlayer) {
        videoPlayer.pause();
        videoPlayer.src = '';
      }
      videoPopup.classList.remove('active');
      videoPopup.setAttribute('aria-hidden', 'true');
      veloPopup.classList.remove('active', 'has-video-popup');
      veloPopup.setAttribute('aria-hidden', 'true');
    }
    
    // Close on button click
    if (closeVideoBtn) {
      closeVideoBtn.addEventListener('click', closeVideoPopup);
    }
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && videoPopup.classList.contains('active')) {
        closeVideoPopup();
      }
    });
    
    // Close on click outside video (on velo-popup)
    veloPopup.addEventListener('click', (e) => {
      if (e.target === veloPopup) {
        closeVideoPopup();
      }
    });
  }
  
  // Initialize video popup when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVideoPopup);
  } else {
    initVideoPopup();
  }