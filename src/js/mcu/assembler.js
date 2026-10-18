/**
 * Two-Pass Assembler for VirtualMCU
 * Translates human-readable assembly into machine code bytes with label resolution,
 * symbolic constants, string/byte directives, and line mapping.
 */
class Assembler {
  static parseNumber(str, constants = {}) {
    str = str.trim();
    if (constants.hasOwnProperty(str.toUpperCase())) {
      return constants[str.toUpperCase()];
    }
    if (str.startsWith('0x') || str.startsWith('0X') || str.startsWith('$')) {
      return parseInt(str.replace('$', ''), 16);
    }
    if (str.startsWith('0b') || str.startsWith('0B')) {
      return parseInt(str.substring(2), 2);
    }
    if (str.startsWith("'") && str.endsWith("'") && str.length === 3) {
      return str.charCodeAt(1);
    }
    const n = parseInt(str, 10);
    return isNaN(n) ? null : n;
  }

  static assemble(source) {
    const lines = source.split(/\r?\n/);
    const errors = [];
    const labels = {};
    const constants = {
      'PORTA': 0x01,
      'PORTB': 0x02,
      'PINB': 0x03,
      'UART_DATA': 0x04,
      'UART_STATUS': 0x05,
      'TIMER0': 0x06
    };

    // Pre-processing and tokenization
    const parsedLines = [];
    let pc = 0;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      let rawLine = lines[lineIdx];
      // Strip comments
      const commentIdx = rawLine.search(/;|(\/\/)/);
      if (commentIdx !== -1) {
        rawLine = rawLine.substring(0, commentIdx);
      }
      rawLine = rawLine.trim();

      if (!rawLine) continue;

      // Check for EQU / = constants
      const equMatch = rawLine.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(?:EQU|=)\s*(.+)$/i);
      if (equMatch) {
        const cName = equMatch[1].toUpperCase();
        const cVal = Assembler.parseNumber(equMatch[2], constants);
        if (cVal !== null) {
          constants[cName] = cVal;
        } else {
          errors.push({ line: lineIdx + 1, message: `Invalid constant expression: ${equMatch[2]}` });
        }
        continue;
      }

      // Check for label at start of line
      let remaining = rawLine;
      const labelMatch = remaining.match(/^([A-Za-z_][A-Za-z0-9_]*):/);
      if (labelMatch) {
        const lName = labelMatch[1].toLowerCase();
        labels[lName] = pc;
        remaining = remaining.substring(labelMatch[0].length).trim();
      }

      if (!remaining) continue;

      // Extract mnemonic and arguments
      const parts = remaining.split(/\s+/);
      const mnemonic = parts[0].toUpperCase();
      const argsStr = remaining.substring(mnemonic.length).trim();
      const args = argsStr ? argsStr.split(',').map(s => s.trim()) : [];

      let estimatedSize = 1;

      // Size calculation for Pass 1
      if (['LDI', 'ADD', 'SUB', 'AND', 'OR', 'XOR', 'CMP', 'OUT', 'IN', 'LDS', 'STS'].includes(mnemonic)) {
        estimatedSize = 2;
      } else if (['JMP', 'JZ', 'JNZ', 'JC', 'JNC', 'CALL'].includes(mnemonic)) {
        estimatedSize = 3;
      } else if (mnemonic === '.DB' || mnemonic === 'DB') {
        // String or byte sequence
        let dbBytes = 0;
        let inQuotes = false;
        let currentToken = '';
        for (let i = 0; i < argsStr.length; i++) {
          const ch = argsStr[i];
          if (ch === '"' || ch === "'") {
            inQuotes = !inQuotes;
            continue;
          }
          if (inQuotes) {
            dbBytes++;
          } else if (ch === ',') {
            if (currentToken.trim()) dbBytes++;
            currentToken = '';
          } else {
            currentToken += ch;
          }
        }
        if (currentToken.trim()) dbBytes++;
        estimatedSize = Math.max(1, dbBytes);
      }

      parsedLines.push({
        lineIdx,
        pc,
        mnemonic,
        args,
        rawArgs: argsStr,
        estimatedSize
      });

      pc += estimatedSize;
    }

    // Pass 2: Code Generation
    const bytecode = [];
    const sourceMap = new Map(); // pc -> source lineIdx
    const lineToPc = new Map();  // source lineIdx -> pc

    for (const item of parsedLines) {
      const currentPC = bytecode.length;
      sourceMap.set(currentPC, item.lineIdx);
      if (!lineToPc.has(item.lineIdx)) {
        lineToPc.set(item.lineIdx, currentPC);
      }

      const m = item.mnemonic;
      const args = item.args;

      try {
        switch (m) {
          case 'NOP':
            bytecode.push(0x00);
            break;

          case 'LDI': {
            const reg = (args[0] || '').toUpperCase();
            const val = Assembler.parseNumber(args[1], constants);
            if (val === null) throw new Error(`Invalid immediate value '${args[1]}'`);
            if (reg === 'A') bytecode.push(0x01, val & 0xFF);
            else if (reg === 'X') bytecode.push(0x02, val & 0xFF);
            else throw new Error(`Unknown register '${reg}' for LDI (use A or X)`);
            break;
          }

          case 'MOV': {
            const dst = (args[0] || '').toUpperCase();
            const src = (args[1] || '').toUpperCase();
            if (dst === 'A' && src === 'X') bytecode.push(0x03);
            else if (dst === 'X' && src === 'A') bytecode.push(0x04);
            else throw new Error(`MOV supports A, X or X, A only`);
            break;
          }

          case 'ADD': {
            const reg = (args[0] || '').toUpperCase();
            if (reg !== 'A') throw new Error(`ADD target must be register A`);
            const op2 = (args[1] || '').toUpperCase();
            if (op2 === 'X') {
              bytecode.push(0x11);
            } else {
              const imm = Assembler.parseNumber(op2, constants);
              if (imm === null) throw new Error(`Invalid add operand '${args[1]}'`);
              bytecode.push(0x10, imm & 0xFF);
            }
            break;
          }

          case 'SUB': {
            const reg = (args[0] || '').toUpperCase();
            if (reg !== 'A') throw new Error(`SUB target must be register A`);
            const op2 = (args[1] || '').toUpperCase();
            if (op2 === 'X') {
              bytecode.push(0x13);
            } else {
              const imm = Assembler.parseNumber(op2, constants);
              if (imm === null) throw new Error(`Invalid sub operand '${args[1]}'`);
              bytecode.push(0x12, imm & 0xFF);
            }
            break;
          }

          case 'INC': {
            const reg = (args[0] || '').toUpperCase();
            if (reg === 'A') bytecode.push(0x14);
            else if (reg === 'X') bytecode.push(0x15);
            else throw new Error(`INC requires A or X`);
            break;
          }

          case 'DEC': {
            const reg = (args[0] || '').toUpperCase();
            if (reg === 'A') bytecode.push(0x16);
            else if (reg === 'X') bytecode.push(0x17);
            else throw new Error(`DEC requires A or X`);
            break;
          }

          case 'AND': {
            const op2 = (args[1] || '').toUpperCase();
            if (op2 === 'X') bytecode.push(0x21);
            else {
              const imm = Assembler.parseNumber(op2, constants);
              bytecode.push(0x20, imm & 0xFF);
            }
            break;
          }

          case 'OR': {
            const op2 = (args[1] || '').toUpperCase();
            if (op2 === 'X') bytecode.push(0x23);
            else {
              const imm = Assembler.parseNumber(op2, constants);
              bytecode.push(0x22, imm & 0xFF);
            }
            break;
          }

          case 'XOR': {
            const op2 = (args[1] || '').toUpperCase();
            if (op2 === 'X') bytecode.push(0x25);
            else {
              const imm = Assembler.parseNumber(op2, constants);
              bytecode.push(0x24, imm & 0xFF);
            }
            break;
          }

          case 'NOT':
            bytecode.push(0x26);
            break;

          case 'SHL':
            bytecode.push(0x27);
            break;

          case 'SHR':
            bytecode.push(0x28);
            break;

          case 'CMP': {
            const op2 = (args[1] || '').toUpperCase();
            if (op2 === 'X') bytecode.push(0x31);
            else {
              const imm = Assembler.parseNumber(op2, constants);
              bytecode.push(0x30, imm & 0xFF);
            }
            break;
          }

          // Branch / Jump Instructions
          case 'JMP':
          case 'JZ':
          case 'JNZ':
          case 'JC':
          case 'JNC':
          case 'CALL': {
            const opcodes = {
              'JMP': 0x40, 'JZ': 0x41, 'JNZ': 0x42, 'JC': 0x43, 'JNC': 0x44, 'CALL': 0x50
            };
            const targetLabel = (args[0] || '').toLowerCase();
            let targetAddr = labels[targetLabel];
            if (targetAddr === undefined) {
              targetAddr = Assembler.parseNumber(args[0], constants);
            }
            if (targetAddr === undefined || targetAddr === null) {
              throw new Error(`Undefined target label or address '${args[0]}'`);
            }
            bytecode.push(opcodes[m], targetAddr & 0xFF, (targetAddr >> 8) & 0xFF);
            break;
          }

          case 'RET':
            bytecode.push(0x51);
            break;

          case 'OUT': {
            const portVal = Assembler.parseNumber(args[0], constants);
            const reg = (args[1] || 'A').toUpperCase();
            if (portVal === null) throw new Error(`Unknown port '${args[0]}'`);
            if (reg === 'A') bytecode.push(0x60, portVal & 0xFF);
            else if (reg === 'X') bytecode.push(0x61, portVal & 0xFF);
            else throw new Error(`OUT requires register A or X`);
            break;
          }

          case 'IN': {
            const reg = (args[0] || 'A').toUpperCase();
            const portVal = Assembler.parseNumber(args[1], constants);
            if (portVal === null) throw new Error(`Unknown port '${args[1]}'`);
            if (reg === 'A') bytecode.push(0x62, portVal & 0xFF);
            else if (reg === 'X') bytecode.push(0x63, portVal & 0xFF);
            else throw new Error(`IN requires register A or X`);
            break;
          }

          case 'LDS': {
            const addr = Assembler.parseNumber(args[1], constants);
            bytecode.push(0x70, addr & 0xFF);
            break;
          }

          case 'STS': {
            const addr = Assembler.parseNumber(args[0], constants);
            bytecode.push(0x71, addr & 0xFF);
            break;
          }

          case 'PUSH':
            bytecode.push(0x80);
            break;

          case 'POP':
            bytecode.push(0x81);
            break;

          case 'SLEEP':
            bytecode.push(0xFE);
            break;

          case 'HLT':
            bytecode.push(0xFF);
            break;

          case '.DB':
          case 'DB': {
            // Parse sequence of numbers and quoted strings
            let raw = item.rawArgs;
            let inQuotes = false;
            let token = '';
            for (let i = 0; i < raw.length; i++) {
              const ch = raw[i];
              if (ch === '"' || ch === "'") {
                if (inQuotes) {
                  // End quote
                  inQuotes = false;
                } else {
                  inQuotes = true;
                }
                continue;
              }
              if (inQuotes) {
                bytecode.push(ch.charCodeAt(0));
              } else if (ch === ',') {
                if (token.trim()) {
                  const b = Assembler.parseNumber(token.trim(), constants);
                  if (b !== null) bytecode.push(b & 0xFF);
                }
                token = '';
              } else {
                token += ch;
              }
            }
            if (token.trim()) {
              const b = Assembler.parseNumber(token.trim(), constants);
              if (b !== null) bytecode.push(b & 0xFF);
            }
            break;
          }

          default:
            throw new Error(`Unknown instruction '${m}'`);
        }
      } catch (err) {
        errors.push({ line: item.lineIdx + 1, message: err.message });
      }
    }

    return {
      binary: new Uint8Array(bytecode),
      errors,
      labels,
      sourceMap,
      lineToPc
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Assembler };
}
