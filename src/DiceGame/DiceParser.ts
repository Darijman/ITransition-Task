import { Dice } from "./Dice";

export class DiceParser {
  static parseDiceArgs(args: string[]): Dice[] {
    return args.map(arg => {
      const parts = arg.split(",").map(n => parseInt(n, 10));
      if (parts.length < 6 || parts.some(isNaN)) {
        console.log(`❌ Error: each die must have at least 6 faces. Invalid input: "${arg}"`);
        process.exit(1);
      }
      return new Dice(parts);
    });
  }
}