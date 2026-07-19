import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { createAudioCapture } from '@smartvolume/audio/createAudioCapture';
import { analysisReducer, initialAnalysisState } from '@smartvolume/domain/workflow';
import { DEFAULT_SETTINGS, type SessionSummary, type Settings } from '@smartvolume/domain/models';
import { recommendVolume } from '@smartvolume/domain/recommendation';
import { exportLocalData } from '@smartvolume/platform/exportData';
import { getPlatformCapabilities } from '@smartvolume/platform/runtimeCapabilities';
import { subscribeToCaptureInterruption } from '@smartvolume/platform/captureLifecycle';
import { repository } from '@smartvolume/storage/repository';
import { colors } from '@smartvolume/ui/theme';
import { translate } from './i18n';

type Screen = 'dashboard' | 'history' | 'calibration' | 'settings' | 'privacy';

export function SmartVolumeApp() {
  const [onboarded, setOnboarded] = useState(false);
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [settingsSaveState, setSettingsSaveState] = useState('');
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [state, dispatch] = useReducer(analysisReducer, initialAnalysisState);
  const controller = useRef<AbortController | null>(null);
  const capture = useMemo(() => createAudioCapture(), []);
  const capabilities = useMemo(() => getPlatformCapabilities(), []);

  useEffect(() => {
    void repository.load().then(persisted => {
      setOnboarded(persisted.onboardingComplete);
      setSettings(persisted.settings);
      setSessions(persisted.sessions);
      setReady(true);
    });
    const unsubscribe = subscribeToCaptureInterruption(() => controller.current?.abort());
    return () => {
      unsubscribe();
      controller.current?.abort();
    };
  }, []);
  const updateSettings = (next: Settings) => {
    setSettings(next);
    setSettingsSaveState('Saving settings...');
    void repository.saveSettings(next)
      .then(() => setSettingsSaveState('Settings saved.'))
      .catch(() => setSettingsSaveState('Settings could not be saved.'));
  };
  const start = useCallback(async () => {
    if (state.status === 'recording') return;
    dispatch({ type: 'START' });
    const abort = new AbortController();
    controller.current = abort;
    try {
      dispatch({ type: 'PERMISSION_GRANTED' });
      const metrics = await capture.analyze(settings.sessionSeconds, settings.calibration, {
        onProgress: (progress, liveLevel) => dispatch({ type: 'PROGRESS', progress, liveLevel })
      }, abort.signal);
      dispatch({ type: 'CAPTURE_COMPLETE' });
      const recommendation = recommendVolume(metrics, settings);
      const session: SessionSummary = { id: createSessionId(), createdAt: new Date().toISOString(), metrics, recommendation };
      const persisted = await repository.addSession(session);
      setSessions(persisted.sessions);
      dispatch({ type: 'RESULT', result: metrics });
    } catch (error) {
      if ((error as Error).name === 'AbortError') dispatch({ type: 'CANCEL' });
      else dispatch({ type: 'FAIL', message: error instanceof Error ? error.message : 'Analysis failed.' });
    } finally { controller.current = null; }
  }, [capture, settings, state.status]);
  const latest = sessions[0];

  if (!ready) return <View style={[styles.app, styles.center]}><Text style={styles.body}>Loading SmartVolume...</Text></View>;
  if (!onboarded) return <Onboarding onContinue={() => { void repository.setOnboardingComplete(); setOnboarded(true); }} />;
  return (
    <View style={styles.app}>
      <View style={styles.header}>
        <View><Text accessibilityRole="header" style={styles.brand}>SmartVolume</Text><Text style={styles.tagline}>Hear comfortably. Keep audio private.</Text></View>
        <View style={styles.nav}>
          {(['dashboard','history','calibration','settings','privacy'] as Screen[]).map(item =>
            <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: screen === item }} onPress={() => setScreen(item)} style={[styles.navButton, screen === item && styles.navActive]}><Text style={styles.navText}>{translate(item)}</Text></Pressable>
          )}
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {screen === 'dashboard' && <Dashboard state={state} latest={latest} settings={settings} capabilities={capabilities} onStart={start} onCancel={() => controller.current?.abort()} onReset={() => dispatch({ type: 'RESET' })} />}
        {screen === 'history' && <History sessions={sessions} onExport={() => { void repository.exportJson().then(exportLocalData); }} onDelete={() => { void repository.deleteAll(); setSessions([]); setSettings(DEFAULT_SETTINGS); }} />}
        {screen === 'calibration' && <CalibrationView settings={settings} onChange={updateSettings} />}
        {screen === 'settings' && <SettingsView settings={settings} saveState={settingsSaveState} onChange={updateSettings} />}
        {screen === 'privacy' && <PrivacyView />}
      </ScrollView>
    </View>
  );
}

function Onboarding({ onContinue }: { onContinue(): void }) {
  return <View style={[styles.app, styles.center]}><View style={styles.onboarding}><Text accessibilityRole="header" style={styles.hero}>Sound guidance without recording you</Text><Text style={styles.body}>SmartVolume analyzes microphone frames on your device. Raw audio is never saved or sent anywhere. You choose when each short measurement begins.</Text><Text style={styles.notice}>This is not a certified sound level meter or medical device.</Text><Button label="Continue" onPress={onContinue} /></View></View>;
}

function Dashboard({ state, latest, settings, capabilities, onStart, onCancel, onReset }: any) {
  const [volumeMessage, setVolumeMessage] = useState('');
  const active = ['requesting-permission','recording','processing'].includes(state.status);
  const shown = state.result ?? latest?.metrics;
  const recommendation = state.result ? recommendVolume(state.result, settings) : latest?.recommendation;
  return <View style={styles.grid}>
    <View style={styles.heroCard}>
      <Text style={styles.eyebrow}>{active ? 'ANALYZING LOCALLY' : 'AMBIENT SOUND'}</Text>
      <Text accessibilityLiveRegion="polite" style={styles.metric}>{state.liveLevel?.toFixed(1) ?? shown?.leq?.toFixed(1) ?? 'Ready'}</Text>
      <Text style={styles.unit}>{shown?.unit === 'estimated-dBA' ? 'estimated dBA' : 'relative dBFS, A-weighted'}</Text>
      {active && <View accessible accessibilityLabel={`${Math.round(state.progress * 100)} percent complete`} style={styles.track}><View style={[styles.progress, { width: `${Math.round(state.progress * 100)}%` }]} /></View>}
      {state.error && <Text accessibilityRole="alert" style={styles.error}>{state.error}</Text>}
      <View style={styles.actions}>{active ? <Button label="Cancel" onPress={onCancel} secondary /> : <Button label={`Analyze for ${settings.sessionSeconds} seconds`} onPress={onStart} />}{state.status !== 'idle' && !active && <Button label="Reset view" onPress={onReset} secondary />}</View>
    </View>
    <View style={styles.card}><Text style={styles.cardTitle}>Recommended media volume</Text><Text style={styles.recommendation}>{recommendation ? `${recommendation.percent}%` : 'Measure first'}</Text><Text style={styles.body}>{recommendation?.rationale ?? 'A short local measurement creates a personalized suggestion.'}</Text>{recommendation?.cappedForSafety && <Text style={styles.notice}>Suggestion limited by your safety cap.</Text>}{recommendation && capabilities.volumeControl !== 'guidance' ? <Button label={capabilities.volumeControl === 'system-ui' ? 'Open system volume control' : 'Apply volume'} onPress={() => { void capabilities.applyVolume(recommendation.percent).then(() => setVolumeMessage('Volume control completed.')).catch((error: Error) => setVolumeMessage(error.message)); }} /> : <Text style={styles.muted}>Use your device controls to apply this suggestion.</Text>}{volumeMessage ? <Text accessibilityRole="alert" style={styles.muted}>{volumeMessage}</Text> : null}</View>
    <View style={styles.card}><Text style={styles.cardTitle}>Measurement quality</Text><Text style={styles.body}>{shown?.quality ?? 'Waiting for a measurement'}</Text><Text style={styles.muted}>Peak: {shown ? `${shown.peak.toFixed(1)} ${shown.unit}` : 'Not available'}</Text><Text style={styles.muted}>No raw audio leaves the audio processing thread.</Text></View>
  </View>;
}

function History({ sessions, onDelete, onExport }: { sessions: SessionSummary[]; onDelete(): void; onExport(): void }) {
  return <View style={styles.stack}><Text style={styles.pageTitle}>History</Text><Text style={styles.body}>Only aggregate results are stored. The newest 100 sessions are retained.</Text>{sessions.length === 0 ? <Text style={styles.muted}>No measurements yet.</Text> : sessions.map(item => <View key={item.id} style={styles.card}><Text style={styles.cardTitle}>{new Date(item.createdAt).toLocaleString()}</Text><Text style={styles.body}>{item.metrics.leq.toFixed(1)} {item.metrics.unit}</Text><Text style={styles.muted}>Recommendation: {item.recommendation.percent}%</Text></View>)}<View style={styles.actions}><Button label="Export local data" onPress={onExport} secondary /><Button label="Delete all local data" onPress={onDelete} danger /></View></View>;
}

function CalibrationView({ settings, onChange }: { settings: Settings; onChange(settings: Settings): void }) {
  const [offset, setOffset] = useState(String(settings.calibration.offsetDb));
  return <View style={styles.stack}><Text style={styles.pageTitle}>Calibration</Text><Text style={styles.body}>Compare SmartVolume with a trusted reference meter in a steady environment, then enter the difference. Without calibration, measurements remain relative and are not labeled as SPL.</Text><Text style={styles.label}>Calibration offset in dB</Text><TextInput accessibilityLabel="Calibration offset in decibels" keyboardType="numeric" value={offset} onChangeText={setOffset} style={styles.input} /><Button label="Save reference calibration" onPress={() => { const value = Number(offset); if (Number.isFinite(value) && value >= -20 && value <= 140) onChange({ ...settings, calibration: { offsetDb: value, source: 'reference-meter', updatedAt: new Date().toISOString() } }); }} /><Button label="Remove calibration" secondary onPress={() => onChange({ ...settings, calibration: { offsetDb: 0, source: 'none' } })} /></View>;
}

function SettingsView({ settings, saveState, onChange }: { settings: Settings; saveState: string; onChange(settings: Settings): void }) {
  return <View style={styles.stack}><Text style={styles.pageTitle}>Settings</Text><Text style={styles.label}>Measurement length: {settings.sessionSeconds} seconds</Text><View style={styles.actions}>{[3,5,10,15].map(value => <Pressable key={value} onPress={() => onChange({ ...settings, sessionSeconds: value })} style={[styles.choice, settings.sessionSeconds === value && styles.navActive]}><Text style={styles.navText}>{value}s</Text></Pressable>)}</View><Text style={styles.label}>Maximum suggested volume: {settings.maxRecommendedVolume}%</Text><TextInput accessibilityLabel="Maximum suggested volume" keyboardType="numeric" value={String(settings.maxRecommendedVolume)} onChangeText={(text: string) => { const value = Number(text); if (value >= 20 && value <= 80) onChange({ ...settings, maxRecommendedVolume: value }); }} style={styles.input} /><View style={styles.switchRow}><Text style={styles.body}>Share anonymous diagnostics</Text><Pressable accessibilityRole="switch" accessibilityLabel="Share anonymous diagnostics" accessibilityState={{ checked: settings.diagnosticsOptIn }} aria-checked={settings.diagnosticsOptIn} onPress={() => onChange({ ...settings, diagnosticsOptIn: !settings.diagnosticsOptIn })} style={[styles.toggle, settings.diagnosticsOptIn && styles.toggleOn]}><Text style={styles.toggleText}>{settings.diagnosticsOptIn ? 'On' : 'Off'}</Text></Pressable></View><Text style={styles.muted}>No diagnostics provider is enabled in this local-first release.</Text>{saveState ? <Text accessibilityLiveRegion="polite" style={styles.muted}>{saveState}</Text> : null}</View>;
}

function PrivacyView() { return <View style={styles.stack}><Text style={styles.pageTitle}>Privacy and safety</Text><Text style={styles.body}>Microphone access is used only during a measurement you start. Processing is local. Raw audio is not stored, logged, uploaded, or passed to the interface. You can delete aggregate history at any time.</Text><Text style={styles.cardTitle}>Platform behavior</Text><Text style={styles.body}>Android can apply media volume directly. iOS presents the system volume control. Browsers provide guidance because websites cannot change system volume. Windows and macOS check the active audio route before offering direct control.</Text><Text style={styles.notice}>Volume percentage does not determine hearing exposure by itself. Use device listening safety features and take breaks.</Text></View>; }
function Button({ label, onPress, secondary, danger }: { label: string; onPress(): void; secondary?: boolean; danger?: boolean }) { return <Pressable accessibilityRole="button" onPress={onPress} style={[styles.button, secondary && styles.secondaryButton, danger && styles.dangerButton]}><Text style={[styles.buttonText, secondary && styles.secondaryText]}>{label}</Text></Pressable>; }
const createSessionId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const styles = StyleSheet.create({
  app: { minHeight: '100%', flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: { padding: 24, gap: 20, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  brand: { color: colors.text, fontSize: 28, fontWeight: '800' }, tagline: { color: colors.muted, marginTop: 4 },
  nav: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, navButton: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 9 }, navActive: { backgroundColor: colors.surfaceRaised }, navText: { color: colors.text, fontWeight: '600' },
  content: { width: '100%', maxWidth: 1120, alignSelf: 'center', padding: 24 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 }, stack: { gap: 16 },
  heroCard: { minWidth: 280, flexGrow: 2, flexBasis: 540, padding: 28, borderRadius: 20, backgroundColor: colors.surface },
  card: { minWidth: 260, flexGrow: 1, flexBasis: 300, padding: 22, borderRadius: 16, backgroundColor: colors.surface },
  onboarding: { maxWidth: 680, gap: 20, padding: 32, borderRadius: 20, backgroundColor: colors.surface },
  hero: { color: colors.text, fontSize: 42, lineHeight: 48, fontWeight: '800' }, pageTitle: { color: colors.text, fontSize: 34, fontWeight: '800' },
  eyebrow: { color: colors.primary, fontSize: 13, fontWeight: '800', letterSpacing: 1.4 }, metric: { color: colors.text, fontSize: 72, lineHeight: 82, fontWeight: '800', marginTop: 10 },
  unit: { color: colors.muted, fontSize: 16 }, recommendation: { color: colors.primary, fontSize: 52, fontWeight: '800', marginVertical: 8 },
  cardTitle: { color: colors.text, fontSize: 20, fontWeight: '700' }, body: { color: colors.text, fontSize: 17, lineHeight: 26 }, muted: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  notice: { color: colors.warning, fontSize: 15, lineHeight: 22 }, error: { color: colors.danger, marginTop: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 }, button: { alignSelf: 'flex-start', backgroundColor: colors.primary, paddingVertical: 13, paddingHorizontal: 18, borderRadius: 11 }, buttonText: { color: colors.primaryText, fontWeight: '800' },
  secondaryButton: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border }, secondaryText: { color: colors.text }, dangerButton: { backgroundColor: colors.danger },
  track: { height: 8, backgroundColor: colors.surfaceRaised, borderRadius: 4, marginTop: 22, overflow: 'hidden' }, progress: { height: 8, backgroundColor: colors.primary },
  label: { color: colors.text, fontSize: 16, fontWeight: '700' }, input: { color: colors.text, backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 12, maxWidth: 320 },
  choice: { borderWidth: 1, borderColor: colors.border, borderRadius: 9, paddingVertical: 10, paddingHorizontal: 14 }, switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', maxWidth: 520 },
  toggle: { minWidth: 56, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 18, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  toggleOn: { backgroundColor: colors.primary }, toggleText: { color: colors.text, fontWeight: '700' }
});
