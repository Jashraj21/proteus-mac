/**
 * Electronic Component Definitions and Models for Schematic Workspace
 * Includes iconic Proteus components: ATmega/8051 MCU, LM016L 16x2 LCD,
 * POT-HG interactive potentiometer, LEDs, 7-Segment, Buttons, and Probes.
 */

let componentIdCounter = 1;

function generateId(prefix) {
  return `${prefix}_${componentIdCounter++}`;
}

function rotatePoint(x, y, deg) {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: Math.round(x * cos - y * sin),
    y: Math.round(x * sin + y * cos)
  };
}

class CircuitComponent {
  constructor(type, x = 100, y = 100) {
    this.id = generateId(type);
    this.type = type;
    this.name = this.id;
    this.x = x;
    this.y = y;
    this.rotation = 0; // 0, 90, 180, 270
    this.selected = false;
    this.pins = [];
    this.properties = {};
  }

  getPinAbsolutePos(pinId) {
    const pin = this.pins.find(p => p.id === pinId);
    if (!pin) return { x: this.x, y: this.y };
    const r = rotatePoint(pin.relX, pin.relY, this.rotation);
    return {
      x: this.x + r.x,
      y: this.y + r.y
    };
  }

  rotate() {
    this.rotation = (this.rotation + 90) % 360;
  }
}

// Microcontroller DIP-16 / DIP-28
class MCUComponent extends CircuitComponent {
  constructor(x, y) {
    super('mcu', x, y);
    this.width = 170;
    this.height = 250;
    this.name = "U1";
    this.device = "ATMEGA328P / 8051";

    this.pins = [
      // Left side: Port A (PA0 to PA7)
      { id: 'PA0', name: 'PA0', relX: -85, relY: -90, isOutput: true, logicState: 'LOW' },
      { id: 'PA1', name: 'PA1', relX: -85, relY: -65, isOutput: true, logicState: 'LOW' },
      { id: 'PA2', name: 'PA2', relX: -85, relY: -40, isOutput: true, logicState: 'LOW' },
      { id: 'PA3', name: 'PA3', relX: -85, relY: -15, isOutput: true, logicState: 'LOW' },
      { id: 'PA4', name: 'PA4', relX: -85, relY: 15, isOutput: true, logicState: 'LOW' },
      { id: 'PA5', name: 'PA5', relX: -85, relY: 40, isOutput: true, logicState: 'LOW' },
      { id: 'PA6', name: 'PA6', relX: -85, relY: 65, isOutput: true, logicState: 'LOW' },
      { id: 'PA7', name: 'PA7', relX: -85, relY: 90, isOutput: true, logicState: 'LOW' },

      // Right side: Port B, UART, Power
      { id: 'PB0', name: 'PB0', relX: 85, relY: -90, isInput: true, logicState: 'FLOAT' },
      { id: 'PB1', name: 'PB1', relX: 85, relY: -65, isInput: true, logicState: 'FLOAT' },
      { id: 'PB2', name: 'PB2', relX: 85, relY: -40, isInput: true, logicState: 'FLOAT' },
      { id: 'PB3', name: 'PB3', relX: 85, relY: -15, isInput: true, logicState: 'FLOAT' },
      { id: 'TX',  name: 'TXD', relX: 85, relY: 15, isOutput: true, logicState: 'HIGH' },
      { id: 'RX',  name: 'RXD', relX: 85, relY: 40, isInput: true, logicState: 'FLOAT' },
      { id: 'VCC', name: 'VCC', relX: 85, relY: 65, isPower: true, logicState: 'HIGH' },
      { id: 'GND', name: 'GND', relX: 85, relY: 90, isGround: true, logicState: 'LOW' }
    ];
  }
}

// LM016L HD44780 16x2 Character LCD Display (Iconic Proteus component!)
class LCD16x2Component extends CircuitComponent {
  constructor(x, y) {
    super('lcd16x2', x, y);
    this.width = 240;
    this.height = 120;
    this.name = "LCD1";
    this.device = "LM016L (16x2 LCD)";

    // Screen text memory
    this.lines = [
      "PROTEUS VSM macOS",
      "SYSTEM READY >_ "
    ];

    // HD44780 controller state
    this.cursorX = 0;
    this.cursorY = 0;
    this.lastEState = false;

    // Pinout: VSS, VDD, VEE, RS, RW, E, D0-D7
    this.pins = [
      { id: 'VSS', name: 'VSS', relX: -100, relY: 60, isGround: true, logicState: 'LOW' },
      { id: 'VDD', name: 'VDD', relX: -80,  relY: 60, isPower: true, logicState: 'HIGH' },
      { id: 'RS',  name: 'RS',  relX: -50,  relY: 60, isInput: true, logicState: 'FLOAT' },
      { id: 'RW',  name: 'RW',  relX: -30,  relY: 60, isInput: true, logicState: 'FLOAT' },
      { id: 'E',   name: 'E',   relX: -10,  relY: 60, isInput: true, logicState: 'FLOAT' },
      { id: 'D4',  name: 'D4',  relX: 20,   relY: 60, isInput: true, logicState: 'FLOAT' },
      { id: 'D5',  name: 'D5',  relX: 40,   relY: 60, isInput: true, logicState: 'FLOAT' },
      { id: 'D6',  name: 'D6',  relX: 60,   relY: 60, isInput: true, logicState: 'FLOAT' },
      { id: 'D7',  name: 'D7',  relX: 80,   relY: 60, isInput: true, logicState: 'FLOAT' }
    ];
  }

  writeChar(ch) {
    let line = this.lines[this.cursorY];
    if (this.cursorX < 16) {
      line = line.substring(0, this.cursorX) + ch + line.substring(this.cursorX + 1);
      this.lines[this.cursorY] = line;
      this.cursorX++;
    }
  }

  clearScreen() {
    this.lines = ["                ", "                "];
    this.cursorX = 0;
    this.cursorY = 0;
  }
}

// POT-HG Interactive Potentiometer (Clickable +/- arrows)
class PotHGComponent extends CircuitComponent {
  constructor(x, y) {
    super('potHG', x, y);
    this.width = 60;
    this.height = 70;
    this.name = "RV1";
    this.device = "POT-HG (10k)";
    this.percentage = 50; // 0% to 100%

    this.pins = [
      { id: 't1',  name: '1', relX: -25, relY: -20, logicState: 'FLOAT' },
      { id: 'wip', name: '2', relX: 25,  relY: 0,   logicState: 'FLOAT' },
      { id: 't2',  name: '3', relX: -25, relY: 20,  logicState: 'FLOAT' }
    ];
  }
}

// LED Diode
class LEDComponent extends CircuitComponent {
  constructor(x, y, color = '#ef4444', label = 'LED-RED') {
    super('led', x, y);
    this.width = 50;
    this.height = 30;
    this.color = color;
    this.device = label;
    this.state = false;
    this.pins = [
      { id: 'anode', name: 'A', relX: -25, relY: 0, logicState: 'FLOAT' },
      { id: 'cathode', name: 'K', relX: 25, relY: 0, logicState: 'FLOAT' }
    ];
  }
}

// Push Button
class ButtonComponent extends CircuitComponent {
  constructor(x, y) {
    super('button', x, y);
    this.width = 44;
    this.height = 30;
    this.name = "SW1";
    this.device = "BUTTON";
    this.pressed = false;
    this.pins = [
      { id: 'p1', name: '1', relX: -22, relY: 0, logicState: 'FLOAT' },
      { id: 'p2', name: '2', relX: 22,  relY: 0, logicState: 'FLOAT' }
    ];
  }
}

// Toggle Switch
class SwitchComponent extends CircuitComponent {
  constructor(x, y) {
    super('switch', x, y);
    this.width = 44;
    this.height = 30;
    this.name = "SW2";
    this.device = "SW-SPST";
    this.closed = false;
    this.pins = [
      { id: 'p1', name: '1', relX: -22, relY: 0, logicState: 'FLOAT' },
      { id: 'p2', name: '2', relX: 22,  relY: 0, logicState: 'FLOAT' }
    ];
  }
}

// 7-Segment Display (Common Cathode)
class SevenSegmentComponent extends CircuitComponent {
  constructor(x, y) {
    super('sevenSegment', x, y);
    this.width = 70;
    this.height = 100;
    this.name = "DS1";
    this.device = "7SEG-COM-CATHODE";
    this.segments = { a: false, b: false, c: false, d: false, e: false, f: false, g: false, dp: false };
    this.pins = [
      { id: 'a',  name: 'A',  relX: -35, relY: -40, logicState: 'FLOAT' },
      { id: 'b',  name: 'B',  relX: -35, relY: -20, logicState: 'FLOAT' },
      { id: 'c',  name: 'C',  relX: -35, relY: 0,   logicState: 'FLOAT' },
      { id: 'd',  name: 'D',  relX: -35, relY: 20,  logicState: 'FLOAT' },
      { id: 'e',  name: 'E',  relX: 35,  relY: -40, logicState: 'FLOAT' },
      { id: 'f',  name: 'F',  relX: 35,  relY: -20, logicState: 'FLOAT' },
      { id: 'g',  name: 'G',  relX: 35,  relY: 0,   logicState: 'FLOAT' },
      { id: 'com',name: 'GND',relX: 35,  relY: 30,  logicState: 'LOW' }
    ];
  }
}

// Resistor
class ResistorComponent extends CircuitComponent {
  constructor(x, y, value = '10k') {
    super('resistor', x, y);
    this.width = 50;
    this.height = 20;
    this.name = "R1";
    this.device = "RES";
    this.value = value;
    this.pins = [
      { id: 'p1', name: '1', relX: -25, relY: 0, logicState: 'FLOAT' },
      { id: 'p2', name: '2', relX: 25,  relY: 0, logicState: 'FLOAT' }
    ];
  }
}

// DC Power Terminal (+5V)
class Power5VComponent extends CircuitComponent {
  constructor(x, y) {
    super('power5v', x, y);
    this.width = 30;
    this.height = 30;
    this.device = "POWER (+5V)";
    this.pins = [
      { id: 'out', name: '+5V', relX: 0, relY: 15, logicState: 'HIGH' }
    ];
  }
}

// Ground Terminal (0V)
class GroundComponent extends CircuitComponent {
  constructor(x, y) {
    super('ground', x, y);
    this.width = 30;
    this.height = 30;
    this.device = "GROUND (0V)";
    this.pins = [
      { id: 'gnd', name: 'GND', relX: 0, relY: -15, logicState: 'LOW' }
    ];
  }
}

// Piezo Buzzer / Speaker
class BuzzerComponent extends CircuitComponent {
  constructor(x, y) {
    super('buzzer', x, y);
    this.width = 40;
    this.height = 40;
    this.name = "LS1";
    this.device = "SPEAKER";
    this.active = false;
    this.pins = [
      { id: 'pos', name: '+', relX: -20, relY: 0, logicState: 'FLOAT' },
      { id: 'neg', name: '-', relX: 20,  relY: 0, logicState: 'FLOAT' }
    ];
  }
}

// Oscilloscope Probe
class ScopeProbeComponent extends CircuitComponent {
  constructor(x, y, channel = 'A') {
    super('scopeProbe', x, y);
    this.width = 36;
    this.height = 24;
    this.channel = channel;
    this.device = `PROBE CH-${channel}`;
    this.voltage = 0.0;
    this.pins = [
      { id: 'in', name: `CH${channel}`, relX: -18, relY: 0, logicState: 'FLOAT' }
    ];
  }
}

// Extra Proteus VSM Components: Terminals, Generators, Instruments, Graphs, Text & Junctions
class DefaultTerminalComponent extends CircuitComponent {
  constructor(x, y, name = 'TERM') {
    super('defaultTerminal', x, y);
    this.width = 30;
    this.height = 20;
    this.device = name;
    this.name = name;
    this.pins = [{ id: 'p', name: name, relX: -15, relY: 0, logicState: 'FLOAT' }];
  }
}

class InputTerminalComponent extends CircuitComponent {
  constructor(x, y, name = 'IN') {
    super('inputTerminal', x, y);
    this.width = 32;
    this.height = 20;
    this.device = name;
    this.name = name;
    this.pins = [{ id: 'p', name: name, relX: 16, relY: 0, isInput: true, logicState: 'FLOAT' }];
  }
}

class OutputTerminalComponent extends CircuitComponent {
  constructor(x, y, name = 'OUT') {
    super('outputTerminal', x, y);
    this.width = 32;
    this.height = 20;
    this.device = name;
    this.name = name;
    this.pins = [{ id: 'p', name: name, relX: -16, relY: 0, isOutput: true, logicState: 'FLOAT' }];
  }
}

class BidirTerminalComponent extends CircuitComponent {
  constructor(x, y, name = 'BUS') {
    super('bidirTerminal', x, y);
    this.width = 36;
    this.height = 22;
    this.device = name;
    this.name = name;
    this.pins = [{ id: 'p', name: name, relX: 0, relY: 11, logicState: 'FLOAT' }];
  }
}

class GeneratorComponent extends CircuitComponent {
  constructor(x, y, genType = 'DC', param = 5.0) {
    super('generator', x, y);
    this.width = 44;
    this.height = 36;
    this.genType = genType;
    this.param = param;
    this.device = `GEN-${genType}`;
    this.name = `GEN_${genType}`;
    this.pins = [{ id: 'out', name: 'OUT', relX: 22, relY: 0, isOutput: true, logicState: 'HIGH' }];
  }
}

class InstrumentBlockComponent extends CircuitComponent {
  constructor(x, y, instName = 'OSCILLOSCOPE') {
    super('instrumentBlock', x, y);
    this.width = 90;
    this.height = 65;
    this.instName = instName;
    this.device = instName;
    this.name = instName.replace(/\s+/g, '_');
    this.pins = [
      { id: 'chA', name: 'A', relX: -45, relY: -15, isInput: true, logicState: 'FLOAT' },
      { id: 'chB', name: 'B', relX: -45, relY: 15, isInput: true, logicState: 'FLOAT' },
      { id: 'chC', name: 'C', relX: 45, relY: -15, isInput: true, logicState: 'FLOAT' },
      { id: 'chD', name: 'D', relX: 45, relY: 15, isInput: true, logicState: 'FLOAT' }
    ];
  }
}

class SimulationGraphComponent extends CircuitComponent {
  constructor(x, y, graphType = 'ANALOG') {
    super('simulationGraph', x, y);
    this.width = 160;
    this.height = 100;
    this.graphType = graphType;
    this.device = `GRAPH (${graphType})`;
    this.name = `GRAPH_${graphType}`;
    this.pins = [
      { id: 'probe1', name: 'P1', relX: -80, relY: -20, isInput: true, logicState: 'FLOAT' },
      { id: 'probe2', name: 'P2', relX: -80, relY: 20, isInput: true, logicState: 'FLOAT' }
    ];
  }
}

class JunctionDotComponent extends CircuitComponent {
  constructor(x, y) {
    super('junctionDot', x, y);
    this.width = 12;
    this.height = 12;
    this.device = 'JUNCTION';
    this.name = 'JUNC';
    this.pins = [{ id: 'j', name: 'J', relX: 0, relY: 0, logicState: 'LOW' }];
  }
}

class TextNoteComponent extends CircuitComponent {
  constructor(x, y, text = 'Note') {
    super('textNote', x, y);
    this.text = text;
    this.width = Math.max(70, text.length * 8);
    this.height = 24;
    this.device = 'TEXT';
    this.name = text;
    this.pins = [];
  }
}

class BusLineComponent extends CircuitComponent {
  constructor(x, y, label = 'DATA[0..7]') {
    super('busLine', x, y);
    this.label = label;
    this.width = 120;
    this.height = 16;
    this.device = label;
    this.name = label;
    this.pins = [
      { id: 'b0', name: 'D0', relX: -60, relY: 0, logicState: 'FLOAT' },
      { id: 'b1', name: 'D7', relX: 60, relY: 0, logicState: 'FLOAT' }
    ];
  }
}

class SubSheetComponent extends CircuitComponent {
  constructor(x, y, name = 'SUB1') {
    super('subSheet', x, y);
    this.width = 100;
    this.height = 70;
    this.device = `SHEET:${name}`;
    this.name = name;
    this.pins = [
      { id: 'in', name: 'IN', relX: -50, relY: 0, isInput: true, logicState: 'FLOAT' },
      { id: 'out', name: 'OUT', relX: 50, relY: 0, isOutput: true, logicState: 'FLOAT' }
    ];
  }
}

class Graphic2DComponent extends CircuitComponent {
  constructor(x, y, shapeType = 'box') {
    super('graphic2D', x, y);
    this.shapeType = shapeType;
    this.width = 60;
    this.height = 40;
    this.device = `2D-${shapeType.toUpperCase()}`;
    this.name = `2D_${shapeType}`;
    this.pins = [];
  }
}

// Component Catalog for the Proteus "Pick Devices" (P) Library Dialog
const PROTEUS_LIBRARY = [
  { id: 'mcu', name: 'ATMEGA328P', category: 'Microprocessor ICs', desc: '8-bit AVR Microcontroller with 32K Flash, 2K SRAM', create: (x,y) => new MCUComponent(x,y) },
  { id: 'lcd16x2', name: 'LM016L', category: 'Display Devices', desc: '16x2 Dot Matrix Alphanumeric Liquid Crystal Display', create: (x,y) => new LCD16x2Component(x,y) },
  { id: 'potHG', name: 'POT-HG', category: 'Resistors & Pots', desc: 'Interactive Active Potentiometer with increment/decrement buttons', create: (x,y) => new PotHGComponent(x,y) },
  { id: 'ledRed', name: 'LED-RED', category: 'Optoelectronics', desc: 'Animated Light Emitting Diode (Red)', create: (x,y) => new LEDComponent(x,y, '#ef4444', 'LED-RED') },
  { id: 'ledGreen', name: 'LED-GREEN', category: 'Optoelectronics', desc: 'Animated Light Emitting Diode (Green)', create: (x,y) => new LEDComponent(x,y, '#22c55e', 'LED-GREEN') },
  { id: 'ledBlue', name: 'LED-BLUE', category: 'Optoelectronics', desc: 'Animated Light Emitting Diode (Blue)', create: (x,y) => new LEDComponent(x,y, '#38bdf8', 'LED-BLUE') },
  { id: 'sevenSeg', name: '7SEG-COM-CAT', category: 'Display Devices', desc: '7-Segment Common Cathode LED Display', create: (x,y) => new SevenSegmentComponent(x,y) },
  { id: 'button', name: 'BUTTON', category: 'Switches & Relays', desc: 'Active Momentary Push Button Switch', create: (x,y) => new ButtonComponent(x,y) },
  { id: 'switch', name: 'SW-SPST', category: 'Switches & Relays', desc: 'Single Pole Single Throw Latching Toggle Switch', create: (x,y) => new SwitchComponent(x,y) },
  { id: 'resistor', name: 'RES', category: 'Resistors & Pots', desc: 'Generic 10k Ohm Carbon Film Resistor', create: (x,y) => new ResistorComponent(x,y) },
  { id: 'buzzer', name: 'BUZZER', category: 'Audio & Transducers', desc: 'Piezoelectric Sound Transducer / Sounder', create: (x,y) => new BuzzerComponent(x,y) },
  { id: 'power', name: 'POWER (+5V)', category: 'Terminals & Power', desc: 'Regulated +5.0V DC Power Supply Rail', create: (x,y) => new Power5VComponent(x,y) },
  { id: 'ground', name: 'GROUND (0V)', category: 'Terminals & Power', desc: 'Zero-Volt Reference Earth Ground Terminal', create: (x,y) => new GroundComponent(x,y) },
  { id: 'probeA', name: 'PROBE-CH-A', category: 'Instruments & Probes', desc: 'Oscilloscope Voltage Probe Channel A (Yellow)', create: (x,y) => new ScopeProbeComponent(x,y, 'A') },
  { id: 'probeB', name: 'PROBE-CH-B', category: 'Instruments & Probes', desc: 'Oscilloscope Voltage Probe Channel B (Cyan)', create: (x,y) => new ScopeProbeComponent(x,y, 'B') }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CircuitComponent,
    MCUComponent,
    LCD16x2Component,
    PotHGComponent,
    LEDComponent,
    ButtonComponent,
    SwitchComponent,
    SevenSegmentComponent,
    ResistorComponent,
    Power5VComponent,
    GroundComponent,
    BuzzerComponent,
    ScopeProbeComponent,
    DefaultTerminalComponent,
    InputTerminalComponent,
    OutputTerminalComponent,
    BidirTerminalComponent,
    GeneratorComponent,
    InstrumentBlockComponent,
    SimulationGraphComponent,
    JunctionDotComponent,
    TextNoteComponent,
    BusLineComponent,
    SubSheetComponent,
    Graphic2DComponent,
    PROTEUS_LIBRARY,
    rotatePoint
  };
}
