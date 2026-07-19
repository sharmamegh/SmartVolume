# Battery and performance

SmartVolume records only during a user-started session. The default session is five seconds and the maximum product option is fifteen seconds. Capture stops when the app leaves the foreground, the user cancels, the timer ends, or an error occurs.

Native adapters use bounded audio buffers and process frames in C++. Web capture uses an `AudioWorklet`. Raw samples do not enter React state or cross the native module boundary. The interface receives aggregate updates no faster than four times per second.

Release profiling should measure CPU time, wakeups, memory growth, microphone teardown latency, and energy impact on representative low-end and high-end devices. Continuous background listening is intentionally excluded from the local-first release.
