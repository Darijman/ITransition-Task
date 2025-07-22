import readline from "readline";
import Table from "cli-table3";
import chalk from "chalk";
import { Dice } from "./Dice";
import { HelpTableRenderer } from "./HelpTableRenderer";
import { DiceParser } from "./DiceParser";
import { FairRandomProtocol } from "./FairRandomProtocol";

export class DiceGame {
  private rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  private allDice: Dice[] = [];

  private prompt(msg: string): Promise<string> {
    return new Promise(resolve => this.rl.question(msg, resolve));
  }

  async startFromArgs(args: string[]): Promise<void> {
    const diceSets = DiceParser.parseDiceArgs(args);
    if (diceSets.length <= 2) {
      console.log("You must provide at least 3 dice.");
      this.rl.close();
      return;
    }
    await this.start(diceSets);
  }

  private async start(diceList: Dice[]): Promise<void> {
    this.allDice = [...diceList];
    console.log("Let's determine who makes the first move.");

    const firstMove = FairRandomProtocol.generateHmacEntry(2);
    console.log(`I selected a random value in range 0..1`);
    console.log(`HMAC=${firstMove.hmac}`);
    const userGuess = await this.select("Try to guess my selection", ["0", "1"]);
    console.log(`My selection: ${firstMove.value} (KEY=${firstMove.key.toString("hex")})`);

    const computerGoesFirst = userGuess !== firstMove.value.toString();
    let computerDice: Dice;
    let playerDice: Dice;

    if (computerGoesFirst) {
      const compIndex = this.random(diceList.length);
      computerDice = diceList[compIndex];
      const availableForPlayer = diceList.filter((_, i) => i !== compIndex);
      console.log(`Computer goes first and chose: ${computerDice.toString()}`);
      playerDice = await this.selectDice(availableForPlayer);
      console.log(`You chose: ${playerDice.toString()}`);
    } else {
      playerDice = await this.selectDice(diceList);
      console.log(`You go first and chose: ${playerDice.toString()}`);
      const availableForComputer = diceList.filter(d => d !== playerDice);
      const compIndex = this.random(availableForComputer.length);
      computerDice = availableForComputer[compIndex];
      console.log(`Computer chose: ${computerDice.toString()}`);
    }

    const compRoll = FairRandomProtocol.generateHmacEntry(computerDice.faces.length);
    const userInput1 = await this.select(`Add your number modulo ${computerDice.faces.length}`, this.range(computerDice.faces.length));
    const roll1 = (parseInt(userInput1) + compRoll.value) % computerDice.faces.length;
    console.log(`My number is ${compRoll.value} (KEY=${compRoll.key.toString("hex")})`);
    console.log(`My roll result: ${computerDice.getFace(roll1)}`);

    const userRoll = FairRandomProtocol.generateHmacEntry(playerDice.faces.length);
    const userInput2 = await this.select(`Add your number modulo ${playerDice.faces.length}`, this.range(playerDice.faces.length));
    const roll2 = (parseInt(userInput2) + userRoll.value) % playerDice.faces.length;
    console.log(`My number is ${userRoll.value} (KEY=${userRoll.key.toString("hex")})`);
    console.log(`Your roll result: ${playerDice.getFace(roll2)}`);

    this.printResult(playerDice.getFace(roll2), computerDice.getFace(roll1));
    this.rl.close();
  }

  private select(message: string, options: string[]): Promise<string> {
    console.log(`${message}:`);
    options.forEach(opt => console.log(`${opt} - ${opt}`));
    console.log("X - exit\n? - help");

    return new Promise(async (resolve) => {
      while (true) {
        const input = await this.prompt("Your selection: ");
        if (input === "?") {
          HelpTableRenderer.printHelpTable(this.allDice);
        } else if (input.toLowerCase() === "x") {
          console.log("Exiting...");
          this.rl.close();
          process.exit(0);
        } else if (options.includes(input)) {
          resolve(input);
          break;
        }
      }
    });
  }

  private selectDice(diceList: Dice[]): Promise<Dice> {
    console.log("Choose your dice:");
    diceList.forEach((d, i) => console.log(`${i} - ${d.toString()}`));
    console.log("X - exit\n? - help");

    return new Promise(async (resolve) => {
      while (true) {
        const input = await this.prompt("Your selection: ");
        const index = parseInt(input);
        if (input === "?") HelpTableRenderer.printHelpTable(this.allDice);
        else if (input.toLowerCase() === "x") {
          console.log("Exiting...");
          this.rl.close();
          process.exit(0);
        } else if (!isNaN(index) && index >= 0 && index < diceList.length) {
          resolve(diceList[index]);
          break;
        }
      }
    });
  }

  private printResult(user: number, comp: number): void {
    const table = new Table({ head: ["Player", "Computer", "Result"], style: { head: ["green"] } });
    let result: string;

    if (user > comp) result = chalk.green("You won!");
    else if (user < comp) result = chalk.red("Computer won!");
    else result = chalk.yellow("Draw");

    table.push([user, comp, result]);
    console.log(table.toString());
  }

  private range(n: number): string[] {
    return Array.from({ length: n }, (_, i) => i.toString());
  }

  private random(max: number): number {
    return Math.floor(Math.random() * max);
  }
}