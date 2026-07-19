# Signal processing

The processor normalizes mono floating-point PCM, applies an A-weighting IIR filter, accumulates energy for Leq, tracks unweighted digital peak and clipping, and records low-rate frame levels for percentiles. Silence, clipping, and short sessions are marked as low quality.

Without calibration, output is `relative-dBFS-A`. A reference-meter offset changes the label to `estimated-dBA`, not certified SPL. Production calibration should validate filter response and device profiles against IEC 61672 reference equipment before any compliance claim.

Raw samples stay in the audio thread and bounded native buffers. Only aggregate frames and final metrics cross the application boundary.
