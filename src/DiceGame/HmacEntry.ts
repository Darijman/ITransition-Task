import crypto from "crypto";

export class HmacEntry {
  public readonly key: Buffer;
  public readonly hmac: string;
  public readonly value: number;

  constructor(value: number, modulo: number) {
    this.value = value % modulo;
    this.key = crypto.randomBytes(32);
    this.hmac = crypto.createHmac("sha256", this.key).update(this.value.toString()).digest("hex");
  }
}