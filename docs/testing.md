# Testing

Run `pnpm verify` for lint, strict TypeScript, domain, workflow, storage, DSP accumulator tests, and the production web build. Run the CMake commands in the root README for native DSP tests.

Run `pnpm test:e2e` for Playwright browser flows. The `.maestro/smoke.yaml` flow provides the shared Android and iOS onboarding smoke test.

Native release gates also require microphone grant, denial, revocation, interruption, cancellation, backgrounding, silent input, clipping, unavailable input, calibration, migration, deletion, and unsupported volume-control scenarios on physical devices. Windows and macOS builds run on their matching CI hosts.
