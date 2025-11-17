// Lightweight image lightbox with aggressive lazy loading
(function() {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = lightbox.querySelector('.lightbox-img');
  const closeBtn = lightbox.querySelector('.lightbox-close');
  const prevBtn = lightbox.querySelector('.lightbox-prev');
  const nextBtn = lightbox.querySelector('.lightbox-next');
  
  let currentImages = [];
  let currentIndex = 0;
  
  // Aggressive lazy loading for ALL images
  document.addEventListener('DOMContentLoaded', () => {
    // Target all images in the document
    document.querySelectorAll('img').forEach((img) => {
      // Force lazy loading on everything except logo/critical assets
      if (!img.classList.contains('no-lazy')) {
        img.setAttribute('loading', 'lazy');
        
        // Add low-quality placeholder while loading
        if (!img.complete) {
          img.style.opacity = '0';
          img.style.transition = 'opacity 0.3s ease';
          
          img.addEventListener('load', function() {
            this.style.opacity = '1';
          }, { once: true });
        }
      }
    });
    
    // Setup lightbox click handlers after images are processed
    // Exclude images inside .hero-gif-link (clickable website redirects)
    const images = document.querySelectorAll('.project-hero-frame img:not(.hero-gif-link img), .gallery-thumb');
    images.forEach((img, index) => {
      // Skip if image is inside a clickable link
      if (img.closest('.hero-gif-link')) {
        return;
      }
      img.style.cursor = 'pointer';
      img.addEventListener('click', () => {
        // Get all images in the current project page
        const projectSection = img.closest('.project-page');
        if (projectSection) {
          currentImages = Array.from(projectSection.querySelectorAll('.project-hero-frame img:not(.hero-gif-link img), .gallery-thumb'));
          currentIndex = currentImages.indexOf(img);
        } else {
          currentImages = [img];
          currentIndex = 0;
        }
        
        showImage(currentIndex);
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
        updateNavButtons();
      });
    });
  });
  
  function showImage(index) {
    if (currentImages[index]) {
      lightboxImg.src = currentImages[index].src;
      lightboxImg.alt = currentImages[index].alt;
      currentIndex = index;
      updateNavButtons();
    }
  }
  
  function updateNavButtons() {
    // Hide/show nav buttons based on position
    prevBtn.style.display = currentIndex > 0 ? 'block' : 'none';
    nextBtn.style.display = currentIndex < currentImages.length - 1 ? 'block' : 'none';
  }
  
  // Navigation handlers
  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      showImage(currentIndex - 1);
    }
  });
  
  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (currentIndex < currentImages.length - 1) {
      showImage(currentIndex + 1);
    }
  });
  
  // Close on X button
  closeBtn.addEventListener('click', closeLightbox);
  
  // Close on background click
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
      closeLightbox();
    }
  });
  
  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;
    
    if (e.key === 'Escape') {
      closeLightbox();
    } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
      showImage(currentIndex - 1);
    } else if (e.key === 'ArrowRight' && currentIndex < currentImages.length - 1) {
      showImage(currentIndex + 1);
    }
  });
  
  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }
})();

