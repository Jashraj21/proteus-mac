/**
 * Interactive Schematic Canvas (Proteus ISIS Engine)
 * Features authentic Proteus blue border sheet, title block,
 * iconic red/blue/gray pin logic state squares, and the Overview Mini-Map.
 */

class SchematicCanvas {
  constructor(canvas, circuit) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.circuit = circuit;

    // View transform
    this.panX = 180;
    this.panY = 100;
    this.zoom = 1.0;

    // Interaction states
    this.selectedComponent = null;
    this.selectedWire = null;
    this.isDraggingComponent = false;
    this.dragStartX = 0;
    this.dragStartY = 0;

    // Panning state
    this.isPanning = false;
    this.panStartX = 0;
    this.panStartY = 0;

    // Wiring state
    this.wiringFrom = null; // { compId, pinId, x, y }
    this.mouseWorldPos = { x: 0, y: 0 };
    this.hoveredPin = null;

    // Grid mode: 'dots', 'lines', 'off'
    this.gridMode = 'dots';
    this.gridSize = 10;

    // Active tool/item to place onto canvas
    this.activePlacementItem = null;
    this.onCircuitChanged = null;
    this.onPlacementCancelled = null;
    this.onCoordUpdate = null; // Callback for status bar X/Y coordinates

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

  screenToWorld(sx, sy) {
    return {
      x: Math.round((sx - this.panX) / this.zoom),
      y: Math.round((sy - this.panY) / this.zoom)
    };
  }

  worldToScreen(wx, wy) {
    return {
      x: wx * this.zoom + this.panX,
      y: wy * this.zoom + this.panY
    };
  }

  snap(val) {
    return Math.round(val / this.gridSize) * this.gridSize;
  }

  setupListeners() {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'r' || e.key === 'R') {
        if (this.selectedComponent) {
          this.selectedComponent.rotate();
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.selectedComponent) {
          this.circuit.removeComponent(this.selectedComponent.id);
          this.selectedComponent = null;
          if (this.onCircuitChanged) this.onCircuitChanged();
        } else if (this.selectedWire) {
          this.circuit.removeWire(this.selectedWire.id);
          this.selectedWire = null;
          if (this.onCircuitChanged) this.onCircuitChanged();
        }
      } else if (e.key === 'Escape') {
        this.wiringFrom = null;
        this.activePlacementItem = null;
        if (typeof this.onPlacementCancelled === 'function') {
          this.onPlacementCancelled();
        }
      }
    });
  }

  findPinAt(wx, wy, threshold = 14) {
    for (const comp of this.circuit.components) {
      for (const pin of comp.pins) {
        const pPos = comp.getPinAbsolutePos(pin.id);
        const dist = Math.hypot(pPos.x - wx, pPos.y - wy);
        if (dist <= threshold) {
          return { comp, pin, pos: pPos };
        }
      }
    }
    return null;
  }

  findComponentAt(wx, wy) {
    for (let i = this.circuit.components.length - 1; i >= 0; i--) {
      const comp = this.circuit.components[i];
      let w = comp.width || 60;
      let h = comp.height || 40;
      if (comp.rotation === 90 || comp.rotation === 270) {
        const tmp = w; w = h; h = tmp;
      }
      if (Math.abs(wx - comp.x) <= w / 2 + 5 && Math.abs(wy - comp.y) <= h / 2 + 5) {
        return comp;
      }
    }
    return null;
  }

  placeActiveItem(wx, wy) {
    if (!this.activePlacementItem) return;
    let newComp = null;

    if (typeof this.activePlacementItem.create === 'function') {
      newComp = this.activePlacementItem.create(wx, wy);
    } else {
      const type = this.activePlacementItem.type || '';
      const name = this.activePlacementItem.name || 'DEV';

      if (type === 'terminal') {
        if (name === 'POWER') newComp = new Power5VComponent(wx, wy);
        else if (name === 'GROUND' || name === 'CHASSIS') newComp = new GroundComponent(wx, wy);
        else if (name === 'INPUT') newComp = new InputTerminalComponent(wx, wy, 'IN');
        else if (name === 'OUTPUT') newComp = new OutputTerminalComponent(wx, wy, 'OUT');
        else if (name === 'BIDIR') newComp = new BidirTerminalComponent(wx, wy, 'BUS');
        else newComp = new DefaultTerminalComponent(wx, wy, name);
      } else if (type === 'generator') {
        newComp = new GeneratorComponent(wx, wy, name);
      } else if (type === 'probe') {
        newComp = new ScopeProbeComponent(wx, wy, name === 'CURRENT' ? 'B' : 'A');
      } else if (type === 'instrument') {
        newComp = new InstrumentBlockComponent(wx, wy, name);
      } else if (type === 'graph') {
        newComp = new SimulationGraphComponent(wx, wy, name);
      } else if (type === 'junction') {
        newComp = new JunctionDotComponent(wx, wy);
      } else if (type === 'text') {
        newComp = new TextNoteComponent(wx, wy, this.activePlacementItem.text || name);
      } else if (type === 'bus') {
        newComp = new BusLineComponent(wx, wy, this.activePlacementItem.label || name);
      } else if (type === 'subcircuit') {
        newComp = new SubSheetComponent(wx, wy, name);
      } else if (type === 'graphics2d') {
        newComp = new Graphic2DComponent(wx, wy, name.toLowerCase().replace('2d ', ''));
      } else {
        newComp = new MCUComponent(wx, wy);
        newComp.device = name;
        newComp.name = name;
      }
    }

    if (newComp) {
      this.circuit.addComponent(newComp);
      this.selectedComponent = newComp;
      if (typeof this.onCircuitChanged === 'function') {
        this.onCircuitChanged();
      }
    }
  }

  onMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const wPos = this.screenToWorld(sx, sy);

    if (e.button === 1 || e.shiftKey || e.altKey) {
      this.isPanning = true;
      this.panStartX = sx - this.panX;
      this.panStartY = sy - this.panY;
      return;
    }

    if (e.button === 0) {
      // 0. Active Device/Terminal Placement from Left Bar
      if (this.activePlacementItem) {
        this.placeActiveItem(this.snap(wPos.x), this.snap(wPos.y));
        return;
      }

      // 1. Interactive clicks (Button, Switch, Potentiometer arrows)
      const hitComp = this.findComponentAt(wPos.x, wPos.y);
      if (hitComp) {
        if (hitComp.type === 'button') {
          hitComp.pressed = true;
          return;
        }
        if (hitComp.type === 'switch') {
          hitComp.closed = !hitComp.closed;
          return;
        }
        if (hitComp.type === 'potHG') {
          // Check if clicked the up or down arrows
          if (wPos.y < hitComp.y - 10) {
            hitComp.percentage = Math.min(100, hitComp.percentage + 5);
          } else if (wPos.y > hitComp.y + 10) {
            hitComp.percentage = Math.max(0, hitComp.percentage - 5);
          }
          return;
        }
      }

      // 2. Pin Click for Wiring
      const pinHit = this.findPinAt(wPos.x, wPos.y);
      if (pinHit) {
        if (!this.wiringFrom) {
          this.wiringFrom = {
            compId: pinHit.comp.id,
            pinId: pinHit.pin.id,
            x: pinHit.pos.x,
            y: pinHit.pos.y
          };
        } else {
          if (this.wiringFrom.compId !== pinHit.comp.id || this.wiringFrom.pinId !== pinHit.pin.id) {
            this.circuit.addWire(
              this.wiringFrom.compId,
              this.wiringFrom.pinId,
              pinHit.comp.id,
              pinHit.pin.id
            );
          }
          this.wiringFrom = null;
        }
        return;
      }

      if (this.wiringFrom) {
        this.wiringFrom = null;
        return;
      }

      // 3. Component Selection
      if (hitComp) {
        this.selectedComponent = hitComp;
        this.selectedWire = null;
        this.isDraggingComponent = true;
        this.dragStartX = wPos.x - hitComp.x;
        this.dragStartY = wPos.y - hitComp.y;
      } else {
        this.selectedComponent = null;
      }
    }
  }

  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (this.isPanning) {
      this.panX = sx - this.panStartX;
      this.panY = sy - this.panY;
      return;
    }

    const wPos = this.screenToWorld(sx, sy);
    this.mouseWorldPos = wPos;
    this.hoveredPin = this.findPinAt(wPos.x, wPos.y);

    if (this.onCoordUpdate) {
      this.onCoordUpdate(wPos.x * 10, wPos.y * 10);
    }

    if (this.isDraggingComponent && this.selectedComponent) {
      this.selectedComponent.x = this.snap(wPos.x - this.dragStartX);
      this.selectedComponent.y = this.snap(wPos.y - this.dragStartY);
    }
  }

  onMouseUp(e) {
    this.isPanning = false;
    this.isDraggingComponent = false;
    for (const c of this.circuit.components) {
      if (c.type === 'button') c.pressed = false;
    }
  }

  onWheel(e) {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(Math.max(this.zoom * zoomFactor, 0.4), 3.0);

    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    this.panX = mx - (mx - this.panX) * (newZoom / this.zoom);
    this.panY = my - (my - this.panY) * (newZoom / this.zoom);
    this.zoom = newZoom;
    this.onZoomChanged?.(this.zoom);
  }

  zoomIn() {
    const mx = this.canvas.width / 2;
    const my = this.canvas.height / 2;
    const newZoom = Math.min(3.0, this.zoom * 1.25);
    this.panX = mx - (mx - this.panX) * (newZoom / this.zoom);
    this.panY = my - (my - this.panY) * (newZoom / this.zoom);
    this.zoom = newZoom;
    this.onZoomChanged?.(this.zoom);
  }

  zoomOut() {
    const mx = this.canvas.width / 2;
    const my = this.canvas.height / 2;
    const newZoom = Math.max(0.4, this.zoom / 1.25);
    this.panX = mx - (mx - this.panX) * (newZoom / this.zoom);
    this.panY = my - (my - this.panY) * (newZoom / this.zoom);
    this.zoom = newZoom;
    this.onZoomChanged?.(this.zoom);
  }

  zoomAll() {
    this.zoom = 1.0;
    this.panX = 200;
    this.panY = 100;
    this.onZoomChanged?.(this.zoom);
  }

  panCenter() {
    this.panX = this.canvas.width / 2 - 500 * this.zoom;
    this.panY = this.canvas.height / 2 - 350 * this.zoom;
    this.onZoomChanged?.(this.zoom);
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Proteus ISIS Sheet Background
    ctx.fillStyle = '#080d16';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);

    // 1. Draw Proteus Blue Boundary Sheet & Title Block
    this.drawSheetBorder();

    // 2. Draw Grid
    this.drawGrid();

    // 3. Draw Wires
    this.drawWires();

    // 4. Draw Active Wire
    if (this.wiringFrom) {
      this.drawActiveWire();
    }

    // 5. Draw Components
    for (const comp of this.circuit.components) {
      this.drawComponent(comp);
    }

    // 6. Draw Pin Hover Ring
    if (this.hoveredPin) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.hoveredPin.pos.x, this.hoveredPin.pos.y, 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 7. Draw Placement Ghost Cursor
    if (this.activePlacementItem && this.mouseWorldPos) {
      const gx = this.snap(this.mouseWorldPos.x);
      const gy = this.snap(this.mouseWorldPos.y);
      ctx.save();
      ctx.translate(gx, gy);
      ctx.strokeStyle = '#0a84ff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(-28, -20, 56, 40);
      ctx.fillStyle = 'rgba(10, 132, 255, 0.18)';
      ctx.fillRect(-28, -20, 56, 40);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      const label = this.activePlacementItem.name || 'DEVICE';
      ctx.fillText(label.length > 12 ? label.substring(0, 10) + '..' : label, 0, 3);
      ctx.restore();
    }

    ctx.restore();
  }

  drawSheetBorder() {
    const ctx = this.ctx;
    // Standard Proteus A4 Sheet (1200 x 800)
    const sx = 0, sy = 0, sw = 1200, sh = 800;

    // Outer sheet border
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 3;
    ctx.strokeRect(sx, sy, sw, sh);

    // Inner sheet line
    ctx.strokeStyle = '#14273d';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx + 10, sy + 10, sw - 20, sh - 20);

    // Title Block in lower right
    const tbW = 280;
    const tbH = 70;
    const tbX = sw - tbW - 10;
    const tbY = sh - tbH - 10;

    ctx.fillStyle = '#0b1626';
    ctx.fillRect(tbX, tbY, tbW, tbH);
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tbX, tbY, tbW, tbH);

    // Divider lines
    ctx.beginPath();
    ctx.moveTo(tbX, tbY + 24); ctx.lineTo(tbX + tbW, tbY + 24);
    ctx.moveTo(tbX, tbY + 48); ctx.lineTo(tbX + tbW, tbY + 48);
    ctx.moveTo(tbX + 160, tbY + 24); ctx.lineTo(tbX + 160, tbY + tbH);
    ctx.stroke();

    // Title block text
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('PROTEUS 8 VSM - LABCENTER', tbX + 8, tbY + 16);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText('DESIGN: ATMEGA328P DEMO', tbX + 8, tbY + 38);
    ctx.fillText('REV: 1.0', tbX + 168, tbY + 38);
    ctx.fillText('SHEET: 1 OF 1', tbX + 8, tbY + 62);
    ctx.fillText('DATE: 2026-10-18', tbX + 168, tbY + 62);
  }

  drawGrid() {
    if (this.gridMode === 'off') return;
    const ctx = this.ctx;
    const step = 20;
    const minW = Math.max(0, Math.floor(-this.panX / this.zoom / step) * step);
    const maxW = Math.min(1200, Math.ceil((-this.panX + this.canvas.width) / this.zoom / step) * step);
    const minH = Math.max(0, Math.floor(-this.panY / this.zoom / step) * step);
    const maxH = Math.min(800, Math.ceil((-this.panY + this.canvas.height) / this.zoom / step) * step);

    ctx.fillStyle = '#172538';
    for (let x = minW; x <= maxW; x += step) {
      for (let y = minH; y <= maxH; y += step) {
        ctx.fillRect(x - 0.75, y - 0.75, 1.5, 1.5);
      }
    }
  }

  drawWires() {
    const ctx = this.ctx;
    for (const wire of this.circuit.wires) {
      const fromComp = this.circuit.getComponent(wire.fromCompId);
      const toComp = this.circuit.getComponent(wire.toCompId);
      if (!fromComp || !toComp) continue;

      const p1 = fromComp.getPinAbsolutePos(wire.fromPinId);
      const p2 = toComp.getPinAbsolutePos(wire.toPinId);
      const midX = p1.x + (p2.x - p1.x) * 0.5;

      const isHigh = wire.voltage > 2.5;
      ctx.strokeStyle = isHigh ? '#22c55e' : '#334155';
      ctx.lineWidth = isHigh ? 2.5 : 1.8;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(midX, p1.y);
      ctx.lineTo(midX, p2.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      // Junction dots
      ctx.fillStyle = isHigh ? '#4ade80' : '#475569';
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, 3, 0, Math.PI * 2);
      ctx.arc(p2.x, p2.y, 3, 0, Math.PI * 2);
      ctx.fill();

      // Current particle
      if (wire.hasCurrent && isHigh) {
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        const offset = (wire.flowOffset || 0) / 24;
        const partX = p1.x + (midX - p1.x) * offset;
        ctx.arc(partX, p1.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawActiveWire() {
    const ctx = this.ctx;
    const p1 = this.wiringFrom;
    const p2 = this.mouseWorldPos;
    const midX = p1.x + (p2.x - p1.x) * 0.5;

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(midX, p1.y);
    ctx.lineTo(midX, p2.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawComponent(comp) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(comp.x, comp.y);
    ctx.rotate((comp.rotation * Math.PI) / 180);
    if (comp.mirrorX || comp.mirrorY) {
      ctx.scale(comp.mirrorX ? -1 : 1, comp.mirrorY ? -1 : 1);
    }

    // Selected Halo
    if (this.selectedComponent === comp) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      const bw = (comp.width || 60) + 16;
      const bh = (comp.height || 40) + 16;
      ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
      ctx.setLineDash([]);
    }

    switch (comp.type) {
      case 'mcu': this.renderMCU(comp); break;
      case 'lcd16x2': this.renderLCD16x2(comp); break;
      case 'potHG': this.renderPotHG(comp); break;
      case 'led': this.renderLED(comp); break;
      case 'button': this.renderButton(comp); break;
      case 'switch': this.renderSwitch(comp); break;
      case 'sevenSegment': this.renderSevenSegment(comp); break;
      case 'buzzer': this.renderBuzzer(comp); break;
      case 'resistor': this.renderResistor(comp); break;
      case 'power5v': this.renderPower(comp); break;
      case 'ground': this.renderGround(comp); break;
      case 'scopeProbe': this.renderScopeProbe(comp); break;
      case 'defaultTerminal': this.renderDefaultTerminal(comp); break;
      case 'inputTerminal': this.renderInputTerminal(comp); break;
      case 'outputTerminal': this.renderOutputTerminal(comp); break;
      case 'bidirTerminal': this.renderBidirTerminal(comp); break;
      case 'generator': this.renderGenerator(comp); break;
      case 'instrumentBlock': this.renderInstrumentBlock(comp); break;
      case 'simulationGraph': this.renderSimulationGraph(comp); break;
      case 'junctionDot': this.renderJunctionDot(comp); break;
      case 'textNote': this.renderTextNote(comp); break;
      case 'busLine': this.renderBusLine(comp); break;
      case 'subSheet': this.renderSubSheet(comp); break;
      case 'graphic2D': this.renderGraphic2D(comp); break;
      default: this.renderGenericComponent(comp); break;
    }

    ctx.restore();

    // Render Pins AND the Iconic Proteus Logic State Dots!
    this.renderPinsAndLogicDots(comp);
  }

  renderMCU(comp) {
    const ctx = this.ctx;
    const w = comp.width;
    const h = comp.height;

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeRect(-w / 2, -h / 2, w, h);

    // IC Top Notch
    ctx.beginPath();
    ctx.arc(0, -h / 2, 10, 0, Math.PI);
    ctx.fillStyle = '#080d16';
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ATMEGA328P', 0, -20);
    ctx.font = '10px monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText('PROTEUS VSM', 0, 0);

    // Reference designator
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('U1', 0, 30);
  }

  renderLCD16x2(comp) {
    const ctx = this.ctx;
    const w = comp.width;
    const h = comp.height;

    // Dark bezel
    ctx.fillStyle = '#062817';
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeRect(-w / 2, -h / 2, w, h);

    // Yellow-green LCD display matrix
    const screenW = w - 30;
    const screenH = 50;
    ctx.fillStyle = '#8fad16';
    ctx.fillRect(-screenW / 2, -h / 2 + 15, screenW, screenH);
    ctx.strokeStyle = '#4d5e0b';
    ctx.strokeRect(-screenW / 2, -h / 2 + 15, screenW, screenH);

    // Dot matrix characters
    ctx.fillStyle = '#1a2203';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(comp.lines[0], -screenW / 2 + 10, -h / 2 + 35);
    ctx.fillText(comp.lines[1], -screenW / 2 + 10, -h / 2 + 52);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LM016L (16x2 LCD)', 0, h / 2 - 12);
  }

  renderPotHG(comp) {
    const ctx = this.ctx;
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(-25, -30, 50, 60);

    // Interactive clickable increment / decrement arrows
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.moveTo(0, -24); ctx.lineTo(-8, -14); ctx.lineTo(8, -14);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(0, 24); ctx.lineTo(-8, 14); ctx.lineTo(8, 14);
    ctx.closePath();
    ctx.fill();

    // Percentage value
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${comp.percentage}%`, 0, 4);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px monospace';
    ctx.fillText('POT-HG', 0, -36);
  }

  renderLED(comp) {
    const ctx = this.ctx;
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-25, 0); ctx.lineTo(-12, 0);
    ctx.moveTo(12, 0);  ctx.lineTo(25, 0);
    ctx.stroke();

    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(-12, -10); ctx.lineTo(10, 0); ctx.lineTo(-12, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(10, -10); ctx.lineTo(10, 10);
    ctx.stroke();

    // Glowing bulb
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    if (comp.state) {
      ctx.fillStyle = comp.color;
      ctx.shadowColor = comp.color;
      ctx.shadowBlur = 18;
      ctx.fill();
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#334155';
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(comp.device, 0, -14);
  }

  renderButton(comp) {
    const ctx = this.ctx;
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-22, 0); ctx.lineTo(-8, 0);
    ctx.moveTo(8, 0);   ctx.lineTo(22, 0);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(-8, 0, 2.5, 0, Math.PI * 2);
    ctx.arc(8, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();

    const barY = comp.pressed ? 0 : -8;
    ctx.strokeStyle = comp.pressed ? '#22c55e' : '#e2e8f0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-12, barY); ctx.lineTo(12, barY);
    ctx.moveTo(0, barY);   ctx.lineTo(0, barY - 10);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BUTTON', 0, -22);
  }

  renderSwitch(comp) {
    const ctx = this.ctx;
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-22, 0); ctx.lineTo(-8, 0);
    ctx.moveTo(8, 0);   ctx.lineTo(22, 0);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(-8, 0, 2.5, 0, Math.PI * 2);
    ctx.arc(8, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();

    const endY = comp.closed ? 0 : -12;
    ctx.strokeStyle = comp.closed ? '#22c55e' : '#f97316';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-8, 0); ctx.lineTo(8, endY);
    ctx.stroke();
  }

  renderSevenSegment(comp) {
    const ctx = this.ctx;
    const w = comp.width;
    const h = comp.height;

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeRect(-w / 2, -h / 2, w, h);

    const segs = {
      a: { x: 0, y: -30, w: 26, h: 6 },
      b: { x: 14, y: -16, w: 6, h: 22 },
      c: { x: 14, y: 14, w: 6, h: 22 },
      d: { x: 0, y: 28, w: 26, h: 6 },
      e: { x: -14, y: 14, w: 6, h: 22 },
      f: { x: -14, y: -16, w: 6, h: 22 },
      g: { x: 0, y: -1, w: 26, h: 6 }
    };

    for (const [key, s] of Object.entries(segs)) {
      const lit = comp.segments[key];
      ctx.fillStyle = lit ? '#ef4444' : '#1e293b';
      if (lit) {
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;
      }
      ctx.fillRect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h);
      ctx.shadowBlur = 0;
    }
  }

  renderBuzzer(comp) {
    const ctx = this.ctx;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (comp.active) {
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 26, -Math.PI / 4, Math.PI / 4);
      ctx.arc(0, 0, 32, -Math.PI / 4, Math.PI / 4);
      ctx.stroke();
    }
  }

  renderResistor(comp) {
    const ctx = this.ctx;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-25, 0); ctx.lineTo(-18, 0);
    ctx.lineTo(-14, -7); ctx.lineTo(-7, 7);
    ctx.lineTo(0, -7);   ctx.lineTo(7, 7);
    ctx.lineTo(14, -7);  ctx.lineTo(18, 0);
    ctx.lineTo(25, 0);
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(comp.value, 0, -12);
  }

  renderPower(comp) {
    const ctx = this.ctx;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 15); ctx.lineTo(0, 0);
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('+5V', 0, -8);
  }

  renderGround(comp) {
    const ctx = this.ctx;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -15); ctx.lineTo(0, 0);
    ctx.moveTo(-12, 0); ctx.lineTo(12, 0);
    ctx.moveTo(-8, 4);  ctx.lineTo(8, 4);
    ctx.moveTo(-4, 8);  ctx.lineTo(4, 8);
    ctx.stroke();
  }

  renderScopeProbe(comp) {
    const ctx = this.ctx;
    const color = comp.channel === 'A' ? '#facc15' : '#38bdf8';
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(-18, 0); ctx.lineTo(0, 0);
    ctx.lineTo(10, -6); ctx.lineTo(10, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`CH${comp.channel}`, 14, 3);
  }

  // The Signature Proteus Feature: Red/Blue/Gray Pin Logic State Dots!
  renderPinsAndLogicDots(comp) {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = '9px "JetBrains Mono", monospace';

    for (const pin of comp.pins) {
      const p = comp.getPinAbsolutePos(pin.id);

      // 1. Draw Proteus Logic State Square
      const lState = pin.logicState || 'FLOAT';
      let dotColor = '#64748b'; // Gray for floating
      if (lState === 'HIGH') dotColor = '#ef4444'; // Red for HIGH
      else if (lState === 'LOW') dotColor = '#2563eb'; // Blue for LOW

      ctx.fillStyle = dotColor;
      ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      ctx.strokeRect(p.x - 3, p.y - 3, 6, 6);

      // Center bright pixel
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(p.x - 0.5, p.y - 0.5, 1, 1);

      // 2. Pin Name Labels
      if (comp.type === 'mcu') {
        ctx.fillStyle = '#94a3b8';
        if (pin.relX < 0) {
          ctx.textAlign = 'left';
          ctx.fillText(pin.name, comp.x - 75, p.y + 3);
        } else {
          ctx.textAlign = 'right';
          ctx.fillText(pin.name, comp.x + 75, p.y + 3);
        }
      } else if (comp.type === 'lcd16x2') {
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'center';
        ctx.fillText(pin.name, p.x, comp.y + 50);
      }
    }
    ctx.restore();
  }

  renderDefaultTerminal(comp) {
    const ctx = this.ctx;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-15, 0); ctx.lineTo(15, 0);
    ctx.moveTo(15, -6); ctx.lineTo(15, 6);
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(comp.name, 0, -8);
  }

  renderInputTerminal(comp) {
    const ctx = this.ctx;
    ctx.strokeStyle = '#22c55e';
    ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-16, -8); ctx.lineTo(6, -8); ctx.lineTo(16, 0); ctx.lineTo(6, 8); ctx.lineTo(-16, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(comp.name, -2, 3);
  }

  renderOutputTerminal(comp) {
    const ctx = this.ctx;
    ctx.strokeStyle = '#f59e0b';
    ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-16, 0); ctx.lineTo(-6, -8); ctx.lineTo(16, -8); ctx.lineTo(16, 8); ctx.lineTo(-6, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(comp.name, 4, 3);
  }

  renderBidirTerminal(comp) {
    const ctx = this.ctx;
    ctx.strokeStyle = '#a855f7';
    ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-16, 0); ctx.lineTo(-8, -9); ctx.lineTo(8, -9); ctx.lineTo(16, 0); ctx.lineTo(8, 9); ctx.lineTo(-8, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(comp.name, 0, 3);
  }

  renderGenerator(comp) {
    const ctx = this.ctx;
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (comp.genType === 'SINE' || comp.genType === 'AUDIO' || comp.genType === 'SFFM') {
      ctx.moveTo(-10, 0);
      ctx.bezierCurveTo(-5, -10, -5, 10, 0, 0);
      ctx.bezierCurveTo(5, -10, 5, 10, 10, 0);
    } else if (comp.genType === 'DC') {
      ctx.moveTo(-10, -3); ctx.lineTo(10, -3);
      ctx.moveTo(-10, 3); ctx.lineTo(10, 3);
    } else {
      ctx.moveTo(-10, 5); ctx.lineTo(-5, 5); ctx.lineTo(-5, -5); ctx.lineTo(5, -5); ctx.lineTo(5, 5); ctx.lineTo(10, 5);
    }
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(comp.genType, 0, 28);
  }

  renderInstrumentBlock(comp) {
    const ctx = this.ctx;
    const w = comp.width;
    const h = comp.height;
    ctx.fillStyle = '#0a192f';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeRect(-w / 2, -h / 2, w, h);

    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1;
    ctx.strokeRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(comp.instName, 0, -5);

    ctx.fillStyle = '#22c55e';
    ctx.font = '8px monospace';
    ctx.fillText('LIVE VSM ACTIVE', 0, 12);
  }

  renderSimulationGraph(comp) {
    const ctx = this.ctx;
    const w = comp.width;
    const h = comp.height;
    ctx.fillStyle = '#051329';
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeRect(-w / 2, -h / 2, w, h);

    ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
    ctx.lineWidth = 1;
    for (let x = -w / 2 + 10; x < w / 2; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, -h / 2); ctx.lineTo(x, h / 2); ctx.stroke();
    }
    for (let y = -h / 2 + 10; y < h / 2; y += 15) {
      ctx.beginPath(); ctx.moveTo(-w / 2, y); ctx.lineTo(w / 2, y); ctx.stroke();
    }

    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 10, 10);
    for (let i = -w / 2 + 10; i < w / 2 - 10; i += 10) {
      ctx.lineTo(i, Math.sin(i * 0.08) * 20);
    }
    ctx.stroke();

    ctx.fillStyle = '#6ee7b7';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`GRAPH: ${comp.graphType}`, -w / 2 + 6, -h / 2 + 12);
  }

  renderJunctionDot(comp) {
    const ctx = this.ctx;
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  renderTextNote(comp) {
    const ctx = this.ctx;
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(comp.text, 0, 4);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.strokeRect(-comp.width / 2, -comp.height / 2, comp.width, comp.height);
    ctx.setLineDash([]);
  }

  renderBusLine(comp) {
    const ctx = this.ctx;
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-comp.width / 2, 0); ctx.lineTo(comp.width / 2, 0);
    ctx.stroke();

    ctx.fillStyle = '#93c5fd';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(comp.label, 0, -8);
  }

  renderSubSheet(comp) {
    const ctx = this.ctx;
    const w = comp.width;
    const h = comp.height;
    ctx.fillStyle = '#1e1b4b';
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 2;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeRect(-w / 2, -h / 2, w, h);

    ctx.fillStyle = '#c7d2fe';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(comp.device, 0, 0);
  }

  renderGraphic2D(comp) {
    const ctx = this.ctx;
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    if (comp.shapeType === 'circle') {
      ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.stroke();
    } else if (comp.shapeType === 'line') {
      ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(30, 0); ctx.stroke();
    } else {
      ctx.strokeRect(-30, -20, 60, 40);
    }
  }

  renderGenericComponent(comp) {
    const ctx = this.ctx;
    const w = comp.width || 80;
    const h = comp.height || 50;
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeRect(-w / 2, -h / 2, w, h);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(comp.name || comp.device || 'DEV', 0, 4);
  }

  // Draw the Symbol Preview or Camera Overview Mini-Map in top-left sidebar
  updateOverview(miniCanvas) {
    if (!miniCanvas) return;
    const mctx = miniCanvas.getContext('2d');
    const mw = miniCanvas.width;
    const mh = miniCanvas.height;

    // If an item is active from the Left Mode Bar, draw the iconic Proteus Symbol Preview!
    if (this.activePlacementItem) {
      this.drawSymbolPreview(mctx, mw, mh, this.activePlacementItem);
      return;
    }

    mctx.fillStyle = '#061321';
    mctx.fillRect(0, 0, mw, mh);

    // Sheet boundary (1200x800) scaled to mini-map
    const scale = mw / 1200;
    const shH = 800 * scale;

    mctx.strokeStyle = '#1e3a5f';
    mctx.lineWidth = 1;
    mctx.strokeRect(0, 0, mw, shH);

    // Draw tiny components
    mctx.fillStyle = '#38bdf8';
    for (const c of this.circuit.components) {
      mctx.fillRect(c.x * scale - 2, c.y * scale - 2, 4, 4);
    }

    // Draw current camera viewport in green
    const camX = (-this.panX / this.zoom) * scale;
    const camY = (-this.panY / this.zoom) * scale;
    const camW = (this.canvas.width / this.zoom) * scale;
    const camH = (this.canvas.height / this.zoom) * scale;

    mctx.strokeStyle = '#22c55e';
    mctx.lineWidth = 1.5;
    mctx.strokeRect(camX, camY, camW, camH);
  }

  drawSymbolPreview(mctx, mw, mh, item) {
    mctx.fillStyle = '#040914';
    mctx.fillRect(0, 0, mw, mh);

    // Technical grid
    mctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    mctx.lineWidth = 1;
    for (let x = 0; x < mw; x += 15) {
      mctx.beginPath(); mctx.moveTo(x, 0); mctx.lineTo(x, mh); mctx.stroke();
    }
    for (let y = 0; y < mh; y += 15) {
      mctx.beginPath(); mctx.moveTo(0, y); mctx.lineTo(mw, y); mctx.stroke();
    }

    const cx = mw / 2;
    const cy = mh / 2 - 4;

    // Draw component box
    const boxW = Math.min(mw - 50, 110);
    const boxH = Math.min(mh - 36, 46);
    mctx.fillStyle = 'rgba(10, 132, 255, 0.12)';
    mctx.strokeStyle = '#0a84ff';
    mctx.lineWidth = 1.5;
    mctx.fillRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);
    mctx.strokeRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);

    // Left and right pin leads
    mctx.strokeStyle = '#38bdf8';
    mctx.lineWidth = 1.5;
    mctx.beginPath();
    mctx.moveTo(cx - boxW / 2 - 14, cy - 8); mctx.lineTo(cx - boxW / 2, cy - 8);
    mctx.moveTo(cx - boxW / 2 - 14, cy + 8); mctx.lineTo(cx - boxW / 2, cy + 8);
    mctx.moveTo(cx + boxW / 2, cy - 8); mctx.lineTo(cx + boxW / 2 + 14, cy - 8);
    mctx.moveTo(cx + boxW / 2, cy + 8); mctx.lineTo(cx + boxW / 2 + 14, cy + 8);
    mctx.stroke();

    // Logic pin dots
    mctx.fillStyle = '#ef4444';
    mctx.fillRect(cx - boxW / 2 - 16, cy - 10, 4, 4);
    mctx.fillStyle = '#2563eb';
    mctx.fillRect(cx + boxW / 2 + 12, cy + 6, 4, 4);

    // Device Title
    mctx.fillStyle = '#ffffff';
    mctx.font = 'bold 11px monospace';
    mctx.textAlign = 'center';
    const displayName = item.name.length > 15 ? item.name.substring(0, 14) + '…' : item.name;
    mctx.fillText(displayName, cx, cy + 4);

    // Subtitle Badge
    mctx.fillStyle = '#64748b';
    mctx.font = '8px monospace';
    mctx.fillText(item.desc || item.type || 'CLICK CANVAS TO PLACE', cx, mh - 6);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SchematicCanvas };
}
