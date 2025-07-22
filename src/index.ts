import { DiceGame } from "./DiceGame/DiceGame";

const args = process.argv.slice(2);
new DiceGame().startFromArgs(args).catch(console.error);