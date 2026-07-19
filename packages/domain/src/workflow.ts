import type { SessionStatus, SoundMetrics } from './models';

export interface AnalysisState {
  status: SessionStatus;
  progress: number;
  liveLevel?: number;
  result?: SoundMetrics;
  error?: string;
}

export type AnalysisEvent =
  | { type: 'START' }
  | { type: 'PERMISSION_GRANTED' }
  | { type: 'PROGRESS'; progress: number; liveLevel?: number }
  | { type: 'CAPTURE_COMPLETE' }
  | { type: 'RESULT'; result: SoundMetrics }
  | { type: 'CANCEL' }
  | { type: 'FAIL'; message: string }
  | { type: 'RESET' };

export const initialAnalysisState: AnalysisState = { status: 'idle', progress: 0 };

export function analysisReducer(state: AnalysisState, event: AnalysisEvent): AnalysisState {
  switch (event.type) {
    case 'START':
      return state.status === 'recording' ? state : { status: 'requesting-permission', progress: 0 };
    case 'PERMISSION_GRANTED':
      return state.status === 'requesting-permission' ? { status: 'recording', progress: 0 } : state;
    case 'PROGRESS':
      return state.status === 'recording' ? { ...state, progress: Math.max(0, Math.min(1, event.progress)), liveLevel: event.liveLevel } : state;
    case 'CAPTURE_COMPLETE':
      return state.status === 'recording' ? { ...state, status: 'processing', progress: 1 } : state;
    case 'RESULT':
      return state.status === 'processing' ? { status: 'completed', progress: 1, result: event.result } : state;
    case 'CANCEL':
      return ['recording', 'requesting-permission', 'processing'].includes(state.status) ? { status: 'cancelled', progress: 0 } : state;
    case 'FAIL':
      return { status: 'failed', progress: 0, error: event.message };
    case 'RESET':
      return initialAnalysisState;
    default:
      return state;
  }
}
