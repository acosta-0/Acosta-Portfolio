/* ===================================
   PAOLO ACOSTA — INTERACTIVE PORTFOLIO
   Three.js 3D + Particle System + Interactions
   =================================== */

// ===== CYBER DEFENDER MINI-GAME ENGINE (Replaces Initializing Screen) =====
const MiniGame = (function initMiniGame() {
    const screen = document.getElementById('miniGameScreen');
    const canvas = document.getElementById('miniGameCanvas');
    if (!canvas || !screen) return null;
    const ctx = canvas.getContext('2d');

    const scoreEl = document.getElementById('gameScore');
    const timerEl = document.getElementById('gameTimer');
    const progressBar = document.getElementById('gameProgressBar');
    const progressNum = document.getElementById('gameProgressNum');
    const introOverlay = document.getElementById('gameIntroOverlay');
    const victoryOverlay = document.getElementById('gameVictoryOverlay');
    const finalScoreVal = document.getElementById('finalScoreVal');
    const startBtn = document.getElementById('startMiniGameBtn');
    const directSkipBtn = document.getElementById('directSkipBtn');
    const skipGameBtn = document.getElementById('skipGameBtn');
    const victoryEnterBtn = document.getElementById('victoryEnterBtn');
    const openArcadeBtn = document.getElementById('openArcadeBtn');

    let animId = null;
    let score = 0;
    const TARGET_SCORE = 20000;
    let timeLeft = 45;
    let timerInterval = null;
    let isPlaying = false;
    let isUnlocked = false;
    let mouseAimX = 0;
    let mouseAimY = 0;
    let showReticle = false;

    // Player Ship
    const player = {
        x: 0,
        y: 0,
        width: 44,
        height: 36,
        targetX: 0,
        speed: 15,
        thrusterParticles: []
    };

    let lasers = [];
    let targets = [];
    let particles = [];
    let floatingTexts = [];
    let spawnTimer = 0;
    const keys = {};

    function resizeCanvas() {
        const container = canvas.parentElement;
        if (!container) return;
        canvas.width = container.clientWidth || window.innerWidth;
        canvas.height = container.clientHeight || (window.innerHeight - 130);
        player.y = canvas.height - 45;
        if (player.x === 0) {
            player.x = canvas.width / 2;
            player.targetX = player.x;
        }
    }
    window.addEventListener('resize', resizeCanvas);
    setTimeout(resizeCanvas, 50);

    // Web Audio Sound FX for Mini-Game
    function playSfx(type) {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const actx = new AudioCtx();
            const now = actx.currentTime;

            if (type === 'laser') {
                const osc = actx.createOscillator();
                const gain = actx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(120, now + 0.1);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                osc.connect(gain);
                gain.connect(actx.destination);
                osc.start(now);
                osc.stop(now + 0.11);
            } else if (type === 'hit') {
                const osc = actx.createOscillator();
                const gain = actx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(280, now);
                osc.frequency.exponentialRampToValueAtTime(70, now + 0.15);
                gain.gain.setValueAtTime(0.18, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                osc.connect(gain);
                gain.connect(actx.destination);
                osc.start(now);
                osc.stop(now + 0.16);
            } else if (type === 'chip') {
                [523.25, 659.25, 783.99].forEach((freq, idx) => {
                    const osc = actx.createOscillator();
                    const gain = actx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.05);
                    gain.gain.setValueAtTime(0.15, now + idx * 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.18);
                    osc.connect(gain);
                    gain.connect(actx.destination);
                    osc.start(now + idx * 0.05);
                    osc.stop(now + idx * 0.05 + 0.2);
                });
            } else if (type === 'victory') {
                [440, 554.37, 659.25, 880].forEach((freq, idx) => {
                    const osc = actx.createOscillator();
                    const gain = actx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.09);
                    gain.gain.setValueAtTime(0.22, now + idx * 0.09);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.3);
                    osc.connect(gain);
                    gain.connect(actx.destination);
                    osc.start(now + idx * 0.09);
                    osc.stop(now + idx * 0.09 + 0.32);
                });
            }
        } catch (e) {
            // Audio context fallback
        }
    }

    function shootLaser() {
        if (!isPlaying) return;
        playSfx('laser');
        lasers.push({
            x: player.x - 14,
            y: player.y - 12,
            vy: -16,
            width: 3,
            height: 18,
            color: '#00d4ff'
        });
        lasers.push({
            x: player.x + 14,
            y: player.y - 12,
            vy: -16,
            width: 3,
            height: 18,
            color: '#7c3aed'
        });
    }

    function shootAt(targetX, targetY) {
        if (!isPlaying) return;
        player.targetX = targetX;
        shootLaser();
    }

    const TARGET_TYPES = [
        { type: 'bug', label: 'BUG', color: '#ff006e', pts: 1000, radius: 18, shape: 'square' },
        { type: 'core', label: 'CORE', color: '#00d4ff', pts: 1500, radius: 20, shape: 'circle' },
        { type: 'vue', label: 'WEB', color: '#06d6a0', pts: 2500, radius: 22, shape: 'diamond' },
        { type: 'python', label: 'PY', color: '#ffb703', pts: 2500, radius: 22, shape: 'diamond' },
        { type: 'cpp', label: 'C++', color: '#a78bfa', pts: 3000, radius: 22, shape: 'diamond' },
        { type: 'shield', label: 'SHIELD', color: '#0284c7', pts: 2000, radius: 20, shape: 'ring' }
    ];

    function spawnTarget() {
        const item = TARGET_TYPES[Math.floor(Math.random() * TARGET_TYPES.length)];
        const margin = 40;
        const x = margin + Math.random() * (canvas.width - margin * 2);
        targets.push({
            ...item,
            x: x,
            y: -30,
            vx: (Math.random() - 0.5) * 1.6,
            vy: 2.0 + Math.random() * 1.8,
            rot: 0,
            rotSpeed: (Math.random() - 0.5) * 0.06
        });
    }

    function hitTarget(index) {
        const t = targets[index];
        if (!t) return;

        score += t.pts;
        if (scoreEl) scoreEl.textContent = score.toLocaleString();
        if (progressNum) progressNum.textContent = Math.min(score, TARGET_SCORE).toLocaleString() + ' / ' + TARGET_SCORE.toLocaleString();
        if (progressBar) {
            const pct = Math.min((score / TARGET_SCORE) * 100, 100);
            progressBar.style.width = pct + '%';
        }

        if (t.pts >= 2500) {
            playSfx('chip');
        } else {
            playSfx('hit');
        }

        // Particle explosion
        for (let i = 0; i < 18; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 5;
            particles.push({
                x: t.x,
                y: t.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2.5 + Math.random() * 3,
                color: t.color,
                life: 1,
                decay: 0.025 + Math.random() * 0.03
            });
        }

        // Floating score popup
        floatingTexts.push({
            x: t.x,
            y: t.y,
            text: `+${t.pts} ${t.label}`,
            color: t.color,
            life: 1,
            vy: -2
        });

        targets.splice(index, 1);

        if (score >= TARGET_SCORE && !isUnlocked) {
            triggerVictory();
        }
    }

    function triggerVictory() {
        isUnlocked = true;
        isPlaying = false;
        playSfx('victory');
        clearInterval(timerInterval);

        for (let i = 0; i < 50; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 8;
            particles.push({
                x: canvas.width / 2 + (Math.random() - 0.5) * 200,
                y: canvas.height / 2 + (Math.random() - 0.5) * 100,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 4,
                color: Math.random() > 0.5 ? '#06d6a0' : (Math.random() > 0.5 ? '#7c3aed' : '#00d4ff'),
                life: 1.2,
                decay: 0.015
            });
        }

        const victoryTitle = document.getElementById('victoryTitle');
        const victorySub = document.getElementById('victorySub');
        const victoryBadge = document.getElementById('victoryBadge');

        if (score >= TARGET_SCORE) {
            if (victoryBadge) victoryBadge.textContent = 'ACCESS GRANTED';
            if (victoryTitle) victoryTitle.textContent = 'TARGET UNLOCKED!';
            if (victorySub) victorySub.textContent = 'You surpassed 20,000 points and unlocked the portfolio.';
        } else {
            if (victoryBadge) victoryBadge.textContent = 'MISSION PAUSED';
            if (victoryTitle) victoryTitle.textContent = 'ROUND COMPLETE';
            if (victorySub) victorySub.textContent = 'Choose whether to continue playing or explore the portfolio.';
        }

        if (finalScoreVal) finalScoreVal.textContent = score.toLocaleString();
        if (victoryOverlay) victoryOverlay.classList.remove('hidden');
        // Do not auto-close; let the player decide via buttons
    }

    function unlockPortfolio() {
        screen.classList.add('hidden');
        isPlaying = false;
        clearInterval(timerInterval);
        if (animId) cancelAnimationFrame(animId);
        animId = null;

        const heroContent = document.querySelector('.hero-content');
        if (heroContent) heroContent.style.opacity = '1';
    }

    window.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'Escape') {
            unlockPortfolio();
        } else if (e.code === 'Space') {
            if (isPlaying) {
                e.preventDefault();
                shootLaser();
            }
        }
    });

    window.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseAimX = e.clientX - rect.left;
        mouseAimY = e.clientY - rect.top;
        showReticle = true;
        player.targetX = mouseAimX;
    });

    canvas.addEventListener('mouseleave', () => {
        showReticle = false;
    });

    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        shootAt(clickX, clickY);
    });

    canvas.addEventListener('touchstart', (e) => {
        if (!e.touches[0]) return;
        const rect = canvas.getBoundingClientRect();
        const clickX = e.touches[0].clientX - rect.left;
        const clickY = e.touches[0].clientY - rect.top;
        shootAt(clickX, clickY);
    }, { passive: true });

    if (startBtn) {
        startBtn.addEventListener('click', () => {
            if (introOverlay) introOverlay.classList.add('hidden');
            startGame();
        });
    }

    if (directSkipBtn) {
        directSkipBtn.addEventListener('click', unlockPortfolio);
    }

    if (skipGameBtn) {
        skipGameBtn.addEventListener('click', unlockPortfolio);
    }

    if (victoryEnterBtn) {
        victoryEnterBtn.addEventListener('click', unlockPortfolio);
    }

    const victoryContinueBtn = document.getElementById('victoryContinueBtn');
    if (victoryContinueBtn) {
        victoryContinueBtn.addEventListener('click', () => {
            if (victoryOverlay) victoryOverlay.classList.add('hidden');
            isPlaying = true;
            timeLeft = 45;
            if (timerEl) timerEl.textContent = timeLeft + 's';
            clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                if (!isPlaying) return;
                timeLeft--;
                if (timerEl) timerEl.textContent = timeLeft + 's';
                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    triggerVictory();
                }
            }, 1000);
            if (!animId) {
                animId = requestAnimationFrame(gameLoop);
            }
        });
    }

    if (openArcadeBtn) {
        openArcadeBtn.addEventListener('click', () => {
            screen.classList.remove('hidden');
            if (introOverlay) introOverlay.classList.add('hidden');
            if (victoryOverlay) victoryOverlay.classList.add('hidden');
            score = 0;
            timeLeft = 45;
            if (scoreEl) scoreEl.textContent = '0';
            if (timerEl) timerEl.textContent = '45s';
            if (progressBar) progressBar.style.width = '0%';
            if (progressNum) progressNum.textContent = '0 / 20,000';
            startGame();
        });
    }

    function startGame() {
        resizeCanvas();
        isPlaying = true;
        isUnlocked = false;
        lasers = [];
        targets = [];
        particles = [];
        floatingTexts = [];
        spawnTimer = 0;

        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            if (!isPlaying) return;
            timeLeft--;
            if (timerEl) timerEl.textContent = timeLeft + 's';
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                triggerVictory();
            }
        }, 1000);

        if (!animId) {
            animId = requestAnimationFrame(gameLoop);
        }
    }

    function gameLoop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Keyboard Movement
        if (keys['ArrowLeft'] || keys['KeyA']) {
            player.targetX -= player.speed;
        }
        if (keys['ArrowRight'] || keys['KeyD']) {
            player.targetX += player.speed;
        }

        player.targetX = Math.max(30, Math.min(canvas.width - 30, player.targetX));
        player.x += (player.targetX - player.x) * 0.18;

        // Thruster sparks
        if (isPlaying) {
            player.thrusterParticles.push({
                x: player.x + (Math.random() - 0.5) * 8,
                y: player.y + 16,
                vx: (Math.random() - 0.5) * 2,
                vy: 3 + Math.random() * 4,
                life: 1,
                size: 2 + Math.random() * 2,
                color: Math.random() > 0.5 ? '#00d4ff' : '#7c3aed'
            });
        }

        // Draw thruster particles
        for (let i = player.thrusterParticles.length - 1; i >= 0; i--) {
            const p = player.thrusterParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.05;
            if (p.life <= 0) {
                player.thrusterParticles.splice(i, 1);
                continue;
            }
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Draw Player Ship
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.fillStyle = '#1e1644';
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 12;

        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(20, 15);
        ctx.lineTo(8, 10);
        ctx.lineTo(0, 16);
        ctx.lineTo(-8, 10);
        ctx.lineTo(-20, 15);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#06d6a0';
        ctx.shadowColor = '#06d6a0';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.ellipse(0, -3, 4, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Spawn targets
        if (isPlaying) {
            spawnTimer++;
            if (spawnTimer % 35 === 0 && targets.length < 8) {
                spawnTarget();
            }
        }

        // Update & Draw Targets
        for (let i = targets.length - 1; i >= 0; i--) {
            const t = targets[i];
            t.x += t.vx;
            t.y += t.vy;
            t.rot += t.rotSpeed;

            if (t.x < t.radius || t.x > canvas.width - t.radius) t.vx *= -1;

            if (t.y > canvas.height + 40) {
                targets.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.translate(t.x, t.y);
            ctx.rotate(t.rot);
            ctx.shadowColor = t.color;
            ctx.shadowBlur = 15;
            ctx.strokeStyle = t.color;
            ctx.fillStyle = t.color + '22';
            ctx.lineWidth = 2.5;

            if (t.shape === 'circle' || t.shape === 'ring') {
                ctx.beginPath();
                ctx.arc(0, 0, t.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(0, 0, t.radius * 0.4, 0, Math.PI * 2);
                ctx.fillStyle = t.color;
                ctx.fill();
            } else if (t.shape === 'square') {
                ctx.beginPath();
                ctx.rect(-t.radius, -t.radius, t.radius * 2, t.radius * 2);
                ctx.fill();
                ctx.stroke();
            } else if (t.shape === 'diamond') {
                ctx.beginPath();
                ctx.moveTo(0, -t.radius * 1.2);
                ctx.lineTo(t.radius, 0);
                ctx.lineTo(0, t.radius * 1.2);
                ctx.lineTo(-t.radius, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }

            ctx.rotate(-t.rot);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px Orbitron, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowBlur = 4;
            ctx.fillText(t.label.replace(/[^A-Za-z0-9+]/g, ''), 0, 0);
            ctx.restore();
        }

        // Update & Draw Lasers
        for (let i = lasers.length - 1; i >= 0; i--) {
            const l = lasers[i];
            l.y += l.vy;

            if (l.y < -20) {
                lasers.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.fillStyle = l.color;
            ctx.shadowColor = l.color;
            ctx.shadowBlur = 12;
            ctx.fillRect(l.x - l.width / 2, l.y, l.width, l.height);
            ctx.restore();

            for (let j = targets.length - 1; j >= 0; j--) {
                const t = targets[j];
                const dist = Math.hypot(l.x - t.x, l.y - t.y);
                if (dist < t.radius + 10) {
                    lasers.splice(i, 1);
                    hitTarget(j);
                    break;
                }
            }
        }

        // Update & Draw Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;

            if (p.life <= 0) {
                particles.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Update & Draw Floating Texts
        for (let i = floatingTexts.length - 1; i >= 0; i--) {
            const ft = floatingTexts[i];
            ft.y += ft.vy;
            ft.life -= 0.025;

            if (ft.life <= 0) {
                floatingTexts.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.font = 'bold 12px Orbitron, sans-serif';
            ctx.fillStyle = ft.color;
            ctx.shadowColor = ft.color;
            ctx.shadowBlur = 8;
            ctx.globalAlpha = ft.life;
            ctx.textAlign = 'center';
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }

        // Draw Targeting Crosshair Reticle for Mouse
        if (showReticle && mouseAimX && mouseAimY) {
            ctx.save();
            ctx.strokeStyle = '#00d4ff';
            ctx.lineWidth = 1.5;
            ctx.shadowColor = '#00d4ff';
            ctx.shadowBlur = 10;
            
            // Outer ring
            ctx.beginPath();
            ctx.arc(mouseAimX, mouseAimY, 14, 0, Math.PI * 2);
            ctx.stroke();

            // Center dot
            ctx.fillStyle = '#ff006e';
            ctx.beginPath();
            ctx.arc(mouseAimX, mouseAimY, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Crosshair ticks
            ctx.beginPath();
            ctx.moveTo(mouseAimX - 22, mouseAimY);
            ctx.lineTo(mouseAimX - 8, mouseAimY);
            ctx.moveTo(mouseAimX + 8, mouseAimY);
            ctx.lineTo(mouseAimX + 22, mouseAimY);
            ctx.moveTo(mouseAimX, mouseAimY - 22);
            ctx.lineTo(mouseAimX, mouseAimY - 8);
            ctx.moveTo(mouseAimX, mouseAimY + 8);
            ctx.lineTo(mouseAimX, mouseAimY + 22);
            ctx.stroke();
            ctx.restore();
        }

        animId = requestAnimationFrame(gameLoop);
    }

    setTimeout(() => {
        startGame();
    }, 300);

    return {
        unlock: unlockPortfolio,
        start: startGame
    };
})();

// ===== CUSTOM CURSOR =====
const cursorDot = document.getElementById('cursorDot');
const cursorRing = document.getElementById('cursorRing');
let mouseX = 0, mouseY = 0;
let ringX = 0, ringY = 0;

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursorDot.style.left = mouseX + 'px';
    cursorDot.style.top = mouseY + 'px';
});

// Smooth cursor ring follow
function animateCursor() {
    ringX += (mouseX - ringX) * 0.12;
    ringY += (mouseY - ringY) * 0.12;
    cursorRing.style.left = ringX + 'px';
    cursorRing.style.top = ringY + 'px';
    requestAnimationFrame(animateCursor);
}
animateCursor();

// Cursor hover states
const interactiveElements = document.querySelectorAll(
    'a, button, .nav-link, .stat-card, .hobby-item, .tool-chip, .skill-card, .timeline-card, .contact-card, .cta-button, .progress-dot, [data-tilt]'
);

interactiveElements.forEach(el => {
    el.addEventListener('mouseenter', () => {
        cursorDot.classList.add('hover');
        cursorRing.classList.add('hover');
    });
    el.addEventListener('mouseleave', () => {
        cursorDot.classList.remove('hover');
        cursorRing.classList.remove('hover');
    });
});

// ===== THREE.JS 3D BACKGROUND =====
const bgCanvas = document.getElementById('bgCanvas');
let scene, camera, renderer;
let geometries = [];
let mouseWorldX = 0, mouseWorldY = 0;

function initThreeJS() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30;

    renderer = new THREE.WebGLRenderer({ canvas: bgCanvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Create floating 3D objects
    const shapes = [
        { geo: new THREE.IcosahedronGeometry(1.2, 0), color: 0x7c3aed, pos: [-15, 8, -10] },
        { geo: new THREE.OctahedronGeometry(1, 0), color: 0x06d6a0, pos: [18, -6, -15] },
        { geo: new THREE.TetrahedronGeometry(0.9, 0), color: 0x00d4ff, pos: [-12, -10, -8] },
        { geo: new THREE.TorusGeometry(1, 0.3, 8, 20), color: 0xff006e, pos: [14, 10, -12] },
        { geo: new THREE.DodecahedronGeometry(0.8, 0), color: 0xb14eff, pos: [-20, 3, -18] },
        { geo: new THREE.BoxGeometry(1.2, 1.2, 1.2), color: 0x7c3aed, pos: [22, -10, -20] },
        { geo: new THREE.IcosahedronGeometry(0.7, 0), color: 0x06d6a0, pos: [5, 15, -25] },
        { geo: new THREE.OctahedronGeometry(0.6, 0), color: 0x00d4ff, pos: [-8, -15, -12] },
        { geo: new THREE.TorusKnotGeometry(0.6, 0.2, 40, 6), color: 0xb14eff, pos: [10, 5, -18] },
        { geo: new THREE.ConeGeometry(0.7, 1.4, 5), color: 0xff006e, pos: [-18, -5, -22] },
        { geo: new THREE.IcosahedronGeometry(0.5, 0), color: 0x7c3aed, pos: [0, -12, -15] },
        { geo: new THREE.OctahedronGeometry(0.4, 0), color: 0x06d6a0, pos: [-5, 12, -10] },
        { geo: new THREE.TetrahedronGeometry(0.6, 0), color: 0x00d4ff, pos: [25, 0, -28] },
        { geo: new THREE.DodecahedronGeometry(0.5, 0), color: 0xff006e, pos: [-25, 8, -25] },
    ];

    shapes.forEach(({ geo, color, pos }) => {
        const material = new THREE.MeshBasicMaterial({
            color: color,
            wireframe: true,
            transparent: true,
            opacity: 0.25,
        });
        const mesh = new THREE.Mesh(geo, material);
        mesh.position.set(pos[0], pos[1], pos[2]);
        mesh.userData = {
            originalPos: { x: pos[0], y: pos[1], z: pos[2] },
            rotSpeed: {
                x: (Math.random() - 0.5) * 0.01,
                y: (Math.random() - 0.5) * 0.01,
                z: (Math.random() - 0.5) * 0.005,
            },
            floatOffset: Math.random() * Math.PI * 2,
            floatSpeed: 0.3 + Math.random() * 0.5,
            floatAmplitude: 0.5 + Math.random() * 1,
        };
        scene.add(mesh);
        geometries.push(mesh);
    });

    // Create grid lines (like a holographic grid)
    const gridHelper = new THREE.GridHelper(100, 40, 0x7c3aed, 0x7c3aed);
    gridHelper.position.y = -18;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.04;
    scene.add(gridHelper);

    // Mouse tracking for parallax
    document.addEventListener('mousemove', (e) => {
        mouseWorldX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseWorldY = -(e.clientY / window.innerHeight - 0.5) * 2;
    });

    animateThreeJS();
}

function animateThreeJS() {
    requestAnimationFrame(animateThreeJS);
    const time = Date.now() * 0.001;

    geometries.forEach(mesh => {
        const ud = mesh.userData;
        // Rotation
        mesh.rotation.x += ud.rotSpeed.x;
        mesh.rotation.y += ud.rotSpeed.y;
        mesh.rotation.z += ud.rotSpeed.z;

        // Float animation
        mesh.position.y = ud.originalPos.y + Math.sin(time * ud.floatSpeed + ud.floatOffset) * ud.floatAmplitude;

        // Mouse parallax
        mesh.position.x = ud.originalPos.x + mouseWorldX * 1.5;
    });

    // Camera subtle movement
    camera.position.x += (mouseWorldX * 2 - camera.position.x) * 0.03;
    camera.position.y += (mouseWorldY * 1.5 - camera.position.y) * 0.03;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
}

initThreeJS();

// ===== 2D PARTICLE SYSTEM =====
const particleCanvas = document.getElementById('particleCanvas');
const pCtx = particleCanvas.getContext('2d');
let particles = [];

function resizeParticleCanvas() {
    particleCanvas.width = window.innerWidth;
    particleCanvas.height = window.innerHeight;
}
resizeParticleCanvas();

class Particle {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * particleCanvas.width;
        this.y = Math.random() * particleCanvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.speedY = (Math.random() - 0.5) * 0.3;
        this.opacity = Math.random() * 0.4 + 0.1;
        this.hue = Math.random() > 0.5 ? 265 : 160; // purple or green
        this.pulseSpeed = Math.random() * 0.02 + 0.01;
        this.pulseOffset = Math.random() * Math.PI * 2;
    }

    update(time) {
        this.x += this.speedX;
        this.y += this.speedY;
        this.opacity = (Math.sin(time * this.pulseSpeed + this.pulseOffset) + 1) * 0.15 + 0.05;

        if (this.x < 0 || this.x > particleCanvas.width ||
            this.y < 0 || this.y > particleCanvas.height) {
            this.reset();
        }
    }

    draw() {
        pCtx.beginPath();
        pCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        pCtx.fillStyle = `hsla(${this.hue}, 80%, 60%, ${this.opacity})`;
        pCtx.fill();

        // Glow effect
        pCtx.beginPath();
        pCtx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
        pCtx.fillStyle = `hsla(${this.hue}, 80%, 60%, ${this.opacity * 0.15})`;
        pCtx.fill();
    }
}

// Create particles
for (let i = 0; i < 80; i++) {
    particles.push(new Particle());
}

// Draw connections between close particles
function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 120) {
                const opacity = (1 - dist / 120) * 0.08;
                pCtx.beginPath();
                pCtx.moveTo(particles[i].x, particles[i].y);
                pCtx.lineTo(particles[j].x, particles[j].y);
                pCtx.strokeStyle = `rgba(124, 58, 237, ${opacity})`;
                pCtx.lineWidth = 0.5;
                pCtx.stroke();
            }
        }
    }
}

function animateParticles() {
    requestAnimationFrame(animateParticles);
    pCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
    const time = Date.now();

    particles.forEach(p => {
        p.update(time);
        p.draw();
    });

    drawConnections();
}
animateParticles();

// ===== SCROLL-BASED ANIMATIONS =====
const sections = document.querySelectorAll('.section');
const navLinks = document.querySelectorAll('.nav-link');
const progressDots = document.querySelectorAll('.progress-dot');
const xpFill = document.getElementById('xpFill');
const revealElements = document.querySelectorAll('.reveal-left, .reveal-right, .reveal-up');
const timelineFill = document.getElementById('timelineFill');

function handleScroll() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = (scrollTop / docHeight) * 100;

    // Update XP bar
    xpFill.style.width = scrollPercent + '%';

    // Update active nav link and progress dots
    let currentSection = 'home';
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 200;
        if (scrollTop >= sectionTop) {
            currentSection = section.id;
        }
    });

    navLinks.forEach(link => {
        link.classList.toggle('active', link.dataset.section === currentSection);
    });

    const sectionIds = ['home', 'about', 'skills', 'education', 'contact'];
    progressDots.forEach((dot, i) => {
        dot.classList.toggle('active', sectionIds[i] === currentSection);
    });

    // Reveal elements on scroll
    revealElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.85) {
            el.classList.add('revealed');
        }
    });

    // Timeline fill
    const educationSection = document.getElementById('education');
    if (educationSection) {
        const rect = educationSection.getBoundingClientRect();
        const sectionHeight = educationSection.offsetHeight;
        const visible = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / sectionHeight));
        if (timelineFill) {
            timelineFill.style.height = Math.min(visible * 120, 100) + '%';
        }
    }

    // Parallax on scroll indicator
    const scrollIndicator = document.getElementById('scrollIndicator');
    if (scrollIndicator) {
        scrollIndicator.style.opacity = Math.max(0, 1 - scrollTop / 300);
    }
}

window.addEventListener('scroll', handleScroll, { passive: true });
handleScroll();

// ===== SMOOTH SCROLL NAVIGATION =====
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.getElementById(link.dataset.section);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

progressDots.forEach(dot => {
    dot.addEventListener('click', () => {
        const target = document.getElementById(dot.dataset.target);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// Keyboard navigation (1-5 keys)
document.addEventListener('keydown', (e) => {
    const sectionIds = ['home', 'about', 'skills', 'education', 'contact'];
    const num = parseInt(e.key);
    if (num >= 1 && num <= 5) {
        const target = document.getElementById(sectionIds[num - 1]);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    }
});

// ===== TYPING EFFECT =====
const typingPhrases = [
    'IT STUDENT',
    'WEB DEVELOPER',
    'TECH ENTHUSIAST',
    'PROBLEM SOLVER',
    'FAST LEARNER',
];

let phraseIndex = 0;
let charIndex = 0;
let isDeleting = false;
const typingText = document.getElementById('typingText');

function typeEffect() {
    const currentPhrase = typingPhrases[phraseIndex];

    if (isDeleting) {
        typingText.textContent = currentPhrase.substring(0, charIndex - 1);
        charIndex--;
    } else {
        typingText.textContent = currentPhrase.substring(0, charIndex + 1);
        charIndex++;
    }

    let typeSpeed = isDeleting ? 40 : 80;

    if (!isDeleting && charIndex === currentPhrase.length) {
        typeSpeed = 2000;
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % typingPhrases.length;
        typeSpeed = 300;
    }

    setTimeout(typeEffect, typeSpeed);
}

setTimeout(typeEffect, 3500);

// ===== COUNTER ANIMATION =====
const statValues = document.querySelectorAll('.stat-value[data-count]');

function animateCounter(el) {
    const target = parseInt(el.dataset.count);
    let current = 0;
    const increment = target / 40;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        el.textContent = Math.floor(current);
    }, 50);
}

// Observer for counters
const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

statValues.forEach(el => counterObserver.observe(el));

// ===== 3D TILT EFFECT =====
const tiltElements = document.querySelectorAll('[data-tilt]');

tiltElements.forEach(el => {
    el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (y - centerY) / centerY * -6;
        const rotateY = (x - centerX) / centerX * 6;

        el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
    });

    el.addEventListener('mouseleave', () => {
        el.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
    });
});

// ===== WINDOW RESIZE =====
window.addEventListener('resize', () => {
    // Three.js
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Particles
    resizeParticleCanvas();
});

// ===== AMBIENT SOUND (Optional) =====
const audioToggle = document.getElementById('audioToggle');
const audioSvgOff = document.getElementById('audioSvgOff');
const audioSvgOn = document.getElementById('audioSvgOn');
let audioContext = null;
let isPlaying = false;

audioToggle.addEventListener('click', () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        createAmbientSound();
    }

    if (isPlaying) {
        audioContext.suspend();
        audioSvgOff.style.display = '';
        audioSvgOn.style.display = 'none';
        isPlaying = false;
    } else {
        audioContext.resume();
        audioSvgOff.style.display = 'none';
        audioSvgOn.style.display = '';
        isPlaying = true;
    }
});

function createAmbientSound() {
    // Create a subtle ambient drone
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    oscillator1.type = 'sine';
    oscillator1.frequency.value = 80;
    oscillator2.type = 'sine';
    oscillator2.frequency.value = 120;

    filter.type = 'lowpass';
    filter.frequency.value = 200;

    gainNode.gain.value = 0.03;

    oscillator1.connect(filter);
    oscillator2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator1.start();
    oscillator2.start();

    // Subtle modulation
    const lfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();
    lfo.frequency.value = 0.2;
    lfoGain.gain.value = 10;
    lfo.connect(lfoGain);
    lfoGain.connect(oscillator1.frequency);
    lfo.start();
}

// ===== SMOOTH SCROLL ANCHOR LINKS =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// ===== MAGNETIC BUTTON EFFECT =====
document.querySelectorAll('.cta-button').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
    });

    btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
    });
});

// ===== CLICK RIPPLE EFFECT =====
document.addEventListener('click', (e) => {
    const ripple = document.createElement('div');
    ripple.style.cssText = `
        position: fixed;
        left: ${e.clientX}px;
        top: ${e.clientY}px;
        width: 0;
        height: 0;
        border-radius: 50%;
        border: 1px solid rgba(6, 214, 160, 0.6);
        pointer-events: none;
        z-index: 10001;
        transform: translate(-50%, -50%);
        animation: clickRipple 0.6s ease forwards;
    `;
    document.body.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
});

// Add ripple keyframes
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
    @keyframes clickRipple {
        to {
            width: 80px;
            height: 80px;
            opacity: 0;
        }
    }
`;
document.head.appendChild(rippleStyle);

// ===== EASTER EGG: Konami Code =====
let konamiSequence = [];
const konamiCode = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65]; // ↑↑↓↓←→←→BA

document.addEventListener('keydown', (e) => {
    konamiSequence.push(e.keyCode);
    konamiSequence = konamiSequence.slice(-10);

    if (konamiSequence.join(',') === konamiCode.join(',')) {
        // Rainbow mode!
        document.body.style.animation = 'rainbowBg 3s linear';
        setTimeout(() => {
            document.body.style.animation = '';
        }, 3000);

        const easterEggStyle = document.createElement('style');
        easterEggStyle.textContent = `
            @keyframes rainbowBg {
                0% { filter: hue-rotate(0deg); }
                100% { filter: hue-rotate(360deg); }
            }
        `;
        document.head.appendChild(easterEggStyle);
    }
});

console.log('%c Welcome to Paolo Acosta\'s Portfolio!', 'color: #06d6a0; font-size: 20px; font-weight: bold;');
console.log('%cTry the Konami Code for a surprise: ↑↑↓↓←→←→BA', 'color: #7c3aed; font-size: 12px;');
console.log('%cUse keys 1-5 to navigate sections!', 'color: #00d4ff; font-size: 12px;');

// ===== THEME TOGGLE (Light / Dark Mode) =====
const themeToggle = document.getElementById('themeToggle');
const themeIconDark = document.getElementById('themeIconDark');
const themeIconLight = document.getElementById('themeIconLight');

function applyThemeVisuals(isLight) {
    if (typeof geometries !== 'undefined' && geometries) {
        geometries.forEach(mesh => {
            if (mesh.material) {
                mesh.material.opacity = isLight ? 0.65 : 0.25;
                mesh.material.needsUpdate = true;
            }
        });
    }
}

// Check saved preference
const savedTheme = localStorage.getItem('portfolio-theme');
if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
    themeIconDark.style.display = 'none';
    themeIconLight.style.display = '';
    setTimeout(() => applyThemeVisuals(true), 150);
}

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');

        // Toggle icons
        themeIconDark.style.display = isLight ? 'none' : '';
        themeIconLight.style.display = isLight ? '' : 'none';

        // Update Three.js 3D meshes for punchy light mode
        applyThemeVisuals(isLight);

        // Sound effect on theme switch
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                const actx = new AudioCtx();
                const osc = actx.createOscillator();
                const gain = actx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(isLight ? 587.33 : 440, actx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(isLight ? 880 : 330, actx.currentTime + 0.15);
                gain.gain.setValueAtTime(0.12, actx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.15);
                osc.connect(gain);
                gain.connect(actx.destination);
                osc.start(actx.currentTime);
                osc.stop(actx.currentTime + 0.16);
            }
        } catch (e) {}

        // Save preference
        localStorage.setItem('portfolio-theme', isLight ? 'light' : 'dark');

        // Smooth body background transition
        document.body.style.transition = 'background 0.5s ease';
        setTimeout(() => {
            document.body.style.transition = '';
        }, 500);
    });
}
