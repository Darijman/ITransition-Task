import crypto from "crypto";
import { HmacEntry } from "./HmacEntry";

export class FairRandomProtocol {
  static generateHmacEntry(size: number): HmacEntry {
    return new HmacEntry(crypto.randomInt(0, size), size);
  }
}