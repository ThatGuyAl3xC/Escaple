/* Escaple Prototype - main.js (data-driven refactor)
   - ROOM_DATA at top controls rooms & hotspots
   - BaseRoom reads ROOM_DATA and creates interactive hotspots
   - Actions supported: message, addItem, toggleFlag, promptCode, enterWord, revealIfFlag
   - Easy to extend: edit ROOM_DATA only
*/

const GAME_WIDTH = 720;
const GAME_HEIGHT = 480;

// ---- GAME STATE ----
const STATE = {
  inventory: [],
  flags: {
    powerOn: false,
    flashlightPowered: false
  }
};

// ---- ROOM DATA ----
const ROOM_DATA = {
  1: {
    color: 0xffeedc,
    hotspots: [
      {
        x: 180, y: 300, w: 300, h: 120,
        label: 'Desk (Flashlight)',
        action: { type: 'addItem', payload: 'Flashlight (no batteries)', message: "You found a flashlight (no batteries)." }
      },
      {
        x: 500, y: 140, w: 260, h: 140,
        label: 'Painting',
        action: { type: 'message', payload: 'A painting shows soft shapes. Maybe light would reveal more.' }
      },
      {
        x: 520, y: 360, w: 180, h: 100,
        label: 'Floor Lamp',
        action: { type: 'messageWithFlag', payload: { flag: 'powerOn', ifTrue: 'The lamp is on. The room feels warmer.', ifFalse: 'The lamp has no power. Maybe the breaker is off.' } }
      }
    ]
  },

  2: {
    color: 0xfff7ea,
    hotspots: [
      {
        x: 140, y: 120, w: 200, h: 110,
        label: 'Tool Rack',
        action: { type: 'message', payload: 'Three wrenches hang labeled 3,1,2. Could be a code order.' }
      },
      {
        x: 400, y: 260, w: 260, h: 120,
        label: 'Locker',
        action: { type: 'promptCode', payload: { codes: ['312','213'], onSuccessAdd: 'Batteries', successMessage: 'You took batteries from the locker.' , failMessage: 'Wrong code.' } }
      },
      {
        x: 580, y: 100, w: 200, h: 100,
        label: 'Breaker Switch',
        action: { type: 'toggleFlag', payload: { flag: 'powerOn', trueMsg: 'You flipped the breaker: power on.', falseMsg: 'You flipped the breaker: power off.' } }
      }
    ]
  },

  3: {
    color: 0xf6f0e6,
    hotspots: [
      {
        x: 160, y: 260, w: 220, h: 220,
        label: 'Bookshelf',
        action: { type: 'message', payload: 'There is a pattern of colored books. Somewhere to note the order.' }
      },
      {
        x: 420, y: 140, w: 260, h: 120,
        label: 'Poster',
        action: { type: 'revealIfFlagAndItems', payload: { requiredFlag: null, requiredItems: ['Flashlight (powered)'], revealMessage: 'You shine the powered flashlight and see letters: A _ _ L E', failMessage: 'The poster is faded. Maybe a light would help.' } }
      },
      {
        x: 520, y: 340, w: 200, h: 120,
        label: 'Small Box',
        action: { type: 'message', payload: 'A small box with 4 color slots. You need the color order from the painting.' }
      }
    ]
  },

  4: {
    color: 0xfff6ee,
    hotspots: [
      {
        x: 200, y: 220, w: 240, h: 160,
        label: 'Final Chest',
        action: { type: 'enterWord', payload: { solution: 'APPLE', success: 'Chest opens! You escaped! 🎉', fail: 'The chest vibrates. Wrong word.' } }
      },
      {
        x: 520, y: 160, w: 200, h: 120,
        label: 'Clock',
        action: { type: 'message', payload: 'The clock is set at 2:13. Maybe that was a clue for the locker.' }
      },
      {
        x: 480, y: 360, w: 220, h: 120,
        label: 'Mirror',
        action: { type: 'messageWithFlag', payload: { flag: 'powerOn', ifTrue: 'The mirror reveals reversed letters: E L P P A', ifFalse: 'The mirror is dull. Turn on the lights to see it clearly.' } }
      }
    ]
  }
};

// ---- DOM Helpers ----
function addToInventory(name) {
  if (name.includes('Flashlight')) {
    if (STATE.inventory.includes('Flashlight (no batteries)') || STATE.inventory.includes('Flashlight (powered)')) {
      showMessage('You already took the flashlight.');
      return;
    }
  }

  if (!STATE.inventory.includes(name)) {
    STATE.inventory.push(name);
    renderInventory();
    showMessage(`Added: ${name}`);
  } else {
    showMessage(`${name} is already in inventory.`);
  }
}

function removeFromInventory(name) {
  STATE.inventory = STATE.inventory.filter(x => x !== name);
  renderInventory();
}

function renderInventory() {
  const container = document.getElementById('inv-items');
  container.innerHTML = '';
  STATE.inventory.forEach(item => {
    const el = document.createElement('div');
    el.className = 'inv-item';
    el.textContent = item;
    el.onclick = () => {
      showMessage(`Try using "${item}" on something in the room.`);
    };
    container.appendChild(el);
  });
}

let msgTimeout = null;
function showMessage(text, timeout = 3500) {
  const box = document.getElementById('messageBox');
  box.classList.remove('hidden');
  box.textContent = text;
  if (msgTimeout) clearTimeout(msgTimeout);
  msgTimeout = setTimeout(() => box.classList.add('hidden'), timeout);
}

function replaceInventoryItem(oldName, newName) {
  const idx = STATE.inventory.indexOf(oldName);
  if (idx !== -1) {
    STATE.inventory[idx] = newName;
    renderInventory();
    return true;
  }
  return false;
}

// ---- Action Handlers ----
const ACTIONS = {
  message: (scene, payload) => showMessage(payload),
  addItem: (scene, payload) => addToInventory(payload),
  toggleFlag: (scene, payload) => {
    const flag = payload.flag;
    STATE.flags[flag] = !STATE.flags[flag];
    showMessage(STATE.flags[flag] ? payload.trueMsg : payload.falseMsg);
  },

  promptCode: (scene, payload) => {
    let code = prompt('Enter code:');
    if (code === null) { showMessage('No entry.'); return; }

    code = code.toString().trim();
    const validCodes = (payload.codes || []).map(c => c.toString().trim());

    if (validCodes.includes(code)) {
      if (payload.onSuccessAdd && !STATE.inventory.includes(payload.onSuccessAdd)) {
        addToInventory(payload.onSuccessAdd);
      }
      showMessage(payload.successMessage || 'Unlocked!');
    } else {
      showMessage(payload.failMessage || 'Wrong code.');
    }
  },

  revealIfFlagAndItems: (scene, payload) => {
    const { requiredFlag, requiredItems, revealMessage, failMessage } = payload;
    const flagOk = requiredFlag ? !!STATE.flags[requiredFlag] : true;
    const itemsOk = requiredItems ? requiredItems.every(it => STATE.inventory.includes(it)) : true;
    if (flagOk && itemsOk) {
      showMessage(revealMessage);
    } else {
      showMessage(failMessage || 'Nothing new here.');
    }
  },

  enterWord: (scene, payload) => {
    let entry = prompt('Enter 5-letter code:');
    if (entry === null) { showMessage('No entry.'); return; }

    entry = entry.toString().trim().toUpperCase();
    if (entry === payload.solution) {
      showMessage(payload.success, 6000);
    } else {
      showMessage(payload.fail, 3000);
    }
  },

  messageWithFlag: (scene, payload) => {
    const val = STATE.flags[payload.flag];
    showMessage(val ? payload.ifTrue : payload.ifFalse);
  }
};

// ---- Phaser Scene ----
class BaseRoom extends Phaser.Scene {
  constructor(key, roomNum) {
    super(key);
    this.roomNum = roomNum;
  }

  create() {
    document.getElementById('roomNum').innerText = this.roomNum;

    const data = ROOM_DATA[this.roomNum];
    this.cameras.main.setBackgroundColor(data.color);

    this.hotspots = [];

    data.hotspots.forEach(h => {
      const rect = this.add.rectangle(h.x, h.y, h.w, h.h, 0xffffff, 0.03)
        .setStrokeStyle(2, 0x000000, 0.08)
        .setInteractive({ useHandCursor: true });

      const label = this.add.text(h.x - h.w / 2 + 10, h.y - h.h / 2 + 8, h.label, { font: '14px Arial', color: '#3C2F2F' });

      rect.on('pointerdown', () => {
        const act = h.action;
        if (!act || !act.type) {
          showMessage('Nothing special here.');
          return;
        }
        const handler = ACTIONS[act.type];
        if (handler) handler(this, act.payload || act);
        else showMessage('Unimplemented action: ' + act.type);

        this.postInteractionUpdate();
      });

      this.hotspots.push({ rect, label });
    });

    const navLeft = this.add.text(14, 14, '< Prev', { font: '16px Arial', color: '#fff', backgroundColor: '#7b6452', padding: 6 }).setInteractive();
    const navRight = this.add.text(GAME_WIDTH - 80, 14, 'Next >', { font: '16px Arial', color: '#fff', backgroundColor: '#7b6452', padding: 6 }).setInteractive();

    navLeft.on('pointerdown', () => {
      const prev = this.roomNum === 1 ? 4 : this.roomNum - 1;
      this.scene.start('room' + prev);
    });
    navRight.on('pointerdown', () => {
      const next = this.roomNum === 4 ? 1 : this.roomNum + 1;
      this.scene.start('room' + next);
    });

    this.postInteractionUpdate();
  }

  postInteractionUpdate() {
    if (STATE.inventory.includes('Flashlight (no batteries)') && STATE.inventory.includes('Batteries')) {
      if (replaceInventoryItem('Flashlight (no batteries)', 'Flashlight (powered)')) {
        showMessage('You assembled the flashlight with the batteries. It is now powered.');
        STATE.flags.flashlightPowered = true;
      }
    }

    if (STATE.inventory.includes('Flashlight (powered)') && STATE.inventory.includes('Batteries')) {
      removeFromInventory('Batteries');
      showMessage('The batteries are used up and can’t be reused.');
    }
  }
}

// ---- create scenes ----
class Room1 extends BaseRoom { constructor() { super('room1', 1); } }
class Room2 extends BaseRoom { constructor() { super('room2', 2); } }
class Room3 extends BaseRoom { constructor() { super('room3', 3); } }
class Room4 extends BaseRoom { constructor() { super('room4', 4); } }

// ---- Phaser config ----
const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'gameContainer',
  scene: [Room1, Room2, Room3, Room4],
  backgroundColor: '#efe7dc'
};

const game = new Phaser.Game(config);

window.onload = () => {
  renderInventory();
  showMessage('Welcome to Escaple prototype — try clicking things. Use Next/Prev to navigate rooms.');
};
