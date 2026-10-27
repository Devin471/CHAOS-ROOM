// Zero-dependency particle celebration engine for arcade game rewards
export function launchConfetti(durationMs = 2800) {
  let canvas = document.getElementById('game-confetti-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'game-confetti-canvas';
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '99999';
    document.body.appendChild(canvas);
  }

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#ec4899', '#a855f7', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#3b82f6'];
  const particles = [];
  const particleCount = 140;

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: canvas.width * 0.5 + (Math.random() - 0.5) * 200,
      y: canvas.height * 0.6,
      vx: (Math.random() - 0.5) * 16,
      vy: -Math.random() * 18 - 8,
      size: Math.random() * 8 + 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 12,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
      opacity: 1
    });
  }

  const startTime = performance.now();

  function render(now) {
    const elapsed = now - startTime;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let alive = false;
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.45; // gravity
      p.vx *= 0.98; // drag
      p.rotation += p.vRot;

      if (elapsed > durationMs - 800) {
        p.opacity = Math.max(0, (durationMs - elapsed) / 800);
      }

      if (p.opacity > 0 && p.y < canvas.height + 50) {
        alive = true;
        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    });

    if (alive && elapsed < durationMs) {
      requestAnimationFrame(render);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  requestAnimationFrame(render);
}
