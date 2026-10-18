/**
 * Circuit Netlist Solver & Logic State Engine
 * Resolves electrical nets and drives the iconic Proteus logic pin state dots:
 * RED (HIGH / 5V), BLUE (LOW / 0V), SLATE GRAY (FLOATING / Hi-Z).
 */

class Circuit {
  constructor(mcu) {
    this.mcu = mcu;
    this.components = [];
    this.wires = [];
    this.wireIdCounter = 1;
  }

  clear() {
    this.components = [];
    this.wires = [];
    this.mcu.reset();
  }

  addComponent(component) {
    this.components.push(component);
    return component;
  }

  removeComponent(compId) {
    this.components = this.components.filter(c => c.id !== compId);
    this.wires = this.wires.filter(w => w.fromCompId !== compId && w.toCompId !== compId);
  }

  addWire(fromCompId, fromPinId, toCompId, toPinId, waypoints = []) {
    const exists = this.wires.some(w => 
      (w.fromCompId === fromCompId && w.fromPinId === fromPinId && w.toCompId === toCompId && w.toPinId === toPinId) ||
      (w.fromCompId === toCompId && w.fromPinId === toPinId && w.toCompId === fromCompId && w.toPinId === fromPinId)
    );
    if (exists) return null;

    const wire = {
      id: `w_${this.wireIdCounter++}`,
      fromCompId,
      fromPinId,
      toCompId,
      toPinId,
      waypoints: waypoints || [],
      voltage: 0.0,
      logicState: 'FLOAT',
      hasCurrent: false,
      flowOffset: 0
    };
    this.wires.push(wire);
    return wire;
  }

  removeWire(wireId) {
    this.wires = this.wires.filter(w => w.id !== wireId);
  }

  getComponent(id) {
    return this.components.find(c => c.id === id);
  }

  buildNets() {
    const pinKey = (compId, pinId) => `${compId}:${pinId}`;
    const adj = new Map();

    const addEdge = (p1, p2) => {
      if (!adj.has(p1)) adj.set(p1, []);
      if (!adj.has(p2)) adj.set(p2, []);
      adj.get(p1).push(p2);
      adj.get(p2).push(p1);
    };

    for (const w of this.wires) {
      addEdge(pinKey(w.fromCompId, w.fromPinId), pinKey(w.toCompId, w.toPinId));
    }

    // Switches and buttons
    for (const c of this.components) {
      if ((c.type === 'button' && c.pressed) || (c.type === 'switch' && c.closed)) {
        addEdge(pinKey(c.id, 'p1'), pinKey(c.id, 'p2'));
      }
      if (c.type === 'resistor') {
        addEdge(pinKey(c.id, 'p1'), pinKey(c.id, 'p2'));
      }
    }

    const visited = new Set();
    const nets = [];

    for (const [startPin] of adj) {
      if (!visited.has(startPin)) {
        const netPins = [];
        const queue = [startPin];
        visited.add(startPin);

        while (queue.length > 0) {
          const curr = queue.shift();
          netPins.push(curr);
          const neighbors = adj.get(curr) || [];
          for (const n of neighbors) {
            if (!visited.has(n)) {
              visited.add(n);
              queue.push(n);
            }
          }
        }
        nets.push(netPins);
      }
    }

    return nets;
  }

  update(scopeDataCallback) {
    // Reset all pins to floating initially
    for (const comp of this.components) {
      for (const pin of comp.pins) {
        pin.logicState = 'FLOAT';
      }
    }

    const nets = this.buildNets();
    const netVoltageMap = new Map();

    for (let netIndex = 0; netIndex < nets.length; netIndex++) {
      const netPins = nets[netIndex];
      let hasVCC = false;
      let hasGND = false;
      let mcuDriverHigh = false;
      let mcuDriverLow = false;

      for (const p of netPins) {
        const [compId, pinId] = p.split(':');
        const comp = this.getComponent(compId);
        if (!comp) continue;

        if (comp.type === 'power5v' && pinId === 'out') hasVCC = true;
        if (comp.type === 'ground' && pinId === 'gnd') hasGND = true;
        if (comp.type === 'mcu') {
          if (pinId === 'VCC') hasVCC = true;
          if (pinId === 'GND') hasGND = true;
          if (pinId.startsWith('PA')) {
            const pinNum = parseInt(pinId.replace('PA', ''), 10);
            if (this.mcu.getOutputPin('A', pinNum) === 1) mcuDriverHigh = true;
            else mcuDriverLow = true;
          }
          if (pinId === 'TX') mcuDriverHigh = true;
        }
      }

      let v = 0.0;
      let lState = 'FLOAT';

      if (hasVCC || mcuDriverHigh) {
        v = 5.0;
        lState = 'HIGH';
      } else if (hasGND || mcuDriverLow) {
        v = 0.0;
        lState = 'LOW';
      }

      netVoltageMap.set(netIndex, { v, lState });

      // Apply logic states to all pins in this net
      for (const p of netPins) {
        const [compId, pinId] = p.split(':');
        const comp = this.getComponent(compId);
        if (comp) {
          const pin = comp.pins.find(pn => pn.id === pinId);
          if (pin) pin.logicState = lState;

          // Propagate to MCU inputs
          if (comp.type === 'mcu' && pinId.startsWith('PB')) {
            const pinNum = parseInt(pinId.replace('PB', ''), 10);
            this.mcu.setExternalPin('B', pinNum, v > 2.5 ? 1 : 0);
          }
        }
      }
    }

    // Helper: get pin voltage and state
    const getPinInfo = (compId, pinId) => {
      const key = `${compId}:${pinId}`;
      for (let i = 0; i < nets.length; i++) {
        if (nets[i].includes(key)) {
          return netVoltageMap.get(i) || { v: 0.0, lState: 'FLOAT' };
        }
      }
      return { v: 0.0, lState: 'FLOAT' };
    };

    // Update Output Devices
    let buzzerActive = false;
    let chAVolts = 0.0;
    let chBVolts = 0.0;

    for (const c of this.components) {
      if (c.type === 'led') {
        const aInfo = getPinInfo(c.id, 'anode');
        const kInfo = getPinInfo(c.id, 'cathode');
        c.state = (aInfo.v > 2.5 && kInfo.v < 1.0);
      } else if (c.type === 'sevenSegment') {
        const comInfo = getPinInfo(c.id, 'com');
        for (const seg of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) {
          const sInfo = getPinInfo(c.id, seg);
          c.segments[seg] = (sInfo.v > 2.5 && comInfo.v < 1.0);
        }
      } else if (c.type === 'buzzer') {
        const posInfo = getPinInfo(c.id, 'pos');
        const negInfo = getPinInfo(c.id, 'neg');
        c.active = (posInfo.v > 2.5 && negInfo.v < 1.0);
        if (c.active) buzzerActive = true;
      } else if (c.type === 'scopeProbe') {
        const pInfo = getPinInfo(c.id, 'in');
        c.voltage = pInfo.v;
        if (c.channel === 'A') chAVolts = pInfo.v;
        if (c.channel === 'B') chBVolts = pInfo.v;
      } else if (c.type === 'lcd16x2') {
        // Emulate HD44780 E strobe: when E goes HIGH to LOW
        const eInfo = getPinInfo(c.id, 'E');
        const isEHigh = eInfo.v > 2.5;
        if (c.lastEState && !isEHigh) { // Falling edge
          const rsInfo = getPinInfo(c.id, 'RS');
          // Read D4-D7
          const d4 = getPinInfo(c.id, 'D4').v > 2.5 ? 1 : 0;
          const d5 = getPinInfo(c.id, 'D5').v > 2.5 ? 1 : 0;
          const d6 = getPinInfo(c.id, 'D6').v > 2.5 ? 1 : 0;
          const d7 = getPinInfo(c.id, 'D7').v > 2.5 ? 1 : 0;
          const val = (d7 << 3) | (d6 << 2) | (d5 << 1) | d4;

          if (rsInfo.v > 2.5) { // Data write
            c.writeChar(String.fromCharCode(64 + (val % 26)));
          }
        }
        c.lastEState = isEHigh;
      } else if (c.type === 'potHG') {
        // Wiper voltage is fraction of t1 and t2
        const t1 = getPinInfo(c.id, 't1').v;
        const t2 = getPinInfo(c.id, 't2').v;
        const vWip = t2 + (t1 - t2) * (c.percentage / 100);
        const wipPin = c.pins.find(p => p.id === 'wip');
        if (wipPin) wipPin.logicState = vWip > 2.5 ? 'HIGH' : 'LOW';
      }
    }

    if (typeof soundEngine !== 'undefined') {
      if (buzzerActive) soundEngine.startBuzzer(2400);
      else soundEngine.stopBuzzer();
    }

    // Update wires
    for (const w of this.wires) {
      const fromInfo = getPinInfo(w.fromCompId, w.fromPinId);
      const toInfo = getPinInfo(w.toCompId, w.toPinId);
      w.voltage = Math.max(fromInfo.v, toInfo.v);
      w.logicState = (fromInfo.lState === 'HIGH' || toInfo.lState === 'HIGH') ? 'HIGH' : 
                     (fromInfo.lState === 'LOW' || toInfo.lState === 'LOW') ? 'LOW' : 'FLOAT';
      w.hasCurrent = Math.abs(fromInfo.v - toInfo.v) > 2.0 || (fromInfo.v > 2.5);
      w.flowOffset = (w.flowOffset + 2) % 24;
    }

    if (scopeDataCallback) {
      scopeDataCallback(chAVolts, chBVolts);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Circuit };
}
