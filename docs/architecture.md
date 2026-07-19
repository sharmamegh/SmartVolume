# Architecture

SmartVolume uses feature-oriented shared React Native code with strict capability boundaries. The analysis workflow depends on `AudioCapture`, `VolumeControl`, and `LocalRepository` contracts, not platform APIs. Aggregate metrics are the only output from capture.

The native path captures at the device sample rate into bounded buffers and processes frames in the shared C++ meter. The web path uses `getUserMedia`, an `AudioWorklet`, and the equivalent filter and accumulator. UI updates are throttled to four times per second.

The local-first release has no account, backend, analytics vendor, advertising SDK, or raw-audio persistence.
