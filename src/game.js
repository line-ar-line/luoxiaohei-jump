// Canvas renderer and game state. No network dependency or build step is needed.
export const RULES = Object.freeze({ chargeMs: 1250, minDistance: 30, distanceRange: 330, perfectRadius: 15 });
export const jumpDistance = charge => RULES.minDistance + Math.max(0, Math.min(1, charge)) * RULES.distanceRange;
export function containsPoint(platform, point, margin = .94) {
  return Math.abs(point.x - platform.x) / (platform.width / 2) + Math.abs(point.y - platform.y) / (platform.depth / 2) <= margin;
}
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - t, 3);
function loadImage(path) {
  return new Promise((resolve, reject) => {
    const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = path;
  });
}
function seeded(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
function polygon(ctx, points, radius = 0) {
  ctx.beginPath();
  if (!radius) { points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); }
  else {
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const p = points[i], prev = points[(i + n - 1) % n], next = points[(i + 1) % n];
      const r1 = Math.min(.3, radius / Math.hypot(prev[0] - p[0], prev[1] - p[1]));
      const r2 = Math.min(.3, radius / Math.hypot(next[0] - p[0], next[1] - p[1]));
      const entry = [lerp(p[0], prev[0], r1), lerp(p[1], prev[1], r1)];
      if (!i) ctx.moveTo(...entry); else ctx.lineTo(...entry);
      ctx.quadraticCurveTo(...p, lerp(p[0], next[0], r2), lerp(p[1], next[1], r2));
    }
  }
  ctx.closePath();
}
function ellipse(ctx, x, y, rx, ry, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }

export class ForestGame {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.callbacks = callbacks;
    this.assist = callbacks.assist ?? true; this.sprites = {}; this.characterVersion = 0;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.time = 0; this.lastFrame = performance.now(); this.state = 'loading';
    this.background = document.createElement('canvas');
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(canvas);
    this.resize(); this.reset();
    const frame = now => {
      const dt = Math.min((now - this.lastFrame) / 1000, .045); this.lastFrame = now;
      if (!document.hidden && !this.paused) { this.time += dt; this.update(dt, now); this.draw(); }
      this.frameId = requestAnimationFrame(frame);
    };
    this.frameId = requestAnimationFrame(frame);
  }
  resize() {
    const { width, height } = this.canvas.getBoundingClientRect();
    this.width = Math.max(560, width); this.height = height * this.width / Math.max(width, 1);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(width * this.dpr); this.canvas.height = Math.round(height * this.dpr);
    this.scale = this.canvas.width / this.width;
    this.buildBackground();
    if (this.player) { this.camera = this.desiredCamera(); }
  }
  reset() {
    this.score = 0; this.combo = 0; this.perfectCount = 0; this.jumps = 0; this.charge = 0;
    this.currentId = 0; this.particles = []; this.rings = []; this.flight = null; this.fall = null; this.landingPulse = 0;
    this.platforms = [{ id: 0, x: 0, y: 0, width: 156, depth: 79, kind: 0 }, { id: 1, x: 174, y: -87, width: 144, depth: 73, kind: 1 }];
    this.appendPlatform(); this.player = { x: 0, y: 0, z: 0 };
    this.camera = this.desiredCamera(); this.setState(Object.keys(this.sprites).length ? 'ready' : 'loading');
    this.callbacks.onCharge?.(0); this.callbacks.onScore?.(0, false, 0);
  }
  async setCharacter(asset) {
    const version = ++this.characterVersion;
    this.cancelCharge(); this.setState('loading');
    const paths = asset?.sprites || { idle: './assets/favicon.svg' };
    const results = await Promise.allSettled(Object.entries(paths).map(async ([key, path]) => [key, await loadImage(path)]));
    if (version !== this.characterVersion) return;
    const loaded = Object.fromEntries(results.filter(r => r.status === 'fulfilled').map(r => r.value));
    if (!loaded.idle) loaded.idle = await loadImage('./assets/favicon.svg');
    if (version !== this.characterVersion) return;
    this.sprites = loaded; this.setState('ready');
  }
  setState(state) { this.state = state; this.callbacks.onState?.(state); }
  get current() { return this.platforms.find(p => p.id === this.currentId); }
  get next() { return this.platforms.find(p => p.id === this.currentId + 1); }
  desiredCamera() {
    const a = this.player || this.platforms[0], b = this.next || a;
    return { x: (a.x + b.x) / 2 - this.width * .49, y: (a.y + b.y) / 2 - this.height * .58 };
  }
  appendPlatform() {
    const last = this.platforms[this.platforms.length - 1];
    const direction = Math.random() < .48 ? -1 : 1;
    const distance = 145 + Math.random() * 57 + Math.min(this.jumps * 1.2, 20);
    this.platforms.push({ id: last.id + 1, x: last.x + distance * direction, y: last.y - distance * .52, width: 140 - Math.min(this.jumps * 1.1, 24) + Math.random() * 10, depth: 71 - Math.min(this.jumps * .55, 12), kind: (last.id + 1) % 4 });
  }
  beginCharge() {
    if (this.state !== 'ready') return false;
    this.charge = 0; this.chargeStart = performance.now(); this.setState('charging'); return true;
  }
  cancelCharge() {
    if (this.state !== 'charging') return;
    this.charge = 0; this.callbacks.onCharge?.(0); this.setState('ready');
  }
  release() {
    if (this.state !== 'charging') return;
    this.charge = Math.min(1, Math.max(0, (performance.now() - this.chargeStart) / RULES.chargeMs));
    const dx = this.next.x - this.player.x, dy = this.next.y - this.player.y;
    const length = Math.hypot(dx, dy), distance = jumpDistance(this.charge);
    this.flight = { start: { ...this.player }, end: { x: this.player.x + dx / length * distance, y: this.player.y + dy / length * distance }, t: 0, duration: .50 + this.charge * .16, height: 92 + this.charge * 60 };
    this.callbacks.onSound?.('jump'); this.charge = 0; this.callbacks.onCharge?.(0); this.setState('jumping');
  }
  land() {
    const point = this.player, target = this.next;
    if (containsPoint(target, point)) {
      const perfect = Math.hypot(point.x - target.x, (point.y - target.y) * 1.4) < RULES.perfectRadius;
      this.combo = perfect ? this.combo + 1 : 0;
      this.score += perfect ? Math.min(this.combo + 1, 6) : 1;
      this.perfectCount += Number(perfect); this.jumps++; this.currentId = target.id;
      // Preserve the actual landing location, so edge landings affect the following jump.
      this.player.z = 0; this.landingPulse = 1;
      this.callbacks.onScore?.(this.score, perfect, this.combo); this.callbacks.onSound?.(perfect ? 'perfect' : 'land');
      this.emitParticles(point.x, point.y, perfect ? 15 : 7);
      this.rings.push({ x: point.x, y: point.y, life: 1, perfect });
      this.appendPlatform(); this.platforms = this.platforms.filter(p => p.id >= this.currentId - 3);
      this.setState('ready');
    } else if (containsPoint(this.current, point)) {
      this.player.z = 0; this.landingPulse = .6; this.callbacks.onSound?.('land'); this.setState('ready');
    } else {
      this.callbacks.onSound?.('fall'); this.fall = { t: 0 }; this.setState('falling');
    }
    this.flight = null;
  }
  emitParticles(x, y, count) {
    if (this.reducedMotion.matches) return;
    for (let i = 0; i < count; i++) this.particles.push({ x, y, z: 9, vx: (Math.random() - .5) * 90, vy: (Math.random() - .5) * 40, vz: 40 + Math.random() * 80, life: 1, color: ['#e8edba', '#8da768', '#b9cf8f', '#fff6c4'][i % 4], size: 2 + Math.random() * 2 });
  }
  update(dt, now) {
    if (this.state === 'charging') {
      this.charge = Math.min((now - this.chargeStart) / RULES.chargeMs, 1); this.callbacks.onCharge?.(this.charge);
    }
    if (this.state === 'jumping') {
      const f = this.flight; f.t = Math.min(f.t + dt / f.duration, 1);
      this.player.x = lerp(f.start.x, f.end.x, f.t); this.player.y = lerp(f.start.y, f.end.y, f.t);
      this.player.z = Math.sin(Math.PI * f.t) * f.height;
      if (f.t === 1) this.land();
    }
    if (this.state === 'falling') {
      this.fall.t += dt; this.player.z = -Math.pow(this.fall.t * 21, 2);
      if (this.fall.t > .64) { this.setState('over'); this.callbacks.onEnd?.({ score: this.score, perfectCount: this.perfectCount, jumps: this.jumps }); }
    }
    if (this.state === 'ready' || this.state === 'charging' || this.state === 'loading') {
      const desired = this.desiredCamera(), factor = this.reducedMotion.matches ? 1 : 1 - Math.exp(-dt * 7);
      this.camera.x = lerp(this.camera.x, desired.x, factor); this.camera.y = lerp(this.camera.y, desired.y, factor);
    }
    this.landingPulse = Math.max(0, this.landingPulse - dt * 4);
    this.particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= 230 * dt; p.life -= dt * 1.3; });
    this.particles = this.particles.filter(p => p.life > 0);
    this.rings.forEach(r => r.life -= dt * 2); this.rings = this.rings.filter(r => r.life > 0);
  }
  buildBackground() {
    const w = this.width, h = this.height, bg = this.background;
    bg.width = Math.ceil(w * this.dpr); bg.height = Math.ceil(h * this.dpr);
    const c = bg.getContext('2d'); c.scale(this.dpr, this.dpr);
    const gradient = c.createLinearGradient(0, 0, w * .5, h); gradient.addColorStop(0, '#e7edde'); gradient.addColorStop(.55, '#eaf0e0'); gradient.addColorStop(1, '#dbe8d2');
    c.fillStyle = gradient; c.fillRect(0, 0, w, h);
    const glow = c.createRadialGradient(w * .6, h * .25, 0, w * .6, h * .25, w * .6);
    glow.addColorStop(0, '#ffffea99'); glow.addColorStop(1, '#ffffec00'); c.fillStyle = glow; c.fillRect(0, 0, w, h);
    ellipse(c, w * .74, h * .19, 37, 37, '#f6f7dd90');
    // Soft silhouettes, a little like layers of cut paper in the morning mist.
    const random = seeded(3254);
    for (let layer = 0; layer < 3; layer++) {
      c.fillStyle = ['#cfdcbb35', '#c1d2ae35', '#b6cba42b'][layer]; c.beginPath(); c.moveTo(0, h);
      for (let x = -100; x < w + 150; x += 100) { const y = h * (.34 + layer * .19) + random() * 65; c.quadraticCurveTo(x + 50, y - 55, x + 100, y); }
      c.lineTo(w, h); c.closePath(); c.fill();
    }
    // Slim background trees around the frame leave the playing area quiet.
    for (let i = 0; i < 17; i++) {
      const x = random() * w, y = h * (.2 + random() * .65);
      if (x > w * .16 && x < w * .83 && y > h * .3) continue;
      const size = 18 + random() * 35; this.drawTree(c, x, y, size, '#b6c9a735', '#aabb9338');
    }
    this.drawCornerPlant(c, -10, h + 18, 1.3, '#91b08140'); this.drawCornerPlant(c, w + 22, h + 30, -1.15, '#98b78b38');
    // Sparse texture stays fixed, instead of repainting random grain every frame.
    for (let i = 0; i < 800; i++) ellipse(c, random() * w, random() * h, .5, .5, '#6380520c');
    for (let i = 0; i < 14; i++) {
      const x = random() * w, y = random() * h;
      c.strokeStyle = '#8ba77929'; c.lineWidth = .7; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 3, y - 6, x + 10, y - 3); c.stroke();
    }
  }
  drawTree(c, x, y, size, foliage, trunk) {
    c.strokeStyle = trunk; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - size); c.stroke();
    ellipse(c, x - size * .2, y - size * .65, size * .35, size * .44, foliage);
    ellipse(c, x + size * .2, y - size * .72, size * .34, size * .47, foliage);
    ellipse(c, x, y - size, size * .33, size * .45, foliage);
  }
  drawCornerPlant(c, x, y, scale, color) {
    c.save(); c.translate(x, y); c.scale(scale, Math.abs(scale)); c.strokeStyle = color; c.fillStyle = color; c.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      c.save(); c.rotate(.13 + i * .23); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(42, -65, 13, -154 - i * 8); c.stroke();
      for (let j = 1; j < 5; j++) {
        const yy = -j * 28, xx = 15 + Math.sin(j / 4 * Math.PI) * 8;
        c.beginPath(); c.moveTo(xx, yy); c.quadraticCurveTo(xx - 39, yy - 3, xx - 29, yy - 30); c.quadraticCurveTo(xx - 3, yy - 24, xx, yy); c.fill();
        c.beginPath(); c.moveTo(xx, yy); c.quadraticCurveTo(xx + 35, yy - 6, xx + 28, yy - 30); c.quadraticCurveTo(xx + 1, yy - 24, xx, yy); c.fill();
      }
      c.restore();
    }
    c.restore();
  }
  draw() {
    const c = this.ctx; c.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    c.clearRect(0, 0, this.width, this.height); c.drawImage(this.background, 0, 0, this.width, this.height);
    if (!this.player) return;
    const camera = this.camera;
    // A pair of distant stepping stones suggests that the forest continues.
    const last = this.platforms[this.platforms.length - 1];
    c.save(); c.globalAlpha = .18; this.drawIsland(c, { ...last, x: last.x + 133, y: last.y - 78, width: 88, depth: 44, id: last.id + 1 }, camera); c.restore();
    const drawables = this.platforms.map(p => ({ y: p.y, type: 'platform', p }));
    drawables.push({ y: this.state === 'falling' ? this.player.y - 1 : this.current.y + 1, type: 'player' });
    drawables.sort((a, b) => a.y - b.y);
    for (const item of drawables) {
      if (item.type === 'platform') {
        c.save();
        if (item.p.id > this.currentId + 1) c.globalAlpha = .57;
        else if (item.p.id < this.currentId) c.globalAlpha = .6;
        this.drawIsland(c, item.p, camera); c.restore();
      } else this.drawPlayer(c, camera);
    }
    if (this.state === 'charging' && this.assist) this.drawAim(c, camera);
    for (const ring of this.rings) {
      c.save(); c.globalAlpha = ring.life; c.strokeStyle = ring.perfect ? '#fffad4' : '#e4f0cf'; c.lineWidth = 2;
      c.beginPath(); c.ellipse(ring.x - camera.x, ring.y - camera.y, (1 - ring.life) * 55 + 8, (1 - ring.life) * 24 + 4, 0, 0, Math.PI * 2); c.stroke(); c.restore();
    }
    for (const p of this.particles) { c.save(); c.globalAlpha = p.life; ellipse(c, p.x - camera.x, p.y - camera.y - p.z, p.size, p.size * .6, p.color); c.restore(); }
    if (!this.reducedMotion.matches) {
      // A few fireflies, no full-screen animated filter or canvas blur.
      for (let i = 0; i < 7; i++) {
        const x = (Math.sin(this.time * .12 + i * 4.3) * .39 + .5) * this.width;
        const y = (Math.cos(this.time * .16 + i * 3.1) * .31 + .5) * this.height;
        ellipse(c, x, y, 1.5, 1.5, `rgba(255,255,218,${.3 + Math.sin(this.time * 1.3 + i) * .22})`);
      }
    }
  }
  drawIsland(c, p, camera) {
    const x = p.x - camera.x, y = p.y - camera.y, w = p.width / 2, d = p.depth / 2;
    if (x < -150 || x > this.width + 150 || y > this.height + 150 || y < -160) return;
    const sinking = p.id === this.currentId && this.state === 'charging' ? this.charge * 6 : 0;
    c.save(); c.translate(x, y + sinking);
    const height = 50 + (p.kind || 0) * 5;
    ellipse(c, 6, height + 37, w * .85, 13, '#80996d0d');
    // Extruded faces with a mossy upper layer.
    polygon(c, [[-w, 0], [0, d], [0, d + height], [-w, height]], 6); c.fillStyle = '#b0b899'; c.fill();
    polygon(c, [[0, d], [w, 0], [w, height], [0, d + height]], 6); c.fillStyle = '#97a580'; c.fill();
    polygon(c, [[-w, 0], [0, d], [0, d + 9], [-w, 10]], 3); c.fillStyle = '#8da175'; c.fill();
    polygon(c, [[0, d], [w, 0], [w, 11], [0, d + 10]], 3); c.fillStyle = '#7f9668'; c.fill();
    const top = c.createLinearGradient(-w, -d, w, d); top.addColorStop(0, '#c3d49d'); top.addColorStop(.58, '#b6cc8f'); top.addColorStop(1, '#a8c080');
    polygon(c, [[0, -d], [w, 0], [0, d], [-w, 0]], 7); c.fillStyle = top; c.fill();
    c.strokeStyle = '#e0e8b977'; c.lineWidth = 1.5; c.stroke();
    // A subtle concentric patch gives the player a center without a bullseye.
    ellipse(c, 0, 0, 23, 10, '#dbe5b14a'); ellipse(c, 0, -1, 10, 4.4, '#e3eac143');
    const r = seeded(p.id * 217 + 50);
    for (let i = 0; i < 18; i++) {
      const xx = (r() - .5) * w * 1.5, yy = (r() - .5) * d * 1.5;
      if (Math.abs(xx) / w + Math.abs(yy) / d > .8) continue;
      c.strokeStyle = r() > .5 ? '#7f9b5c55' : '#dfe8b66b'; c.lineWidth = .8; c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx - 1, yy - 3); c.moveTo(xx, yy); c.lineTo(xx + 2, yy - 2); c.stroke();
    }
    // Fine cracks and little pebbles keep the side faces from looking plastic.
    c.strokeStyle = '#73845c24'; c.lineWidth = .8;
    c.beginPath(); c.moveTo(-w * .7, 25); c.lineTo(-w * .6, 39); c.lineTo(-w * .69, 49); c.moveTo(w * .65, 28); c.lineTo(w * .5, 46); c.stroke();
    ellipse(c, -w * .45, height * .8, 3, 1.5, '#c6ceb164');
    c.fillStyle = '#e8edce8a'; c.font = '9px ui-monospace, monospace'; c.textAlign = 'center';
    c.fillText(String(p.id + 1).padStart(2, '0'), -w * .3, d * .6 + height * .65);
    // Two kinds of little plants, kept out of the landing surface.
    if ((p.kind || 0) % 2 === 0) {
      const px = -w * .52, py = -d * .16;
      c.strokeStyle = '#708b54'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(px - 2, py - 12, px + 2, py - 22); c.stroke();
      this.leaf(c, px, py - 9, -1, '#829f62'); this.leaf(c, px + 1, py - 16, 1, '#91ac70');
    } else {
      const px = w * .53, py = -d * .08;
      c.fillStyle = '#eae4c4'; c.fillRect(px - 1, py - 10, 3, 10);
      c.beginPath(); c.ellipse(px, py - 10, 8, 5, 0, Math.PI, Math.PI * 2); c.closePath(); c.fillStyle = '#d7ac88'; c.fill();
      ellipse(c, px - 2, py - 12, 1.1, .7, '#f6edcd'); ellipse(c, px + 3, py - 11, 1, .6, '#f6edcd');
    }
    if (p.kind === 2) {
      c.strokeStyle = '#7d98676b'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(w * .7, 17); c.bezierCurveTo(w * .6, 31, w * .8, 38, w * .58, 54); c.stroke();
      this.leaf(c, w * .68, 28, 1, '#8fa676'); this.leaf(c, w * .67, 38, -1, '#8fa676');
    }
    // Tiny wildflower on the next island.
    if (p.id === this.currentId + 1) {
      const fx = -w * .24, fy = -d * .49; c.strokeStyle = '#8b9f65'; c.lineWidth = 1; c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx, fy - 10); c.stroke();
      for (let i = 0; i < 5; i++) ellipse(c, fx + Math.cos(i * 1.256) * 2.4, fy - 10 + Math.sin(i * 1.256) * 2, 2, 1.7, '#f6f1d8');
      ellipse(c, fx, fy - 10, 1.3, 1.3, '#d4bb76');
    }
    c.restore();
  }
  leaf(c, x, y, direction, color) {
    c.fillStyle = color; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + direction * 11, y + 2, x + direction * 12, y - 8); c.quadraticCurveTo(x + direction * 3, y - 9, x, y); c.fill();
  }
  drawPlayer(c, camera) {
    if (this.state === 'over') return;
    const x = this.player.x - camera.x, y = this.player.y - camera.y, z = this.player.z;
    c.save();
    if (this.state === 'falling') c.globalAlpha = Math.max(0, 1 - this.fall.t * 1.6);
    if (z >= 0) ellipse(c, x, y + 2, Math.max(8, 23 - z * .08), Math.max(3, 8 - z * .025), `rgba(60,79,44,${.16 - Math.min(z, 160) * .0006})`);
    const sprite = this.sprites[this.state === 'charging' ? 'charge' : this.state === 'jumping' ? 'jump' : this.state === 'falling' ? 'fall' : 'idle'] || this.sprites.idle;
    if (sprite) {
      const idle = this.reducedMotion.matches ? 0 : Math.sin(this.time * 2.8) * 1.1;
      const squash = this.state === 'charging' ? 1 - this.charge * .12 : 1 - this.landingPulse * .13;
      c.translate(x, y - z + (this.state === 'charging' ? this.charge * 6 : 0));
      c.scale(1 + (1 - squash) * .45, squash);
      const size = 118;
      c.drawImage(sprite, -size / 2, -size * (238 / 256) + idle, size, size);
    }
    c.restore();
  }
  drawAim(c, camera) {
    const dx = this.next.x - this.player.x, dy = this.next.y - this.player.y, len = Math.hypot(dx, dy);
    const distance = jumpDistance(this.charge);
    const x = this.player.x + dx / len * distance - camera.x, y = this.player.y + dy / len * distance - camera.y;
    const good = containsPoint(this.next, { x: x + camera.x, y: y + camera.y });
    c.save(); c.strokeStyle = good ? '#557b45bb' : '#73846577'; c.lineWidth = 1.2; c.setLineDash([3, 5]);
    c.beginPath(); c.moveTo(this.player.x - camera.x, this.player.y - camera.y); c.lineTo(x, y); c.stroke(); c.setLineDash([]);
    c.fillStyle = good ? '#faffdeaa' : '#faffef66'; c.beginPath(); c.ellipse(x, y, 14, 7, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(x - 5, y); c.lineTo(x + 5, y); c.moveTo(x, y - 3); c.lineTo(x, y + 3); c.stroke();
    c.fillStyle = '#6b8458'; c.font = '10px -apple-system, sans-serif'; c.textAlign = 'center'; c.fillText(good ? '这里刚刚好' : '预计落点', x, y + 24); c.restore();
  }
  snapshot() {
    return { state: this.state, score: this.score, combo: this.combo, jumps: this.jumps, charge: this.charge, player: { ...this.player }, target: { ...this.next }, current: { ...this.current }, camera: { ...this.camera }, view: { width: this.width, height: this.height }, sprites: Object.keys(this.sprites), perfectHoldMs: (Math.hypot(this.next.x - this.player.x, this.next.y - this.player.y) - RULES.minDistance) / RULES.distanceRange * RULES.chargeMs };
  }
}
