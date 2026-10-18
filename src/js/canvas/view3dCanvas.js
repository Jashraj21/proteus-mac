/**
 * Proteus 3D Board Visualizer
 * Renders an interactive 3D perspective of the populated PCB with ICs, LEDs, and traces.
 */

class View3DCanvas {
  constructor(canvas, circuit) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.circuit = circuit;

    this.angleX = 45; // Elevation
    this.angleZ = -30; // Azimuth
    this.isOrbiting = false;
    this.startX = 0;
    this.startY = 0;

    this.setupListeners();
    this.resize();
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (parent) {
      this.canvas.width = parent.clientWidth;
      this.canvas.height = parent.clientHeight;
    }
  }

  setupListeners() {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousedown', (e) => {
      this.isOrbiting = true;
      this.startX = e.clientX;
      this.startY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isOrbiting) return;
      const dx = e.clientX - this.startX;
      const dy = e.clientY - this.startY;
      this.angleZ += dx * 0.5;
      this.angleX = Math.max(15, Math.min(80, this.angleX + dy * 0.5));
      this.startX = e.clientX;
      this.startY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.isOrbiting = false;
    });
  }

  project(x, y, z) {
    const radZ = (this.angleZ * Math.PI) / 180;
    const radX = (this.angleX * Math.PI) / 180;

    // Rotate around Z axis
    const x1 = x * Math.cos(radZ) - y * Math.sin(radZ);
    const y1 = x * Math.sin(radZ) + y * Math.cos(radZ);

    // Rotate around X axis (tilt)
    const y2 = y1 * Math.sin(radX) - z * Math.cos(radX);

    const scale = 0.85;
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2 + 40;

    return {
      x: cx + x1 * scale,
      y: cy + y2 * scale
    };
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Studio dark background with subtle vignette
    const grad = ctx.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, w * 0.7);
    grad.addColorStop(0, '#111827');
    grad.addColorStop(1, '#030712');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // PCB Board Dimensions centered at 0,0
    const bw = 500, bh = 340, bThickness = 12;

    // 1. Draw 3D Board Sides (Fiberglass Core)
    const pBL = this.project(-bw / 2, bh / 2, 0);
    const pBR = this.project(bw / 2, bh / 2, 0);
    const pBL_bot = this.project(-bw / 2, bh / 2, -bThickness);
    const pBR_bot = this.project(bw / 2, bh / 2, -bThickness);

    ctx.fillStyle = '#0f291e';
    ctx.beginPath();
    ctx.moveTo(pBL.x, pBL.y);
    ctx.lineTo(pBR.x, pBR.y);
    ctx.lineTo(pBR_bot.x, pBR_bot.y);
    ctx.lineTo(pBL_bot.x, pBL_bot.y);
    ctx.closePath();
    ctx.fill();

    // 2. Draw Top Board Surface (FR4 Green Soldermask)
    const p1 = this.project(-bw / 2, -bh / 2, 0);
    const p2 = this.project(bw / 2, -bh / 2, 0);
    const p3 = this.project(bw / 2, bh / 2, 0);
    const p4 = this.project(-bw / 2, bh / 2, 0);

    ctx.fillStyle = '#0d3822';
    ctx.strokeStyle = '#ffd60a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Draw 3D Components
    for (const comp of this.circuit.components) {
      const cx = comp.x - 380;
      const cy = comp.y - 240;

      if (comp.type === 'mcu') {
        this.draw3DIC(cx, cy, 140, 70, 20);
      } else if (comp.type === 'led') {
        this.draw3DLED(cx, cy, comp.color, comp.state);
      } else if (comp.type === 'lcd16x2') {
        this.draw3DLCD(cx, cy);
      } else if (comp.type === 'sevenSegment') {
        this.draw3DSevenSeg(cx, cy);
      }
    }

    // Overlay hint
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🖱 Drag to orbit in 3D', 20, h - 20);
  }

  draw3DIC(x, y, w, h, thickness) {
    const ctx = this.ctx;
    const top1 = this.project(x - w / 2, y - h / 2, thickness);
    const top2 = this.project(x + w / 2, y - h / 2, thickness);
    const top3 = this.project(x + w / 2, y + h / 2, thickness);
    const top4 = this.project(x - w / 2, y + h / 2, thickness);

    // IC Body (Black epoxy)
    ctx.fillStyle = '#111827';
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(top1.x, top1.y);
    ctx.lineTo(top2.x, top2.y);
    ctx.lineTo(top3.x, top3.y);
    ctx.lineTo(top4.x, top4.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // IC Laser Engraving
    const pCenter = this.project(x, y, thickness);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ATMEGA328P', pCenter.x, pCenter.y);
  }

  draw3DLED(x, y, color, isLit) {
    const ctx = this.ctx;
    const pBase = this.project(x, y, 0);
    const pTop = this.project(x, y, 22);

    ctx.save();
    ctx.beginPath();
    ctx.arc(pTop.x, pTop.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = isLit ? color : '#334155';
    if (isLit) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 24;
    }
    ctx.fill();
    ctx.restore();
  }

  draw3DLCD(x, y) {
    const ctx = this.ctx;
    const w = 200, h = 90, thick = 14;
    const p1 = this.project(x - w / 2, y - h / 2, thick);
    const p2 = this.project(x + w / 2, y - h / 2, thick);
    const p3 = this.project(x + w / 2, y + h / 2, thick);
    const p4 = this.project(x - w / 2, y + h / 2, thick);

    ctx.fillStyle = '#064e3b';
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
    ctx.closePath();
    ctx.fill();

    // Yellow screen
    const pCenter = this.project(x, y, thick);
    ctx.fillStyle = '#84cc16';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[ 16x2 LCD MODULE ]', pCenter.x, pCenter.y);
  }

  draw3DSevenSeg(x, y) {
    const ctx = this.ctx;
    const pCenter = this.project(x, y, 16);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(pCenter.x - 25, pCenter.y - 35, 50, 70);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('8', pCenter.x, pCenter.y + 6);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { View3DCanvas };
}
