/**
 * Deterministic Seeded Pseudo-Random Number Generator (Mulberry32)
 * Ensures the exact same handwriting variation is reproduced across renders and export.
 */
export class PRNG {
  private state: number;

  constructor(seed: number = 1337) {
    this.state = seed >>> 0;
  }

  /**
   * Returns a pseudo-random float between 0 (inclusive) and 1 (exclusive)
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Float between min and max
   */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Integer between min and max inclusive
   */
  rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /**
   * Approximate gaussian distribution centered at mean with stdDev
   */
  gaussian(mean: number = 0, stdDev: number = 1): number {
    // Box-Muller transform
    const u1 = Math.max(1e-15, this.next());
    const u2 = this.next();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
  }

  /**
   * Random choice from array
   */
  choice<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  /**
   * Re-seed the generator
   */
  setSeed(seed: number) {
    this.state = seed >>> 0;
  }
}
