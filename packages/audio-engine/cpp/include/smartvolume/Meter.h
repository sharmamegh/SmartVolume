#pragma once
#include <array>
#include <cstddef>
#include <vector>
namespace smartvolume {
struct Metrics {
  double leqDbfsA;
  double peakDbfs;
  double percentile10;
  double percentile50;
  double percentile90;
  double clippedRatio;
  std::size_t samples;
};
class Meter {
 public:
  explicit Meter(double sample_rate = 48000.0);
  void reset();
  void process(const float* samples, std::size_t count);
  Metrics metrics() const;
 private:
  struct Biquad {
    double b0 = 0;
    double b1 = 0;
    double b2 = 0;
    double a1 = 0;
    double a2 = 0;
    double z1 = 0;
    double z2 = 0;
    double process(double sample);
    void reset();
  };
  void configure(double sample_rate);
  double weighted(float sample);
  std::array<Biquad, 3> weighting_sections_{};
  double energy_ = 0;
  double peak_ = 0;
  std::size_t clipped_ = 0;
  std::size_t samples_ = 0;
  std::vector<double> frame_levels_;
};
}
