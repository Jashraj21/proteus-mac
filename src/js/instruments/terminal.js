/**
 * Virtual Serial Terminal (UART Console)
 * Simulates a hardware RS-232 / UART monitor for interactive bidirectional serial communication.
 */

class VirtualTerminal {
  constructor(outputEl, inputEl, sendBtn, mcu) {
    this.outputEl = outputEl;
    this.inputEl = inputEl;
    this.sendBtn = sendBtn;
    this.mcu = mcu;
    this.hexMode = false;
    this.buffer = '';

    // Register UART TX listener on MCU
    this.mcu.onUartTx = (byte) => {
      this.receiveByte(byte);
    };

    this.bindEvents();
  }

  bindEvents() {
    if (this.sendBtn && this.inputEl) {
      this.sendBtn.addEventListener('click', () => this.sendInput());
      this.inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.sendInput();
        }
      });
    }
  }

  sendInput() {
    if (!this.inputEl) return;
    const text = this.inputEl.value;
    if (!text) return;

    // Send characters into MCU's RX buffer
    for (let i = 0; i < text.length; i++) {
      this.mcu.queueUartRx(text[i]);
    }
    // Append newline \r\n
    this.mcu.queueUartRx(13); // \r
    this.mcu.queueUartRx(10); // \n

    // Echo locally in muted color
    this.appendRaw(`\n[TX] > ${text}\n`, 'tx-echo');
    this.inputEl.value = '';
  }

  receiveByte(byte) {
    if (this.hexMode) {
      const hex = '0x' + (byte & 0xFF).toString(16).padStart(2, '0').toUpperCase() + ' ';
      this.appendRaw(hex, 'rx-text');
    } else {
      const ch = String.fromCharCode(byte & 0xFF);
      this.appendRaw(ch, 'rx-text');
    }
  }

  appendRaw(text, className = '') {
    if (!this.outputEl) return;
    const span = document.createElement('span');
    if (className) span.className = className;
    span.textContent = text;
    this.outputEl.appendChild(span);
    this.outputEl.scrollTop = this.outputEl.scrollHeight;
  }

  clear() {
    if (this.outputEl) {
      this.outputEl.innerHTML = '';
      this.appendRaw("--- PROTEUS VSM VIRTUAL TERMINAL (9600-8-N-1) ---\n", 'term-header');
    }
  }

  setHexMode(enabled) {
    this.hexMode = enabled;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VirtualTerminal };
}
