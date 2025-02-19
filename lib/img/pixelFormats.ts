//   rgb5650,
//   rgba5551,
//   rgba4444,
//   rgba8888,
//   index4,
//   index8,
//   index16,
//   index32,

let rgba = (r: number, g: number, b: number, a: number) =>
  (a << 24) | (b << 16) | (g << 8) | (r << 0);

export const rgb5650ToRgba8888 = (color: number) => {
  let r = ((color & 0x1f) * 0x21) >> 2;
  let g = (((color >> 5) & 0x3f) * 0x41) >> 4;
  let b = (((color >> 11) & 0x1f) * 0x21) >> 2;
  return rgba(r, g, b, 255);
};

export const rgba5551ToRgba8888 = (color: number) => {
  let r = ((color & 0x1f) * 0x21) >> 2;
  let g = (((color >> 5) & 0x1f) * 0x21) >> 2;
  let b = (((color >> 10) & 0x1f) * 0x21) >> 2;
  let a = color >> 15;
  if (color & 0x7fff) {
    a = 255;
  } else if (color == 0) a = 0;
  else a = 127 + 128 * a;
  return rgba(r, g, b, a);
};
export const rgb5551ToRgba8888 = (color: number) => {
  let r = ((color & 0x1f) * 0x21) >> 2;
  let g = (((color >> 5) & 0x1f) * 0x21) >> 2;
  let b = (((color >> 10) & 0x1f) * 0x21) >> 2;
  let a = 255;
  if (color == 0) a = 0;
  return rgba(r, g, b, a);
};

export const rgba4444ToRgba8888 = (color: number) => {
  let r = (color & 0xf) * 0x11;
  let g = ((color >> 4) & 0xf) * 0x11;
  let b = ((color >> 8) & 0xf) * 0x11;
  let a = ((color >> 12) & 0xf) * 0x11;
  return rgba(r, g, b, a);
};

export const rgba8888ToRgb5650 = (color: number) => {
  let r = color & 0xff;
  let g = (color >> 8) & 0xff;
  let b = (color >> 16) & 0xff;
  let a = (color >> 24) & 0xff;
  return ((b >> 3) << 11) | ((g >> 2) << 5) | (r >> 3);
};

export const rgba8888ToRgba5551 = (color: number) => {
  let r = color & 0xff;
  let g = (color >> 8) & 0xff;
  let b = (color >> 16) & 0xff;
  let a = (color >> 24) & 0xff;
  //is this how alpha should really be handled?
  return (
    ((a > 127 ? 1 : 0) << 15) | ((b >> 3) << 10) | ((g >> 3) << 5) | (r >> 3)
  );
};

export const rgba8888ToRgba4444 = (color: number) => {
  let r = color & 0xff;
  let g = (color >> 8) & 0xff;
  let b = (color >> 16) & 0xff;
  let a = (color >> 24) & 0xff;
  return ((a >> 4) << 12) | ((b >> 4) << 8) | ((g >> 4) << 4) | (r >> 4);
};
