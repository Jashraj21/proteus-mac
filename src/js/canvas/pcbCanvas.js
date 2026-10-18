/**
 * Proteus ARES PCB Layout Engine
 * Renders authentic dark green soldermask, copper traces, pads, silkscreen, and vias.
 */

class PCBCanvas {
  constructor(canvas, circuit) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.circuit = circuit;

    this.panX = 160;
    this.panY = 100;
    this.zoom = 1.0;
    this.isPanning = false;
    this.panStartX = 0;
    this.panStartY = 0;

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
      this.isPanning = true;
      this.panStartX = e.clientX - this.panX;
      this.panStartY = e.clientY - this.panY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPanning) return;
      this.panX = e.clientX - this.panStartX;
      this.panY = e.clientY - this.panStartY;
    });

    window.addEventListener('mouseup', () => {
      this.isPanning = false;
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      this.zoom = Math.min(Math.max(this.zoom * factor, 0.4), 3.0);
    }, { passive: false });
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // ARES Soldermask Background (Dark PCB Green)
    ctx.fillStyle = '#06160e';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);

    // Board Outline (Edge.Cuts)
    const bw = 900, bh = 600;
    ctx.fillStyle = '#0a2316';
    ctx.fillRect(0, 0, bw, bh);
    ctx.strokeStyle = '#ffd60a'; // Board edge outline
    ctx.lineWidth = 2.5;
    ctx.strokeRect(0, 0, bw, bh);

    // Grid dots
    ctx.fillStyle = '#113522';
    for (let x = 20; x < bw; x += 20) {
      for (let y = 20; y < bh; y += 20) {
        ctx.fillRect(x - 0.75, y - 0.75, 1.5, 1.5);
      }
    }

    // Draw Copper Traces
    for (const wire of this.circuit.wires) {
      const c1 = this.circuit.getComponent(wire.fromCompId);
      const c2 = this.circuit.getComponent(wire.toCompId);
      if (!c1 || !c2) continue;

      const p1 = c1.getPinAbsolutePos(wire.fromPinId);
      const p2 = c2.getPinAbsolutePos(wire.toPinId);
      const midX = (p1.x + p2.x) / 2;

      // Top Copper (Reddish Gold)
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(midX, p1.y);
      ctx.lineTo(midX, p2.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    // Draw Component Footprints
    for (const comp of this.circuit.components) {
      this.drawFootprint(comp);
    }

    ctx.restore();
  }

  drawFootprint(comp) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(comp.x, comp.y);

    // Silkscreen outline (Crisp White)
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1.5;

    const fw = comp.width || 60;
    const fh = comp.height || 40;

    // Component Body Silkscreen
    ctx.strokeRect(-fw / 2, -fh / 2, fw, fh);

    // Silkscreen Label
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(comp.name || comp.device, 0, 4);

    // Solder Pads with gold annular rings
    for (const pin of comp.pins) {
      const px = pin.relX;
      const py = pin.relY;

      // Outer copper ring
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();

      // Inner drill hole
      ctx.fillStyle = '#06160e';
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PCBCanvas };
}
