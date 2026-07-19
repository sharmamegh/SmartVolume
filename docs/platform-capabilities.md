# Platform capabilities

## Android
Native microphone capture and direct media-stream volume apply are supported after explicit permission and user action.

## iOS
Native microphone capture is supported. Apple does not expose arbitrary system-volume mutation, so the app presents a visible `MPVolumeView` for user control.

## Web
Secure-context microphone capture uses Web Audio. Browsers cannot change system volume, so the app shows a recommendation and device-control guidance.

## Windows
WASAPI capture and Windows Core Audio endpoint volume are provided by a C++ TurboModule. Apply is shown only when the active endpoint supports it.

## macOS
CoreAudio capture and output control are provided by an AppKit module. Apply is shown only when the active route and sandbox entitlement allow it.
