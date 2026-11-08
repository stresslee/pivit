/* pivit public website — scroll motion (GSAP + ScrollTrigger) */
(function () {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const review = location.search.includes('review');
  if (review) document.documentElement.classList.add('review');
  const MOBILE = window.matchMedia('(max-width: 834px)').matches;   // 모바일 분기 (CSS 브레이크포인트 834 와 동일)
  const shift = new URLSearchParams(location.search).get('shift');
  if (shift) document.body.style.marginTop = (-parseInt(shift, 10)) + 'px';
  if (location.search.includes('gnbdark')) document.getElementById('gnb').classList.add('is-dark');

  /* ---------- 고정 Early Access 버튼 : 콘텐츠 안 버튼이 보일 때는 숨김 ---------- */
  // 콘텐츠 안 Early Access 버튼(히어로·푸터)이 20% 이상 보이거나, 푸터가 화면에 들어오면 끝까지 숨김
  const fixedCta = document.querySelector('.cta--fixed');
  const inlineCtas = Array.from(document.querySelectorAll('.cta:not(.cta--fixed)'));
  const footer = document.querySelector('.footer');
  if (fixedCta && inlineCtas.length) {
    const visible = new Set();
    const apply = () => fixedCta.classList.toggle('is-hidden', visible.size > 0);
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); });
      apply();
    }, { threshold: 0.2 });
    inlineCtas.forEach((el) => cio.observe(el));
    if (footer) {
      const fio = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) visible.add(footer); else visible.delete(footer); });
        apply();
      }, { threshold: 0 });
      fio.observe(footer);
    }
  }

  /* ---------- FAQ : 하나만 열기 + 펼침 0.3s(easeOutQuad) / 접힘 0.1s ---------- */
  const faqItems = Array.from(document.querySelectorAll('.faq__item'));
  const faqAnimated = window.gsap && !reduce && !review;
  const faqOpen = (d) => {
    const a = d.querySelector('.faq__a');
    d.open = true; d.classList.add('is-open');
    gsap.killTweensOf(a);
    gsap.fromTo(a, { height: 0, opacity: 0, marginTop: 0 },
      { height: 'auto', opacity: 1, marginTop: 10, duration: 0.3, ease: 'power1.out', onComplete: () => gsap.set(a, { clearProps: 'height,opacity,marginTop' }) });
  };
  const faqClose = (d) => {
    const a = d.querySelector('.faq__a');
    d.classList.remove('is-open');
    gsap.killTweensOf(a);
    gsap.to(a, { height: 0, opacity: 0, marginTop: 0, duration: 0.1, ease: 'power1.out',
      onComplete: () => { d.open = false; gsap.set(a, { clearProps: 'height,opacity,marginTop' }); } });
  };
  /* 데스크톱 FAQ 는 고정 높이(푸터가 밀리지 않게). 답변 길이가 달라도 넘치지 않도록 '가장 긴 답변을 연 상태'의 높이를 재서 예약한다 (Figma 745*u 보다 작아지진 않음) */
  const faq = document.querySelector('.faq');
  const fitFaq = () => {
    if (!faq || !faqItems.length) return;
    if (window.matchMedia('(max-width: 834px)').matches) { faq.style.height = ''; return; }
    faq.style.height = '';
    const base = faq.getBoundingClientRect().height;             // CSS 고정 높이(745*u)
    const clone = faq.cloneNode(true);
    clone.style.cssText = 'position:absolute;left:0;top:0;width:' + faq.getBoundingClientRect().width + 'px;height:auto;visibility:hidden;pointer-events:none;margin:0;';
    clone.querySelectorAll('.faq__a').forEach((a) => a.removeAttribute('style'));
    faq.parentNode.appendChild(clone);
    const cItems = Array.from(clone.querySelectorAll('.faq__item'));
    let max = 0;
    cItems.forEach((ci) => { cItems.forEach((o) => { o.open = o === ci; }); max = Math.max(max, clone.getBoundingClientRect().height); });
    clone.remove();
    if (max > base + 0.5) faq.style.height = Math.ceil(max) + 'px';
  };
  let faqFitRaf = 0;
  const scheduleFitFaq = () => { cancelAnimationFrame(faqFitRaf); faqFitRaf = requestAnimationFrame(fitFaq); };
  fitFaq();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleFitFaq);
  window.addEventListener('resize', scheduleFitFaq);
  faqItems.forEach((d) => {
    if (d.open) d.classList.add('is-open');
    if (!faqAnimated) {                                       // GSAP 없음/모션 축소: 네이티브 토글 + 하나만 열기
      d.addEventListener('toggle', () => { if (d.open) faqItems.forEach((o) => { if (o !== d) o.open = false; }); });
      return;
    }
    d.querySelector('.faq__q').addEventListener('click', (e) => {
      e.preventDefault();
      if (d.classList.contains('is-open')) faqClose(d);
      else { faqItems.forEach((o) => { if (o !== d && o.classList.contains('is-open')) faqClose(o); }); faqOpen(d); }
    });
  });

  /* ---------- Video : 보이면 재생 ---------- */
  const video = document.querySelector('.video__player');
  if (video && video.querySelector('source')) {
    const vio = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) video.play().catch(() => {}); else video.pause(); });
    }, { threshold: 0.4 });
    vio.observe(video);
  }

  /* ---------- 반응형 스케일: --vw 를 스크롤바를 뺀 실제 폭으로 (CSS 기본값 100vw 는 스크롤바 포함) ---------- */
  // 데스크톱 레이아웃(835px+)은 900px 아래로 줄어들지 않는다: 900 기준으로 고정하고 가로 스크롤 (모바일 600 이하는 100% 유동)
  const DESKTOP_MIN = 900;
  // --vw: 레이아웃 폭(데스크톱은 최소 900), --cw: 실제 창 폭, --sx: 가로 스크롤 — GNB·고정 CTA 가 900 고정 레이아웃을 따라가도록 CSS 에서 사용
  const setVW = () => { const w = document.documentElement.clientWidth; const root = document.documentElement.style; root.setProperty('--vw', (w > 834 ? Math.max(w, DESKTOP_MIN) : w) + 'px'); root.setProperty('--cw', w + 'px'); root.setProperty('--sx', Math.round(window.scrollX) + 'px'); };
  setVW();
  window.addEventListener('resize', setVW);
  let lastSX = 0; window.addEventListener('scroll', () => { if (window.scrollX !== lastSX) { lastSX = window.scrollX; document.documentElement.style.setProperty('--sx', Math.round(lastSX) + 'px'); } }, { passive: true });
  if (window.ResizeObserver) new ResizeObserver(setVW).observe(document.documentElement);

  /* ---------- Section 3 : 좌측 메뉴 탭 → 우측 화면 전환 (스크롤 비연동) ---------- */
  const s3Steps = Array.from(document.querySelectorAll('.s3__step'));
  const s3Panes = Array.from(document.querySelectorAll('.s3__pane'));
  const s3Tabs = Array.from(document.querySelectorAll('.s3__tab'));
  const s3Current = document.querySelector('.s3__current');
  let s3Active = 0;
  if (s3Steps.length && s3Panes.length) {
    const select = (idx, focus) => {
      s3Steps.forEach((li, i) => {
        const on = i === idx;
        li.classList.toggle('is-active', on);
        li.setAttribute('aria-selected', on ? 'true' : 'false');
        li.tabIndex = on ? 0 : -1;
        if (on && focus) li.focus();
      });
      s3Panes.forEach((pane, i) => { pane.classList.toggle('is-active', i === idx); pane.setAttribute('aria-hidden', i === idx ? 'false' : 'true'); });
      // 모바일 탭 + 현재 스텝 설명
      s3Tabs.forEach((t, i) => { t.classList.toggle('is-active', i === idx); t.setAttribute('aria-selected', i === idx ? 'true' : 'false'); });
      if (s3Current) {
        const li = s3Steps[idx];
        const icon = li.querySelector('.s3__icon--on'), name = li.querySelector('.s3__step-name'), desc = li.querySelector('.s3__step-head .body');
        s3Current.innerHTML = `<div class="s3__current-head"><img src="${icon ? icon.getAttribute('src') : ''}" width="30" height="30" alt="" /><b>${name ? name.textContent : ''}</b></div><p>${desc ? desc.textContent : ''}</p>`;
      }
      s3Active = idx;
    };
    s3Tabs.forEach((t, i) => t.addEventListener('click', () => select(i)));
    s3Steps.forEach((li, i) => {
      li.addEventListener('click', () => select(i));
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(i); }
        else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); select((i + 1) % s3Steps.length, true); }
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); select((i - 1 + s3Steps.length) % s3Steps.length, true); }
      });
    });
    select(0);
  }

  if (reduce || review || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
  const EASE = 'power3.out';

  /* ---------- GNB : 비디오 섹션이 화면 상단에 닿으면 다크 글래스로 ---------- */
  const gnb = document.getElementById('gnb');
  // 비디오 섹션 상단을 지나면 다크, 다시 위로 올라올 때만 라이트. 페이지 끝(end)에서는 바뀌지 않음
  ScrollTrigger.create({
    trigger: '#video', start: 'top top',
    onEnter: () => gnb.classList.add('is-dark'),
    onLeaveBack: () => gnb.classList.remove('is-dark')
  });

  /* ---------- GNB 글래스 렌즈 (glisse) : spread 필드 · Bend 1.0 · Dispersion 1.05 · Rim 0.61 ---------- */
  const glass = window.PivitGlass ? PivitGlass.mountField(gnb, { bend: 1.0, dispersion: 1.05, rim: 0.61, blur: 0.6 }) : null;
  window.addEventListener('load', () => glass && glass.refit());

  /* ---------- GNB 꿀렁임 : 스크롤 속도에 따라 눌렸다가 탄성으로 복귀, 렌즈 굴절도 같이 출렁 ---------- */
  const wobble = { amount: 1 };
  let wobbleTl = null;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate(self) {
      const v = Math.abs(self.getVelocity());          // px/s
      if (v < 250) return;
      const k = Math.min(1, v / 3000);                 // 0~1 세기
      if (wobbleTl && wobbleTl.isActive() && wobbleTl.progress() < 0.25) return;
      wobbleTl = gsap.timeline()
        .to(gnb, { scaleX: 1 + 0.045 * k, scaleY: 1 - 0.11 * k, duration: 0.12, ease: 'power2.out' }, 0)
        .to(gnb, { scaleX: 1, scaleY: 1, duration: 1.1, ease: 'elastic.out(1.1, 0.32)' }, 0.12)
        .to(wobble, { amount: 1 - 0.5 * k, duration: 0.12, ease: 'power2.out',
          onUpdate: () => glass && glass.setAmount(wobble.amount) }, 0)
        .to(wobble, { amount: 1, duration: 1.1, ease: 'elastic.out(1.1, 0.32)',
          onUpdate: () => glass && glass.setAmount(wobble.amount) }, 0.12);
    }
  });

  /* ---------- 앵커 링크 : GSAP ScrollTo (pin 구간과 호환되는 스무스 스크롤) ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href').slice(1);
      const target = id ? document.getElementById(id) : document.body;
      if (!target) return;
      e.preventDefault();
      gsap.to(window, { duration: 1, ease: 'power2.inOut', scrollTo: { y: id ? target : 0, autoKill: false },
        onComplete: () => { history.replaceState(null, '', id ? '#' + id : location.pathname); ScrollTrigger.update(); } });
    });
  });

  /* ---------- Hero : 진입 시 순차 등장 ---------- */
  gsap.fromTo('.hero__content > *',
    { y: 28, opacity: 0 },
    { y: 0, opacity: 1, duration: 1, ease: EASE, stagger: 0.14, delay: 0.1 });

  /* ---------- 공통 reveal : 섹션 헤더/비주얼/컬럼 ---------- */
  gsap.utils.toArray('.reveal').forEach((el) => {
    const cols = el.classList.contains('feat__cols') ? el.querySelectorAll('.feat__col') : null;
    if (cols && cols.length) {
      gsap.set(el, { opacity: 1 });
      gsap.from(cols, {
        y: 40, opacity: 0, duration: 0.9, ease: EASE, stagger: 0.12,
        scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' }
      });
      return;
    }
    const isFigure = el.classList.contains('feat__figure');
    gsap.fromTo(el,
      { y: isFigure ? 60 : 36, opacity: 0, scale: isFigure ? 0.97 : 1 },
      { y: 0, opacity: 1, scale: 1, duration: isFigure ? 1.1 : 0.9, ease: EASE,
        scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' } });
  });

  /* ---------- Section 1 : 텍스트가 화면 가운데 오면 고정 → 스크롤에 따라 첫 줄부터 검정으로 → 모두 바뀌면 해제 ---------- */
  const s1Lines = gsap.utils.toArray('.s1__line');
  if (s1Lines.length) {
    const PIN_SCROLL = 900;                                   // 고정 상태로 소비하는 스크롤 길이(px)
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#s1', pin: true, start: 'top top',
        // anticipatePin 은 빠른 스크롤 시 start 보다 100px+ 먼저 고정해 텍스트가 가운데로 '튀어' 보인다 → 사용 안 함
        end: '+=' + PIN_SCROLL, scrub: true, invalidateOnRefresh: true
      }
    });
    tl.to({}, { duration: 0.15 });                           // 고정 직후 잠깐 멈춤
    s1Lines.forEach((line, i) => {
      tl.to(line, { '--t': 1, duration: 0.5, ease: 'none' }, 0.15 + i * 0.55);
    });
    tl.to({}, { duration: 0.15 });                           // 모두 검정이 된 뒤 잠깐 멈춤
  }

  /* ---------- Section 4 : 핀 + 3개 슬라이드 스토리 ----------
     슬라이드마다 [커버(중앙 타이틀)] → [타이틀 상단 이동 + 캡션/자세히 + 목업 등장] → 다음 슬라이드 크로스페이드 */
  const s4 = document.querySelector('.s4');
  const s4Slides = gsap.utils.toArray('.s4__slide');
  if (s4 && s4Slides.length) {
    // 데스크톱(835px+)에서만 스크롤 스토리. 창 크기가 모바일 폭으로 바뀌면 GSAP 이 핀/인라인 스타일을 되돌려 CSS 정적 레이아웃(카드 3장 전부 표시)만 남는다
    const s4mm = gsap.matchMedia();
    s4mm.add('(min-width: 835px)', () => {
    const SLIDE_SCROLL = 2000;                                 // 슬라이드당 스크롤 길이 (멈춤 구간 포함)
    const tl = gsap.timeline({
      scrollTrigger: { trigger: s4, pin: '.s4__sticky', start: 'top top', end: '+=' + (SLIDE_SCROLL * s4Slides.length), scrub: 0.4, invalidateOnRefresh: true } // anticipatePin 제거: 섹션1 과 같은 조기 스냅 방지
    });
    /* 슬라이드 i 구간 = [i, i+1] (1 = SLIDE_SCROLL px)
       0.00~0.12  이전 슬라이드 아웃 → 이 슬라이드 인 (문장만 보이는 상태)
       0.12~0.36  ■ 한 문장 읽는 멈춤 (약 480px)
       0.36~0.52  문장 축소 + 타이틀 등장 (커버)
       0.52~0.60  ■ 커버 멈춤
       0.60~0.72  헤드 상단으로
       0.68~0.88  목업 상승, 캡션/자세히 등장
       0.88~1.00  ■ 콘텐츠 읽는 멈춤 (약 240px) 후 다음 슬라이드 */
    // 글자 크기를 고정하면서 좁은 폭에서는 헤드가 길어진다 → 헤드 높이를 --s4-head-h 로 넘겨 CSS 가 목업을 아래로 밀 수 있게 한다
    if (window.ResizeObserver) {
      const headRO = new ResizeObserver((entries) => { entries.forEach((e) => e.target.closest('.s4__slide').style.setProperty('--s4-head-h', Math.ceil(e.contentRect.height) + 'px')); });
      s4Slides.forEach((slide) => headRO.observe(slide.querySelector('.s4__head')));
    }
    s4Slides.forEach((slide, i) => {
      const t0 = i;
      const head = slide.querySelector('.s4__head');
      const eyebrow = slide.querySelector('.s4__eyebrow');
      const title = slide.querySelector('.s4__title');
      const mock = slide.querySelector('.s4__mock');
      const more = slide.querySelector('.s4__more');
      const cap = slide.querySelector('.s4__caption');
      if (i > 0) {
        tl.to(s4Slides[i - 1], { opacity: 0, duration: 0.05, ease: 'none' }, t0);
        tl.fromTo(slide, { opacity: 0 }, { opacity: 1, duration: 0.07, ease: 'none' }, t0 + 0.05);
      }
      // --hy / --m 은 단위 없는 값. CSS 에서 반응형 스케일(--u)을 곱해 실제 px 로 쓴다
      gsap.set(head, { '--hy': 374 });
      gsap.set(eyebrow, { '--m': 1 });
      tl.to(eyebrow, { '--m': 0, fontWeight: 500, lineHeight: 1.63, letterSpacing: '-0.48px', duration: 0.16, ease: 'power2.inOut' }, t0 + 0.36);
      tl.fromTo(head, { '--hy': 374 }, { '--hy': 271, duration: 0.16, ease: 'power2.inOut' }, t0 + 0.36);
      tl.fromTo(title, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.14, ease: 'power2.out' }, t0 + 0.42);
      tl.fromTo(head, { '--hy': 271 }, { '--hy': 37, duration: 0.12, ease: 'power2.inOut', immediateRender: false }, t0 + 0.6);
      tl.fromTo(mock, { y: 160, opacity: 0 }, { y: 0, opacity: 1, duration: 0.2, ease: 'power2.out' }, t0 + 0.68);
      if (cap) tl.to(cap, { opacity: 1, duration: 0.08, ease: 'none' }, t0 + 0.74);
      tl.to(more, { opacity: 1, duration: 0.08, ease: 'none' }, t0 + 0.78);
      tl.to({}, { duration: 0.12 }, t0 + 0.88);                 // 콘텐츠 멈춤 (타임라인 길이 확보)
    });
    // 역방향으로 되돌아올 때 활성 클래스 정리
    tl.eventCallback('onUpdate', () => {
      const idx = Math.min(s4Slides.length - 1, Math.floor(tl.progress() * s4Slides.length));
      s4Slides.forEach((s, k) => s.classList.toggle('is-active', k === idx));
    });
    // 데스크톱→모바일(834 이하)로 창이 줄면 GSAP 이 컨텍스트를 되돌리는데, .to() 트윈은 시작값(데스크톱 CSS opacity 0)을 인라인으로 남긴다
    // → 캡션/자세히 버튼이 모바일에서 안 보임. 되돌릴 때 인라인 스타일을 지워 CSS 정적 레이아웃만 남긴다 (슬라이드의 --bg 인라인은 유지)
    return () => {
      gsap.set(s4Slides, { clearProps: 'opacity' });
      gsap.set(s4.querySelectorAll('.s4__head, .s4__eyebrow, .s4__title, .s4__mock, .s4__more, .s4__caption'), { clearProps: 'all' });
    };
    }); // s4mm

    /* 상세 모달 */
    const modal = document.getElementById('s4-modal');
    const bodies = modal ? Array.from(modal.querySelectorAll('.s4__modal-body')) : [];
    // 모달이 열린 동안 페이지 스크롤 잠금 (스크롤은 모달 안에서만), 바깥 클릭/ESC/X 로 닫힘 (0.2s)
    let lockedY = 0;
    // body 를 position:fixed 로 바꾸면 scrollY 가 0 이 되어 ScrollTrigger 가 전부 되감긴다(핀 해제·GNB 흰색).
    // 대신 html overflow:hidden 으로 잠그고 스크롤 위치는 그대로 둔다.
    const lockPage = () => { lockedY = window.scrollY; document.documentElement.classList.add('is-locked'); };
    const unlockPage = () => { document.documentElement.classList.remove('is-locked'); if (Math.abs(window.scrollY - lockedY) > 1) window.scrollTo(0, lockedY); };
    const openModal = (idx) => {
      bodies.forEach((b) => { b.hidden = String(idx) !== b.dataset.modalBody; });
      (modal.querySelector('.s4__modal-scroll') || modal).scrollTop = 0;
      modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false');
      lockPage();
      gsap.fromTo(modal, { x: 40, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.45, ease: 'power3.out' });
    };
    const closeModal = () => {
      if (!modal.classList.contains('is-open')) return;
      modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true');
      unlockPage();
      gsap.to(modal, { x: 40, autoAlpha: 0, duration: 0.2, ease: 'power2.in' });
    };
    document.querySelectorAll('.s4__more').forEach((btn) => btn.addEventListener('click', (e) => { e.stopPropagation(); openModal(btn.dataset.modal); }));
    if (modal) {
      modal.querySelector('.s4__close').addEventListener('click', closeModal);
      modal.addEventListener('click', (e) => e.stopPropagation());
      document.addEventListener('click', () => closeModal());                 // 모달 바깥 클릭
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
      // 잠금 상태에서 휠/터치가 페이지로 새지 않게 (모달 밖에서 발생한 것만 차단)
      const block = (e) => { if (modal.classList.contains('is-open') && !modal.contains(e.target)) e.preventDefault(); };
      window.addEventListener('wheel', block, { passive: false });
      window.addEventListener('touchmove', block, { passive: false });
      const SCROLL_KEYS = [' ', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'];
      window.addEventListener('keydown', (e) => { if (modal.classList.contains('is-open') && SCROLL_KEYS.includes(e.key) && !modal.contains(e.target)) e.preventDefault(); });
    }
  }

  /* ---------- Section 5 : 카드 등장 + 패럴랙스 ---------- */
  const s5 = document.getElementById('s5');
  const s5Cards = gsap.utils.toArray('.s5__card');
  if (s5 && s5Cards.length) {
    // 배경 큰 원: 섹션이 지나가는 동안 스크롤에 비례해 커짐
    gsap.fromTo('.s5__ellipse', { scale: 0.55 }, { scale: 1.15, ease: 'none',
      scrollTrigger: { trigger: s5, start: 'top bottom', end: 'bottom top', scrub: true } });
    // 가운데 문장: 뷰포트 아래쪽(85%)에 들어오면 한 글자씩 순서대로 드러난다
    const cap = s5.querySelector('.s5__caption');
    if (cap && !cap.querySelector('.s5__ch')) {
      // <br class="br-m"> 기준으로 줄을 나눠(모바일 2줄, Figma 30:2650) 줄마다 .s5__line(nowrap) 안에 글자 span 을 넣는다 → 글자 단위 inline-block 이 임의 위치에서 줄바꿈되지 않음
      const lines = [[]];
      cap.childNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BR') lines.push([]);
        else if (node.nodeType === Node.TEXT_NODE) lines[lines.length - 1].push(node.textContent.trim());
      });
      const lineTexts = lines.map((parts) => parts.join(''));
      cap.setAttribute('aria-label', lineTexts.join(' '));
      cap.innerHTML = lineTexts.map((line) => `<span class="s5__line">${Array.from(line).map((ch) => `<span class="s5__ch" aria-hidden="true">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('')}</span>`).join('<br class="br-m" />');
      gsap.from(cap.querySelectorAll('.s5__ch'), { opacity: 0, y: 14, filter: 'blur(4px)', duration: 0.5, ease: EASE, stagger: 0.045,
        scrollTrigger: { trigger: cap, start: 'top 85%', toggleActions: 'play none none reverse' } });
    }
    s5Cards.forEach((card) => {
      const depth = parseFloat(card.dataset.depth || '1');
      gsap.fromTo(card, { opacity: 0, yPercent: 12, scale: 0.96 },
        { opacity: 1, yPercent: 0, scale: 1, duration: 1.1, ease: EASE,
          scrollTrigger: { trigger: card, start: 'top 90%', toggleActions: 'play none none reverse' } });
      const amp = MOBILE ? 40 : 120;                                      // 모바일은 프레임이 작아 진폭 축소
      gsap.fromTo(card, { y: amp * depth }, { y: -amp * depth, ease: 'none',
        scrollTrigger: { trigger: s5, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  }

  /* 섹션 6/7/9 화면 이미지: export 가 비주얼 박스 하단에 맞춰 클립된 상태라 세로 패럴랙스를 주면 아래가 떠 보인다 → 패럴랙스 없음 */

  /* ---------- 푸터 메시지 ---------- */
  gsap.from('.footer__msg > *', { y: 30, opacity: 0, duration: 1, ease: EASE, stagger: 0.12,
    scrollTrigger: { trigger: '.footer__msg', start: 'top 85%', toggleActions: 'play none none reverse' } });

  window.addEventListener('load', () => ScrollTrigger.refresh());
  /* 창 크기 변경 보정: window resize 이벤트를 놓치는 경우(다른 탭에서 리사이즈, 디스플레이 이동 등)에도
     뷰포트 크기가 바뀌었으면 핀 레이아웃을 다시 계산한다 */
  let vw = innerWidth, vh = innerHeight, refreshTimer;
  const refreshIfResized = () => {
    if (innerWidth === vw && innerHeight === vh) return;
    vw = innerWidth; vh = innerHeight;
    clearTimeout(refreshTimer); refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 150);
  };
  if (window.ResizeObserver) new ResizeObserver(refreshIfResized).observe(document.documentElement);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshIfResized(); });
  window.addEventListener('pageshow', refreshIfResized);
})();
