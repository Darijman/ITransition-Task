export class Dice {
  constructor(public faces: number[]) {}

  toString(): string {
    return `[${this.faces.join(",")}]`;
  }

  getFace(index: number): number {
    return this.faces[index];
  }
}