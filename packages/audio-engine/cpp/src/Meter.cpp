#include "smartvolume/Meter.h"
#include <algorithm>
#include <cmath>
#include <complex>
namespace smartvolume {
namespace {
constexpr double pi = 3.14159265358979323846;
double db(double value) { return value > 0 ? 20.0 * std::log10(value) : -120.0; }
}
Meter::Meter(double sample_rate) { configure(sample_rate); }
double Meter::Biquad::process(double sample) {
  const auto output = b0 * sample + z1;
  z1 = b1 * sample - a1 * output + z2;
  z2 = b2 * sample - a2 * output;
  return output;
}
void Meter::Biquad::reset() { z1 = 0; z2 = 0; }
void Meter::configure(double sample_rate) {
  const auto pole = [sample_rate](double hz) {
    return std::exp(-2.0 * pi * hz / sample_rate);
  };
  const auto p1 = pole(20.598997);
  const auto p2 = pole(107.65265);
  const auto p3 = pole(737.86223);
  const auto p4 = pole(12194.217);
  weighting_sections_[0] = {1, -2, 1, -2 * p1, p1 * p1};
  weighting_sections_[1] = {1, -2, 1, -(p2 + p3), p2 * p3};
  weighting_sections_[2] = {1, 2, 1, -2 * p4, p4 * p4};

  const auto omega = 2.0 * pi * 1000.0 / sample_rate;
  const auto z1 = std::exp(std::complex<double>(0, -omega));
  const auto z2 = z1 * z1;
  std::complex<double> response = 1;
  for (auto const &section : weighting_sections_) {
    response *= (section.b0 + section.b1 * z1 + section.b2 * z2) /
        (1.0 + section.a1 * z1 + section.a2 * z2);
  }
  const auto gain = 1.0 / std::abs(response);
  weighting_sections_[2].b0 *= gain;
  weighting_sections_[2].b1 *= gain;
  weighting_sections_[2].b2 *= gain;
}
void Meter::reset() {
  for (auto &section : weighting_sections_) section.reset();
  energy_ = 0;
  peak_ = 0;
  clipped_ = 0;
  samples_ = 0;
  frame_levels_.clear();
}
double Meter::weighted(float sample) {
  auto output = static_cast<double>(sample);
  for (auto &section : weighting_sections_) output = section.process(output);
  return std::isfinite(output) ? output : 0;
}
void Meter::process(const float* samples, std::size_t count) {
  double frame_energy = 0;
  for (std::size_t i = 0; i < count; ++i) {
    const auto value = std::clamp(samples[i], -1.0f, 1.0f);
    const auto filtered = weighted(value);
    energy_ += filtered * filtered;
    frame_energy += filtered * filtered;
    peak_ = std::max(peak_, std::abs(static_cast<double>(value)));
    clipped_ += std::abs(value) >= 0.999f;
    ++samples_;
  }
  if (count > 0 && frame_levels_.size() < 240) {
    frame_levels_.push_back(db(std::sqrt(frame_energy / count)));
  }
}
Metrics Meter::metrics() const {
  auto levels = frame_levels_;
  std::sort(levels.begin(), levels.end());
  const auto percentile = [&levels](double ratio) {
    if (levels.empty()) return -120.0;
    return levels[std::min(levels.size() - 1, static_cast<std::size_t>(ratio * levels.size()))];
  };
  return {
      samples_ ? db(std::sqrt(energy_ / samples_)) : -120.0,
      db(peak_),
      percentile(0.9),
      percentile(0.5),
      percentile(0.1),
      samples_ ? static_cast<double>(clipped_) / samples_ : 0,
      samples_};
}
}
