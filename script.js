/* =========================================
   DA-TCN RESEARCH DASHBOARD — SCRIPT
   ========================================= */

// ── SCROLL PROGRESS BAR ──────────────────
const progressBar = document.getElementById('progressBar');
function updateProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    if (progressBar) progressBar.style.width = pct + '%';
}

// ── NAVBAR: SCROLL SHRINK + ACTIVE LINKS ──
const navbar = document.getElementById('navbar');
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('section[id], header[id], footer[id]');

function updateNavbar() {
    if (!navbar) return;
    if (window.scrollY > 60) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
}

function updateActiveNavLink() {
    let current = '';
    sections.forEach(sec => {
        const top = sec.offsetTop - 120;
        if (window.scrollY >= top) current = sec.id;
    });
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + current) link.classList.add('active');
    });
}

// ── HAMBURGER MENU ───────────────────────
const hamburger = document.getElementById('hamburger');
const navList = document.querySelector('.nav-links');
if (hamburger && navList) {
    hamburger.addEventListener('click', () => {
        navList.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
        if (!navbar.contains(e.target)) navList.classList.remove('open');
    });
    navLinks.forEach(link => link.addEventListener('click', () => navList.classList.remove('open')));
}

// ── SECTION REVEAL (INTERSECTION OBSERVER) ──
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

document.querySelectorAll('.reveal-section').forEach(sec => revealObserver.observe(sec));

// ── CARD STAGGER ANIMATION ────────────────
const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
            const delay = entry.target.dataset.delay || 0;
            setTimeout(() => {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }, parseInt(delay));
            cardObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.05 });

document.querySelectorAll('.member-card, .pipe-card, .obs-card, .adv-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.5s ease, transform 0.5s ease, border-color 0.3s, box-shadow 0.3s';
    cardObserver.observe(card);
});

// ── VISUALIZATION TOGGLE ──────────────────
const vizData = {
    fd001: {
        title: 'FD001 — Operating Conditions',
        desc: 'Single operating condition at sea-level. Low distribution variance — models generalize easily. Serves as the baseline comparison.',
        img: 'FD001 op cons.png',
        alt: 'FD001 Operating Conditions'
    },
    fd002: {
        title: 'FD004 — Operating Conditions (Domain Shift)',
        desc: 'Multiple operating conditions introduce distribution shift. Identical sensor readings carry different degradation meanings across conditions.',
        img: 'FD002 op cons.png',
        alt: 'FD004 Operating Conditions'
    },
    violin: {
        title: 'Violin Plots — Sensor Distribution (FD001 vs FD004)',
        desc: 'Sensor 2, 7, and 15 show significant multimodal distributions in FD004 compared to the unimodal FD001, confirming domain shift.',
        img: 'Violin Plots.png',
        alt: 'Violin Plots Sensor Distribution'
    }
};

window.switchViz = function(type) {
    const data = vizData[type];
    if (!data) return;

    const titleEl   = document.getElementById('viz-title');
    const descEl    = document.getElementById('viz-desc');
    const imgEl     = document.getElementById('viz-img');
    const vizFrame  = document.querySelector('.viz-frame');

    // Button state
    document.querySelectorAll('.viz-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.viz === type);
    });

    // Fade transition
    if (vizFrame) {
        vizFrame.style.opacity = '0.4';
        vizFrame.style.transition = 'opacity 0.25s ease';
    }
    setTimeout(() => {
        if (titleEl) titleEl.textContent = data.title;
        if (descEl)  descEl.textContent  = data.desc;
        if (imgEl) {
            imgEl.alt = data.alt;
            imgEl.src = data.img;
            imgEl.style.display = '';
            // Reveal placeholder on error
            imgEl.onerror = function() {
                this.style.display = 'none';
                const ph = this.nextElementSibling;
                if (ph) {
                    ph.style.display = 'flex';
                    const span = ph.querySelector('span');
                    if (span) span.textContent = data.img;
                }
            };
        }
        if (vizFrame) vizFrame.style.opacity = '1';
    }, 240);
};

// ── RESULT TABS ──────────────────────────
window.switchResultTab = function(tab) {
    document.querySelectorAll('.rtab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.querySelectorAll('.result-tab-content').forEach(content => {
        content.classList.toggle('active', content.id === 'tab-' + tab);
    });
};

// ── PROTOTYPE SIMULATION ──────────────────
let simRunning = false;

window.runSimulation = function(type) {
    if (simRunning) return;
    simRunning = true;

    const display   = document.getElementById('rulResult');
    const statusMsg = document.getElementById('rul-status');
    const steps     = document.querySelectorAll('.p-step');
    const lines     = document.querySelectorAll('.ps-line');
    const ring      = document.getElementById('rulRing');
    const condDisp  = document.getElementById('cond-display');

    // Update button state
    document.getElementById('btn-healthy').classList.toggle('active', type === 'healthy');
    document.getElementById('btn-critical').classList.toggle('active', type === 'critical');

    // Reset
    steps.forEach(s => s.classList.remove('active'));
    lines.forEach(l => l.classList.remove('active'));
    if (display) { display.textContent = '--'; display.style.color = 'var(--secondary)'; }
    if (statusMsg) { statusMsg.textContent = ''; statusMsg.className = 'rul-status-msg'; }
    if (ring) ring.style.background = 'conic-gradient(var(--secondary) 0deg, rgba(34,211,238,0.1) 0deg)';
    if (condDisp) condDisp.textContent = type === 'healthy' ? 'OC-3' : 'OC-6';

    // Animate pipeline steps
    let i = 0;
    const interval = setInterval(() => {
        if (i < steps.length) {
            steps[i].classList.add('active');
            if (i < lines.length) lines[i].classList.add('active');
            i++;
        } else {
            clearInterval(interval);

            const rulValue = type === 'healthy' ? 142 : 14;
            const isHealthy = type === 'healthy';

            // Animate counter
            let count = 0;
            const target = rulValue;
            const step = Math.max(1, Math.ceil(target / 30));
            const counter = setInterval(() => {
                count = Math.min(count + step, target);
                if (display) display.textContent = count;
                if (count >= target) clearInterval(counter);
            }, 40);

            // Ring fill
            if (ring) {
                const pct = (rulValue / 150) * 360;
                const color = isHealthy ? 'var(--secondary)' : 'var(--danger)';
                ring.style.background = `conic-gradient(${color} ${pct}deg, rgba(255,255,255,0.04) ${pct}deg)`;
            }

            // Status
            if (display) display.style.color = isHealthy ? 'var(--secondary)' : 'var(--danger)';
            if (statusMsg) {
                statusMsg.textContent = isHealthy ? '✓ HEALTHY — Maintenance Not Urgent' : '⚠ CRITICAL — Immediate Maintenance Required';
                statusMsg.className = 'rul-status-msg ' + (isHealthy ? 'safe' : 'critical');
            }

            simRunning = false;
        }
    }, 450);
};

// ── SMOOTH ANCHOR SCROLL ──────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function(e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            e.preventDefault();
            const top = target.getBoundingClientRect().top + window.scrollY - 80;
            window.scrollTo({ top, behavior: 'smooth' });
        }
    });
});

// ── SCROLL EVENTS ────────────────────────
window.addEventListener('scroll', () => {
    updateProgress();
    updateNavbar();
    updateActiveNavLink();
}, { passive: true });

// ── INIT ─────────────────────────────────
(function init() {
    updateNavbar();
    updateActiveNavLink();

    // Auto-run healthy engine on section enter
    const protoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                setTimeout(() => runSimulation('healthy'), 400);
                protoObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });

    const protoSection = document.getElementById('prototype');
    if (protoSection) protoObserver.observe(protoSection);
})();
