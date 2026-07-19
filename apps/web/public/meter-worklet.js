class SmartVolumeMeter extends AudioWorkletProcessor {
  constructor() {
    super();
    this.energy = 0;
    this.count = 0;
    this.peak = 0;
    this.clipped = 0;
    this.lastReport = 0;
    const pole = frequency => Math.exp(-2 * Math.PI * frequency / sampleRate);
    const p1 = pole(20.598997);
    const p2 = pole(107.65265);
    const p3 = pole(737.86223);
    const p4 = pole(12194.217);
    this.filters = [
      { b0: 1, b1: -2, b2: 1, a1: -2 * p1, a2: p1 * p1, z1: 0, z2: 0 },
      { b0: 1, b1: -2, b2: 1, a1: -(p2 + p3), a2: p2 * p3, z1: 0, z2: 0 },
      { b0: 1, b1: 2, b2: 1, a1: -2 * p4, a2: p4 * p4, z1: 0, z2: 0 }
    ];
    const omega = 2 * Math.PI * 1000 / sampleRate;
    const magnitude = this.filters.reduce((result, filter) => {
      const numeratorReal = filter.b0 + filter.b1 * Math.cos(omega) + filter.b2 * Math.cos(2 * omega);
      const numeratorImaginary = -filter.b1 * Math.sin(omega) - filter.b2 * Math.sin(2 * omega);
      const denominatorReal = 1 + filter.a1 * Math.cos(omega) + filter.a2 * Math.cos(2 * omega);
      const denominatorImaginary = -filter.a1 * Math.sin(omega) - filter.a2 * Math.sin(2 * omega);
      return result * Math.sqrt(
        (numeratorReal ** 2 + numeratorImaginary ** 2) /
        (denominatorReal ** 2 + denominatorImaginary ** 2)
      );
    }, 1);
    this.filters[2].b0 /= magnitude;
    this.filters[2].b1 /= magnitude;
    this.filters[2].b2 /= magnitude;
  }
  weighted(sample) {
    let output = sample;
    for (const filter of this.filters) {
      const next = filter.b0 * output + filter.z1;
      filter.z1 = filter.b1 * output - filter.a1 * next + filter.z2;
      filter.z2 = filter.b2 * output - filter.a2 * next;
      output = next;
    }
    return Number.isFinite(output) ? output : 0;
  }
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel) return true;
    for (const sample of channel) {
      const weighted = this.weighted(sample);
      this.energy += weighted * weighted;
      this.count += 1;
      this.peak = Math.max(this.peak, Math.abs(sample));
      if (Math.abs(sample) >= 0.999) this.clipped += 1;
    }
    const now = currentTime;
    if (now - this.lastReport >= 0.25) {
      this.port.postMessage({ energy: this.energy, count: this.count, peak: this.peak, clipped: this.clipped });
      this.energy = 0; this.count = 0; this.peak = 0; this.clipped = 0; this.lastReport = now;
    }
    return true;
  }
}
registerProcessor('smartvolume-meter', SmartVolumeMeter);
