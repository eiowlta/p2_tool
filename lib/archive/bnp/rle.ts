export const decompress = (input: Uint8Array, uncompressed_size: number) => {
  let off = 0;
  let ptr = 0;
  if (
    input.byteLength == 0 ||
    uncompressed_size == 0 ||
    input.byteLength > uncompressed_size
  ) {
    throw `Invalid RLE compressed data at ${off}`;
  }
  let output = new Uint8Array(uncompressed_size);
  let optr = 0;
  while (optr < uncompressed_size && ptr < input.byteLength) {
    if ((input[ptr] & 0x80) == 0x80) {
      let count = (input[ptr++] & 0x7f) + 3;
      let char = input[ptr++];
      output.fill(char, optr, optr + count);
      optr += count;
    } else {
      let count = input[ptr++] + 1;
      //   console.log(ptr, optr, count, output.byteLength)
      output.set(input.subarray(ptr, ptr + count), optr);
      optr += count;
      ptr += count;
    }
  }
  if (optr != uncompressed_size || ptr - off != input.byteLength) {
    throw `RLE Decompression failed at ${off}: expected ${ptr - off}=${
      input.byteLength
    } and ${optr}=${uncompressed_size}`;
  }
  return output;
};

let backref = (input: Uint8Array, iptr: number) => {
  let best = {
    offset: 0,
    length: 1,
  };
  let count = 0;
  let ptr = iptr;
  while (input[ptr] == input[iptr] && count < 128) {
    ptr++;
    count++;
  }
  best.length = count;
  best.offset = input[iptr];
  return best;
};

export const compress = (input: Uint8Array) => {
  let output = new Uint8Array(input.byteLength);

  let uncompressed_size = input.byteLength;
  let optr = 0;
  let iptr = 0;

  while (iptr < uncompressed_size) {
    let best = backref(input, iptr);
    if (best.length < 3) {
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
