# SmartVolume

SmartVolume is an Android application that dynamically suggests a device volume setting based on the ambient noise level. Built with Kotlin and Jetpack Compose, it captures sound from the device's microphone for a user-selected duration, computes an estimated decibel level, and maps this value to a suggested volume percentage.

## Features

- **Ambient Noise Analysis:**  
  Records audio for a user-defined duration (between 1 and 30 seconds) to analyze the surrounding noise.

- **Adaptive Volume Suggestion:**  
  Calculates a noise level (in dB) using a simple RMS algorithm and suggests a corresponding device volume level.

- **Interactive UI:**  
  Built using Jetpack Compose, the UI includes:
  - A large, clear display of the current ambient noise level.
  - Sliders to adjust both the suggested volume and the recording duration.
  - A progress bar that indicates when audio analysis is in progress.
  - Buttons to analyze noise, confirm the volume setting, and reset the results.

- **Permission Handling:**  
  Requests and handles microphone permissions appropriately to ensure smooth operation.

## How It Works

1. **Recording & Analysis:**  
   The app records audio from the microphone for a duration specified by the user. It continuously accumulates audio samples over this period and computes the RMS value to estimate the noise level in decibels.

2. **Volume Mapping:**  
   Based on the computed decibel level, the app maps the value to a suggested volume level (e.g., low noise suggests 30%, moderate noise 50%, etc.). These thresholds can be adjusted for better calibration.

3. **User Interaction:**  
   Users can view the ambient noise and the corresponding volume suggestion, adjust the volume via a slider, and apply the setting to their device.

## Limitations & Future Improvements

- **Calibration:**  
  The current decibel values are relative and may not represent true dB SPL without proper calibration against a known sound level.

- **Signal Processing:**  
  Future improvements could include more advanced filtering and averaging to achieve a more accurate noise analysis.

- **Mapping Adjustments:**  
  The thresholds mapping noise levels to volume settings are basic and may need adjustments based on further testing and user feedback.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements, bug fixes, or new feature suggestions. For major changes, please discuss your ideas by opening an issue first. Thank you for helping improve SmartVolume!
