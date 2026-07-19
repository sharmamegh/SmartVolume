import React

@objc(SmartVolumeStorage)
final class SmartVolumeStorage: NSObject {
    private let queue = DispatchQueue(label: "dev.mnsharma.smartvolume.storage")
    @objc static func requiresMainQueueSetup() -> Bool { false }

    @objc(get:resolver:rejecter:)
    func get(key: String, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
        queue.async {
            do { resolve(try self.read()[key]) }
            catch { reject("E_STORAGE", error.localizedDescription, error) }
        }
    }
    @objc(set:value:resolver:rejecter:)
    func set(key: String, value: String, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
        queue.async {
            do {
                var values = try self.read()
                values[key] = value
                try self.write(values)
                resolve(nil)
            } catch { reject("E_STORAGE", error.localizedDescription, error) }
        }
    }
    @objc(remove:resolver:rejecter:)
    func remove(key: String, resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock) {
        queue.async {
            do {
                var values = try self.read()
                values.removeValue(forKey: key)
                try self.write(values)
                resolve(nil)
            } catch { reject("E_STORAGE", error.localizedDescription, error) }
        }
    }

    private func storageURL() throws -> URL {
        let directory = try FileManager.default.url(
            for: .applicationSupportDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: true
        ).appendingPathComponent("SmartVolume", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        var mutableDirectory = directory
        try mutableDirectory.setResourceValues(values)
        return directory.appendingPathComponent("local-state.json")
    }

    private func read() throws -> [String: String] {
        let url = try storageURL()
        guard FileManager.default.fileExists(atPath: url.path) else { return [:] }
        return try JSONDecoder().decode([String: String].self, from: Data(contentsOf: url))
    }

    private func write(_ values: [String: String]) throws {
        let url = try storageURL()
        try JSONEncoder().encode(values).write(to: url, options: .atomic)
        var resources = URLResourceValues()
        resources.isExcludedFromBackup = true
        var mutableURL = url
        try mutableURL.setResourceValues(resources)
    }
}
