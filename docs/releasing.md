# Releasing

1. Pin one compatible React Native, Windows, and macOS version family.
2. Run shared verification and C++ tests on Linux, macOS, and Windows.
3. Build unsigned Android, iOS, Windows, and macOS artifacts in CI.
4. Run physical-device capture and accessibility matrices.
5. Review privacy declarations, licenses, release notes, signing, and rollback artifacts.
6. Promote signed artifacts only after every supported platform smoke test passes.
