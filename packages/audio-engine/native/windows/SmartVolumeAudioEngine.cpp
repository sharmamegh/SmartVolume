#include "smartvolume/Meter.h"
#include <atomic>
#include <memory>

namespace smartvolume::windows {
class SmartVolumeAudioEngine {
 public:
  void start() {
    meter_ = std::make_unique<smartvolume::Meter>();
    meter_->reset();
    running_.store(true);
  }
  void process_wasapi_frame(const float* mono_samples, std::size_t count) {
    if (running_.load() && meter_) meter_->process(mono_samples, count);
  }
  smartvolume::Metrics finish() {
    running_.store(false);
    return meter_ ? meter_->metrics() : smartvolume::Metrics{};
  }
  void cancel() { running_.store(false); }

 private:
  std::atomic_bool running_{false};
  std::unique_ptr<smartvolume::Meter> meter_;
};
}
