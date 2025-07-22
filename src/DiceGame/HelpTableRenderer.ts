import chalk from "chalk";
import { Dice } from "./Dice";
import { ProbabilityCalculator } from "./ProbabilityCalculator";

export class HelpTableRenderer {
  static printHelpTable(diceList: Dice[]): void {
    const headers = diceList.map(d => d.toString());
    const size = headers.length;

    const colWidths = headers.map(h => h.length);
    const maxColWidth = Math.max(...colWidths, "User dice v".length, 7);
    const formatCell = (s: string) => s.padEnd(maxColWidth);

    const topBorder = "┌" + Array(size + 1).fill("─".repeat(maxColWidth)).join("┬") + "┐";
    const middleBorder = "├" + Array(size + 1).fill("─".repeat(maxColWidth)).join("┼") + "┤";
    const bottomBorder = "└" + Array(size + 1).fill("─".repeat(maxColWidth)).join("┴") + "┘";

    const headerRow = ["User dice v", ...headers]
      .map(h => chalk.cyanBright.bold(formatCell(h)))
      .join("│");

    console.log(chalk.yellow.bold("\nProbability of the win for the user:"));
    console.log(topBorder);
    console.log("│" + headerRow + "│");
    console.log(middleBorder);

    for (let i = 0; i < size; i++) {
      const row: string[] = [chalk.cyanBright.bold(formatCell(headers[i]))];

      for (let j = 0; j < size; j++) {
        const winProb = ProbabilityCalculator.calculateWinProbability(diceList[i], diceList[j]);

        let raw: string;
        if (i === j) {
          raw = ".3333";
        } else {
          raw = winProb.toFixed(4);
        }

        const padded = raw.padEnd(maxColWidth);

        const valueStr =
          i === j
            ? chalk.gray(padded)
            : winProb > 0.5
            ? chalk.green(padded)
            : winProb < 0.5
            ? chalk.red(padded)
            : chalk.white(padded);

        row.push(valueStr);
      }

      console.log("│" + row.join("│") + "│");
      if (i === size - 1) {
        console.log(bottomBorder);
      } else {
        console.log(middleBorder);
      }
    }
  }
}
