import AVFoundation
import React

@objc(SmartVolumeAudioEngine)
final class SmartVolumeAudioEngine: NSObject {
    private let queue = DispatchQueue(label: "dev.mnsharma.smartvolume.capture", qos: .userInitiated)
    private var engine: AVAudioEngine?
    private var completionWorkItem: DispatchWorkItem?
    private var pendingReject: RCTPromiseRejectBlock?

    @objc static func requiresMainQueueSetup() -> Bool { false }

    @objc(start:calibrationOffsetDb:resolver:rejecter:)
    func start(
        durationMs: Double,
        calibrationOffsetDb: Double,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        queue.async {
            guard self.engine == nil else {
                reject("E_BUSY", "A measurement is already running.", nil)
                return
            }
            let session = AVAudioSession.sharedInstance()
            session.requestRecordPermission { granted in
                guard granted else {
                    reject("E_PERMISSION", "Microphone permission is required.", nil)
                    return
                }
                self.queue.async {
                    let engine = AVAudioEngine()
                    let meter = SmartVolumeMeterBridge()
                    let input = engine.inputNode
                    let format = input.inputFormat(forBus: 0)
                    meter.reset(withSampleRate: format.sampleRate)
                    self.engine = engine
                    self.pendingReject = reject
                    input.installTap(onBus: 0, bufferSize: 4096, format: format) { buffer, _ in
                        guard let samples = buffer.floatChannelData?[0] else { return }
                        meter.process(samples, count: UInt(buffer.frameLength))
                    }
                    do {
                        try session.setCategory(.record, mode: .measurement, options: [])
                        try session.setActive(true)
                        try engine.start()
                        let startedAt = ProcessInfo.processInfo.systemUptime
                        let completion = DispatchWorkItem {
                            guard self.engine === engine else { return }
                            input.removeTap(onBus: 0)
                            engine.stop()
                            try? session.setActive(false, options: .notifyOthersOnDeactivation)
                            self.engine = nil
                            self.completionWorkItem = nil
                            self.pendingReject = nil
                            let elapsed = (ProcessInfo.processInfo.systemUptime - startedAt) * 1000
                            resolve(meter.finish(withCalibrationOffset: calibrationOffsetDb, durationMs: elapsed))
                        }
                        self.completionWorkItem = completion
                        self.queue.asyncAfter(deadline: .now() + durationMs / 1000, execute: completion)
                    } catch {
                        input.removeTap(onBus: 0)
                        self.engine = nil
                        self.completionWorkItem = nil
                        self.pendingReject = nil
                        reject("E_CAPTURE", error.localizedDescription, error)
                    }
                }
            }
        }
    }

    @objc func cancel() {
        queue.async {
            self.completionWorkItem?.cancel()
            self.completionWorkItem = nil
            if let engine = self.engine {
                engine.inputNode.removeTap(onBus: 0)
                engine.stop()
                try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
                self.engine = nil
                self.pendingReject?("E_CANCELLED", "Measurement cancelled.", nil)
                self.pendingReject = nil
            }
        }
    }
}
