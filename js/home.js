document.addEventListener('DOMContentLoaded', () => {
  const mobileMenu = document.querySelector('.mobile-menu');

  if (mobileMenu) {
    mobileMenu.addEventListener('click', (event) => {
      if (event.target.closest('a')) {
        mobileMenu.open = false;
      }
    });

    document.addEventListener('click', (event) => {
      if (!mobileMenu.contains(event.target)) {
        mobileMenu.open = false;
      }
    });
  }

  if (mobileMenu) {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        mobileMenu.open = false;
      }
    });
  }

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    document.querySelectorAll('.home-section .container > *, .home-service-card, .feature-list article').forEach((element) => {
      element.classList.add('reveal');
      revealObserver.observe(element);
    });

    const countObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const counter = entry.target;
        const target = Number(counter.dataset.count);
        const startTime = performance.now();
        const duration = 850;

        const updateCount = (now) => {
          const progress = Math.min((now - startTime) / duration, 1);
          counter.textContent = String(Math.round(target * progress));

          if (progress < 1) {
            requestAnimationFrame(updateCount);
          }
        };

        requestAnimationFrame(updateCount);
        observer.unobserve(counter);
      });
    }, { threshold: 0.6 });

    document.querySelectorAll('[data-count]').forEach((counter) => countObserver.observe(counter));
  }
});
