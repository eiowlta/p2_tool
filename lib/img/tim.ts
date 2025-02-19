import {
  pad,
  structType,
  toDataView,
  toStructBuffer,
  u16,
  u32,
  u8,
} from "../util/structlib";
import { rgb5551ToRgba8888, rgba5551ToRgba8888 } from "./pixelFormats";
import { Image } from "./img";

const TIMHeader = structType({
  type: pad(u8, 3),
  flag: u32,
});
enum PMode {
  index4,
  index8,
  rgb5551,
  rgb888,
}
let ModeBPP = {
  [PMode.index4]: 4,
  [PMode.index8]: 8,
  [PMode.rgb5551]: 16,
  [PMode.rgb888]: 24,
};

const SectionHeader = structType({
  x: u16,
  y: u16,
  w: u16,
  h: u16,
});
const HAS_CLUT = 8;

const extractImageData = (data: Uint8Array, mode: PMode, clut?: number[]) => {
  let sb = toStructBuffer(data, 0, true);
  let header = SectionHeader.read(sb);
  console.log(header);
  let bpp = ModeBPP[mode];
  console.log(bpp);
  let img: number[][] = [];
  for (let y = 0; y < header.h; y++) {
    let row = [];
    for (let x = 0; x < header.w; x++) {
      if (mode == PMode.rgb888) {
        x += 0.5;
        row.push(u16.read(sb) | 0xff000000 | (u8.read(sb) << 16));
      } else {
        let v = u16.read(sb);
        // console.log(v);
        switch (mode) {
          case PMode.index4: {
            for (let i = 0; i < 4; i++) {
              row.push(clut![v & 0xf]);
              v >>= 4;
            }
            break;
          }
          case PMode.index8: {
            row.push(clut![v & 0xff], clut![v >> 8]);
            break;
          }
          case PMode.rgb5551:
            row.push(rgba5551ToRgba8888(v));
            break;
        }
      }
    }
    if (y < 10) console.log(row.map((a) => a.toString(16)));
    img.push(row);
  }
  return img;
};

export const imgFromTim = (data: Uint8Array) => {
  let sb = toStructBuffer(data, 0, true);
  let header = TIMHeader.read(sb);
  if (header.type != 0x10) throw `Expected TIM (0x10) found ${header.type}`;
  // let clt;
  let pxl;
  // let pixels: number[][];
  let clut: number[] | undefined;
  console.log(header);
  if (header.flag & HAS_CLUT) {
    let size = u32.read(sb) - 4;
    let res = extractImageData(data.subarray(sb.ptr, sb.ptr + size), 0x2);
    if (res.length > 1) console.warn("multiple clt");
    clut = res.flat();
    // console.log(clut.map((a) => a.toString(16)));
    sb.ptr += size;
  }
  let size = u32.read(sb) - 4;
  pxl = extractImageData(
    data.subarray(sb.ptr, sb.ptr + size),
    header.flag & 0x3,
    clut
  );
  let image = new Image(pxl[0].length, pxl.length);
  // console.log(pxl.map(a=>a.length));
  for (let i = 0; i < pxl.length; i++) {
    for (let j = 0; j < pxl[0].length; j++) {
      image.setPixel(j, i, pxl[i][j]);
    }
  }
  return image;
};

export const timFromPxlClt = (pxl: Uint8Array, clt: Uint8Array) => {
  let buff = new Uint8Array(pxl.byteLength + clt.byteLength - 8);
  buff.set(clt);
  buff.set(pxl.subarray(8), clt.byteLength);
  buff[0] = 0x10;
  buff[4] = pxl[4] | HAS_CLUT;
  return buff;
};
