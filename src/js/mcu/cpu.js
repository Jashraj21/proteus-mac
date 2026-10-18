/**
 * Virtual 8-bit Microcontroller (VSM Engine)
 * Models an 8-bit RISC core with Harvard architecture, internal peripherals,
 * and cycle-accurate I/O mapping for schematic co-simulation.
 */
class VirtualMCU {
  constructor() {
    // Registers
    this.A = 0;          // 8-bit Accumulator
    this.X = 0;          // 8-bit General/Index register
    this.PC = 0;         // 16-bit Program Counter
    this.SP = 0xFF;      // Stack Pointer (0x00 - 0xFF in RAM)
    this.flags = {
      Z: 0, // Zero flag
      C: 0, // Carry flag
      N: 0  // Negative flag
    };

    // Memories
    this.flash = new Uint8Array(1024); // 1KB Program ROM
    this.ram = new Uint8Array(256);    // 256B Data SRAM

    // I/O Registers
    this.PORTA = 0x00; // Output latch for Port A (PA0-PA7)
    this.PORTB = 0x00; // Output latch for Port B (PB0-PB7)
    this.PINB = 0x00;  // Input latch for Port B (driven externally)
    
    // UART peripheral
    this.uartTxBuffer = [];
    this.uartRxQueue = [];
    this.onUartTx = null; // Callback for serial terminal
    
    // Timer 0
    this.timer0 = 0;
    this.timerPrescaler = 0;

    // Simulation metrics
    this.cycles = 0;
    this.halted = false;
  }

  reset() {
    this.A = 0;
    this.X = 0;
    this.PC = 0;
    this.SP = 0xFF;
    this.flags = { Z: 0, C: 0, N: 0 };
    this.PORTA = 0x00;
    this.PORTB = 0x00;
    this.PINB = 0x00;
    this.timer0 = 0;
    this.timerPrescaler = 0;
    this.cycles = 0;
    this.halted = false;
    this.ram.fill(0);
  }

  loadProgram(binary) {
    this.flash.fill(0);
    for (let i = 0; i < binary.length && i < this.flash.length; i++) {
      this.flash[i] = binary[i];
    }
    this.reset();
  }

  // Update Zero and Negative flags based on 8-bit value
  updateZN(val) {
    val &= 0xFF;
    this.flags.Z = (val === 0) ? 1 : 0;
    this.flags.N = ((val & 0x80) !== 0) ? 1 : 0;
  }

  // Read I/O Port
  readPort(port) {
    switch (port) {
      case 0x01: return this.PORTA;
      case 0x02: return this.PORTB;
      case 0x03: return this.PINB; // Physical inputs
      case 0x04: {
        // UART Data in
        if (this.uartRxQueue.length > 0) {
          return this.uartRxQueue.shift() & 0xFF;
        }
        return 0;
      }
      case 0x05: {
        // UART Status: Bit 0 = TX ready (always 1), Bit 1 = RX char ready
        const rxReady = this.uartRxQueue.length > 0 ? 0x02 : 0x00;
        return 0x01 | rxReady;
      }
      case 0x06: return this.timer0;
      default: return 0;
    }
  }

  // Write I/O Port
  writePort(port, val) {
    val &= 0xFF;
    switch (port) {
      case 0x01:
        this.PORTA = val;
        break;
      case 0x02:
        this.PORTB = val;
        break;
      case 0x04: // UART Data out
        this.uartTxBuffer.push(val);
        if (this.onUartTx) {
          this.onUartTx(val);
        }
        break;
      case 0x06:
        this.timer0 = val;
        break;
    }
  }

  // External circuit writes to MCU input pins
  setExternalPin(port, pinIndex, state) {
    if (port === 'B') {
      if (state) {
        this.PINB |= (1 << pinIndex);
      } else {
        this.PINB &= ~(1 << pinIndex);
      }
    }
  }

  getOutputPin(port, pinIndex) {
    if (port === 'A') {
      return (this.PORTA & (1 << pinIndex)) !== 0 ? 1 : 0;
    }
    if (port === 'B') {
      return (this.PORTB & (1 << pinIndex)) !== 0 ? 1 : 0;
    }
    return 0;
  }

  queueUartRx(charOrByte) {
    const byte = typeof charOrByte === 'string' ? charOrByte.charCodeAt(0) : (charOrByte & 0xFF);
    this.uartRxQueue.push(byte);
  }

  // Push to stack
  push(val) {
    this.ram[this.SP & 0xFF] = val & 0xFF;
    this.SP = (this.SP - 1) & 0xFF;
  }

  // Pop from stack
  pop() {
    this.SP = (this.SP + 1) & 0xFF;
    return this.ram[this.SP & 0xFF];
  }

  // Single step instruction execution
  step() {
    if (this.halted) return false;
    if (this.PC >= this.flash.length) {
      this.halted = true;
      return false;
    }

    const opcode = this.flash[this.PC++];
    this.cycles++;

    // Increment Timer0 periodically
    this.timerPrescaler++;
    if (this.timerPrescaler >= 4) {
      this.timerPrescaler = 0;
      this.timer0 = (this.timer0 + 1) & 0xFF;
    }

    switch (opcode) {
      case 0x00: // NOP
        break;

      case 0x01: // LDI A, imm
        this.A = this.flash[this.PC++];
        this.updateZN(this.A);
        break;

      case 0x02: // LDI X, imm
        this.X = this.flash[this.PC++];
        this.updateZN(this.X);
        break;

      case 0x03: // MOV A, X
        this.A = this.X;
        this.updateZN(this.A);
        break;

      case 0x04: // MOV X, A
        this.X = this.A;
        this.updateZN(this.X);
        break;

      case 0x10: { // ADD A, imm
        const imm = this.flash[this.PC++];
        const res = this.A + imm;
        this.flags.C = res > 0xFF ? 1 : 0;
        this.A = res & 0xFF;
        this.updateZN(this.A);
        break;
      }

      case 0x11: { // ADD A, X
        const res = this.A + this.X;
        this.flags.C = res > 0xFF ? 1 : 0;
        this.A = res & 0xFF;
        this.updateZN(this.A);
        break;
      }

      case 0x12: { // SUB A, imm
        const imm = this.flash[this.PC++];
        const res = this.A - imm;
        this.flags.C = res < 0 ? 1 : 0;
        this.A = (res + 256) & 0xFF;
        this.updateZN(this.A);
        break;
      }

      case 0x13: { // SUB A, X
        const res = this.A - this.X;
        this.flags.C = res < 0 ? 1 : 0;
        this.A = (res + 256) & 0xFF;
        this.updateZN(this.A);
        break;
      }

      case 0x14: // INC A
        this.A = (this.A + 1) & 0xFF;
        this.updateZN(this.A);
        break;

      case 0x15: // INC X
        this.X = (this.X + 1) & 0xFF;
        this.updateZN(this.X);
        break;

      case 0x16: // DEC A
        this.A = (this.A - 1 + 256) & 0xFF;
        this.updateZN(this.A);
        break;

      case 0x17: // DEC X
        this.X = (this.X - 1 + 256) & 0xFF;
        this.updateZN(this.X);
        break;

      case 0x20: // AND A, imm
        this.A &= this.flash[this.PC++];
        this.updateZN(this.A);
        break;

      case 0x21: // AND A, X
        this.A &= this.X;
        this.updateZN(this.A);
        break;

      case 0x22: // OR A, imm
        this.A |= this.flash[this.PC++];
        this.updateZN(this.A);
        break;

      case 0x23: // OR A, X
        this.A |= this.X;
        this.updateZN(this.A);
        break;

      case 0x24: // XOR A, imm
        this.A ^= this.flash[this.PC++];
        this.updateZN(this.A);
        break;

      case 0x25: // XOR A, X
        this.A ^= this.X;
        this.updateZN(this.A);
        break;

      case 0x26: // NOT A
        this.A = (~this.A) & 0xFF;
        this.updateZN(this.A);
        break;

      case 0x27: { // SHL A
        this.flags.C = (this.A & 0x80) !== 0 ? 1 : 0;
        this.A = (this.A << 1) & 0xFF;
        this.updateZN(this.A);
        break;
      }

      case 0x28: { // SHR A
        this.flags.C = (this.A & 0x01) !== 0 ? 1 : 0;
        this.A = (this.A >> 1) & 0xFF;
        this.updateZN(this.A);
        break;
      }

      case 0x30: { // CMP A, imm
        const imm = this.flash[this.PC++];
        const res = this.A - imm;
        this.flags.C = res < 0 ? 1 : 0;
        this.flags.Z = (res === 0) ? 1 : 0;
        this.flags.N = ((res & 0x80) !== 0) ? 1 : 0;
        break;
      }

      case 0x31: { // CMP A, X
        const res = this.A - this.X;
        this.flags.C = res < 0 ? 1 : 0;
        this.flags.Z = (res === 0) ? 1 : 0;
        this.flags.N = ((res & 0x80) !== 0) ? 1 : 0;
        break;
      }

      case 0x40: { // JMP addr
        const low = this.flash[this.PC++];
        const high = this.flash[this.PC++];
        this.PC = (high << 8) | low;
        break;
      }

      case 0x41: { // JZ addr
        const low = this.flash[this.PC++];
        const high = this.flash[this.PC++];
        if (this.flags.Z === 1) {
          this.PC = (high << 8) | low;
        }
        break;
      }

      case 0x42: { // JNZ addr
        const low = this.flash[this.PC++];
        const high = this.flash[this.PC++];
        if (this.flags.Z === 0) {
          this.PC = (high << 8) | low;
        }
        break;
      }

      case 0x43: { // JC addr
        const low = this.flash[this.PC++];
        const high = this.flash[this.PC++];
        if (this.flags.C === 1) {
          this.PC = (high << 8) | low;
        }
        break;
      }

      case 0x44: { // JNC addr
        const low = this.flash[this.PC++];
        const high = this.flash[this.PC++];
        if (this.flags.C === 0) {
          this.PC = (high << 8) | low;
        }
        break;
      }

      case 0x50: { // CALL addr
        const low = this.flash[this.PC++];
        const high = this.flash[this.PC++];
        // Push return PC onto stack (high then low)
        this.push((this.PC >> 8) & 0xFF);
        this.push(this.PC & 0xFF);
        this.PC = (high << 8) | low;
        break;
      }

      case 0x51: { // RET
        const low = this.pop();
        const high = this.pop();
        this.PC = (high << 8) | low;
        break;
      }

      case 0x60: { // OUT port, A
        const port = this.flash[this.PC++];
        this.writePort(port, this.A);
        break;
      }

      case 0x61: { // OUT port, X
        const port = this.flash[this.PC++];
        this.writePort(port, this.X);
        break;
      }

      case 0x62: { // IN A, port
        const port = this.flash[this.PC++];
        this.A = this.readPort(port);
        this.updateZN(this.A);
        break;
      }

      case 0x63: { // IN X, port
        const port = this.flash[this.PC++];
        this.X = this.readPort(port);
        this.updateZN(this.X);
        break;
      }

      case 0x70: { // LDS A, addr
        const addr = this.flash[this.PC++];
        this.A = this.ram[addr & 0xFF];
        this.updateZN(this.A);
        break;
      }

      case 0x71: { // STS addr, A
        const addr = this.flash[this.PC++];
        this.ram[addr & 0xFF] = this.A;
        break;
      }

      case 0x80: // PUSH A
        this.push(this.A);
        break;

      case 0x81: // POP A
        this.A = this.pop();
        this.updateZN(this.A);
        break;

      case 0xFE: // SLEEP
        break;

      case 0xFF: // HLT
        this.halted = true;
        return false;

      default:
        console.warn(`[MCU] Unknown opcode 0x${opcode.toString(16).padStart(2, '0')} at PC=${this.PC - 1}`);
        this.halted = true;
        return false;
    }

    return true;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VirtualMCU };
}
