import { DEFAULT_MAP_PRESET, DEFAULT_DATA_PRESET, DEFAULT_LABEL_PRESET, PRESETS } from './constants.js';

export const appState = {
  // Image
  sourceFile:           null,   // File
  sourcePixelData:      null,   // Uint8ClampedArray — original RGBA
  sourceWidth:          0,
  sourceHeight:         0,
  classificationMask:   null,   // Uint8Array — 0/1/2/3 per pixel
  previewPixelData:     null,   // Uint8ClampedArray — 50% res render result
  previewWidth:         0,
  previewHeight:        0,

  // Async flags
  isClassifying:        false,
  isRendering:          false,
  isExporting:          false,

  // Slider values
  mapHue:               PRESETS[DEFAULT_MAP_PRESET].hue,
  mapSat:               PRESETS[DEFAULT_MAP_PRESET].sat,
  mapLuminance:         PRESETS[DEFAULT_MAP_PRESET].luminance,
  dataHue:              PRESETS[DEFAULT_DATA_PRESET].hue,
  dataSat:              PRESETS[DEFAULT_DATA_PRESET].sat,
  dataLuminance:        PRESETS[DEFAULT_DATA_PRESET].luminance,
  labelHue:             PRESETS[DEFAULT_LABEL_PRESET].hue,
  labelSat:             PRESETS[DEFAULT_LABEL_PRESET].sat,
  labelLuminance:       PRESETS[DEFAULT_LABEL_PRESET].luminance,

  // Preset selection
  selectedMapPreset:    DEFAULT_MAP_PRESET,
  selectedDataPreset:   DEFAULT_DATA_PRESET,
  selectedLabelPreset:  DEFAULT_LABEL_PRESET,
  selectedColorway:  -1,

  // Background
  selectedBackground:   'auto',    // 'auto' | 'black' | 'white' | 'image'
  customImage:          null,       // data URL string | null

  // Effects
  dropShadowEnabled:    false,     // true | false

  // Logo overlay
  showLogo:             false,     // true | false - show StravaChroma logo on export
};

const listeners = [];

export function setState(patch) {
  Object.assign(appState, patch);
  for (const fn of listeners) fn(appState);
}

export function subscribe(fn) {
  listeners.push(fn);
}
