/**
 * Distro Disco bottom navigation — interactions only (no routing).
 * Dispatches `bottomnav:select` on the nav element: { detail: { tab } }
 * tab: home | events | support | volunteer | forums
 */
(function () {
  'use strict';

  var ICON_ANIM = {
    home: { selector: '.icon-home', duration: 550 },
    events: { selector: '.icon-calendar', duration: 520 },
    volunteer: { selector: '.icon-items', duration: 600 },
    forums: { selector: '.icon-forum', duration: 620 }
  };

  var LABEL_TO_TAB = {
    home: 'home',
    events: 'events',
    volunteer: 'volunteer',
    forums: 'forums'
  };

  function prefersReducedMotion() {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  function replayAnimation(el, className, durationMs) {
    if (!el) return;
    if (prefersReducedMotion()) return;
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
    window.setTimeout(function () {
      el.classList.remove(className);
    }, durationMs);
  }

  function getItemLabel(item) {
    var labelSpan = item.querySelector('span:last-of-type') || item.querySelector('span');
    return (labelSpan && labelSpan.textContent || '').trim().toLowerCase();
  }

  function setActiveNavItem(bottomNav, activeEl) {
    bottomNav.querySelectorAll('.nav-item').forEach(function (el) {
      el.classList.remove('active');
    });
    if (activeEl) activeEl.classList.add('active');
  }

  function initTouchActivePolyfill(root) {
    var selector = '.nav-item, .donate-icon-btn';
    function clearTouchActive() {
      root.querySelectorAll('.touch-active').forEach(function (el) {
        el.classList.remove('touch-active');
      });
    }
    root.addEventListener('touchstart', function (e) {
      var el = e.target && e.target.closest && e.target.closest(selector);
      if (el) el.classList.add('touch-active');
    }, { passive: true });
    root.addEventListener('touchend', clearTouchActive, { passive: true });
    root.addEventListener('touchcancel', clearTouchActive, { passive: true });
  }

  function initBottomNav(root, options) {
    root = root || document;
    options = options || {};
    var bottomNav = root.querySelector(options.navSelector || '.bottom-nav');
    if (!bottomNav) return null;

    var navItems = bottomNav.querySelectorAll('.nav-item:not(.center-item)');
    var centerItem = bottomNav.querySelector('.nav-item.center-item');
    var donateBtn = bottomNav.querySelector('#donate-btn') || bottomNav.querySelector('.donate-icon-btn');

    initTouchActivePolyfill(bottomNav);

    navItems.forEach(function (item) {
      item.addEventListener('click', function () {
        var label = getItemLabel(item);
        var tab = LABEL_TO_TAB[label] || label;
        var anim = ICON_ANIM[tab];
        if (anim) {
          replayAnimation(item.querySelector(anim.selector), 'active', anim.duration);
        }
        setActiveNavItem(bottomNav, item);
        bottomNav.dispatchEvent(new CustomEvent('bottomnav:select', {
          bubbles: true,
          detail: { tab: tab }
        }));
      });
    });

    if (donateBtn && centerItem) {
      donateBtn.addEventListener('click', function () {
        setActiveNavItem(bottomNav, centerItem);
        var donateSvg = donateBtn.querySelector('.donate-svg');
        replayAnimation(donateSvg, 'active', 500);
        donateBtn.classList.remove('fired');
        void donateBtn.offsetWidth;
        donateBtn.classList.add('fired');
        bottomNav.dispatchEvent(new CustomEvent('bottomnav:select', {
          bubbles: true,
          detail: { tab: 'support' }
        }));
      });
      donateBtn.addEventListener('animationend', function (e) {
        if (e.target.id === 'p5') donateBtn.classList.remove('fired');
      });
    }

    if (options.initialTab) {
      var initial = options.initialTab === 'support' ? centerItem : null;
      if (!initial) {
        navItems.forEach(function (item) {
          if (LABEL_TO_TAB[getItemLabel(item)] === options.initialTab) initial = item;
        });
      }
      setActiveNavItem(bottomNav, initial || navItems[0]);
    }

    return {
      setActiveTab: function (tab) {
        if (tab === 'support') {
          setActiveNavItem(bottomNav, centerItem);
          return;
        }
        var match = null;
        navItems.forEach(function (item) {
          if (LABEL_TO_TAB[getItemLabel(item)] === tab) match = item;
        });
        setActiveNavItem(bottomNav, match);
      }
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initBottomNav: initBottomNav };
  } else {
    window.initBottomNav = initBottomNav;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var auto = document.querySelector('.bottom-nav[data-auto-init]');
    if (auto) initBottomNav(document);
  });
})();
