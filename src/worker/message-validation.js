/**
 * Worker message validation utilities
 * Ensures message structure integrity before processing
 */

/**
 * Validate classify message structure
 * @param {Object} msg - Worker message
 * @returns {boolean} True if message is valid
 */
export function isValidClassifyMsg(msg) {
  return msg &&
    typeof msg.requestId === 'number' &&
    msg.pixelData instanceof Uint8ClampedArray &&
    typeof msg.width === 'number' &&
    typeof msg.height === 'number' &&
    msg.width > 0 &&
    msg.height > 0;
}

/**
 * Validate render message structure
 * @param {Object} msg - Worker message
 * @returns {boolean} True if message is valid
 */
export function isValidRenderMsg(msg) {
  return msg &&
    typeof msg.requestId === 'number' &&
    msg.pixelData instanceof Uint8ClampedArray &&
    msg.mask instanceof Uint8Array &&
    typeof msg.width === 'number' &&
    typeof msg.height === 'number' &&
    msg.width > 0 &&
    msg.height > 0 &&
    typeof msg.sliders === 'object' &&
    msg.sliders !== null;
}
