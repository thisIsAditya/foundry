export class StallDetector {
  rounds = 0;

  constructor(private readonly maxStalls: number) {}

  recordRound(): boolean {
    this.rounds += 1;
    return this.rounds > this.maxStalls;
  }
}
