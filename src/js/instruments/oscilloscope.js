/**
 * Dual-Channel Digital Oscilloscope Virtual Instrument
 * Renders an authentic CRT phosphor-graticule oscilloscope with live waveforms.
 */

class Oscilloscope {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.bufferSize = 300;
    this.bufferA = new Float32Array(this.bufferSize);
    this.bufferB = new Float32Array(this.bufferSize);
    this.writeIndex = 0;

    // Controls
    this.voltsPerDivA = 1.0; // 1V, 2V, 5V
    this.voltsPerDivB = 1.0;
    this.timebaseMs = 20;    // ms per div
    this.chAEnabled = true;
    this.chBEnabled = true;
    this.isPaused = false;

    this.sampleCounter = 0;
  }

  pushSample(valA, valB) {
    if (this.isPaused) return;

    this.bufferA[this.writeIndex] = valA;
    this.bufferB[this.writeIndex] = valB;
    this.writeIndex = (this.writeIndex + 1) % this.bufferSize;
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = '#060d0b';
    ctx.fillRect(0, 0, w, h);

    // Draw Graticule (Grid)
    ctx.strokeStyle = '#0e2e22';
    ctx.lineWidth = 1;
    ctx.beginPath();

    const xDivs = 10;
    const yDivs = 8;
    const dx = w / xDivs;
    const dy = h / yDivs;

    for (let x = 0; x <= w; x += dx) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += dy) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    // Center Crosshair Axis
    ctx.strokeStyle = '#1d5440';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();

    // Draw Channel A Waveform (Yellow)
    if (this.chAEnabled) {
      this.drawTrace(this.bufferA, '#facc15', 'rgba(250, 204, 21, 0.25)', this.voltsPerDivA, h * 0.45);
    }

    // Draw Channel B Waveform (Cyan)
    if (this.chBEnabled) {
      this.drawTrace(this.bufferB, '#38bdf8', 'rgba(56, 189, 248, 0.25)', this.voltsPerDivB, h * 0.75);
    }

    // Draw Overlay Labels
    ctx.fillStyle = '#facc15';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillText(`CH A: ${this.voltsPerDivA.toFixed(1)}V/div`, 10, 20);

    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`CH B: ${this.voltsPerDivB.toFixed(1)}V/div`, 120, 20);

    ctx.fillStyle = '#34d399';
    ctx.fillText(`TIME: ${this.timebaseMs}ms/div`, 230, 20);

    if (this.isPaused) {
      ctx.fillStyle = '#ef4444';
      ctx.fillText('[HOLD]', w - 60, 20);
    }
  }

  drawTrace(buffer, strokeColor, glowColor, voltsPerDiv, groundY) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    const dy = h / 8; // Height per division
    const scale = dy / voltsPerDiv; // pixels per volt

    ctx.save();
    ctx.shadowColor = strokeColor;
    ctx.shadowBlur = 6;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.beginPath();

    const n = this.bufferSize;
    for (let i = 0; i < n; i++) {
      const idx = (this.writeIndex + i) % n;
      const val = buffer[idx];
      const x = (i / (n - 1)) * w;
      const y = groundY - (val * scale);

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.stroke();
    ctx.restore();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Oscilloscope };
}
