# Proteus Studio for macOS ⚡

A desktop electronic design, schematic capture, and circuit simulation suite inspired by Labcenter Electronics Proteus 8 Professional, built natively for macOS with Apple design aesthetics.

---

## 🌟 Highlights

- **Authentic Windows Proteus 8 Assets**:
  - Direct PE extraction of 14 left mode selector tools (`ISIS.DLL`).
  - Command toolbar icons and VCR animation controls (`ITB_VIEW32`, `ITB_FILE32`, `ITB_EDIT32`).
  - Integrated 5,788 Windows Proteus component catalog (`windows_proteus_db.js`).
  - 684 real Windows sample projects library (`windows_proteus_samples.js`).
- **macOS Native Integration**:
  - Full native system menu bar (` Proteus Studio  File  Edit  View  Tools  Design  Graph  Debug  Library  Template  System  Window  Help`).
  - Native traffic light positioning with glassmorphic dark studio theme.
  - Quick-access samples browser, preset demos, and live zoom tracking.
- **Circuit Simulation & Virtual System Modelling (VSM)**:
  - Real-time interactive analog/digital circuit simulation engine.
  - Multi-waveform Tektronix 2-Channel Digital Oscilloscope.
  - RS232 ASCII/Hex Virtual Serial Terminal.
  - Custom Harvard 8-bit RISC MCU with integrated 2-pass assembly compiler.
  - Common hardware peripheral models: LM016L LCD, 7-Segment displays, LEDs, active potentiometers, buzzers, switches.
- **Multiple Viewports**:
  - **Schematic Capture (ISIS)**: Drag-and-drop orthogonal wiring, pin snapping, live current flow animation, and grid modes.
  - **PCB Layout (ARES)**: Interactive track routing, pad placement, and rat's nest netlines.
  - **3D Visualizer**: Real-time 3D board rendering with components, solder pads, and traces.
- **Engineering Tools**:
  - Bill of Materials (BOM) reporting with CSV export.
  - Design Rule Check (DRC) & Electrical Rule Check (ERC).
  - SPICE Netlist generator (`.TRAN`, `.MODEL`, `.TITLE`).
  - CrossOver bridge launcher to open native Windows Proteus if installed.

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation & Run

1. Clone the repository:
   ```bash
   git clone https://github.com/Jashraj21/proteus-desktop.git
   cd proteus-desktop
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch development app:
   ```bash
   npm start
   ```

### Building the Native macOS Application Bundle

To build, sign, and install into `/Applications/Proteus Studio.app`:
```bash
npm run package
# or:
bash scripts/build-mac-app.sh
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| **`F5`** | Start / Resume Simulation |
| **`F6`** / **`⌘+`** | Zoom In |
| **`F7`** / **`⌘-`** | Zoom Out |
| **`F8`** / **`⌘0`** | Zoom All / Fit Entire Sheet |
| **`F10`** | Step Into Single Instruction |
| **`R`** | Rotate Selected Component (+90°) |
| **`Shift + R`** | Rotate Anti-Clockwise (-90°) |
| **`M`** | Mirror Component Horizontally (X-axis) |
| **`Shift + M`** | Mirror Component Vertically (Y-axis) |
| **`P`** | Pick Devices from 5,788 Component Library |
| **`L`** | Open Library Manager |
| **`G`** | Toggle Grid Display (Dots / Off) |
| **`Backspace`** / **`Del`** | Delete Selected Component or Wire |
| **`⌘N`** / **`⌘O`** / **`⌘S`** | New / Open / Save Project |

---

## 📄 License

MIT License © 2026 Jashraj. Built for education, reverse-engineering exploration, and circuit design.
