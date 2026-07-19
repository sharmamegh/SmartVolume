# SmartVolume

SmartVolume is a privacy-first, local ambient sound analyzer that recommends a comfortable media-volume range. Version 2 replaces the Android-only prototype with shared React Native product code for Android, iOS, web, Windows, and macOS.

## Architecture

The repository contains checked-in shells for Android, iOS, web, Windows, and macOS. Shared TypeScript features live under `packages`, while microphone capture, volume control, storage, and the C++ signal processor use platform adapters. Browser audio runs in an `AudioWorklet`; native audio stays outside the JavaScript thread.

## Development

```bash
corepack pnpm install
pnpm dev
pnpm verify
pnpm test:e2e
```

Native DSP tests:

```bash
cmake -S packages/audio-engine/cpp -B packages/audio-engine/cpp/build
cmake --build packages/audio-engine/cpp/build
ctest --test-dir packages/audio-engine/cpp/build --output-on-failure
```

Native application builds require JDK 17 plus the Android SDK, full Xcode plus CocoaPods, or Visual Studio with the Windows App SDK, depending on the target. CI runs each platform on its matching host.

## Privacy and measurement limits

Raw microphone audio is never stored, uploaded, or sent to JavaScript. Local history contains only bounded aggregate summaries. Uncalibrated results are labeled relative dBFS, A-weighted. Calibrated values remain estimates.

SmartVolume is not a certified sound level meter or medical device.

See `docs/architecture.md`, `docs/platform-capabilities.md`, `docs/signal-processing.md`, and `docs/testing.md`.
