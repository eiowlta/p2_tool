export const decompress = (input: Uint8Array, uncompressed_size: number) => {
  let ptr = 0;
  if (
    input.byteLength == 0 ||
    uncompressed_size == 0
    // input.byteLength > uncompressed_size
  ) {
    throw `Invalid LZSS compressed data`;
  }
  let output = new Uint8Array(uncompressed_size);
  let optr = 0;
  while (optr < uncompressed_size) {
    if ((input[ptr] & 0x80) == 0x80) {
      let count = (input[ptr++] & 0x7f) + 3;
      let offset = input[ptr++] + 1;

      let s = optr - offset;
      if (s < 0) {
        throw "invalid";
        console.log(`Going before 0 ${s}`);
        let c = -s;
        c = Math.min(c, count);
        output.fill(0, optr, optr + c);
        optr += c;
        count -= c;
        s += c;
      }
      //   if (count) {
      if (s + count < optr) {
        output.set(output.subarray(s, s + count), optr);
        optr += count;
      } else {
        while (count--) output[optr++] = output[s++];
      }
      //   }
    } else {
      let count = input[ptr++] + 1;
      output.set(input.subarray(ptr, ptr + count), optr);
      optr += count;
      ptr += count;
    }
  }
  if (optr != uncompressed_size || ptr != input.byteLength) {
    throw `LZSS Decompression failed: expected ${ptr}=${input.byteLength} and ${optr}=${uncompressed_size}`;
  }
  return output;
};

let find_backref_no0 = (input: Uint8Array, iptr: number) => {
  let best = {
    type: "raw",
    offset: 0,
    length: 1,
  };
  let getc = (iptr: number) => (iptr < 0 ? 0 : input[iptr]);
  let c = getc(iptr);
  for (let s = iptr - 1; s > iptr - 256; s--) {
    if (s < 0) break;
    if (getc(s) == c) {
      let i = 1;
      for (; i < 128; i++) {
        if (getc(s + i) != getc(iptr + i)) break;
      }
      if (i > 2) {
        if (best.length < i) {
          best.type = "backref";
          best.offset = iptr - s;
          best.length = i;
        }
      }
    }
  }
  return best;
};

export const compress = (input: Uint8Array) => {
  let output = new Uint8Array(input.byteLength * 2);

  let uncompressed_size = input.byteLength;
  let optr = 0;
  let iptr = 0;

  let backref = find_backref_no0;
  while (iptr < uncompressed_size) {
    let best = backref(input, iptr);
    if (best.length == 1) {
      //uncompressed, let's see how many bytes we need to take
      let len = 1;
      while (
        iptr + len < uncompressed_size &&
        len < 128 &&
        backref(input, iptr + len).length == 1
      )
        len++;
      output[optr++] = len - 1;
      for (let i = 0; i < len; i++) {
        output[optr++] = input[iptr++];
      }
    } else {
      output[optr++] = (best.length - 3) | 0x80;
      output[optr++] = best.offset - 1;
      iptr += best.length;
    }
  }
  return output.subarray(0, optr);
};
