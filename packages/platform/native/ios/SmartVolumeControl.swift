import MediaPlayer
import React
import UIKit

@objc(SmartVolumeControl)
final class SmartVolumeControl: NSObject {
    @objc static func requiresMainQueueSetup() -> Bool { true }

    @objc(isAvailable:rejecter:)
    func isAvailable(resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
        resolve(true)
    }

    @objc(apply:resolver:rejecter:)
    func apply(
        percent: Double,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        DispatchQueue.main.async {
            guard let controller = RCTPresentedViewController() else {
                reject("E_UI", "System volume control could not be presented.", nil)
                return
            }
            let sheet = UIAlertController(
                title: "Suggested volume: \(Int(percent))%",
                message: "\n\nUse the system control below.",
                preferredStyle: .alert
            )
            let volumeView = MPVolumeView(frame: CGRect(x: 20, y: 64, width: 230, height: 32))
            sheet.view.addSubview(volumeView)
            sheet.addAction(UIAlertAction(title: "Done", style: .default) { _ in resolve(nil) })
            controller.present(sheet, animated: true)
        }
    }
}
