// Global configuration variables that will be updated per level.
let TUBE_CAPACITY = 4;
let NUM_COLORS = 4;
let EXTRA_TUBES = 2;
let MAX_MOVES = 30;
let currentDifficulty = 'Medium'; // Default (will be updated)

// Predefined difficulty settings
const difficultySettings = {
  easy: {
    tubeCapacity: 4,
    numColors: 3,
    extraTubes: 2,
    maxMoves: 50,
    display: "Easy"
  },
  medium: {
    tubeCapacity: 4,
    numColors: 4,
    extraTubes: 2,
    maxMoves: 30,
    display: "Medium"
  },
  hard: {
    tubeCapacity: 4,
    numColors: 5,
    extraTubes: 1,
    maxMoves: 25,
    display: "Hard"
  }
};

// DOM Elements
const gameContainer = document.getElementById('game-container');
const movesLeftSpan = document.getElementById('moves-left');
const difficultyDisplay = document.getElementById('difficulty-display');
const undoButton = document.getElementById('undo-button');
const resetButton = document.getElementById('reset-button');
const chooseDifficultyButton = document.getElementById('choose-difficulty');
const levelSelectionDiv = document.getElementById('level-selection');
const gameStatsDiv = document.getElementById('game-stats');

// Game State
let tubes = [];
let selectedTubeIndex = null;
let movesLeft = MAX_MOVES;
let undoStack = [];

// Predefined set of colors (if you need more, add to this array)
const availableColors = [
  '#E74C3C', // Vivid Red
  '#3498DB', // Bright Blue
  '#2ECC71', // Fresh Green
  '#F1C40F', // Bold Yellow
  '#9B59B6', // Rich Purple
  '#E67E22', // Energetic Orange
  '#1ABC9C', // Turquoise
  '#16A085', // Deep Teal
  '#F39C12', // Warm Amber
  '#D35400', // Dark Orange
  '#27AE60', // Emerald Green
  '#2980B9'  
];

// Choose a random subset of colors
function getRandomColors(num) {
  const colors = [];
  // Shuffle availableColors array (a simple shuffle)
  const shuffled = availableColors.slice().sort(() => 0.5 - Math.random());
  for (let i = 0; i < num; i++) {
    colors.push(shuffled[i]);
  }
  return colors;
}

// Initialize game parameters based on selected difficulty.
function setDifficulty(level) {
  const settings = difficultySettings[level];
  TUBE_CAPACITY = settings.tubeCapacity;
  NUM_COLORS = settings.numColors;
  EXTRA_TUBES = settings.extraTubes;
  MAX_MOVES = settings.maxMoves;
  currentDifficulty = settings.display;
  difficultyDisplay.textContent = `Difficulty: ${settings.display}`;
}

// Setup game: fill tubes with colors randomly.
function initGame() {
  tubes = [];
  undoStack = [];
  selectedTubeIndex = null;
  movesLeft = MAX_MOVES;
  // Display the limited number of moves based on difficulty
  movesLeftSpan.textContent = `Limited Moves: ${movesLeft}`;
  
  // Get random set of colors for this game.
  const colors = getRandomColors(NUM_COLORS);
  // Each color appears TUBE_CAPACITY times.
  let waterPieces = [];
  colors.forEach(color => {
    for (let i = 0; i < TUBE_CAPACITY; i++) {
      waterPieces.push(color);
    }
  });

  // Shuffle water pieces.
  waterPieces.sort(() => Math.random() - 0.5);

  // Total tubes = number of filled tubes (one per color) + extra empty tubes.
  const totalTubes = NUM_COLORS + EXTRA_TUBES;
  for (let i = 0; i < totalTubes; i++) {
    tubes[i] = [];
  }

  // Fill tubes sequentially with water pieces.
  let tubeIndex = 0;
  while (waterPieces.length > 0) {
    if (tubes[tubeIndex].length < TUBE_CAPACITY) {
      tubes[tubeIndex].push(waterPieces.pop());
    }
    // Only fill the first NUM_COLORS tubes.
    tubeIndex = (tubeIndex + 1) % (NUM_COLORS);
  }

  renderTubes();
}

// Render all tubes and water layers.
function renderTubes() {
  gameContainer.innerHTML = '';
  tubes.forEach((tube, index) => {
    const tubeDiv = document.createElement('div');
    tubeDiv.classList.add('tube');
    tubeDiv.dataset.index = index;
    if (Number(index) === selectedTubeIndex) {
      tubeDiv.classList.add('selected');
    }
    // Render water layers from bottom (first element) to top.
    tube.forEach((color, layerIndex) => {
      const waterDiv = document.createElement('div');
      waterDiv.classList.add('water-layer');
      waterDiv.style.backgroundColor = color;
      // Calculate height and bottom position.
      const layerHeight = 100 / TUBE_CAPACITY;
      waterDiv.style.height = `${layerHeight}%`;
      waterDiv.style.bottom = `${layerIndex * layerHeight}%`;
      tubeDiv.appendChild(waterDiv);
    });
    tubeDiv.addEventListener('click', () => handleTubeClick(index));
    gameContainer.appendChild(tubeDiv);
  });
}

// Save current state for undo.
function pushUndo() {
  // Deep clone the state (using JSON for simple arrays).
  undoStack.push({
    tubes: JSON.parse(JSON.stringify(tubes)),
    movesLeft: movesLeft,
  });
}

// Handle tube clicks.
function handleTubeClick(index) {
  if (movesLeft <= 0) return; // No moves left.

  if (selectedTubeIndex === null) {
    // Select tube if it has water.
    if (tubes[index].length > 0) {
      selectedTubeIndex = index;
      renderTubes();
    }
  } else {
    if (selectedTubeIndex === index) {
      // Deselect if the same tube is clicked.
      selectedTubeIndex = null;
      renderTubes();
      return;
    }
    // Attempt to pour from selectedTubeIndex to clicked tube.
    if (isValidMove(selectedTubeIndex, index)) {
      pushUndo();
      performPour(selectedTubeIndex, index);
      movesLeft--;
      movesLeftSpan.textContent = `Limited Moves: ${movesLeft}`;
      selectedTubeIndex = null;
      renderTubes();
      checkWinCondition();
    } else {
      // If invalid move, change selection if destination tube has water.
      if (tubes[index].length > 0) {
        selectedTubeIndex = index;
        renderTubes();
      } else {
        // Deselect if clicked on empty tube.
        selectedTubeIndex = null;
        renderTubes();
      }
    }
  }
}

// Check if pouring is allowed.
function isValidMove(fromIndex, toIndex) {
  const source = tubes[fromIndex];
  const target = tubes[toIndex];
  if (source.length === 0) return false;
  if (target.length === TUBE_CAPACITY) return false;

  // Get top color of source.
  const sourceColor = source[source.length - 1];

  // If target is empty, move is allowed.
  if (target.length === 0) return true;

  // If target is not empty, its top must match.
  const targetColor = target[target.length - 1];
  return sourceColor === targetColor;
}

// Pour water: pour as many contiguous layers of the same color from source into target.
function performPour(fromIndex, toIndex) {
  const source = tubes[fromIndex];
  const target = tubes[toIndex];
  const sourceColor = source[source.length - 1];

  // Count contiguous layers of the same color at the top of source.
  let count = 0;
  for (let i = source.length - 1; i >= 0; i--) {
    if (source[i] === sourceColor) count++;
    else break;
  }

  // Calculate available space in target.
  const space = TUBE_CAPACITY - target.length;
  const moveCount = Math.min(count, space);

  // Pour the layers.
  for (let i = 0; i < moveCount; i++) {
    target.push(source.pop());
  }
}

// Check if the game is won: each tube is either empty or full with a single color.
function checkWinCondition() {
  const win = tubes.every(tube => {
    if (tube.length === 0) return true;
    if (tube.length !== TUBE_CAPACITY) return false;
    // All layers must be the same color.
    return tube.every(color => color === tube[0]);
  });
  if (win) {
    setTimeout(() => alert('Congratulations, you solved the puzzle!'), 100);
  } else if (movesLeft === 0) {
    setTimeout(() => alert('No moves left! Try again.'), 100);
  }
}

// Undo last move.
undoButton.addEventListener('click', () => {
  if (undoStack.length > 0) {
    const lastState = undoStack.pop();
    tubes = lastState.tubes;
    movesLeft = lastState.movesLeft;
    movesLeftSpan.textContent = `Limited Moves: ${movesLeft}`;
    selectedTubeIndex = null;
    renderTubes();
  }
});

// Reset game.
resetButton.addEventListener('click', () => {
  initGame();
});

// Allow the user to choose the difficulty again.
chooseDifficultyButton.addEventListener('click', () => {
  // Show the level selection and hide game stats and container.
  levelSelectionDiv.classList.remove('hidden');
  gameStatsDiv.classList.add('hidden');
  gameContainer.innerHTML = '';
});

// Level selection handler.
document.querySelectorAll('.level-btn').forEach(button => {
  button.addEventListener('click', (e) => {
    const level = e.target.dataset.level;
    setDifficulty(level);
    // Hide level selection and show game stats.
    levelSelectionDiv.classList.add('hidden');
    gameStatsDiv.classList.remove('hidden');
    initGame();
  });
});



