import posthog from 'posthog-js';

// Only initialize analytics in production builds
// This respects user privacy in development and reduces noise in analytics
const isProduction = import.meta.env.PROD;

if (isProduction) {
  posthog.init('phc_vAvPbQVhh6nji8nxQjWWCSoBmmPfgC26rvhhGrcZpssG', {
    api_host: 'https://eu.i.posthog.com',
    autocapture: false,
    capture_heatmaps: false,
    capture_pageview: true,
  });
}

/**
 * Track colorway selection event
 * Only captured in production builds
 */
export function trackColorwaySelected(colorway, index) {
  if (!isProduction) return;
  
  posthog.capture('colorway_selected', {
    colorway_name:  colorway.name,
    colorway_group: colorway.group,
    colorway_index: index,
  });
}

/**
 * Track image export event
 * Only captured in production builds
 */
export function trackExport(state, colorways) {
  if (!isProduction) return;
  
  const named = state.selectedColorway >= 0 ? colorways[state.selectedColorway] : null;

  posthog.capture('image_exported', {
    colorway_name:  named ? named.name  : 'custom',
    colorway_group: named ? named.group : 'custom',
    map_hue:        state.mapHue,
    map_sat:        state.mapSat,
    map_luminance:  state.mapLuminance,
    data_hue:       state.dataHue,
    data_sat:       state.dataSat,
    data_luminance: state.dataLuminance,
    label_hue:      state.labelHue,
    label_sat:      state.labelSat,
    label_luminance: state.labelLuminance,
  });
}
