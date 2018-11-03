const hash = require("hash.js");

export function calcSha256(data: Uint8Array): Uint8Array {
  const inputArr = [].slice.call(data);
  const outputArr = hash.sha256().update(inputArr).digest();
  return new Uint8Array(outputArr);
}