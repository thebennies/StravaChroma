import { describe, it, expect } from 'vitest';
import { appState, setState, subscribe } from './state.js';

describe('state management', () => {
  it('notifies subscribers on state change', () => {
    const calls = [];
    const unsubscribe = subscribe((state) => calls.push(state.mapHue));
    
    setState({ mapHue: 180 });
    expect(calls).toContain(180);
    
    unsubscribe();
  });

  it('allows unsubscribing from state changes', () => {
    const calls = [];
    const unsubscribe = subscribe((state) => calls.push(state.mapHue));
    
    setState({ mapHue: 100 });
    expect(calls).toContain(100);
    
    // Unsubscribe
    unsubscribe();
    
    // Should not receive further updates
    setState({ mapHue: 200 });
    expect(calls).not.toContain(200);
  });

  it('handles multiple subscribers independently', () => {
    const calls1 = [];
    const calls2 = [];
    
    const unsubscribe1 = subscribe((state) => calls1.push(state.mapHue));
    const unsubscribe2 = subscribe((state) => calls2.push(state.mapHue));
    
    setState({ mapHue: 150 });
    
    expect(calls1).toContain(150);
    expect(calls2).toContain(150);
    
    // Unsubscribe first listener only
    unsubscribe1();
    setState({ mapHue: 250 });
    
    expect(calls1).not.toContain(250);
    expect(calls2).toContain(250);
    
    unsubscribe2();
  });
});