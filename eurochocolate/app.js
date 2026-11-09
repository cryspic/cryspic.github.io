(() => {
  const root = document.documentElement;
  const header = document.querySelector('[data-header]');
  const navbar = document.querySelector('.navbar');
  const navBrand = document.querySelector('.brand--nav');
  const menu = document.querySelector('.nav-menu');
  const toggle = document.querySelector('.menu-toggle');
  const sections = [...document.querySelectorAll('main > .screen')];
  const navLinks = [...document.querySelectorAll('[data-nav]')];
  const homeColors = ['#53110D', '#EA5337', '#B72237'];
  let homeIndex = 0;
  let homeDirection = 1;
  let activeId = 'home';
  let scrollTicking = false;
  let preserveHomeLogoDuringScroll = false;
  const homeSection = document.getElementById('home');
  const footer = document.querySelector('.site-footer');
  const clamp01 = (value) => Math.min(1, Math.max(0, value));

  const beanColorState = {
    metrics: [],
    frame: 0,
    dynamicFrame: 0,
    dynamic: new Map()
  };

  const parseHexColor = (value) => {
    const match = String(value || '').trim().match(/^#([0-9a-f]{6})$/i);
    if (!match) return null;
    const number = Number.parseInt(match[1], 16);
    return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
  };

  const mixColor = (from, to, amount) => {
    const progress = clamp01(amount);
    const channels = from.map((channel, index) => Math.round(channel + (to[index] - channel) * progress));
    return `rgb(${channels[0]} ${channels[1]} ${channels[2]})`;
  };

  const getDynamicBeanColor = (id, now = performance.now()) => {
    const transition = beanColorState.dynamic.get(id);
    if (!transition) return null;

    const progress = transition.duration > 0
      ? clamp01((now - transition.startedAt) / transition.duration)
      : 1;
    return transition.from.map((channel, index) => Math.round(
      channel + (transition.to[index] - channel) * progress
    ));
  };

  const animateDynamicBeanColors = () => {
    beanColorState.dynamicFrame = 0;
    updateBeansColor();

    const now = performance.now();
    const isRunning = [...beanColorState.dynamic.values()].some((transition) => (
      now < transition.startedAt + transition.duration
    ));

    if (isRunning) {
      beanColorState.dynamicFrame = requestAnimationFrame(animateDynamicBeanColors);
    }
  };

  const transitionDynamicBeanColor = (id, value, duration = 1450) => {
    const target = parseHexColor(value);
    if (!target) return;

    const current = getDynamicBeanColor(id) || target;
    beanColorState.dynamic.set(id, {
      from: current,
      to: target,
      startedAt: performance.now(),
      duration: beanColorState.dynamic.has(id) ? duration : 0
    });

    if (!beanColorState.dynamicFrame) {
      beanColorState.dynamicFrame = requestAnimationFrame(animateDynamicBeanColors);
    }
  };

  const getSectionBeanColor = (section) => {
    if (section.id === 'home' || section.id === 'evento') {
      const dynamicColor = getDynamicBeanColor(section.id);
      if (dynamicColor) return dynamicColor;
    }

    const styles = getComputedStyle(root);
    const dynamicValue = section.id === 'home'
      ? styles.getPropertyValue('--home-accent')
      : section.id === 'evento'
        ? styles.getPropertyValue('--event-accent')
        : section.dataset.accent;
    return parseHexColor(dynamicValue) || parseHexColor(section.dataset.accent) || [83, 17, 13];
  };

  const refreshBeanMetrics = () => {
    beanColorState.metrics = sections.map((section) => ({
      section,
      top: section.offsetTop,
      bottom: section.offsetTop + section.offsetHeight
    }));
  };

  const updateBeansColor = () => {
    if (!beanColorState.metrics.length) refreshBeanMetrics();
    if (!beanColorState.metrics.length) return;

    const headerHeight = header?.getBoundingClientRect().height ?? 0;
    const reference = window.scrollY + headerHeight + (window.innerHeight - headerHeight) * 0.48;
    let color = getSectionBeanColor(beanColorState.metrics[0].section);

    for (let index = 0; index < beanColorState.metrics.length - 1; index += 1) {
      const current = beanColorState.metrics[index];
      const next = beanColorState.metrics[index + 1];
      const band = Math.min(window.innerHeight * 0.58, current.section.offsetHeight * 0.42, next.section.offsetHeight * 0.42);
      const start = current.bottom - band / 2;
      const end = current.bottom + band / 2;

      if (reference < start) {
        color = getSectionBeanColor(current.section);
        break;
      }

      if (reference <= end) {
        color = mixColor(getSectionBeanColor(current.section), getSectionBeanColor(next.section), (reference - start) / band);
        break;
      }

      color = getSectionBeanColor(next.section);
    }

    root.style.setProperty('--beans-color', Array.isArray(color) ? mixColor(color, color, 0) : color);
  };

  const requestBeansColorUpdate = () => {
    if (beanColorState.frame) return;
    beanColorState.frame = requestAnimationFrame(() => {
      beanColorState.frame = 0;
      updateBeansColor();
    });
  };

  const smoothstep = (from, to, value) => {
    if (from === to) return value >= to ? 1 : 0;
    const progress = clamp01((value - from) / (to - from));
    return progress * progress * (3 - 2 * progress);
  };

  const updateNavLogoTransition = () => {
    if (!homeSection) return;

    const headerHeight = header?.getBoundingClientRect().height ?? 0;
    const homeTop = homeSection.offsetTop;
    const homeHeight = Math.max(homeSection.offsetHeight, window.innerHeight);
    const transitionStart = homeTop + homeHeight * 0.54;
    const transitionEnd = homeTop + homeHeight - Math.max(44, headerHeight * 0.42);
    const progress = clamp01((window.scrollY - transitionStart) / Math.max(1, transitionEnd - transitionStart));

    /* Il logo 1 ruota e si ingrandisce prima della dissolvenza verso il logo 2.
       Nel passaggio inverso il logo 2 scompare completamente prima che il logo 1
       inizi a raddrizzarsi, evitando la sovrapposizione tra dissolvenza e rotazione. */
    const rotationProgress = smoothstep(0, 0.58, progress);
    const logoGrowthProgress = smoothstep(0.30, 0.68, progress);
    const swapProgress = smoothstep(0.68, 0.94, progress);
    const sharedLogoScale = 1 + 0.15 * logoGrowthProgress;

    const baseHomeRotation = 28.61 * rotationProgress;
    const baseHomeOpacity = 1 - swapProgress;
    const baseStandardOpacity = swapProgress;
    const baseHomeScale = sharedLogoScale;
    const baseStandardScale = sharedLogoScale;

    let footerReturnProgress = 0;
    if (footer) {
      const footerTop = footer.getBoundingClientRect().top;
      footerReturnProgress = smoothstep(window.innerHeight * 0.92, window.innerHeight * 0.52, footerTop);
      root.classList.toggle('is-footer-active', footerTop <= window.innerHeight * 0.92);
    } else {
      root.classList.remove('is-footer-active');
    }

    if (preserveHomeLogoDuringScroll && window.scrollY <= homeTop + 2) {
      preserveHomeLogoDuringScroll = false;
    }

    /* Cliccando il logo del footer, il logo 1 resta stabile per l'intero
       scorrimento verso la Home e il logo 2 non viene mostrato di passaggio. */
    if (preserveHomeLogoDuringScroll) {
      root.style.setProperty('--nav-home-logo-rotation', '0deg');
      root.style.setProperty('--nav-home-logo-opacity', '1');
      root.style.setProperty('--nav-standard-logo-opacity', '0');
      root.style.setProperty('--nav-home-logo-scale', '1');
      root.style.setProperty('--nav-standard-logo-scale', '1');
      return;
    }

    /* Il passaggio in uscita dal footer usa la stessa identica sequenza
       della transizione Home → Eurochocolate 2026: il logo 1 ruota e si
       ingrandisce, poi avviene lo scambio con il logo 2. Scorrendo verso
       il footer, la stessa sequenza viene semplicemente riprodotta al contrario. */
    const footerExitProgress = 1 - footerReturnProgress;
    const footerRotationProgress = smoothstep(0, 0.58, footerExitProgress);
    const footerGrowthProgress = smoothstep(0.30, 0.68, footerExitProgress);
    const footerSwapProgress = smoothstep(0.68, 0.94, footerExitProgress);
    const footerSharedScale = 1 + 0.15 * footerGrowthProgress;

    const footerHomeRotation = 28.61 * footerRotationProgress;
    const footerHomeOpacity = 1 - footerSwapProgress;
    const footerStandardOpacity = footerSwapProgress;

    const homeRotation = footerReturnProgress > 0 ? footerHomeRotation : baseHomeRotation;
    const homeOpacity = footerReturnProgress > 0 ? footerHomeOpacity : baseHomeOpacity;
    const standardOpacity = footerReturnProgress > 0 ? footerStandardOpacity : baseStandardOpacity;
    const homeScale = footerReturnProgress > 0 ? footerSharedScale : baseHomeScale;
    const standardScale = footerReturnProgress > 0 ? footerSharedScale : baseStandardScale;

    root.style.setProperty('--nav-home-logo-rotation', `${homeRotation.toFixed(2)}deg`);
    root.style.setProperty('--nav-home-logo-opacity', homeOpacity.toFixed(3));
    root.style.setProperty('--nav-standard-logo-opacity', standardOpacity.toFixed(3));
    root.style.setProperty('--nav-home-logo-scale', homeScale.toFixed(3));
    root.style.setProperty('--nav-standard-logo-scale', standardScale.toFixed(3));
  };

  const setAccent = (accent) => {
    root.style.setProperty('--active-accent', accent);
    root.style.setProperty('--root-accent', accent);
  };

  const setHomeAccent = (accent) => {
    root.style.setProperty('--home-accent', accent);
    transitionDynamicBeanColor('home', accent);
  };

  const setActive = (id, accent) => {
    activeId = id;
    root.classList.toggle('is-event-active', id === 'evento');
    root.classList.toggle('is-home-active', id === 'home');
    if (id === 'home') {
      setHomeAccent(homeColors[homeIndex]);
      setAccent(homeColors[homeIndex]);
    } else if (accent) {
      setAccent(accent);
    }
    navLinks.forEach((link) => {
      link.classList.toggle('is-active', link.dataset.nav === id);
    });
  };

  const syncHeaderMetrics = () => {
    if (!header) return;
    const bottom = Math.ceil(header.getBoundingClientRect().bottom);
    root.style.setProperty('--header-bottom', `${bottom}px`);
  };

  const updateActiveSection = () => {
    scrollTicking = false;
    updateNavLogoTransition();
    updateBeansColor();
    if (!sections.length) return;

    const headerBottom = header?.getBoundingClientRect().bottom ?? 0;
    const readingLine = headerBottom + (window.innerHeight - headerBottom) * 0.38;
    let current = sections[0];

    for (const section of sections) {
      const rect = section.getBoundingClientRect();
      if (rect.top <= readingLine) current = section;
      if (rect.top <= readingLine && rect.bottom > readingLine) {
        current = section;
        break;
      }
    }

    setActive(current.id, current.dataset.accent);
  };

  const requestActiveUpdate = () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(updateActiveSection);
  };

  const closeMenu = () => {
    menu?.classList.remove('is-open');
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.setAttribute('aria-label', 'Apri il menu');
    document.body.classList.remove('menu-open');
  };

  const navigationFits = () => {
    if (!navbar || !navBrand || !menu) return true;

    const navbarStyle = getComputedStyle(navbar);
    const menuStyle = getComputedStyle(menu);
    const availableWidth = navbar.clientWidth
      - parseFloat(navbarStyle.paddingLeft)
      - parseFloat(navbarStyle.paddingRight);
    const navbarGap = parseFloat(navbarStyle.columnGap || navbarStyle.gap) || 0;
    const menuGap = parseFloat(menuStyle.columnGap || menuStyle.gap) || 0;
    const items = [...menu.children];
    const menuWidth = items.reduce((width, item) => width + item.getBoundingClientRect().width, 0)
      + Math.max(0, items.length - 1) * menuGap;
    const requiredWidth = navBrand.getBoundingClientRect().width + navbarGap + menuWidth;

    return requiredWidth <= availableWidth - 8;
  };

  const updateNavigationMode = () => {
    if (!header || !navbar || !menu || !toggle) return;

    closeMenu();
    header.classList.remove('is-menu-mode', 'is-nav-compact');

    if (!navigationFits()) {
      header.classList.add('is-nav-compact');
    }

    if (!navigationFits()) {
      header.classList.add('is-menu-mode');
    }
  };

  const scrollToSection = (target, updateHistory = true) => {
    if (!target) return;
    closeMenu();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActive(target.id, target.dataset.accent);

    if (updateHistory) {
      history.pushState(null, '', `#${target.id}`);
    }
  };

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;

    const id = decodeURIComponent(link.getAttribute('href').slice(1));
    const target = document.getElementById(id);
    if (!target) return;

    const isFooterHomeLogo = link.matches('.brand--footer[href="#home"]');
    preserveHomeLogoDuringScroll = isFooterHomeLogo;
    if (isFooterHomeLogo) updateNavLogoTransition();

    event.preventDefault();
    scrollToSection(target);
  });

  toggle?.addEventListener('click', () => {
    if (!header?.classList.contains('is-menu-mode')) return;

    const open = !menu?.classList.contains('is-open');
    menu?.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Chiudi il menu' : 'Apri il menu');
    document.body.classList.toggle('menu-open', open);
  });

  document.addEventListener('click', (event) => {
    if (!menu?.classList.contains('is-open')) return;
    if (event.target.closest('.navbar')) return;
    closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });

  window.addEventListener('scroll', requestActiveUpdate, { passive: true });
  window.addEventListener('resize', () => {
    updateNavigationMode();
    syncHeaderMetrics();
    refreshBeanMetrics();
    updateNavLogoTransition();
    requestActiveUpdate();
  });

  window.addEventListener('load', () => {
    updateNavigationMode();
    syncHeaderMetrics();
    refreshBeanMetrics();
    const hashTarget = location.hash && document.querySelector(location.hash);
    if (hashTarget) {
      requestAnimationFrame(() => {
        hashTarget.scrollIntoView({ block: 'start' });
        updateNavLogoTransition();
      });
    } else {
      updateNavLogoTransition();
    }
    requestActiveUpdate();
  });

  setInterval(() => {
    if (activeId !== 'home') return;
    if (homeIndex >= homeColors.length - 1) homeDirection = -1;
    if (homeIndex <= 0) homeDirection = 1;
    homeIndex += homeDirection;
    setHomeAccent(homeColors[homeIndex]);
    setAccent(homeColors[homeIndex]);
  }, 4600);

  const eventSection = document.getElementById('evento');
  const posters = [...document.querySelectorAll('#evento .poster')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let posterIndex = 0;

  const syncEventPoster = (index) => {
    if (!posters.length || !eventSection) return;
    posterIndex = ((index % posters.length) + posters.length) % posters.length;

    posters.forEach((poster, itemIndex) => {
      poster.classList.toggle('is-active', itemIndex === posterIndex);
    });

    const accent = posters[posterIndex].dataset.accent;
    if (!accent) return;

    eventSection.dataset.accent = accent;
    eventSection.style.setProperty('--section-accent', accent);
    root.style.setProperty('--event-accent', accent);
    transitionDynamicBeanColor('evento', accent);
    if (activeId === 'evento') setAccent(accent);
  };

  const transitionEventPoster = (index) => {
    if (!posters.length) return;
    syncEventPoster(index);
  };

  if (posters.length) {
    syncEventPoster(0);
    setInterval(() => transitionEventPoster(posterIndex + 1), 5200);
  }

  const touchProducts = window.matchMedia('(hover: none), (pointer: coarse)');
  document.querySelectorAll('.product-flip').forEach((button) => {
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', (event) => {
      const keyboardActivation = event.detail === 0;
      if (!touchProducts.matches && !keyboardActivation) return;

      const flipped = button.classList.toggle('is-flipped');
      button.setAttribute('aria-pressed', String(flipped));
      button.setAttribute('aria-label', flipped
        ? `Mostra il fronte di ${button.querySelector('.front')?.alt || 'questo prodotto'}`
        : `Mostra il retro di ${button.querySelector('.front')?.alt || 'questo prodotto'}`);
    });
  });

  const productCarousel = document.querySelector('[data-product-carousel]');
  const productTrack = productCarousel?.querySelector('[data-product-track]');
  const productCards = productTrack ? [...productTrack.querySelectorAll('.product-card')] : [];
  const productPrev = productCarousel?.querySelector('[data-product-prev]');
  const productNext = productCarousel?.querySelector('[data-product-next]');
  const productCurrent = productCarousel?.querySelector('[data-product-current]');
  const productCarouselQuery = window.matchMedia('(max-width: 760px)');
  let productIndex = 0;
  let productScrollFrame = 0;

  const getNearestProductIndex = () => {
    if (!productTrack || !productCards.length) return 0;
    const trackRect = productTrack.getBoundingClientRect();
    const trackCenter = trackRect.left + trackRect.width / 2;
    return productCards.reduce((nearest, card, index) => {
      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const distance = Math.abs(cardCenter - trackCenter);
      return distance < nearest.distance ? { index, distance } : nearest;
    }, { index: 0, distance: Infinity }).index;
  };

  const updateProductControls = (index = getNearestProductIndex()) => {
    if (!productCards.length) return;
    productIndex = Math.max(0, Math.min(index, productCards.length - 1));

    productCards.forEach((card, cardIndex) => {
      const isCurrent = cardIndex === productIndex;
      card.classList.toggle('is-current', isCurrent);
      card.classList.toggle('is-previous', cardIndex === productIndex - 1);
      card.classList.toggle('is-next', cardIndex === productIndex + 1);
      card.setAttribute('aria-current', isCurrent ? 'true' : 'false');
    });

    if (productCurrent) productCurrent.textContent = String(productIndex + 1);
    if (productPrev) productPrev.disabled = !productCarouselQuery.matches || productIndex === 0;
    if (productNext) productNext.disabled = !productCarouselQuery.matches || productIndex === productCards.length - 1;
  };

  const goToProduct = (index) => {
    if (!productTrack || !productCards.length) return;
    const nextIndex = Math.max(0, Math.min(index, productCards.length - 1));
    const target = productCards[nextIndex];
    const left = target.offsetLeft - (productTrack.clientWidth - target.offsetWidth) / 2;
    productTrack.scrollTo({ left, behavior: 'smooth' });
    updateProductControls(nextIndex);
  };

  productPrev?.addEventListener('click', () => goToProduct(productIndex - 1));
  productNext?.addEventListener('click', () => goToProduct(productIndex + 1));

  productTrack?.addEventListener('scroll', () => {
    cancelAnimationFrame(productScrollFrame);
    productScrollFrame = requestAnimationFrame(() => updateProductControls());
  }, { passive: true });

  productTrack?.addEventListener('keydown', (event) => {
    if (!productCarouselQuery.matches) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goToProduct(productIndex - 1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goToProduct(productIndex + 1);
    }
  });

  const syncProductCarousel = () => {
    if (!productTrack) return;
    if (!productCarouselQuery.matches) {
      productTrack.scrollLeft = 0;
      productIndex = 0;
    }
    updateProductControls(productCarouselQuery.matches ? getNearestProductIndex() : 0);
  };

  productCarouselQuery.addEventListener?.('change', syncProductCarousel);
  window.addEventListener('resize', syncProductCarousel);
  syncProductCarousel();

  const motionSelectors = [
    '#evento .event-intro',
    '#evento .event-lead',
    '#evento .fact',
    '#evento .event-actions',
    '#evento .poster-stage',
    '#programma .section-header',
    '#programma .program-card',
    '#programma .actions',
    '#esperienze .section-header',
    '#esperienze .experience-card',
    '#esperienze .actions',
    '#prodotti .section-header',
    '#prodotti .product-card',
    '#prodotti .actions',
    '#lavora-con-noi .media-card--career',
    '#lavora-con-noi .section-header',
    '#lavora-con-noi .body-copy',
    '#lavora-con-noi .actions',
    '#newsletter .section-header',
    '#newsletter .button--fit',
    '#newsletter .form-card',
    '.site-footer .brand--footer',
    '.site-footer .footer-nav',
    '.site-footer .footer-contact',
    '.site-footer .footer-bottom'
  ];

  const motionElements = [...document.querySelectorAll(motionSelectors.join(','))];
  const motionCounters = new Map();

  motionElements.forEach((element) => {
    const group = element.closest('.screen, .site-footer') || document.body;
    const index = motionCounters.get(group) || 0;
    motionCounters.set(group, index + 1);
    element.classList.add('motion-enter');
    element.style.setProperty('--motion-delay', `${Math.min(index * 20, 80)}ms`);

    if (element.matches('.poster-stage, .media-card--career')) {
      element.classList.add('motion-enter--opacity');
    }
  });

  /* Evita che l'applicazione iniziale dello stato nascosto venga animata
     al contrario prima della vera entrata nel viewport. */
  void document.body.offsetWidth;
  root.classList.add('motion-ready');

  if (reducedMotion.matches) {
    motionElements.forEach((element) => element.classList.add('is-in-view'));
  } else {
    /* Gli elementi già visibili entrano subito; gli altri si attivano una
       sola volta durante lo scorrimento verso il basso. */
    const pendingMotionElements = new Set(motionElements);
    let previousMotionScrollY = window.scrollY;
    let motionScrollFrame = 0;

    const revealVisibleMotionElements = (force = false) => {
      motionScrollFrame = 0;
      const currentScrollY = window.scrollY;
      const isScrollingDown = currentScrollY > previousMotionScrollY + 0.5;
      previousMotionScrollY = currentScrollY;

      if ((!isScrollingDown && !force) || !pendingMotionElements.size) return;

      const headerBottom = header?.getBoundingClientRect().bottom ?? 0;
      const revealLine = window.innerHeight * 0.99;

      pendingMotionElements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        const isInsideRevealArea = rect.top < revealLine && rect.bottom > headerBottom;
        if (!isInsideRevealArea) return;

        element.classList.add('is-in-view');
        pendingMotionElements.delete(element);
      });
    };

    const requestMotionReveal = () => {
      if (motionScrollFrame) return;
      motionScrollFrame = requestAnimationFrame(revealVisibleMotionElements);
    };

    window.addEventListener('scroll', requestMotionReveal, { passive: true });
    requestAnimationFrame(() => revealVisibleMotionElements(true));
  }

  let dialogPageScroll = 0;
  let openDialogCount = 0;

  const lockPageForDialog = () => {
    if (openDialogCount > 0) {
      openDialogCount += 1;
      return;
    }

    dialogPageScroll = window.scrollY || window.pageYOffset || 0;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.classList.add('dialog-open');
    document.body.style.position = 'fixed';
    document.body.style.top = `-${dialogPageScroll}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    openDialogCount = 1;
  };

  const unlockPageAfterDialog = () => {
    openDialogCount = Math.max(0, openDialogCount - 1);
    if (openDialogCount > 0) return;

    document.body.classList.remove('dialog-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.paddingRight = '';
    window.scrollTo({ top: dialogPageScroll, left: 0, behavior: 'auto' });
  };

  document.querySelectorAll('[data-dialog]').forEach((button) => {
    button.addEventListener('click', () => {
      const dialog = document.getElementById(button.dataset.dialog);
      if (!dialog || dialog.open) return;

      lockPageForDialog();
      dialog.showModal();
      requestAnimationFrame(() => {
        dialog.querySelector('.dialog-close')?.focus({ preventScroll: true });
      });
    });
  });

  document.querySelectorAll('.dialog').forEach((dialog) => {
    dialog.querySelector('.dialog-close')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', unlockPageAfterDialog);
  });



  const careerForm = document.querySelector('[data-career-form]');
  const careerDialog = document.getElementById('dialog-candidatura');

  careerForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const message = careerForm.querySelector('.career-form__message');

    if (!careerForm.checkValidity()) {
      careerForm.reportValidity();
      if (message) message.textContent = 'Completa tutti i campi richiesti.';
      return;
    }

    if (message) message.textContent = 'Demo: candidatura non inviata, nessun dato viene raccolto.';
    careerForm.reset();
  });

  careerDialog?.addEventListener('close', () => {
    const message = careerForm?.querySelector('.career-form__message');
    if (message) message.textContent = '';
  });

  const form = document.querySelector('[data-newsletter]');
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const message = form.querySelector('.form-message');
    if (!form.checkValidity()) {
      form.reportValidity();
      message.textContent = 'Completa tutti i campi richiesti.';
      return;
    }
    message.textContent = 'Demo: nessun dato viene inviato o salvato.';
    form.reset();
  });

  refreshBeanMetrics();
  setHomeAccent(homeColors[homeIndex]);
  root.classList.add('is-home-active');
  setAccent(homeColors[homeIndex]);

  /* Il primo fotogramma usa già il marrone della Home. Solo dopo due frame
     abilitiamo la transizione cromatica, evitando il flash iniziale arancione. */
  requestAnimationFrame(() => {
    requestAnimationFrame(() => root.classList.add('is-color-ready'));
  });

  updateNavigationMode();
  syncHeaderMetrics();
  requestActiveUpdate();

  document.fonts?.ready.then(() => {
    updateNavigationMode();
    syncHeaderMetrics();
  });
})();
