import { describe, expect, it } from 'vitest';
import { analysisReducer, initialAnalysisState } from './workflow';
describe('analysisReducer', () => {
  it('follows the capture lifecycle', () => {
    let state = analysisReducer(initialAnalysisState, { type: 'START' });
    state = analysisReducer(state, { type: 'PERMISSION_GRANTED' });
    state = analysisReducer(state, { type: 'PROGRESS', progress: 2 });
    expect(state.status).toBe('recording');
    expect(state.progress).toBe(1);
    state = analysisReducer(state, { type: 'CANCEL' });
    expect(state.status).toBe('cancelled');
  });
});
