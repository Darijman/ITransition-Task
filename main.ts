import * as crypto from 'crypto';
import * as readline from 'readline';

class Dice {
  constructor(public faces: number[]) {}
  toString(): string {
    return `[${this.faces.join(',')}]`;
  }
  roll(index: number): number {
    return this.faces[index];
  }
  getFaceCount(): number {
    return this.faces.length;
  }
}

class DiceParser {
  static parse(args: string[]): Dice[] {
    if (args.length < 3) {
      throw new Error(
        'At least 3 dice are required. Example: ts-node main.ts 2,2,4,4,9,9 6,8,1,1,8,6 7,5,3,7,5,3'
      );
    }

    return args.map((arg, index) => {
      const parts = arg.split(',');
      if (parts.length !== 6) {
        throw new Error(`Dice #${index + 1} must have exactly 6 sides (found ${parts.length})`);
      }

      const numbers = parts.map((s) => {
        const num = Number(s);
        if (!Number.isInteger(num)) {
          throw new Error(`Dice #${index + 1} contains a non-integer value: "${s}"`);
        }
        return num;
      });

      return new Dice(numbers);
    });
  }
}


class HMACTool {
  static generateKey(): Buffer {
    return crypto.randomBytes(32);
  }

  static generateNumber(range: number): number {
    let rand: number;
    const max = Math.floor(65536 / range) * range;
    do {
      rand = crypto.randomBytes(2).readUInt16BE(0);
    } while (rand >= max);
    return rand % range;
  }

  static computeHMAC(key: Buffer, message: string): string {
    return crypto.createHmac('sha3-256', key).update(message).digest('hex');
  }
}

class FairRandomProtocol {
  private key: Buffer;
  private number: number;
  constructor(private range: number) {
    this.key = HMACTool.generateKey();
    this.number = HMACTool.generateNumber(range);
  }
  getHMAC(): string {
    return HMACTool.computeHMAC(this.key, this.number.toString());
  }
  reveal(): { number: number; key: string } {
    return { number: this.number, key: this.key.toString('hex') };
  }
  computeResult(userInput: number): number {
    return (this.number + userInput) % this.range;
  }
}

class ProbabilityCalculator {
  static winProbability(a: Dice, b: Dice): number {
    let wins = 0;
    let total = a.getFaceCount() * b.getFaceCount();
    for (let x of a.faces) {
      for (let y of b.faces) {
        if (x > y) wins++;
      }
    }
    return wins / total;
  }
}

class HelpTable {
  static show(dice: Dice[]): void {
    const n = dice.length;
    console.log('\nProbability Table (A beats B):');
    let header = '      ' + dice.map((_, i) => `D${i}`).join('    ');
    console.log(header);
    for (let i = 0; i < n; i++) {
      let row = `D${i} |`;
      for (let j = 0; j < n; j++) {
        if (i === j) {
          row += '  -- ';
        } else {
          let p = ProbabilityCalculator.winProbability(dice[i], dice[j]);
          row += ` ${(p * 100).toFixed(1)}%`;
        }
      }
      console.log(row);
    }
    console.log();
  }
}

class Game {
  private rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  constructor(private diceList: Dice[]) {}

  async run(): Promise<void> {
    console.log("Let's determine who makes the first move.");
    const fair = new FairRandomProtocol(2);
    console.log(`I selected a random value in the range 0..1 (HMAC=${fair.getHMAC()})`);
    const guess = await this.prompt('Try to guess my selection (0/1), X to exit, ? for help: ');
    if (guess.toLowerCase() === 'x') return this.exit();
    if (guess === '?') {
      HelpTable.show(this.diceList);
      return this.run();
    }
    const userGuess = parseInt(guess);
    if (isNaN(userGuess) || ![0, 1].includes(userGuess)) {
      console.log('Invalid input. Expected 0 or 1.');
      return this.run();
    }
    const reveal = fair.reveal();
    console.log(`My selection: ${reveal.number} (KEY=${reveal.key})`);
    const computerFirst = userGuess !== reveal.number;

    const available = this.diceList.map((_, i) => i);
    let userIdx: number;
    let computerIdx: number;

    if (computerFirst) {
      computerIdx = 1;
      console.log(`I make the first move and choose the ${this.diceList[computerIdx]}`);
      userIdx = await this.chooseDice(available.filter(i => i !== computerIdx));
    } else {
      userIdx = await this.chooseDice(available);
      computerIdx = available.find(i => i !== userIdx)!;
      console.log(`I choose the ${this.diceList[computerIdx]}`);
    }

    const computerRoll = await this.performRoll(this.diceList[computerIdx], "my");
    const userRoll = await this.performRoll(this.diceList[userIdx], "your");

    console.log(`Result: Computer=${computerRoll}, You=${userRoll}`);
    if (computerRoll > userRoll) {
      console.log("Computer win!");
    } else if (computerRoll < userRoll) {
      console.log("You win!");
    } else {
      console.log("It's a draw!");
    }
    this.exit();
  }

  async chooseDice(indices: number[]): Promise<number> {
    console.log('Choose your dice:');
    for (const i of indices) {
      console.log(`${i} - ${this.diceList[i]}`);
    }
    const choice = await this.prompt('Your selection: ');
    if (choice.toLowerCase() === 'x') this.exit();
    if (choice === '?') {
      HelpTable.show(this.diceList);
      return this.chooseDice(indices);
    }
    const idx = parseInt(choice);
    if (!indices.includes(idx)) {
      console.log('Invalid dice index.');
      return this.chooseDice(indices);
    }
    console.log(`You chose ${this.diceList[idx]}`);
    return idx;
  }

  async performRoll(dice: Dice, who: string): Promise<number> {
    const fair = new FairRandomProtocol(dice.getFaceCount());
    console.log(`I selected a random value in range 0..${dice.getFaceCount() - 1} (HMAC=${fair.getHMAC()})`);
    const input = await this.prompt(`Enter a number from 0 to ${dice.getFaceCount() - 1}. X to exit, ? for help: `);

    if (input.toLowerCase() === 'x') this.exit();
    if (input === '?') {
      HelpTable.show(this.diceList);
      return this.performRoll(dice, who);
    }
    const userNum = parseInt(input);
    if (isNaN(userNum) || userNum < 0 || userNum >= dice.getFaceCount()) {
      console.log('Invalid number. Try again.');
      return this.performRoll(dice, who);
    }
    const reveal = fair.reveal();
    console.log(`My number is ${reveal.number} (KEY=${reveal.key})`);
    const resultIdx = (reveal.number + userNum) % dice.getFaceCount();
    console.log(`The fair number generation result is ${reveal.number} + ${userNum} = ${resultIdx} (mod ${dice.getFaceCount()}).`);
    const result = dice.roll(resultIdx);
    console.log(`${who.charAt(0).toUpperCase() + who.slice(1)} roll result is ${result}`);
    return result;
  }

  prompt(q: string): Promise<string> {
    return new Promise(resolve => this.rl.question(q, resolve));
  }

  exit(): void {
    this.rl.close();
    process.exit(0);
  }
}

// Entry Point
try {
  const args = process.argv.slice(2);
  const dice = DiceParser.parse(args);
  new Game(dice).run();
} catch (e: any) {
  console.error('Error:', e.message);
  console.log('Usage: ts-node main.ts 2,2,4,4,9,9 6,8,1,1,8,6 7,5,3,7,5,3');
  process.exit(1);
}
