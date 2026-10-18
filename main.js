const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    title: 'Proteus 8 Professional - Schematic Capture - [Sample.pdsprj]',
    titleBarStyle: 'hiddenInset', // Native macOS traffic lights integrated
    trafficLightPosition: { x: 16, y: 13 },
    backgroundColor: '#070b12',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    }
  });

  win.loadFile(path.join(__dirname, 'src', 'index.html'));

  // Build authentic complete macOS System Menu Bar (Extreme Top Bar)
  const template = [
    {
      label: 'Proteus Studio',
      submenu: [
        {
          label: 'About Proteus 8 Professional',
          click: () => win.webContents.send('menu-action', 'about')
        },
        { type: 'separator' },
        {
          label: 'Preferences...',
          accelerator: 'CmdOrCtrl+,',
          click: () => win.webContents.send('menu-action', 'design-props')
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit', label: 'Quit Proteus Studio' }
      ]
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Design Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => win.webContents.send('menu-action', 'new')
        },
        {
          label: 'Open Project...',
          accelerator: 'CmdOrCtrl+O',
          click: () => win.webContents.send('menu-action', 'open')
        },
        {
          label: 'Save Project',
          accelerator: 'CmdOrCtrl+S',
          click: () => win.webContents.send('menu-action', 'save')
        },
        {
          label: 'Import Windows Proteus Sample (684 Real Projects)...',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => win.webContents.send('menu-action', 'samples')
        },
        { type: 'separator' },
        {
          label: 'Export Bill of Materials (BOM)...',
          click: () => win.webContents.send('menu-action', 'bom')
        },
        {
          label: 'Design Rule Check (DRC)...',
          click: () => win.webContents.send('menu-action', 'drc')
        },
        {
          label: 'Generate SPICE Netlist...',
          click: () => win.webContents.send('menu-action', 'netlist')
        },
        { type: 'separator' },
        { role: 'close', label: 'Close Window' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          click: () => win.webContents.send('menu-action', 'undo')
        },
        {
          label: 'Redo',
          accelerator: 'CmdOrCtrl+Shift+Z',
          click: () => win.webContents.send('menu-action', 'redo')
        },
        { type: 'separator' },
        {
          label: 'Cut',
          accelerator: 'CmdOrCtrl+X',
          click: () => win.webContents.send('menu-action', 'cut')
        },
        {
          label: 'Copy',
          accelerator: 'CmdOrCtrl+C',
          click: () => win.webContents.send('menu-action', 'copy')
        },
        {
          label: 'Paste',
          accelerator: 'CmdOrCtrl+V',
          click: () => win.webContents.send('menu-action', 'paste')
        },
        {
          label: 'Delete',
          accelerator: 'Backspace',
          click: () => win.webContents.send('menu-action', 'delete')
        },
        { type: 'separator' },
        {
          label: 'Rotate Clockwise (90°)',
          accelerator: 'R',
          click: () => win.webContents.send('menu-action', 'rotate-cw')
        },
        {
          label: 'Rotate Anti-Clockwise (90°)',
          accelerator: 'Shift+R',
          click: () => win.webContents.send('menu-action', 'rotate-ccw')
        },
        {
          label: 'Mirror Horizontal (X)',
          accelerator: 'M',
          click: () => win.webContents.send('menu-action', 'mirror-x')
        },
        {
          label: 'Mirror Vertical (Y)',
          accelerator: 'Shift+M',
          click: () => win.webContents.send('menu-action', 'mirror-y')
        },
        { type: 'separator' },
        {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          click: () => win.webContents.send('menu-action', 'select-all')
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Center at Cursor / Pan View',
          accelerator: 'F4',
          click: () => win.webContents.send('menu-action', 'pan')
        },
        { type: 'separator' },
        {
          label: 'Zoom In',
          accelerator: 'F6',
          click: () => win.webContents.send('menu-action', 'zoom-in')
        },
        {
          label: 'Zoom Out',
          accelerator: 'F7',
          click: () => win.webContents.send('menu-action', 'zoom-out')
        },
        {
          label: 'Zoom To View Entire Sheet',
          accelerator: 'F8',
          click: () => win.webContents.send('menu-action', 'zoom-all')
        },
        {
          label: 'Zoom To Selected Area',
          accelerator: 'CmdOrCtrl+F6',
          click: () => win.webContents.send('menu-action', 'zoom-area')
        },
        { type: 'separator' },
        {
          label: 'Toggle Grid Mode',
          accelerator: 'G',
          click: () => win.webContents.send('menu-action', 'toggle-grid')
        },
        { type: 'separator' },
        {
          label: 'Schematic Capture',
          accelerator: '1',
          click: () => win.webContents.send('menu-action', 'view-schematic')
        },
        {
          label: 'PCB Layout (ARES)',
          accelerator: '2',
          click: () => win.webContents.send('menu-action', 'view-pcb')
        },
        {
          label: '3D Visualizer',
          accelerator: '3',
          click: () => win.webContents.send('menu-action', 'view-3d')
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools', label: 'Toggle Developer Tools' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Tools',
      submenu: [
        {
          label: 'Design Rule Check (DRC)...',
          click: () => win.webContents.send('menu-action', 'drc')
        },
        {
          label: 'Bill of Materials (BOM)...',
          click: () => win.webContents.send('menu-action', 'bom')
        },
        {
          label: 'SPICE Netlist Viewer...',
          click: () => win.webContents.send('menu-action', 'netlist')
        },
        { type: 'separator' },
        {
          label: 'Launch Windows Proteus 8 (via CrossOver)...',
          click: () => win.webContents.send('menu-action', 'crossover')
        }
      ]
    },
    {
      label: 'Design',
      submenu: [
        {
          label: 'Edit Design Properties...',
          click: () => win.webContents.send('menu-action', 'design-props')
        },
        {
          label: 'Clear Sheet Annotations',
          click: () => win.webContents.send('menu-action', 'design-clear')
        }
      ]
    },
    {
      label: 'Graph',
      submenu: [
        {
          label: 'Analog Transient Analysis...',
          click: () => win.webContents.send('menu-action', 'graph-analog')
        },
        {
          label: 'Digital Logic Timing Diagram...',
          click: () => win.webContents.send('menu-action', 'graph-digital')
        },
        {
          label: 'Frequency Response Analysis...',
          click: () => win.webContents.send('menu-action', 'graph-freq')
        }
      ]
    },
    {
      label: 'Debug',
      submenu: [
        {
          label: 'Start / Resume Simulation',
          accelerator: 'F5',
          click: () => win.webContents.send('menu-action', 'run')
        },
        {
          label: 'Step Into (Single Instruction)',
          accelerator: 'F10',
          click: () => win.webContents.send('menu-action', 'step')
        },
        {
          label: 'Pause Simulation',
          accelerator: 'F6',
          click: () => win.webContents.send('menu-action', 'pause')
        },
        {
          label: 'Stop Simulation',
          accelerator: 'F7',
          click: () => win.webContents.send('menu-action', 'stop')
        },
        { type: 'separator' },
        {
          label: 'Digital Oscilloscope (Tektronix)',
          click: () => win.webContents.send('menu-action', 'open-scope')
        },
        {
          label: 'Virtual Terminal (RS232 ASCII)',
          click: () => win.webContents.send('menu-action', 'open-terminal')
        },
        {
          label: 'Source Code / Assembly IDE',
          click: () => win.webContents.send('menu-action', 'open-ide')
        }
      ]
    },
    {
      label: 'Library',
      submenu: [
        {
          label: 'Pick Devices / Symbols (5,788 Windows Components)...',
          accelerator: 'P',
          click: () => win.webContents.send('menu-action', 'open-library')
        },
        {
          label: 'Library Manager (146 Libraries)...',
          accelerator: 'L',
          click: () => win.webContents.send('menu-action', 'lib-manager')
        },
        { type: 'separator' },
        {
          label: 'Browse 684 Sample Projects...',
          click: () => win.webContents.send('menu-action', 'samples')
        }
      ]
    },
    {
      label: 'Template',
      submenu: [
        {
          label: 'Apple Dark Studio (Active)',
          click: () => win.webContents.send('menu-action', 'tpl-dark')
        },
        {
          label: 'Classic Proteus Emerald',
          click: () => win.webContents.send('menu-action', 'tpl-green')
        },
        {
          label: 'Crisp Engineering Paper',
          click: () => win.webContents.send('menu-action', 'tpl-light')
        }
      ]
    },
    {
      label: 'System',
      submenu: [
        {
          label: 'Simulation Speed: 1x (Realtime)',
          click: () => win.webContents.send('menu-action', 'speed-1')
        },
        {
          label: 'Simulation Speed: 5x',
          click: () => win.webContents.send('menu-action', 'speed-5')
        },
        {
          label: 'Simulation Speed: 20x (Fast)',
          click: () => win.webContents.send('menu-action', 'speed-20')
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        {
          label: 'Digital Oscilloscope Window',
          click: () => win.webContents.send('menu-action', 'open-scope')
        },
        {
          label: 'Virtual Terminal Window',
          click: () => win.webContents.send('menu-action', 'open-terminal')
        },
        {
          label: 'Source Code Debugger Window',
          click: () => win.webContents.send('menu-action', 'open-ide')
        },
        { type: 'separator' },
        { role: 'front', label: 'Bring All to Front' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Proteus 8 Professional Help & Documentation',
          click: () => win.webContents.send('menu-action', 'help-doc')
        },
        {
          label: 'Labcenter Electronics Online Support',
          click: () => shell.openExternal('https://www.labcenter.com/')
        },
        { type: 'separator' },
        {
          label: 'About Proteus Studio for macOS...',
          click: () => win.webContents.send('menu-action', 'about')
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
