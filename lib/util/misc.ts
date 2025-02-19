export const memcpy = (dst: Uint8Array, src: Uint8Array, size: number) => {
  //   dst.set(src.subarray(size));
  for (let i = 0; i < size; i++) dst[i] = src[i];
  return dst;
};

export const mergeBuffers = (...buffs: Uint8Array[]) => {
  let size = buffs.reduce((p, c) => p + c.byteLength, 0);
  let output = new Uint8Array(size);
  let off = 0;
  for (let buff of buffs) {
    output.set(buff, off);
    off += buff.byteLength;
  }
  return output;
};

export const printHex = (v: Uint8Array, max = 32) => {
  let line = "";
  for (let i = 0; i < v.byteLength; i++) {
    line += v[i].toString(16).padStart(2, "0") + " ";
    if (i % max == max - 1) {
      console.log(line);
      line = "";
    }
  }
  if (v.byteLength % max) console.log(line);
  console.log("");
};

export function* range(start: number, end?: number, step = 1) {
  if (end == undefined) {
    end = start;
    start = 0;
  }

  if (start < end) {
    for (let i = start; i < end; i += step) {
      yield i;
    }
  } else {
    for (let i = end - 1; i >= start; i -= step) {
      yield i;
    }
  }
}

export const sizeToHuman = (n: number, iec = false) => {
  const decimalSuffixes = ["B", "kB", "MB", "GB"];
  const iecSuffixes = ["B", "kiB", "MiB", "GiB"];
  const decimalScale = 1000;
  const iecScale = 1024;
  const scale = iec ? iecScale : decimalScale;
  const suffixes = iec ? iecSuffixes : decimalSuffixes;

  const negative = n < 0;
  let factor = 1;
  if (negative) n = -n;
  for (let i = 0; i < suffixes.length; i++) {
    if (factor * scale > n) {
      const v = n / factor;
      let s = v.toFixed(2);
      if (Math.round(v) === v) s = v.toString();
      return `${negative ? "-" : ""}${s}${suffixes[i]}`;
    }
    factor *= scale;
  }
  throw `Too big :(`;
};

export type Alignment =
  | 1
  | 2
  | 4
  | 8
  | 16
  | 32
  | 64
  | 128
  | 256
  | 512
  | 1024
  | 2048;
export const align = (size: Alignment, v: number) =>
  (v + size - 1) & ~(size - 1);
export const sectorAlign = (v: number) => align(2048, v);
export const wordAlign = (v: number) => align(4, v);
export const sum = (arr: number[]): number => arr.reduce((p, c) => p + c, 0);

export const indexOfUint8Array = (src: Uint8Array, search: Uint8Array) => {
  const srcLen = src.byteLength;
  const searchLen = search.byteLength;
  for (let i = 0; i < srcLen - searchLen; i++) {
    let found = true;
    for (let j = 0; j < searchLen; j++) {
      if (src[i + j] != search[j]) {
        found = false;
        break;
      }
    }
    if (found) return i;
  }
  return -1;
};
