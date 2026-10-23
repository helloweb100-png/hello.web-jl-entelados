/* ==========================================================================
   ENTELADOS JL · app.js
   Dependencias (CDN, ver index.html): GSAP 3.12 + ScrollTrigger, Lenis.
   Principios:
     - Sin listeners de "scroll" propios: ScrollTrigger / IntersectionObserver.
     - Solo se anima transform / opacity / clip-path.
     - Todo se degrada: sin GSAP o con prefers-reduced-motion la página es
       100% usable (menú, FAQ, formulario, lightbox, selector de color, videos).
   ========================================================================== */
(() => {
    'use strict';

    /* ───────────────────────── Utilidades ───────────────────────── */
    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
    const root = document.documentElement;

    const PHONE = '523521472541';
    const waURL = (msg) => `https://wa.me/${PHONE}?text=${encodeURIComponent(msg)}`;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
    const ANIMATE = hasGsap && !prefersReduced;

    let lenis = null;
    let menuApi = { close() {} };

    const lockScroll = () => { lenis ? lenis.stop() : root.classList.add('has-modal'); };
    const unlockScroll = () => { lenis ? lenis.start() : root.classList.remove('has-modal'); };

    let refreshTimer = 0;
    const refreshLater = (ms = 650) => {
        if (!hasGsap) return;
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => ScrollTrigger.refresh(), ms);
    };

    /* ───────────────────────── WhatsApp ───────────────────────── */
    // Cada CTA lleva su propio mensaje (data-wa) para que el chat llegue con contexto.
    function initWhatsAppLinks() {
        $$('[data-wa]').forEach((a) => {
            a.href = waURL(a.dataset.wa);
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
        });
    }

    /* ───────────────────────── Divisor de texto ───────────────────────── */
    // Envuelve cada palabra conservando etiquetas internas (por ejemplo <em>).
    function splitWords(el, { mask = true } = {}) {
        const words = [];
        const walk = (node) => {
            Array.from(node.childNodes).forEach((child) => {
                if (child.nodeType === Node.TEXT_NODE) {
                    const frag = document.createDocumentFragment();
                    child.textContent.split(/(\s+)/).forEach((part) => {
                        if (!part) return;
                        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
                        const w = document.createElement('span');
                        if (mask) {
                            w.className = 'w';
                            const inner = document.createElement('span');
                            inner.className = 'wi';
                            inner.textContent = part;
                            w.appendChild(inner);
                            words.push(inner);
                        } else {
                            w.className = 'mw';
                            w.textContent = part;
                            words.push(w);
                        }
                        frag.appendChild(w);
                    });
                    child.replaceWith(frag);
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    walk(child);
                }
            });
        };
        const label = el.textContent.replace(/\s+/g, ' ').trim();
        walk(el);
        if (mask) el.setAttribute('aria-label', label);
        return words;
    }

    function splitChars(el) {
        const text = el.textContent;
        el.setAttribute('aria-label', text);
        el.textContent = '';
        return Array.from(text).map((c) => {
            const s = document.createElement('span');
            s.className = 'ch';
            s.textContent = c === ' ' ? ' ' : c;
            el.appendChild(s);
            return s;
        });
    }

    /* ───────────────────────── Lienzo de seda + polvo ───────────────────────── */
    // Hilos de satén que fluyen (eco del listón del logotipo) + motas de luz.
    function createSilk(canvas, opts = {}) {
        const ctx = canvas.getContext('2d');
        if (!ctx) return { start() {}, stop() {}, pointer() {}, leave() {} };

        const small = window.innerWidth < 768;
        const cfg = Object.assign({
            lines: small ? 14 : 24,
            step: small ? 26 : 14,
            dust: small ? 26 : 60,
            amp: 1,
            speed: 1,
        }, opts);

        let w = 1, h = 1, dpr = 1, raf = 0, running = false, last = 0, grad = null;
        let t = 2 + Math.random() * 6;
        const ptr = { x: .5, y: .5, tx: .5, ty: .5, active: false };

        // Sprites de brillo pre-renderizados (más barato que gradientes por frame)
        const tints = ['255,222,214', '232,143,155', '240,200,170'];
        const sprites = tints.map((rgb) => {
            const c = document.createElement('canvas');
            c.width = c.height = 64;
            const g = c.getContext('2d');
            const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
            rg.addColorStop(0, `rgba(${rgb},1)`);
            rg.addColorStop(.25, `rgba(${rgb},.55)`);
            rg.addColorStop(1, `rgba(${rgb},0)`);
            g.fillStyle = rg;
            g.fillRect(0, 0, 64, 64);
            return c;
        });

        const spawn = (initial) => ({
            x: Math.random(),
            y: initial ? Math.random() : 1.06,
            z: Math.random(),
            r: 1.2 + Math.random() * 2.4,
            ph: Math.random() * 6.283,
            c: (Math.random() * 3) | 0,
        });
        const dust = Array.from({ length: cfg.dust }, () => spawn(true));

        function resize() {
            const r = canvas.getBoundingClientRect();
            dpr = Math.min(window.devicePixelRatio || 1, 1.5);
            w = Math.max(1, r.width);
            h = Math.max(1, r.height);
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            grad = ctx.createLinearGradient(0, 0, w, 0);
            grad.addColorStop(0, 'rgba(232,143,155,0)');
            grad.addColorStop(.22, 'rgba(240,200,190,.95)');
            grad.addColorStop(.55, 'rgba(228,143,155,.95)');
            grad.addColorStop(.82, 'rgba(232,200,184,.85)');
            grad.addColorStop(1, 'rgba(232,143,155,0)');
        }

        function draw(dt) {
            ctx.clearRect(0, 0, w, h);
            ptr.x += (ptr.tx - ptr.x) * .05;
            ptr.y += (ptr.ty - ptr.y) * .05;
            const px = ptr.x - .5, py = ptr.y - .5;

            // Hilos de seda
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1;
            const n = cfg.lines;
            for (let i = 0; i < n; i++) {
                const u = i / (n - 1);
                const baseY = h * (.1 + .8 * u) + py * 34 * (u - .5);
                const a1 = (28 + 40 * Math.sin(u * 3.1 + t * .12)) * cfg.amp;
                const a2 = 14 * cfg.amp;
                ctx.globalAlpha = .07 + .17 * Math.pow(Math.sin(u * Math.PI), 1.4) * (.6 + .4 * Math.sin(t * .4 + i * .7));
                ctx.beginPath();
                for (let x = 0; x <= w + cfg.step; x += cfg.step) {
                    const s = x / w;
                    const y = baseY
                        + Math.sin(s * 3.4 + t * .45 + i * .16 + px * 1.4) * a1 * (.35 + s)
                        + Math.sin(s * 8.2 - t * .6 + i * .32) * a2 * (1 - s * .4);
                    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.stroke();
            }

            // Motas de luz
            for (const p of dust) {
                p.y -= (.012 + .032 * p.z) * dt * cfg.speed;
                p.x += Math.sin(t * .3 + p.ph) * .004 * dt;
                if (p.y < -.06) Object.assign(p, spawn(false));
                let x = p.x * w, y = p.y * h;
                if (ptr.active) {
                    const dx = x - ptr.x * w, dy = y - ptr.y * h;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < 16900) {
                        const d = Math.sqrt(d2) || 1;
                        const f = (1 - d / 130) * 30;
                        x += dx / d * f; y += dy / d * f;
                    }
                }
                const tw = .5 + .5 * Math.sin(t * 1.6 + p.ph * 3);
                ctx.globalAlpha = (.22 + .62 * tw) * (.35 + .65 * p.z);
                const r = p.r * (3 + 6 * p.z);
                ctx.drawImage(sprites[p.c], x - r, y - r, r * 2, r * 2);
            }
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
        }

        function loop(now) {
            if (!running) return;
            raf = requestAnimationFrame(loop);
            if (document.hidden) { last = now; return; }
            const dt = Math.min(.05, (now - last) / 1000 || .016);
            last = now;
            t += dt * cfg.speed;
            draw(dt);
        }

        resize();
        if ('ResizeObserver' in window) new ResizeObserver(() => { resize(); if (!running) draw(0); }).observe(canvas);
        else window.addEventListener('resize', resize);
        draw(0);

        return {
            start() {
                if (prefersReduced || running) return;
                running = true; last = performance.now(); raf = requestAnimationFrame(loop);
            },
            stop() { running = false; cancelAnimationFrame(raf); },
            pointer(e) {
                const r = canvas.getBoundingClientRect();
                ptr.tx = (e.clientX - r.left) / r.width;
                ptr.ty = (e.clientY - r.top) / r.height;
                ptr.active = true;
            },
            leave() { ptr.active = false; ptr.tx = .5; ptr.ty = .5; },
        };
    }

    function initSilks() {
        [
            ['#silkHero', {}, '.hero'],
            ['#silkContact', { lines: 18, dust: 34, amp: .85 }, '.contact'],
        ].forEach(([sel, opts, hostSel]) => {
            const canvas = $(sel), host = $(hostSel);
            if (!canvas || !host) return;
            const silk = createSilk(canvas, opts);
            new IntersectionObserver(([e]) => (e.isIntersecting ? silk.start() : silk.stop()), { rootMargin: '120px' }).observe(host);
            if (finePointer) {
                host.addEventListener('pointermove', (e) => silk.pointer(e), { passive: true });
                host.addEventListener('pointerleave', () => silk.leave());
            }
        });
    }

    /* ───────────────────────── Menú móvil ───────────────────────── */
    function initMenu() {
        const burger = $('#burger'), menu = $('#menu');
        if (!burger || !menu) return;
        let open = false;

        const focusables = () => [burger, ...$$('a, button', menu)].filter((el) => !el.hasAttribute('disabled'));

        function setOpen(v) {
            if (open === v) return;
            open = v;
            menu.classList.toggle('is-open', v);
            menu.setAttribute('aria-hidden', String(!v));
            if (v) menu.removeAttribute('inert'); else menu.setAttribute('inert', '');
            burger.setAttribute('aria-expanded', String(v));
            burger.setAttribute('aria-label', v ? 'Cerrar menú' : 'Abrir menú');
            root.classList.toggle('menu-open', v);
            if (v) { lockScroll(); const first = $('a', menu); first && setTimeout(() => first.focus({ preventScroll: true }), 350); }
            else { unlockScroll(); }
        }

        burger.addEventListener('click', () => setOpen(!open));
        document.addEventListener('keydown', (e) => {
            if (!open) return;
            if (e.key === 'Escape') { setOpen(false); burger.focus(); return; }
            if (e.key === 'Tab') {
                const list = focusables();
                const first = list[0], lastEl = list[list.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
                else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
            }
        });
        window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
        menuApi = { close: () => setOpen(false) };
    }

    /* ───────────────────────── Anclas con scroll suave ───────────────────────── */
    function initAnchors() {
        const resolve = (el) => (el.parentElement && el.parentElement.classList.contains('pin-spacer') ? el.parentElement : el);
        $$('a[href^="#"]').forEach((a) => {
            a.addEventListener('click', (e) => {
                const id = a.getAttribute('href');
                if (!id || id.length < 2) return;
                const target = $(id);
                if (!target) return;
                e.preventDefault();
                menuApi.close();
                requestAnimationFrame(() => {
                    const el = resolve(target);
                    if (lenis) lenis.scrollTo(el, { duration: 1.9, easing: (x) => 1 - Math.pow(1 - x, 4) });
                    else el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
                    history.replaceState(null, '', id);
                });
            });
        });
    }

    /* ───────────────────────── Preguntas frecuentes ───────────────────────── */
    function initFaq() {
        const items = $$('.faq-item');
        items.forEach((item) => {
            const btn = $('.faq-q', item);
            btn.addEventListener('click', () => {
                const willOpen = !item.classList.contains('is-open');
                items.forEach((it) => {
                    const on = it === item && willOpen;
                    it.classList.toggle('is-open', on);
                    $('.faq-q', it).setAttribute('aria-expanded', String(on));
                });
                refreshLater(700);
            });
        });
    }

    /* ───────────────────────── Selector de color ───────────────────────── */
    function initStudio() {
        const swatches = $$('.swatch');
        const imgs = [$('#stageImg'), $('#stageImgNext')];
        const glow = $('#stageGlow'), nameEl = $('#studioName'), cta = $('#studioCta'), ctaText = $('#studioCtaText');
        if (!swatches.length || !imgs[0] || !imgs[1]) return;

        let current = Math.max(0, swatches.findIndex((s) => s.classList.contains('is-active')));
        let busy = false, queued = null;

        const paint = (i) => {
            swatches.forEach((s, j) => {
                const on = j === i;
                s.classList.toggle('is-active', on);
                s.setAttribute('aria-checked', String(on));
                s.tabIndex = on ? 0 : -1;
            });
            const s = swatches[i];
            nameEl.textContent = s.dataset.name;
            ctaText.textContent = `Quiero mi techo en ${s.dataset.name}`;
            cta.dataset.wa = `Hola, quiero mi techo en color ${s.dataset.name}.`;
            cta.href = waURL(cta.dataset.wa);
            glow.style.backgroundColor = `rgb(${s.style.getPropertyValue('--c').trim()})`;
        };

        async function swap(src, alt) {
            const cur = imgs.find((im) => im.classList.contains('is-on'));
            const nxt = imgs.find((im) => im !== cur);
            try { const pre = new Image(); pre.src = src; await pre.decode(); } catch (_) { /* la imagen se mostrará al cargar */ }
            nxt.src = src; nxt.alt = alt; nxt.removeAttribute('aria-hidden');
            nxt.style.zIndex = 2; cur.style.zIndex = 1;
            const anim = nxt.animate(
                [{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0 0 0 0)' }],
                { duration: prefersReduced ? 1 : 1000, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' }
            );
            await anim.finished;
            nxt.classList.add('is-on'); cur.classList.remove('is-on');
            cur.setAttribute('aria-hidden', 'true');
            anim.cancel();
            nxt.style.zIndex = cur.style.zIndex = '';
        }

        async function select(i) {
            if (i === current && !queued) return;
            if (busy) { queued = i; return; }
            busy = true; current = i; paint(i);
            await swap(swatches[i].dataset.img, swatches[i].dataset.alt);
            busy = false;
            if (queued !== null) { const q = queued; queued = null; if (q !== current) select(q); }
        }

        paint(current);
        swatches.forEach((s, i) => {
            s.addEventListener('click', () => select(i));
            s.addEventListener('keydown', (e) => {
                const k = e.key;
                let n = null;
                if (k === 'ArrowRight' || k === 'ArrowDown') n = (i + 1) % swatches.length;
                if (k === 'ArrowLeft' || k === 'ArrowUp') n = (i - 1 + swatches.length) % swatches.length;
                if (n !== null) { e.preventDefault(); swatches[n].focus(); select(n); }
            });
        });
    }

    /* ───────────────────────── Videos: carga y reproducción bajo demanda ───────────────────────── */
    function initVideos() {
        const vids = $$('video[data-src]');
        if (!vids.length) return;
        const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => {
                const v = e.target;
                if (e.isIntersecting) {
                    if (!v.getAttribute('src')) { v.src = v.dataset.src; v.load(); }
                    if (!prefersReduced) v.play().catch(() => {});
                } else {
                    v.pause();
                }
            });
        }, { rootMargin: '240px 0px', threshold: .2 });
        vids.forEach((v) => {
            v.muted = true;
            if (prefersReduced) v.controls = true;
            io.observe(v);
        });
    }

    /* ───────────────────────── Proceso: paso activo ───────────────────────── */
    function initProcess() {
        const steps = $$('.process .step');
        const frames = $$('.process .pf');
        if (!steps.length) return;
        const set = (i) => {
            steps.forEach((s, j) => s.classList.toggle('is-active', j === i));
            frames.forEach((f, j) => f.classList.toggle('is-on', j === i));
        };
        const io = new IntersectionObserver((es) => {
            es.forEach((e) => { if (e.isIntersecting) set(steps.indexOf(e.target)); });
        }, { rootMargin: '-46% 0px -46% 0px' });
        steps.forEach((s) => io.observe(s));

        if (ANIMATE) {
            const list = $('.steps');
            ScrollTrigger.create({
                trigger: list, start: 'top 60%', end: 'bottom 60%',
                onUpdate: (self) => list.style.setProperty('--p', self.progress.toFixed(3)),
            });
        }
    }

    /* ───────────────────────── Lightbox ───────────────────────── */
    function initLightbox() {
        const dlg = $('#lightbox');
        const dataEl = $('#galleryData');
        if (!dlg || !dataEl || typeof dlg.showModal !== 'function') return;
        const data = JSON.parse(dataEl.textContent);
        const img = $('#lbImg'), cap = $('#lbCap'), cta = $('#lbCta');
        const prev = $('.lb-prev', dlg), next = $('.lb-next', dlg), close = $('.lb-close', dlg);
        let group = null, idx = 0, opener = null;

        function show(i, dir = 0) {
            const items = group.items;
            idx = (i + items.length) % items.length;
            const [file, alt] = items[idx];
            img.src = `assets/img/${file}.webp`;
            img.alt = alt;
            cap.textContent = alt;
            const multi = items.length > 1;
            prev.hidden = next.hidden = !multi;
            if (ANIMATE) gsap.fromTo(img, { opacity: 0, x: dir * 50, scale: .97 }, { opacity: 1, x: 0, scale: 1, duration: .8, ease: 'expo.out' });
        }

        function open(key, trigger) {
            group = data[key];
            if (!group) return;
            opener = trigger;
            cta.href = waURL(`Hola, me gustó el estilo ${group.title} y quiero cotizarlo.`);
            dlg.showModal();
            lockScroll();
            show(0);
        }

        dlg.addEventListener('close', () => {
            if (!root.classList.contains('menu-open')) unlockScroll();
            if (opener) opener.focus({ preventScroll: true });
        });
        $$('[data-gallery]').forEach((b) => b.addEventListener('click', () => open(b.dataset.gallery, b)));
        close.addEventListener('click', () => dlg.close());
        prev.addEventListener('click', () => show(idx - 1, -1));
        next.addEventListener('click', () => show(idx + 1, 1));
        dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
        dlg.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') show(idx - 1, -1);
            if (e.key === 'ArrowRight') show(idx + 1, 1);
        });

        // Deslizar para cambiar de foto
        const fig = $('.lb-fig', dlg);
        let sx = null;
        fig.addEventListener('pointerdown', (e) => { sx = e.clientX; });
        fig.addEventListener('pointerup', (e) => {
            if (sx === null) return;
            const dx = e.clientX - sx; sx = null;
            if (Math.abs(dx) > 50) (dx < 0 ? show(idx + 1, 1) : show(idx - 1, -1));
        });
        fig.addEventListener('pointercancel', () => { sx = null; });
    }

    /* ───────────────────────── Formulario → WhatsApp ───────────────────────── */
    function initForm() {
        const form = $('#waForm');
        if (!form) return;
        const name = $('#f-name'), phone = $('#f-phone'), type = $('#f-type'), date = $('#f-date'), msg = $('#f-msg');
        const btn = $('#formSubmit'), note = $('#formNote');
        const label = $('span', btn);

        const setErr = (input, text) => {
            const field = input.closest('.field');
            const err = $('.err', field);
            field.classList.toggle('has-error', !!text);
            input.setAttribute('aria-invalid', text ? 'true' : 'false');
            if (err) err.innerHTML = text ? `<i class="ph ph-warning-circle" aria-hidden="true"></i><span>${text}</span>` : '';
        };
        name.addEventListener('input', () => setErr(name, ''));
        type.addEventListener('change', () => setErr(type, ''));

        function burst(el) {
            if (!ANIMATE) return;
            const r = el.getBoundingClientRect();
            const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
            for (let i = 0; i < 20; i++) {
                const d = document.createElement('span');
                d.className = 'burst-dot';
                d.style.left = `${cx}px`; d.style.top = `${cy}px`;
                document.body.appendChild(d);
                const a = Math.random() * Math.PI * 2, dist = 70 + Math.random() * 110;
                gsap.set(d, { xPercent: -50, yPercent: -50 });
                gsap.to(d, {
                    x: Math.cos(a) * dist, y: Math.sin(a) * dist - 24, scale: .2 + Math.random() * 1.5, opacity: 0,
                    duration: 1 + Math.random() * .7, ease: 'expo.out', onComplete: () => d.remove(),
                });
            }
        }

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const okName = name.value.trim().length >= 2;
            const okType = !!type.value;
            setErr(name, okName ? '' : 'Escribe tu nombre para poder dirigirnos a ti.');
            setErr(type, okType ? '' : 'Elige el tipo de evento.');
            if (!okName) { name.focus(); return; }
            if (!okType) { type.focus(); return; }

            const lines = [`Hola, soy ${name.value.trim()}. Quiero cotizar un entelado decorativo para: ${type.value}.`];
            if (date.value) {
                const d = new Date(`${date.value}T00:00:00`);
                lines.push(`Fecha del evento: ${d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}.`);
            }
            if (msg.value.trim()) lines.push(`Mi idea: ${msg.value.trim()}`);
            if (phone.value.trim()) lines.push(`Mi WhatsApp: ${phone.value.trim()}`);

            // Un <a> real dentro del gesto del usuario evita bloqueos de ventanas emergentes
            const link = document.createElement('a');
            link.href = waURL(lines.join('\n'));
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            link.remove();

            burst(btn);
            const original = label.textContent;
            label.textContent = '¡Listo! Abriendo WhatsApp';
            note.textContent = 'Si no se abrió, toca el botón de WhatsApp de la esquina.';
            btn.disabled = true;
            setTimeout(() => {
                label.textContent = original;
                note.textContent = 'Se abrirá WhatsApp con tu mensaje listo para enviar.';
                btn.disabled = false;
            }, 4500);
        });
    }

    /* ==========================================================================
       A PARTIR DE AQUÍ: SOLO CON GSAP + SIN MOVIMIENTO REDUCIDO
       ========================================================================== */

    /* ───────────────────────── Lenis (scroll suave) ───────────────────────── */
    function initLenis() {
        if (!window.Lenis) return;
        lenis = new Lenis({
            duration: 1.25,
            easing: (x) => Math.min(1, 1.001 - Math.pow(2, -10 * x)),
            smoothWheel: true,
            wheelMultiplier: .9,
        });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
    }

    /* ───────────────────────── Preloader ───────────────────────── */
    function runPreloader() {
        return new Promise((resolve) => {
            const pl = $('#preloader');
            if (!pl) { resolve(); return; }
            const fill = $('#plFill'), num = $('#plNum');
            const C = 2 * Math.PI * 74;
            fill.style.strokeDasharray = C;
            fill.style.strokeDashoffset = C;

            root.classList.add('is-loading');
            if (lenis) lenis.stop();

            // Progreso real: nunca llega al 100 % hasta que fuentes e imagen del hero estén listas
            let cap = 86, shown = 0;
            const MIN = 1.8;
            const t0 = performance.now();
            const heroImg = $('#heroSlides img');
            const imgReady = heroImg && !heroImg.complete
                ? new Promise((r) => { heroImg.addEventListener('load', r, { once: true }); heroImg.addEventListener('error', r, { once: true }); })
                : Promise.resolve();
            const fontsReady = document.fonts && document.fonts.ready
                ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 4500))])
                : Promise.resolve();
            Promise.all([imgReady, fontsReady]).then(() => { cap = 100; });

            const finish = () => {
                const tl = gsap.timeline();
                tl.to('.pl-core', { opacity: 0, scale: .94, duration: .55, ease: 'power2.in' })
                    .to('.pl-fold', { yPercent: -104, duration: 1.3, ease: 'power4.inOut', stagger: { each: .08, from: 'center' } }, '-=.1')
                    .add(() => resolve(), '-=.95')
                    .add(() => {
                        pl.style.display = 'none';
                        pl.setAttribute('aria-hidden', 'true');
                        root.classList.remove('is-loading');
                        root.classList.add('is-loaded');
                        if (lenis) lenis.start();
                    });
            };

            const tick = () => {
                const elapsed = (performance.now() - t0) / 1000;
                const target = Math.min(100, (elapsed / MIN) * 100, cap);
                shown += (target - shown) * .1;
                if (target >= 100 && shown > 99.2) shown = 100;
                fill.style.strokeDashoffset = C * (1 - shown / 100);
                num.textContent = Math.round(shown);
                if (shown >= 100) { gsap.ticker.remove(tick); finish(); }
            };
            gsap.ticker.add(tick);
        });
    }

    /* ───────────────────────── Encabezado ───────────────────────── */
    function initHeader() {
        const header = $('#header');
        if (!header) return;
        ScrollTrigger.create({
            start: 0, end: 'max',
            onUpdate: (self) => {
                const y = self.scroll();
                header.classList.toggle('is-scrolled', y > 40);
                header.classList.toggle('is-hidden', self.direction === 1 && y > 520 && !root.classList.contains('menu-open'));
            },
        });
        gsap.to('.scroll-progress span', {
            scaleX: 1, ease: 'none',
            scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: .3 },
        });
    }

    /* ───────────────────────── Botones: relleno direccional + magnetismo ───────────────────────── */
    function initButtons() {
        if (!finePointer) return;
        $$('.btn-primary').forEach((b) => {
            b.addEventListener('pointermove', (e) => {
                const r = b.getBoundingClientRect();
                b.style.setProperty('--x', `${((e.clientX - r.left) / r.width) * 100}%`);
                b.style.setProperty('--y', `${((e.clientY - r.top) / r.height) * 100}%`);
            }, { passive: true });
        });
        $$('.magnetic').forEach((b) => {
            const xTo = gsap.quickTo(b, 'x', { duration: .6, ease: 'power3' });
            const yTo = gsap.quickTo(b, 'y', { duration: .6, ease: 'power3' });
            b.addEventListener('pointermove', (e) => {
                const r = b.getBoundingClientRect();
                xTo((e.clientX - (r.left + r.width / 2)) * .22);
                yTo((e.clientY - (r.top + r.height / 2)) * .32);
            }, { passive: true });
            b.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
        });
    }

    /* ───────────────────────── Textos: aparición por palabra / bloque ───────────────────────── */
    function prepareText() {
        // Titulares generales (el del hero se anima en su propia secuencia)
        $$('[data-split]:not([data-split="hero"])').forEach((el) => {
            const words = splitWords(el);
            gsap.set(words, { yPercent: 118 });
            gsap.set(el, { visibility: 'visible' });
            ScrollTrigger.create({
                trigger: el,
                start: el.dataset.split === 'expand' ? 'top 40%' : 'top 86%',
                once: true,
                onEnter: () => gsap.to(words, { yPercent: 0, duration: 1.25, stagger: .07, ease: 'expo.out' }),
            });
        });

        // Bloques
        gsap.set('[data-reveal]', { y: 44 });
        ScrollTrigger.batch('[data-reveal]', {
            start: 'top 90%', once: true, interval: .1, batchMax: 6,
            onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: .12, overwrite: true }),
        });

        // Manifiesto: se enciende palabra por palabra con el scroll
        const m = $('[data-words]');
        if (m) {
            const words = splitWords(m, { mask: false });
            gsap.to(words, {
                opacity: 1, ease: 'none', stagger: .12,
                scrollTrigger: { trigger: m, start: 'top 80%', end: 'bottom 55%', scrub: true },
            });
        }

        // Marca del pie: letra por letra
        const mark = $('[data-footer-mark]');
        if (mark) {
            const chars = splitChars(mark);
            gsap.set(chars, { yPercent: 40, opacity: 0 });
            ScrollTrigger.create({
                trigger: mark, start: 'top 92%', once: true,
                onEnter: () => gsap.to(chars, { yPercent: 0, opacity: 1, duration: 1.4, stagger: .06, ease: 'expo.out' }),
            });
        }
    }

    /* ───────────────────────── Hero ───────────────────────── */
    function initHero() {
        const hero = $('.hero');
        if (!hero) return { intro() {} };

        // Titular del hero: se prepara ya, se revela tras la cortina
        const title = $('[data-split="hero"]');
        const words = splitWords(title);
        gsap.set(words, { yPercent: 118 });
        gsap.set(title, { visibility: 'visible' });
        gsap.set('#heroArch .arch-clip', { clipPath: 'inset(100% 0% 0% 0%)' });
        gsap.set('.arch-ring', { opacity: 0 });
        gsap.set('.badge-wrap', { scale: 0, rotate: -40 });
        gsap.set('.hero-caption', { opacity: 0 });
        gsap.set('[data-hero="in"]', { y: 30 });

        // Presentación de estilos dentro del arco
        const slides = $$('#heroSlides .hs');
        const imgs = slides.map((s) => $('img', s));
        const label = $('#heroStyle');
        let idx = 0, timer = null, started = false;

        gsap.set(slides, { clipPath: 'inset(100% 0% 0% 0%)', zIndex: 0 });
        gsap.set(slides[0], { clipPath: 'inset(0% 0% 0% 0%)', zIndex: 1 });
        gsap.set(imgs, { scale: 1.22 });
        gsap.set(hero, { '--tone': slides[0].dataset.tone });

        const kenBurns = (img) => gsap.fromTo(img, { scale: 1.24 }, { scale: 1.04, duration: 9, ease: 'none' });
        const swapLabel = (txt) => {
            gsap.timeline()
                .to(label, { yPercent: -70, opacity: 0, duration: .35, ease: 'power2.in' })
                .add(() => { label.textContent = txt; })
                .fromTo(label, { yPercent: 70, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .7, ease: 'expo.out' });
        };

        function next() {
            const n = (idx + 1) % slides.length;
            const from = slides[idx], to = slides[n];
            gsap.set(to, { zIndex: 2, clipPath: 'inset(100% 0% 0% 0%)' });
            gsap.to(to, {
                clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut',
                onComplete: () => { gsap.set(from, { zIndex: 0, clipPath: 'inset(100% 0% 0% 0%)' }); gsap.set(to, { zIndex: 1 }); },
            });
            kenBurns(imgs[n]);
            gsap.to(hero, { '--tone': to.dataset.tone, duration: 1.8, ease: 'power2.inOut' });
            swapLabel(to.dataset.name);
            idx = n;
            schedule();
        }
        const schedule = () => { timer = gsap.delayedCall(5.8, next); };

        // Pausa fuera de pantalla o con la pestaña oculta
        ScrollTrigger.create({
            trigger: hero, start: 'top bottom', end: 'bottom top',
            onToggle: (self) => { if (!started || !timer) return; self.isActive ? timer.resume() : timer.pause(); },
        });
        document.addEventListener('visibilitychange', () => {
            if (!started || !timer) return;
            document.hidden ? timer.pause() : timer.resume();
        });

        // Salida al hacer scroll
        const exit = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
        gsap.to('.hero-copy', { yPercent: -12, opacity: 0, ease: 'none', scrollTrigger: exit });
        gsap.to('.hero-visual', { yPercent: 10, scale: .94, ease: 'none', scrollTrigger: exit });
        gsap.to('.silk#silkHero', { yPercent: 12, ease: 'none', scrollTrigger: exit });

        // Inclinación 3D del arco + foco de luz que sigue al cursor
        if (finePointer) {
            const rx = gsap.quickTo('#heroArch', 'rotationX', { duration: 1.2, ease: 'power3' });
            const ry = gsap.quickTo('#heroArch', 'rotationY', { duration: 1.2, ease: 'power3' });
            const bx = gsap.quickTo('.badge-wrap', 'x', { duration: 1.4, ease: 'power3' });
            const by = gsap.quickTo('.badge-wrap', 'y', { duration: 1.4, ease: 'power3' });
            let frame = 0, ev = null;
            hero.addEventListener('pointermove', (e) => {
                ev = e;
                if (frame) return;
                frame = requestAnimationFrame(() => {
                    frame = 0;
                    const r = hero.getBoundingClientRect();
                    const nx = (ev.clientX - r.left) / r.width - .5;
                    const ny = (ev.clientY - r.top) / r.height - .5;
                    hero.style.setProperty('--mx', `${(nx + .5) * 100}%`);
                    hero.style.setProperty('--my', `${(ny + .5) * 100}%`);
                    ry(nx * 9); rx(-ny * 7); bx(nx * -26); by(ny * -20);
                });
            }, { passive: true });
            hero.addEventListener('pointerleave', () => { ry(0); rx(0); bx(0); by(0); });
        }

        return {
            intro() {
                const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
                tl.from('.site-header', { yPercent: -100, opacity: 0, duration: 1.2 }, 0)
                    .to('#heroArch .arch-clip', { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.8, ease: 'expo.inOut' }, 0)
                    .add(() => kenBurns(imgs[0]), .2)
                    .to(words, { yPercent: 0, duration: 1.5, stagger: .08 }, .25)
                    .to('[data-hero="in"]', { opacity: 1, y: 0, duration: 1.3, stagger: .14 }, .55)
                    .to('.arch-ring', { opacity: 1, duration: 1.6 }, .7)
                    .to('.badge-wrap', { scale: 1, rotate: 0, duration: 1.6, ease: 'back.out(1.5)' }, .9)
                    .to('.hero-caption', { opacity: 1, duration: 1.2 }, 1.2)
                    .to('#waFloat', { opacity: 1, scale: 1, duration: 1.3, ease: 'elastic.out(1,.6)' }, 2.2)
                    .add(() => {
                        started = true;
                        schedule();
                        const wa = $('#waFloat');
                        if (wa) {
                            gsap.delayedCall(2.5, () => wa.classList.add('show-tip'));
                            gsap.delayedCall(6.5, () => wa.classList.remove('show-tip'));
                        }
                    }, 2.4);
            },
        };
    }

    /* ───────────────────────── Marquee con inercia de scroll ───────────────────────── */
    function initMarquee() {
        const track = $('.marquee-track');
        if (!track) return;
        const tween = gsap.to(track, { xPercent: -50, ease: 'none', duration: 42, repeat: -1 });
        let dir = 1;
        ScrollTrigger.create({
            trigger: '.marquee', start: 'top bottom', end: 'bottom top',
            onUpdate: (self) => {
                dir = self.direction;
                tween.timeScale(dir * Math.min(1 + Math.abs(self.getVelocity()) / 170, 7));
            },
        });
        gsap.ticker.add(() => {
            const cur = tween.timeScale();
            tween.timeScale(cur + (dir - cur) * .06);
        });
    }

    /* ───────────────────────── Escena de expansión ───────────────────────── */
    function initExpand() {
        const sec = $('.expand');
        if (!sec) return;
        const frame = $('.expand-frame', sec), img = $('img', frame);
        const scrim = $('.expand-scrim', sec), cap = $('.expand-cap', sec);

        gsap.matchMedia().add({ mobile: '(max-width: 767px)', desktop: '(min-width: 768px)' }, (ctx) => {
            const { mobile } = ctx.conditions;
            const startClip = () => {
                const ix = mobile ? .1 : .3, iy = mobile ? .13 : .1;
                const rad = Math.round(window.innerWidth * (1 - 2 * ix) / 2);
                return `inset(${iy * 100}% ${ix * 100}% ${iy * 100}% ${ix * 100}% round ${rad}px ${rad}px 24px 24px)`;
            };
            const tl = gsap.timeline({
                defaults: { ease: 'none' },
                scrollTrigger: {
                    trigger: sec, start: 'top top', end: mobile ? '+=120%' : '+=170%',
                    pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true,
                },
            });
            tl.fromTo(frame, { clipPath: startClip }, { clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)', ease: 'power2.inOut', duration: .82 }, 0)
                .fromTo(img, { scale: 1.4 }, { scale: 1, duration: 1 }, 0)
                .fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: .5 }, .42)
                .fromTo(cap, { opacity: 0, y: 40 }, { opacity: 1, y: 0, ease: 'power2.out', duration: .3 }, .7);
        });
    }

    /* ───────────────────────── Estilos: carril horizontal fijado ───────────────────────── */
    function initStyles() {
        const sec = $('#estilos'), track = $('#stylesTrack');
        if (!sec || !track) return;
        const bar = $('.styles-progress span', sec);

        gsap.matchMedia().add('(min-width: 900px)', () => {
            sec.classList.add('is-pan');
            const dist = () => Math.max(0, track.scrollWidth - document.documentElement.clientWidth);
            const pan = gsap.to(track, {
                x: () => -dist(), ease: 'none',
                scrollTrigger: {
                    trigger: sec, start: 'top top', end: () => `+=${dist()}`,
                    pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true,
                    onUpdate: (self) => { if (bar) bar.style.transform = `scaleX(${self.progress.toFixed(3)})`; },
                },
            });
            // Profundidad: la foto se desplaza en sentido contrario al carril
            $$('.style-media img', track).forEach((im) => {
                gsap.fromTo(im, { xPercent: -6 }, {
                    xPercent: 6, ease: 'none',
                    scrollTrigger: { trigger: im.closest('.style-card'), containerAnimation: pan, start: 'left right', end: 'right left', scrub: true },
                });
            });
            return () => { sec.classList.remove('is-pan'); if (bar) bar.style.transform = ''; };
        });
    }

    /* ───────────────────────── Parallax y detalles por sección ───────────────────────── */
    function initSections() {
        // Foto de cada tile del bento: acercamiento suave con el scroll
        $$('.tile > img').forEach((im) => {
            gsap.fromTo(im, { scale: 1.2 }, {
                scale: 1, ease: 'none',
                scrollTrigger: { trigger: im.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
            });
        });

        // Foco de luz que sigue al cursor sobre cada tile
        if (finePointer) {
            $$('.tile').forEach((t) => {
                t.addEventListener('pointermove', (e) => {
                    const r = t.getBoundingClientRect();
                    t.style.setProperty('--mx', `${e.clientX - r.left}px`);
                    t.style.setProperty('--my', `${e.clientY - r.top}px`);
                }, { passive: true });
            });
        }

        // Estudio de color: el escenario entra con una máscara
        const stage = $('#stage');
        if (stage) {
            gsap.fromTo(stage, { clipPath: 'inset(12% 12% 12% 12% round 24px)' }, {
                clipPath: 'inset(0% 0% 0% 0% round 24px)', ease: 'none',
                scrollTrigger: { trigger: stage, start: 'top 95%', end: 'top 40%', scrub: true },
            });
        }

        // Videos: máscara de apertura + parallax por columna en escritorio
        $$('.reel-item').forEach((item) => {
            const media = $('.reel-media', item), vid = $('video', item);
            gsap.fromTo(media, { clipPath: 'inset(16% 16% 16% 16% round 24px)' }, {
                clipPath: 'inset(0% 0% 0% 0% round 24px)', ease: 'none',
                scrollTrigger: { trigger: item, start: 'top 98%', end: 'top 55%', scrub: true },
            });
            gsap.fromTo(vid, { scale: 1.25 }, {
                scale: 1, ease: 'none',
                scrollTrigger: { trigger: item, start: 'top 98%', end: 'top 45%', scrub: true },
            });
        });
        gsap.matchMedia().add('(min-width: 1024px)', () => {
            $$('.reel-item[data-speed]').forEach((item) => {
                const s = parseFloat(item.dataset.speed);
                if (!s) return;
                gsap.fromTo(item, { y: 0 }, {
                    y: s, ease: 'none',
                    scrollTrigger: { trigger: '.reel-grid', start: 'top bottom', end: 'bottom top', scrub: .6 },
                });
            });
        });
    }

    /* ───────────────────────── Arranque ───────────────────────── */
    function boot() {
        initWhatsAppLinks();
        initMenu();
        initFaq();
        initForm();
        initLightbox();
        initStudio();
        initVideos();
        initProcess();
        initSilks();

        if (!hasGsap || prefersReduced) {
            // Modo sencillo: contenido visible, sin cortina ni scroll fijado
            const pl = $('#preloader');
            if (pl) {
                pl.style.transition = 'opacity .5s';
                const hide = () => { pl.style.opacity = '0'; setTimeout(() => { pl.style.display = 'none'; }, 520); };
                if (document.readyState === 'complete') hide(); else window.addEventListener('load', hide, { once: true });
            }
            $('#header') && $('#header').classList.add('is-scrolled');
            initAnchors();
            return;
        }

        gsap.registerPlugin(ScrollTrigger);
        ScrollTrigger.config({ ignoreMobileResize: true });
        root.classList.add('anim');

        initLenis();
        initAnchors();
        initButtons();
        const hero = initHero();
        prepareText();
        initHeader();
        initMarquee();
        initExpand();
        initStyles();
        initSections();

        runPreloader().then(() => {
            hero.intro();
            ScrollTrigger.refresh();
        });

        window.addEventListener('load', () => ScrollTrigger.refresh());
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
