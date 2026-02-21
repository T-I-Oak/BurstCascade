(function () {
    window.TutorialRenderer = class TutorialRenderer {
        constructor() {
            this.game = window.game;
            this.init();
        }

        async init() {
            this.overloadState = { frame: 0, particles: [] };
            this.injectState = { frame: 0 };
            this.reconstructState = { frame: 0 };

            // Wait for game to be ready (layout initialized)
            while (!this.game || !this.game.layout) {
                await new Promise(r => setTimeout(r, 100));
            }
            this.startAnimation();
        }

        startAnimation() {
            const animate = () => {
                this.renderObjectiveCore();
                this.renderInjectDemo();
                this.renderOverloadDemo();
                this.renderReconstructDemo();
                requestAnimationFrame(animate);
            };
            requestAnimationFrame(animate);
        }

        // ... existing methods ...

        renderReconstructDemo() {
            const canvas = document.getElementById('help-reconstruct-canvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;
            ctx.clearRect(0, 0, width, height);

            const st = this.reconstructState;
            st.frame++;

            // Cycle: Focus (0-180) -> Diffuse (180-360)
            const loop = 360;
            const t = st.frame % loop;
            const isFocusPhase = (t < 180);
            const localT = t % 180;

            // Layout for 7 hexes (Standard flower shape)
            const size = 12; // Smaller size to fit 7 hexes
            const origin = { x: width / 2, y: height / 2 + 10 };
            const layout = new window.BurstCascade.Layout(size, origin);

            // Define 7 hexes (Center + 6 neighbors)
            // We will pick two specific hexes to animate (e.g., q=-1,r=0 and q=1,r=0)
            // Values are initial states before animation logic
            const hexes = [
                { q: 0, r: 0, val: 3 },
                { q: 1, r: -1, val: 2 }, { q: 1, r: 0, val: 0 }, { q: 0, r: 1, val: 4 },
                { q: -1, r: 1, val: 1 }, { q: -1, r: 0, val: 0 }, { q: 0, r: -1, val: 2 }
            ];

            // Target indices for animation (Left: q=-1,r=0 / Right: q=1,r=0)
            // Note: In the array above:
            // q=-1, r=0 is index 5
            // q=1, r=0 is index 2
            const leftIdx = 5;
            const rightIdx = 2;

            // Animation Params
            // Focus: 2, 4 -> 1, 5 (Widening gap)
            // Diffuse: 1, 5 -> 2, 4 (Narrowing gap)
            let valLeft = isFocusPhase ? 2 : 1;
            let valRight = isFocusPhase ? 4 : 5;
            let label = isFocusPhase ? "集束 (Focus)" : "拡散 (Diffuse)";

            const moveStart = 40;
            const moveEnd = 80;
            const textEnd = 160;

            // Height update
            if (localT >= moveEnd) {
                if (isFocusPhase) {
                    valLeft -= 1;
                    valRight += 1;
                } else {
                    valLeft += 1;
                    valRight -= 1;
                }
            }

            // Update data array
            hexes[leftIdx].val = valLeft;
            hexes[rightIdx].val = valRight;

            // Sort hexes by Y for Z-order
            const drawList = hexes.map((h, i) => {
                const hex = new window.BurstCascade.Hex(h.q, h.r, h.val, 1, 'main');
                const center = layout.hexToPixel(hex);
                return {
                    data: h,
                    index: i,
                    hex: hex,
                    y: center.y
                };
            });

            drawList.sort((a, b) => a.y - b.y);

            // Draw Label
            ctx.fillStyle = '#94a3b8';
            ctx.font = '12px "Share Tech Mono"';
            ctx.textAlign = 'center';
            ctx.fillText(label, width / 2, 20);

            // Draw all hexes
            drawList.forEach(item => {
                const hex = new window.BurstCascade.Hex(item.data.q, item.data.r, item.data.val, 1, 'main');
                hex.visualHeight = item.data.val;
                this.game.drawHex(hex, ctx, layout);
            });

            // Draw Arrow / Particle between targets
            if (localT >= moveStart && localT < moveEnd) {
                const leftHex = new window.BurstCascade.Hex(hexes[leftIdx].q, hexes[leftIdx].r, valLeft, 1, 'main');
                const rightHex = new window.BurstCascade.Hex(hexes[rightIdx].q, hexes[rightIdx].r, valRight, 1, 'main');

                const p = (localT - moveStart) / (moveEnd - moveStart);

                const lPixel = layout.hexToPixel(leftHex);
                const rPixel = layout.hexToPixel(rightHex);

                // Base heights (before change) to calculate particle start/end cleanly
                // Focus: Left(2)->Right(4). Diffuse: Right(5)->Left(1)
                const startH = isFocusPhase ? 2 : 5;
                const endH = isFocusPhase ? 4 : 1;

                const lHead = { x: lPixel.x, y: lPixel.y - (isFocusPhase ? startH : endH) * size * 0.2 };
                const rHead = { x: rPixel.x, y: rPixel.y - (isFocusPhase ? endH : startH) * size * 0.2 };

                const start = isFocusPhase ? lHead : rHead;
                const end = isFocusPhase ? rHead : lHead;

                // Parabolic arc
                const curX = start.x + (end.x - start.x) * p;
                const curY = start.y + (end.y - start.y) * p - Math.sin(p * Math.PI) * 20;

                const startS = isFocusPhase ? 14 : 2;
                const endS = isFocusPhase ? 2 : 14;
                const curS = startS + (endS - startS) * p;

                // Color Graduation: RGB(217, 70, 239) Magenta vs RGB(251, 191, 36) Yellow
                const startRGB = isFocusPhase ? { r: 217, g: 70, b: 239 } : { r: 251, g: 191, b: 36 };
                const endRGB = isFocusPhase ? { r: 251, g: 191, b: 36 } : { r: 217, g: 70, b: 239 };
                const r = Math.round(startRGB.r + (endRGB.r - startRGB.r) * p);
                const g = Math.round(startRGB.g + (endRGB.g - startRGB.g) * p);
                const b = Math.round(startRGB.b + (endRGB.b - startRGB.b) * p);

                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.beginPath();
                ctx.arc(curX, curY, curS / 2, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw Change Text (+1 / -1)
            if (localT >= moveEnd && localT < textEnd) {
                const alpha = 1.0 - (localT - moveEnd) / (textEnd - moveEnd);
                const lift = (localT - moveEnd) * 0.3;

                ctx.globalAlpha = alpha;
                ctx.font = 'bold 16px sans-serif';
                ctx.shadowColor = 'rgba(0,0,0,0.8)';
                ctx.shadowBlur = 4;

                const leftHex = new window.BurstCascade.Hex(hexes[leftIdx].q, hexes[leftIdx].r, valLeft, 1, 'main');
                const rightHex = new window.BurstCascade.Hex(hexes[rightIdx].q, hexes[rightIdx].r, valRight, 1, 'main');

                const lPixel = layout.hexToPixel(leftHex);
                const rPixel = layout.hexToPixel(rightHex);

                const lY = lPixel.y - valLeft * size * 0.2 - 25 - lift;
                const rY = rPixel.y - valRight * size * 0.2 - 25 - lift;

                if (isFocusPhase) {
                    ctx.fillStyle = '#ef4444'; ctx.fillText("-1", lPixel.x, lY);
                    ctx.fillStyle = '#4ade80'; ctx.fillText("+1", rPixel.x, rY);
                } else {
                    ctx.fillStyle = '#4ade80'; ctx.fillText("+1", lPixel.x, lY);
                    ctx.fillStyle = '#ef4444'; ctx.fillText("-1", rPixel.x, rY);
                }
                ctx.globalAlpha = 1.0;
                ctx.shadowBlur = 0;
            }
        }

        renderInjectDemo() {
            const canvas = document.getElementById('help-inject-canvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;
            ctx.clearRect(0, 0, width, height);

            const st = this.injectState;
            st.frame++;

            const loop = 200;
            const t = st.frame % loop;

            // Layout
            const size = 18;
            const origin = { x: width / 2, y: height / 2 + 10 };
            const layout = new window.BurstCascade.Layout(size, origin);

            // 1. Define Hexes
            // Center + 6 Neighbors with delay
            let hexes = [
                { q: 0, r: 0, delay: 0, val: 5 },
                { q: 1, r: 0, delay: 5, val: 1 }, { q: 1, r: -1, delay: 10, val: 1 }, { q: 0, r: -1, delay: 15, val: -1 },
                { q: -1, r: 0, delay: 20, val: 0 }, { q: -1, r: 1, delay: 25, val: 2 }, { q: 0, r: 1, delay: 30, val: 1 }
            ];

            // 2. Sort by Y for painters algorithm (Z-order)
            hexes.forEach(h => {
                const center = layout.hexToPixel(new window.BurstCascade.Hex(h.q, h.r, 0, 0));
                h.y = center.y;
            });
            hexes.sort((a, b) => a.y - b.y);

            // 3. State Calculation
            const hoverStart = 20;
            const clickTime = 50;
            const fallStart = 60;
            const impactBaseTime = 90;

            const cx = origin.x;
            // Height 3 position: h * size * 0.2 (from main.js drawHex logic)
            // size=18, h=3 => 3 * 18 * 0.2 = 10.8
            const cy = origin.y - (3 * size * 0.2);

            // 4. Draw Base Hexes
            hexes.forEach(hData => {
                // Determine current height
                // Initial State: Center=3, Others=0
                let currentH = (hData.q === 0 && hData.r === 0) ? 3 : 0;

                const myImpactTime = impactBaseTime + hData.delay;
                // After impact, add falling value
                if (t > myImpactTime) {
                    currentH += hData.val;
                }

                // If height is 0, owner 0 (neutral), else owner 1 (green)
                const owner = (currentH === 0) ? 0 : 1;

                const hex = new window.BurstCascade.Hex(hData.q, hData.r, currentH, owner, 'main');
                hex.visualHeight = currentH;

                this.game.drawHex(hex, ctx, layout);
            });

            // 5. Draw Falling Hexes
            hexes.forEach(hData => {
                const myStartTime = fallStart + hData.delay;
                const myImpactTime = impactBaseTime + hData.delay;

                if (t >= myStartTime && t < myImpactTime) {
                    const duration = myImpactTime - myStartTime;
                    const progress = (t - myStartTime) / duration;
                    // Ease In Quad
                    const fallDist = 150;
                    const yOffset = -fallDist * (1 - progress * progress);

                    const hex = new window.BurstCascade.Hex(hData.q, hData.r, 0, 0);
                    const pixel = layout.hexToPixel(hex);

                    const de = {
                        x: pixel.x,
                        y: pixel.y + yOffset,
                        alpha: 1.0,
                        type: 'land',
                        sourceHeight: hData.val,
                        owner: 1,
                        targetHex: hex
                    };

                    this.game.drawFallingHex(de, ctx, layout);
                }
            });

            // 6. Click Ripple (No cursor ring, just ripple)
            // Ripple simulates click
            if (t >= clickTime && t < clickTime + 20) {
                const age = (t - clickTime) / 20;
                ctx.save();
                ctx.translate(cx, cy);
                ctx.scale(1.0, 0.6); // Perspective match
                ctx.beginPath();
                ctx.arc(0, 0, 5 + age * 25, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(100, 255, 200, ${1.0 - age})`;
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();
            }
        }

        renderOverloadDemo() {
            const canvas = document.getElementById('help-overload-canvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;
            ctx.clearRect(0, 0, width, height);

            const st = this.overloadState;
            st.frame++;

            // Loop length: 240 frames (~4 sec)
            const loop = 240;
            const t = st.frame % loop;

            let h = 0;
            let isBurst = false;

            // Simple sequence
            if (t < 60) h = 7;
            else if (t < 100) h = 8;
            else if (t < 140) h = 9;
            else if (t < 160) h = 10; // Overload!
            else if (t === 160) {
                isBurst = true; // Trigger burst
                h = 0;
            } else {
                h = 0; // Cooldown
            }

            // Layout
            const size = 28;
            const origin = { x: width / 2, y: height / 2 + 15 };
            const layout = new window.BurstCascade.Layout(size, origin);

            // Draw Hex
            // Fix: If h=0, owner should be 0 (Base state, not green)
            const owner = (h === 0) ? 0 : 1;
            const hex = new window.BurstCascade.Hex(0, 0, h, owner, 'main');
            hex.visualHeight = h;

            // Shake effect just before burst
            if (h >= 10) {
                const shake = (Math.random() - 0.5) * 4;
                ctx.save();
                ctx.translate(shake, shake);
            }

            this.game.drawHex(hex, ctx, layout);

            // Fix: Show "0" momentarily during burst/reset
            // Frame 160 is burst. Let's show "0" for a short while (e.g. 20 frames)
            if (t >= 160 && t < 190) {
                const center = layout.hexToPixel(hex);
                // Use neutral or white color for 0?
                const colors = {
                    0: { top: '#1e293b', side: '#0f172a', border: '#334155', highlight: '#475569' }
                };
                this.game.drawHexNumber(ctx, center.x, center.y, 0, colors[0], 0, layout);
            }

            if (h >= 10) ctx.restore();

            // Particle System for Burst
            if (isBurst) {
                for (let i = 0; i < 15; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 2 + Math.random() * 3;
                    st.particles.push({
                        x: origin.x, y: origin.y - 30, // Approximate top center
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: 1.0,
                        color: '#4ade80'
                    });
                }
            }

            // Update and draw particles
            for (let i = st.particles.length - 1; i >= 0; i--) {
                const p = st.particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.05;

                if (p.life <= 0) {
                    st.particles.splice(i, 1);
                    continue;
                }

                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }
        }

        renderObjectiveCore() {
            const canvas = document.getElementById('help-core-canvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;
            ctx.clearRect(0, 0, width, height);

            const size = 28;
            const origin = { x: width / 2, y: height / 2 + 20 };
            const tempLayout = new window.BurstCascade.Layout(size, origin);

            const coreHex = new window.BurstCascade.Hex(0, 0, 3, 1, 'main');
            coreHex.visualHeight = 3;
            coreHex.hasFlag = true;
            coreHex.flagOwner = 1;
            coreHex.visualFlagScale = 1.0;

            this.game.drawHex(coreHex, ctx, tempLayout);
        }
    };

    window.addEventListener('load', () => {
        window.tutorialRenderer = new TutorialRenderer();
    });

    window.BurstCascade = window.BurstCascade || {};
    window.BurstCascade.TutorialRenderer = TutorialRenderer;
})();
