const COLOR_KEYS = [
  'mapHue', 'mapSat', 'mapLuminance', 'selectedMapPreset',
  'dataHue', 'dataSat', 'dataLuminance', 'selectedDataPreset',
  'labelHue', 'labelSat', 'labelLuminance', 'selectedLabelPreset',
  'selectedColorway',
];

let stack = [];
let cursor = -1;

export function extractColorSnapshot(state) {
  return Object.fromEntries(COLOR_KEYS.map(k => [k, state[k]]));
}

export function pushColorHistory(state) {
  stack = stack.slice(0, cursor + 1);
  stack.push(extractColorSnapshot(state));
  cursor = stack.length - 1;
}

export function canUndo() { return cursor > 0; }
export function canRedo() { return cursor < stack.length - 1; }

export function undoColorState() {
  if (!canUndo()) return null;
  cursor--;
  return { ...stack[cursor] };
}

export function redoColorState() {
  if (!canRedo()) return null;
  cursor++;
  return { ...stack[cursor] };
}

export function resetColorHistory() {
  stack = [];
  cursor = -1;
}
