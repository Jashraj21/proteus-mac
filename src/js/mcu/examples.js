/**
 * Built-in Preset Programs for VirtualMCU
 */
const MCU_EXAMPLES = {
  ledChaser: {
    name: "Knight Rider LED Chaser (Port A)",
    description: "Sweeps a lit LED back and forth across 8 pins on Port A.",
    code: `; ============================================
; Knight Rider LED Chaser
; Sweeps a single bit back and forth on PORTA
; ============================================
PORTA = 1

start:
    LDI A, 0b00000001   ; Start at PA0

sweep_left:
    OUT PORTA, A        ; Update LEDs
    CALL delay
    SHL A               ; Shift bit left
    CMP A, 0b10000000   ; Reached PA7?
    JNZ sweep_left

sweep_right:
    OUT PORTA, A        ; Update LEDs
    CALL delay
    SHR A               ; Shift bit right
    CMP A, 0b00000001   ; Reached PA0?
    JNZ sweep_right

    JMP sweep_left      ; Repeat forever

; Delay subroutine using register X
delay:
    LDI X, 40
delay_loop:
    DEC X
    JNZ delay_loop
    RET
`
  },

  buttonCounter: {
    name: "Push-Button 7-Segment Counter",
    description: "Pressing the button on PB0 increments digits 0-9 on Port A.",
    code: `; ============================================
; Push-Button 7-Segment Counter
; Increments digit on PORTA when PB0 is pressed
; Digits 0-9 lookup: 0x3F, 0x06, 0x5B, 0x4F, 
; 0x66, 0x6D, 0x7D, 0x07, 0x7F, 0x6F
; ============================================
PORTA = 1
PINB  = 3

start:
    ; Store 7-segment digit patterns in RAM (0-9)
    LDI A, 0x3F    ; '0'
    STS 0, A
    LDI A, 0x06    ; '1'
    STS 1, A
    LDI A, 0x5B    ; '2'
    STS 2, A
    LDI A, 0x4F    ; '3'
    STS 3, A
    LDI A, 0x66    ; '4'
    STS 4, A
    LDI A, 0x6D    ; '5'
    STS 5, A
    LDI A, 0x7D    ; '6'
    STS 6, A
    LDI A, 0x07    ; '7'
    STS 7, A
    LDI A, 0x7F    ; '8'
    STS 8, A
    LDI A, 0x6F    ; '9'
    STS 9, A

    LDI X, 0       ; Counter starts at 0

display_digit:
    LDS A, X       ; Load 7-segment pattern for digit X
    OUT PORTA, A   ; Output to display on Port A

wait_press:
    IN A, PINB     ; Read physical buttons on Port B
    AND A, 0b00000001 ; Check bit 0 (PB0)
    JZ wait_press  ; Loop while button is released (LOW)

    ; Button pressed! Increment counter
    INC X
    CMP X, 10      ; Reset counter if > 9
    JNZ debounce
    LDI X, 0

debounce:
    ; Wait for button release
    IN A, PINB
    AND A, 0b00000001
    JNZ debounce   ; Loop while button is still held

    JMP display_digit
`
  },

  uartTerminal: {
    name: "Interactive Serial UART Echo",
    description: "Transmits welcome message to Virtual Terminal and echoes back typed keys.",
    code: `; ============================================
; Interactive Serial UART Echo
; Transmits greeting, then echoes received chars
; ============================================
UART_DATA   = 4
UART_STATUS = 5

start:
    ; Transmit greeting banner
    LDI A, 72      ; 'H'
    OUT UART_DATA, A
    LDI A, 105     ; 'i'
    OUT UART_DATA, A
    LDI A, 33      ; '!'
    OUT UART_DATA, A
    LDI A, 32      ; ' '
    OUT UART_DATA, A
    LDI A, 82      ; 'R'
    OUT UART_DATA, A
    LDI A, 101     ; 'e'
    OUT UART_DATA, A
    LDI A, 97      ; 'a'
    OUT UART_DATA, A
    LDI A, 100     ; 'd'
    OUT UART_DATA, A
    LDI A, 121     ; 'y'
    OUT UART_DATA, A
    LDI A, 62      ; '>'
    OUT UART_DATA, A
    LDI A, 32      ; ' '
    OUT UART_DATA, A

poll_rx:
    IN A, UART_STATUS  ; Read status
    AND A, 0b00000010  ; Check Bit 1 (RX char available)
    JZ poll_rx         ; Wait if no char

    ; Read incoming character
    IN A, UART_DATA

    ; Echo character back to terminal
    OUT UART_DATA, A

    JMP poll_rx
`
  },

  waveformGenerator: {
    name: "Dual Waveform Generator (Oscilloscope)",
    description: "Generates complementary square waves on PA0 and PA1 for oscilloscope probing.",
    code: `; ============================================
; Dual Waveform Generator
; Toggles PA0 (Channel A) and PA1 (Channel B)
; ============================================
PORTA = 1

start:
    LDI A, 0b00000001   ; PA0 = High, PA1 = Low
    OUT PORTA, A
    CALL wave_delay

    LDI A, 0b00000010   ; PA0 = Low,  PA1 = High
    OUT PORTA, A
    CALL wave_delay

    JMP start

wave_delay:
    LDI X, 15
delay_loop:
    DEC X
    JNZ delay_loop
    RET
`
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MCU_EXAMPLES };
}
