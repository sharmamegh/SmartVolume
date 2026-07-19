# Privacy and security

Audio capture starts only after a user action and permission grant. Raw audio is processed in memory, never persisted, logged, uploaded, or bridged into UI code. Aggregate history is bounded to 100 sessions and can be deleted locally.

No diagnostics vendor is enabled. A future integration must be opt-in, scrub identifiers and measurement values by default, document retention, and support consent withdrawal.

Release CI should add dependency review, secret scanning, an SBOM, license policy, signed artifacts, and store privacy declarations before public distribution.
