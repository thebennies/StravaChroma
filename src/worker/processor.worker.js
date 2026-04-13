// Pure computation module — no DOM APIs allowed
// Entry point for the Web Worker

import { classify } from './classification.js';
import { render } from './rendering.js';
import { isValidClassifyMsg, isValidRenderMsg } from './message-validation.js';

self.onmessage = function(e) {
  const msg = e.data;

  if (msg.type === 'classify') {
    if (!isValidClassifyMsg(msg)) {
      console.error('Invalid classify message:', msg);
      self.postMessage({ 
        type: 'error', 
        requestId: msg.requestId ?? 0, 
        message: 'Invalid classify message structure' 
      });
      return;
    }
    
    const { requestId, pixelData, width, height } = msg;
    try {
      const mask = classify(pixelData, width, height);
      let mapCount = 0, textCount = 0;
      for (let i = 0; i < mask.length; i++) {
        if (mask[i] === 1) mapCount++; // MASK_MAP
        else if (mask[i] === 2 || mask[i] === 3) textCount++; // MASK_DATA || MASK_LABEL
      }
      self.postMessage({ 
        type: 'classified', 
        requestId, 
        mask, 
        mapCount, 
        textCount 
      }, [mask.buffer]);
    } catch (err) {
      console.error('Worker classify error:', err);
      self.postMessage({ type: 'error', requestId, message: err.message });
    }
    return;
  }

  if (msg.type === 'render') {
    if (!isValidRenderMsg(msg)) {
      console.error('Invalid render message:', msg);
      self.postMessage({ 
        type: 'error', 
        requestId: msg.requestId ?? 0, 
        message: 'Invalid render message structure' 
      });
      return;
    }
    
    const { requestId, pixelData, mask, width, height, sliders, downscale, gradientEnabled } = msg;
    try {
      const result = render(pixelData, mask, width, height, sliders, downscale, gradientEnabled);
      self.postMessage(
        { 
          type: 'rendered', 
          requestId, 
          pixelData: result.data, 
          width: result.width, 
          height: result.height 
        },
        [result.data.buffer]
      );
    } catch (err) {
      console.error('Worker render error:', err);
      self.postMessage({ type: 'error', requestId, message: err.message });
    }
    return;
  }
  
  // Unknown message type
  console.error('Unknown worker message type:', msg.type);
  self.postMessage({ 
    type: 'error', 
    requestId: msg.requestId ?? 0, 
    message: `Unknown message type: ${msg.type}` 
  });
};
