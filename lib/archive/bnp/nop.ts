export const decompress = (input: Uint8Array, uncompressed_size: number) => {
  if (uncompressed_size != input.byteLength) throw `Bad size`;
  return new Uint8Array(input);
};

export const compress = (input: Uint8Array) => {
  return new Uint32Array(input);
};
