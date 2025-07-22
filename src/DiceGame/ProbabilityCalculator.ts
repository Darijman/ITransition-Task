import { Dice } from "./Dice";

export class ProbabilityCalculator {
  static calculateWinProbability(user: Dice, computer: Dice): number {
    let wins = 0, total = 0;
    const faces = user.faces.length;

    for (let i = 0; i < faces; i++) {
      for (let j = 0; j < faces; j++) {
        const u = user.faces[i];
        const c = computer.faces[j];
        if (u > c) wins++;
        total++;
      }
    }

    return wins / total;
  }
}