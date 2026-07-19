#include "smartvolume/Meter.h"
#include <cassert>
#include <cmath>
#include <vector>
std::vector<float> tone(double frequency) {
  std::vector<float> samples(96000);
  for (std::size_t i = 0; i < samples.size(); ++i) {
    samples[i] = 0.5f * std::sin(2 * 3.141592653589793 * frequency * i / 48000);
  }
  return samples;
}
int main() {
  smartvolume::Meter meter;
  meter.reset();
  std::vector<float> silence(48000, 0);
  meter.process(silence.data(), silence.size());
  auto silent = meter.metrics();
  assert(silent.samples == 48000);
  assert(silent.leqDbfsA <= -119.0);
  meter.reset();
  auto one_khz = tone(1000);
  meter.process(one_khz.data(), one_khz.size());
  auto result = meter.metrics();
  assert(std::isfinite(result.leqDbfsA));
  assert(result.peakDbfs < -5.9 && result.peakDbfs > -6.2);
  assert(result.leqDbfsA < -8.8 && result.leqDbfsA > -9.3);
  meter.reset();
  auto one_hundred_hz = tone(100);
  meter.process(one_hundred_hz.data(), one_hundred_hz.size());
  assert(meter.metrics().leqDbfsA < result.leqDbfsA - 15.0);
}
