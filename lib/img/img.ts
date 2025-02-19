//this can later be replaced to use canvas instead if I run it in a browser

//does not capture all the intricacies of psx format..
// export const rgb5551_to_rgba8 = (value: number): Color => {
//   let r = ((value & 0x1f) * 0x21) >> 2;
//   let g = (((value >> 5) & 0x1f) * 0x21) >> 2;
//   let b = (((value >> 10) & 0x1f) * 0x21) >> 2;
//   let a = (value >> 15) * 255;
//   return [r, g, b, a];
// };

export const rgb8888toColorArr = (
  v: number
): [number, number, number, number] => [
  v & 0xff,
  (v >> 8) & 0xff,
  (v >> 16) & 0xff,
  (v >> 24) & 0xff,
];
export const colorArrToRgb8888 = (
  v: [number, number, number, number]
): number => {
  return (v[2] << 16) | (v[1] << 8) | v[0] | (v[3] << 24);
};
// export type Color = [number, number, number] | [number, number, number, number];
type Color = number;
export class Image {
  width: number;
  height: number;
  data: Uint8Array;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height * 4);
  }
  getPixel(x: number, y: number): Color {
    if (x >= this.width || y >= this.height)
      throw new Error(`Image access out of bounds`);
    let off = (y * this.width + x) * 4;
    return colorArrToRgb8888([...this.data.subarray(off, off + 4)] as [
      number,
      number,
      number,
      number
    ]);
  }
  setPixel(x: number, y: number, col: Color) {
    let off = (y * this.width + x) * 4;
    this.data.set(rgb8888toColorArr(col), off);
    // if (col.length == 3) this.data[off + 3] = 255;
  }
  getSubImage(x: number, y: number, w: number, h: number) {
    let newImg = new Image(w, h);
    for (let i = 0; i < w; i++) {
      for (let j = 0; j < h; j++) {
        newImg.setPixel(i, j, this.getPixel(x + i, y + j));
      }
    }
    return newImg;
  }
  setSubImage(x: number, y: number, img: Image) {
    // let newImg = new Image(w, h);
    for (let i = 0; i < img.width; i++) {
      for (let j = 0; j < img.height; j++) {
        this.setPixel(x + i, y + j, img.getPixel(i, j));
      }
    }
  }
}
type ColorArr = [number, number, number, number];
const squared = (a: number) => a * a;
// export const colorDistance = (a: ColorArr, b: ColorArr) => {
//   // return a
//   //   .map((c, i) => c - b[i])
//   //   .map(squared)
//   //   .reduce((p, c) => p + c);
//   return otherDistance(a, b);
//   // console.log(a,b);
//   let rm = (a[0] + b[0]) / 2;
//   let dstSquared =
//     (2 + rm / 255) * squared(b[0] - a[0]) +
//     4 * squared(b[1] - a[1]) +
//     (2 + (255 - rm) / 255) * squared(b[2] - a[2]);
//   return (
//     (((dstSquared / 3) * b[3] * a[3]) / 255) * 255 + squared(b[3] - a[3]) / 2
//   );
//   //  + Math.sqrt((b[3] - a[3]) / 256)
// };

//borrowed from https://github.com/ImageOptim/libimagequant/blob/a2add483b43e403a17dea19ece077dd00232eb8d/pam.h#L154
const otherDistance = (a: ColorArr, b: ColorArr) => {
  let ascale = a[3] / 255;
  let bscale = b[3] / 255;
  let sum = 0;
  let diffa = ascale - bscale;
  for (let i = 0; i < 3; i++) {
    let diffc = (a[i] * ascale - b[i] * bscale) / 255;
    sum += Math.max(squared(diffc), squared(diffc - diffa));
  }
  return sum;
};

export const colorDistance = otherDistance;
