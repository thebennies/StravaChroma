import posthog from 'posthog-js';

posthog.init('phc_vAvPbQVhh6nji8nxQjWWCSoBmmPfgC26rvhhGrcZpssG', {
  api_host: 'https://eu.i.posthog.com',
  autocapture: false,
  capture_heatmaps: false,
  capture_pageview: true,
});

export function trackColorwaySelected(colorway, index) {
  posthog.capture('colorway_selected', {
    colorway_name:  colorway.name,
    colorway_group: colorway.group,
    colorway_index: index,
  });
}

export function trackExport(state, colorways) {
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
