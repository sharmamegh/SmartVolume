# Contributing

Use Node 22, install with `pnpm install --frozen-lockfile`, and run `pnpm verify` plus native DSP tests before opening a change. Keep domain logic platform-independent, never bridge or persist raw audio, add tests for behavior changes, and document platform capability differences.
