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

    const titleEl  = document.getElementById('viz-title');
    const descEl   = document.getElementById('viz-desc');
    const imgEl    = document.getElementById('viz-img');
    const vizFrame = document.querySelector('.viz-frame');

    document.querySelectorAll('.viz-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.viz === type);
    });

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

// ── RUL LIVE CHART ────────────────────────
let rulChartInstance = null;
let rulAnimFrame = null;
let chartJSLoaded = false;

function loadChartJS(cb) {
    if (window.Chart) { cb(); return; }
    if (chartJSLoaded) {
        // Already injected, poll until ready
        const poll = setInterval(() => {
            if (window.Chart) { clearInterval(poll); cb(); }
        }, 50);
        return;
    }
    chartJSLoaded = true;
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
    s.onload = cb;
    document.head.appendChild(s);
}

function generateRULData(type) {
    // Piecewise RUL curve matching reference image:
    // flat cap zone (~125) → degradation → steep drop to end value
    const totalCycles = 480;
    const capCycles   = 260;   // flat zone ends here
    const capRUL      = 125;
    const endRUL      = type === 'healthy' ? 38 : 12;
    const labels = [], trueRUL = [], predictedRUL = [];

    // Seed-based pseudo-random for reproducible noise per engine type
    let seed = type === 'healthy' ? 42 : 99;
    function rand() {
        seed = (seed * 16807 + 0) % 2147483647;
        return (seed / 2147483647) - 0.5;
    }

    for (let i = 0; i <= totalCycles; i += 3) {
        labels.push(i);

        // True RUL: piecewise linear (flat then declining)
        let tRUL;
        if (i < capCycles) {
            tRUL = capRUL;
        } else {
            const progress = (i - capCycles) / (totalCycles - capCycles);
            tRUL = capRUL - progress * (capRUL - endRUL);
        }
        trueRUL.push(parseFloat(tRUL.toFixed(1)));

        // Predicted RUL: noisy version matching reference graph style
        let noise = 0;
        if (i < capCycles) {
            // Occasional sharp dips in flat zone (like reference image)
            const dip1 = Math.exp(-Math.pow((i - 110) / 15, 2)) * 14;
            const dip2 = Math.exp(-Math.pow((i - 190) / 12, 2)) * 10;
            const dip3 = Math.exp(-Math.pow((i - 245) / 10, 2)) * 7;
            noise = -(dip1 + dip2 + dip3) + rand() * 2.5;
        } else {
            // In degradation zone: oscillating noise that grows with severity
            const progress = (i - capCycles) / (totalCycles - capCycles);
            const amplitude = 5 + progress * 20;
            const freq1 = 0.07, freq2 = 0.13;
            noise = Math.sin(i * freq1) * amplitude * 0.6
                  + Math.sin(i * freq2) * amplitude * 0.4
                  + rand() * 5;
            // Extra dip near 80% degradation (visible in reference)
            const dipCenter = capCycles + (totalCycles - capCycles) * 0.78;
            const bigDip = Math.exp(-Math.pow((i - dipCenter) / 18, 2)) * 22;
            noise -= bigDip;
        }

        const pRUL = Math.max(endRUL - 8, Math.min(capRUL + 2, tRUL + noise));
        predictedRUL.push(parseFloat(pRUL.toFixed(1)));
    }

    return { labels, trueRUL, predictedRUL };
}

window.launchRULChart = function(type) {
    const section = document.getElementById('rulChartSection');
    if (!section) return;

    // Show section with slide-in animation
    section.style.display = 'block';
    section.style.opacity = '0';
    section.style.transform = 'translateY(20px)';
    requestAnimationFrame(() => {
        section.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        section.style.opacity = '1';
        section.style.transform = 'translateY(0)';
    });

    // Scroll smoothly to chart
    setTimeout(() => {
        section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);

    loadChartJS(() => {
        // Cancel any in-progress animation
        if (rulAnimFrame) { cancelAnimationFrame(rulAnimFrame); rulAnimFrame = null; }
        if (rulChartInstance) { rulChartInstance.destroy(); rulChartInstance = null; }

        // Reset footer stats
        ['cs-cycle-val','cs-true-val','cs-pred-val','cs-error-val'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '—';
        });
        const statusEl = document.getElementById('cs-status-val');
        if (statusEl) { statusEl.textContent = '—'; statusEl.className = 'cs-status'; }

        const { labels, trueRUL, predictedRUL } = generateRULData(type);
        const canvas = document.getElementById('rulLiveChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Live arrays — data streams in frame by frame
        const visibleTrue = [];
        const visiblePred = [];

        rulChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'True RUL',
                        data: visibleTrue,
                        borderColor: '#22D3EE',
                        backgroundColor: 'transparent',
                        borderWidth: 2.5,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        pointHoverBackgroundColor: '#22D3EE',
                        tension: 0.1,
                        order: 1
                    },
                    {
                        label: 'Predicted',
                        data: visiblePred,
                        borderColor: '#F59E0B',
                        backgroundColor: 'rgba(245,158,11,0.05)',
                        fill: false,
                        borderWidth: 1.8,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        pointHoverBackgroundColor: '#F59E0B',
                        tension: 0.3,
                        order: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#111827',
                        borderColor: 'rgba(99,102,241,0.35)',
                        borderWidth: 1,
                        titleColor: '#9CA3AF',
                        bodyColor: '#E5E7EB',
                        padding: 10,
                        displayColors: true,
                        callbacks: {
                            title: (items) => `Cycle  ${items[0].label}`,
                            label: (item) => `  ${item.dataset.label}: ${parseFloat(item.parsed.y).toFixed(1)} cycles`
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Engine Cycles',
                            color: '#4B5563',
                            font: { size: 11, family: "'Space Grotesk', sans-serif" }
                        },
                        ticks: {
                            color: '#4B5563',
                            maxTicksLimit: 9,
                            font: { size: 10 },
                            autoSkip: true
                        },
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        border: { color: 'rgba(255,255,255,0.08)' }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'RUL (cycles)',
                            color: '#4B5563',
                            font: { size: 11, family: "'Space Grotesk', sans-serif" }
                        },
                        min: 0,
                        max: 140,
                        ticks: {
                            color: '#4B5563',
                            stepSize: 20,
                            font: { size: 10 }
                        },
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        border: { color: 'rgba(255,255,255,0.08)' }
                    }
                }
            }
        });

        // Stream data points frame by frame
        let idx = 0;
        const speed = 4; // points per frame — increase for faster animation

        function stream() {
            const end = Math.min(idx + speed, labels.length);
            for (let j = idx; j < end; j++) {
                visibleTrue.push(trueRUL[j]);
                visiblePred.push(predictedRUL[j]);
            }
            idx = end;
            rulChartInstance.update('none');

            // Update footer live stats
            const cyc  = labels[idx - 1];
            const tVal = trueRUL[idx - 1];
            const pVal = predictedRUL[idx - 1];
            const err  = Math.abs(tVal - pVal).toFixed(1);

            const cycleEl = document.getElementById('cs-cycle-val');
            const trueEl  = document.getElementById('cs-true-val');
            const predEl  = document.getElementById('cs-pred-val');
            const errEl   = document.getElementById('cs-error-val');
            const statEl  = document.getElementById('cs-status-val');

            if (cycleEl) cycleEl.textContent = cyc;
            if (trueEl)  trueEl.textContent  = tVal.toFixed(1);
            if (predEl)  predEl.textContent  = pVal.toFixed(1);
            if (errEl)   errEl.textContent   = '±' + err;

            if (statEl) {
                if (tVal > 80) {
                    statEl.textContent = 'HEALTHY';
                    statEl.className = 'cs-status healthy';
                } else if (tVal > 40) {
                    statEl.textContent = 'WARNING';
                    statEl.className = 'cs-status warning';
                } else {
                    statEl.textContent = 'CRITICAL';
                    statEl.className = 'cs-status critical';
                }
            }

            if (idx < labels.length) {
                rulAnimFrame = requestAnimationFrame(stream);
            } else {
                rulAnimFrame = null;
            }
        }

        rulAnimFrame = requestAnimationFrame(stream);
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

            const rulValue  = type === 'healthy' ? 142 : 14;
            const isHealthy = type === 'healthy';

            // Animate counter
            let count = 0;
            const target = rulValue;
            const step   = Math.max(1, Math.ceil(target / 30));
            const counter = setInterval(() => {
                count = Math.min(count + step, target);
                if (display) display.textContent = count;
                if (count >= target) clearInterval(counter);
            }, 40);

            // Ring fill
            if (ring) {
                const pct   = (rulValue / 150) * 360;
                const color = isHealthy ? 'var(--secondary)' : 'var(--danger)';
                ring.style.background = `conic-gradient(${color} ${pct}deg, rgba(255,255,255,0.04) ${pct}deg)`;
            }

            // Status
            if (display) display.style.color = isHealthy ? 'var(--secondary)' : 'var(--danger)';
            if (statusMsg) {
                statusMsg.textContent = isHealthy
                    ? '✓ HEALTHY — Maintenance Not Urgent'
                    : '⚠ CRITICAL — Immediate Maintenance Required';
                statusMsg.className = 'rul-status-msg ' + (isHealthy ? 'safe' : 'critical');
            }

            simRunning = false;

            // Launch RUL live chart after a brief pause
            setTimeout(() => launchRULChart(type), 300);
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