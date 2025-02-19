import { align } from "../util/misc";
import {
  StructType,
  exact,
  fixedString,
  mapType,
  pad,
  structType,
  toDataView,
  toStructBuffer,
  u16,
  u16le,
  u32,
  u32le,
} from "../util/structlib";
import { Image, colorDistance, rgb8888toColorArr } from "./img";
import {
  rgb5650ToRgba8888,
  rgba4444ToRgba8888,
  rgba5551ToRgba8888,
  rgba8888ToRgb5650,
  rgba8888ToRgba4444,
  rgba8888ToRgba5551,
} from "./pixelFormats";

const GIMHeader = structType({
  magic: exact(fixedString(4), "MIG."),
  version: exact(fixedString(4), "00.1"),
  style: pad(exact(fixedString(4), "PSP\0"), 4),
});

export enum BlockType {
  Root = 0x02,
  Picture = 0x03,
  Image = 0x04,
  Palette = 0x05,
  FileInfo = 0xff,
}
const BlockHeader = structType({
  blockId: u16,
  unk: u16,
  size: u32,
  nextBlockOffset: u32,
  blockDataOffset: exact(u32, 16),
});

export enum ImageFormat {
  rgb5650,
  rgba5551,
  rgba4444,
  rgba8888,
  index4,
  index8,
  index16,
  index32,
  //   dxt1,
  //   dxt3,
  //   dxt5,
  //   dxt1ext = 0x108,
  //   dxt3ext = 0x109,
  //   dxt5ext = 0x10a,
}
interface ImageAlignment {
  pitchAlign: number;
  heightAlign: number;
  bpp: number;
}

//some of the images have a height align of 8 and I don't know why..
const ImageFormatBpp: Record<ImageFormat, ImageAlignment> = {
  [ImageFormat.rgb5650]: { pitchAlign: 16, heightAlign: 8, bpp: 16 },
  [ImageFormat.rgba5551]: { pitchAlign: 16, heightAlign: 8, bpp: 16 },
  [ImageFormat.rgba4444]: { pitchAlign: 16, heightAlign: 8, bpp: 16 },
  [ImageFormat.rgba8888]: { pitchAlign: 16, heightAlign: 8, bpp: 32 },
  [ImageFormat.index4]: { pitchAlign: 16, heightAlign: 8, bpp: 4 },
  [ImageFormat.index8]: { pitchAlign: 16, heightAlign: 8, bpp: 8 },
  [ImageFormat.index16]: { pitchAlign: 16, heightAlign: 8, bpp: 4 },
  [ImageFormat.index32]: { pitchAlign: 16, heightAlign: 8, bpp: 8 },
  //   [ImageFormat.dxt1]: { pitchAlign: 1, heightAlign: 8, bpp: 0 }, //unsupported
  //   [ImageFormat.dxt3]: { pitchAlign: 1, heightAlign: 8, bpp: 0 },
  //   [ImageFormat.dxt5]: { pitchAlign: 1, heightAlign: 8, bpp: 0 },
  //   [ImageFormat.dxt1ext]: { pitchAlign: 1, heightAlign: 8, bpp: 0 },
  //   [ImageFormat.dxt3ext]: { pitchAlign: 1, heightAlign: 8, bpp: 0 },
  //   [ImageFormat.dxt5ext]: { pitchAlign: 1, heightAlign: 8, bpp: 0 },
};
export enum PixelOrder {
  Normal,
  Faster,
}
export const ImageBlock = structType({
  headerLength: exact(u16, 48),
  unk2: exact(u16, 0),
  imageFormat: u16,
  pixelFormat: u16,
  width: u16,
  height: u16,
  bpp: u16,
  pitchAlign: u16,
  heightAlign: u16,
  unk12: exact(u16, 2),
  unk14: exact(u32, 0),
  indexStart: exact(u32, 48),
  pixelStart: u32,
  pixelEnd: u32,
  planeMask: exact(u32, 0),
  levelType: u16,
  levelCount: exact(u16, 1),
  frameType: exact(u16, 3),
  frameCount: exact(u16, 1),
  frameOffset: pad(exact(u32, 0x40), 16),
});

type ImageData = StructType<typeof ImageBlock> & { pixelData: Uint8Array };
type BlockData = StructType<typeof BlockHeader> & { blockData: Uint8Array };

export const parseBlockHeader = (
  data: Uint8Array,
  offset: number
): BlockData => {
  let header = BlockHeader.read(toStructBuffer(data, offset, true));
  // console.log(header.nextBlockOffset);
  return {
    ...header,
    blockData: data.subarray(
      offset + header.blockDataOffset!,
      offset + header.size
    ),
  };
};

type Block =
  | {
      blockId: BlockType.Root;
      children: Block[];
    }
  | {
      blockId: BlockType.Picture;
      children: (Block & { blockId: BlockType.Palette | BlockType.Image })[];
    }
  | ({
      blockId: BlockType.Palette | BlockType.Image;
    } & ImageData)
  | {
      blockId: BlockType.FileInfo;
      blockData: Uint8Array;
    };

export const parseBlock = (header: BlockData): Block => {
  switch (header.blockId) {
    case BlockType.Root:
      {
        let children = [];
        for (let ptr = 0; ptr < header.blockData.byteLength; ) {
          let child = parseBlockHeader(header.blockData, ptr);
          children.push(parseBlock(child));
          ptr += child.size;
        }
        return {
          ...header,
          children,
        };
      }
      break;
    case BlockType.Picture:
      {
        let children = [];
        for (let ptr = 0; ptr < header.blockData.byteLength; ) {
          let child = parseBlockHeader(header.blockData, ptr);
          children.push(parseBlock(child));
          ptr += child.size;
        }
        return {
          ...header,
          children,
        };
      }
      break;
    case BlockType.Palette:
    case BlockType.Image:
      {
        let imageData = ImageBlock.read(
          toStructBuffer(header.blockData, 0, true)
        );
        let pixelData = header.blockData.subarray(
          imageData.pixelStart,
          imageData.pixelEnd
        );
        return {
          ...header,
          ...imageData,
          pixelData,
        };
      }
      break;
    default:
      return header;
      break;
  }
};
export const parseGim = (data: Uint8Array): Block => {
  let sb = toStructBuffer(data, 0, true);
  let gimHeader = GIMHeader.read(sb); //mostly just a check
  let ptr = sb.ptr;
  let root = parseBlockHeader(data, ptr);
  let gim = parseBlock(root);
  if (gim.blockId != BlockType.Root) throw new Error(`Expected root to be GIM`);
  return gim;
};

const alignAny = (x: number, v: number) => {
  x = x + v - 1;
  return x - (x % v);
};
const parseImageData = (data: ImageData) => {
  let pixelData = [];
  let dv = toDataView(data.pixelData);
  let byteWidth = align(8, data.width * data.bpp) >> 3;
  let stride = byteWidth + data.pitchAlign - 1;
  stride = stride - (stride % data.pitchAlign);

  for (let y = 0; y < data.height; y++) {
    let row = [];
    for (let x = 0; x < data.width; x++) {
      let off = 0;
      let xOff = (x * data.bpp) >> 3;
      switch (data.pixelFormat) {
        case PixelOrder.Faster:
          //data is stored in 16x8 byte blocks.  number of pixels in the x direction is based on bpp, height is always 8
          off =
            (xOff & 0xf) +
            0x10 * (y & 7) +
            0x80 * ((xOff >> 4) + (y >> 3) * (stride >> 4));
          break;
        case PixelOrder.Normal:
          off = xOff + y * stride;
          break;
      }
      switch (data.imageFormat) {
        case ImageFormat.rgb5650:
          row.push(rgb5650ToRgba8888(dv.getUint16(off, true)));
          break;
        case ImageFormat.rgba5551:
          row.push(rgba5551ToRgba8888(dv.getUint16(off, true)));
          break;
        case ImageFormat.rgba4444:
          row.push(rgba4444ToRgba8888(dv.getUint16(off, true)));
          break;
        case ImageFormat.rgba8888:
          row.push(dv.getUint32(off, true));
          break;
        case ImageFormat.index4:
          if (x & 1) row.push((dv.getUint8(off) >> 4) & 0xf);
          else row.push(dv.getUint8(off) & 0xf);
          break;
        case ImageFormat.index8:
          row.push(dv.getUint8(off));
          break;
        default:
          throw new Error(
            `Unsupported pixel format ${ImageFormat[data.imageFormat]} (${
              data.imageFormat
            })`
          );
      }
    }
    pixelData.push(row);
  }
  return pixelData;
};

const parseGimImage = (pixelData: ImageData, palette?: ImageData) => {
  let pxl = parseImageData(pixelData);
  let image = new Image(pixelData.width, pixelData.height);
  let clt: number[][]; //only to make
  if (palette) {
    clt = parseImageData(palette);
  }
  //   console.log(pxl, clt!);
  //   console.log(clt!);
  //   console.log(pixelData, palette);
  switch (pixelData.imageFormat) {
    case ImageFormat.index4:
    case ImageFormat.index8:
      if (!palette) throw new Error(`Paletted image missing palette`);
      break;
  }

  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      switch (pixelData.imageFormat) {
        case ImageFormat.index4:
        case ImageFormat.index8:
          image.setPixel(x, y, clt![0][pxl[y][x]]);
          break;
        default:
          image.setPixel(x, y, pxl[y][x]);
          break;
      }
    }
  }
  return image;
};

export const imageFromGim = (root: Block) => {
  if (root.blockId != BlockType.Root) throw new Error(`Expected root block`);
  for (const block of root.children) {
    switch (block.blockId) {
      case BlockType.Picture:
        if (block.children.length > 2)
          throw new Error(`Expected max 2 blocks in image`);
        let image = block.children.find((b) => b.blockId == BlockType.Image);
        if (image === undefined)
          throw new Error(`Unable to find pixel data block`);
        let palette = block.children.find(
          (b) => b.blockId == BlockType.Palette
        );
        return parseGimImage(image, palette);
        break;
      default:
      //ignore
    }
  }
  throw new Error(`Did not find image`);
};

export interface GimConvOptions {
  pixelFormat?: ImageFormat;
  paletteFormat?: ImageFormat;
  heightAlign?: number; //optional, for overriding the data
  matchPalette?: boolean; //attempt to match palette
  pixelOrder?: PixelOrder;
  palette?: number[];
}

export const extractImageInfo = <T>(
  fun: (img: ImageData) => T,
  gim: Block
): T => {
  switch (gim.blockId) {
    case BlockType.Picture:
    case BlockType.Root:
      for (const child of gim.children) {
        try {
          return extractImageInfo(fun, child);
        } catch (e) {}
      }
      break;
    case BlockType.Image:
      return fun(gim);
  }
  throw new Error(`Bad GIM`);
};

export const getGimPalette = (gim: Block): number[] => {
  switch (gim.blockId) {
    case BlockType.Picture:
    case BlockType.Root:
      for (const child of gim.children) {
        try {
          return getGimPalette(child);
        } catch (e) {}
      }
      break;
    case BlockType.Palette:
      return parseImageData(gim)[0];
  }
  throw new Error(`Gim does not have a palette`);
};

export const getGimBpp = (gim: Block) => extractImageInfo((i) => i.bpp, gim);
export const getGimPixelOrder = (gim: Block) =>
  extractImageInfo((i) => i.pixelFormat, gim);
export const getPalette = (img: Image, numColors: number) => {
  let colors = [];
  let usedColors: Record<number, number> = {};
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      let color = img.getPixel(x, y);
      if (usedColors[color] !== undefined) continue;
      usedColors[color] = colors.length;
      colors.push(color);
    }
  }
  if (colors.length > numColors) {
    // console.warn(
    throw new Error(
      `Exceeded palette size.  Found ${colors.length} expected ${numColors}`
    );
  }
  return {
    colors,
    map: usedColors,
  };
};
const getImageData = (
  img: Image,
  format: ImageFormat,
  options: GimConvOptions,
  clt?: Record<number, number>
) => {
  let data = [];
  let start = new Date();
  let matches: Record<number, number> = {};
  //we can assume clt is valid if format is index4 since we create it in the parent function
  for (let y = 0; y < img.height; y++) {
    let row = [];
    for (let x = 0; x < img.width; x++) {
      let pixel = img.getPixel(x, y);
      let v;
      switch (format) {
        case ImageFormat.index4:
        case ImageFormat.index8:
          v = clt![pixel];
          if (v == undefined) {
            if (options.matchPalette) {
              let closest = 0;
              let dist = Number.POSITIVE_INFINITY;
              for (const [c, i] of Object.entries(clt!)) {
                let col = rgb8888toColorArr(parseInt(c));
                let d = colorDistance(col, rgb8888toColorArr(pixel));
                if (d < dist) {
                  closest = i;
                  dist = d;
                }
                clt![pixel] = closest;
              }
              v = clt![pixel];
            } else {
              console.log(clt, pixel);
              throw new Error(`Palette is bad`);
            }
          }
          break;
        case ImageFormat.rgb5650:
          v = rgba8888ToRgb5650(pixel);
          break;
        case ImageFormat.rgba4444:
          v = rgba8888ToRgba4444(pixel);
          break;
        case ImageFormat.rgba5551:
          v = rgba8888ToRgba5551(pixel);
          break;
        case ImageFormat.rgba8888:
          v = pixel;
          break;
        default:
          throw new Error(`Unsupported image format ${ImageFormat[format]}`);
      }
      row.push(v);
    }
    data.push(row);
  }
  let end = new Date();
  let diff = (end as any) - (start as any);
  console.log(diff);
  return data;
};
const convertPalette = (data: number[], format: ImageFormat) => {
  let row = [];
  for (let x = 0; x < data.length; x++) {
    let pixel = data[x];
    let v;
    switch (format) {
      case ImageFormat.rgb5650:
        v = rgba8888ToRgb5650(pixel);
        break;
      case ImageFormat.rgba4444:
        v = rgba8888ToRgba4444(pixel);
        break;
      case ImageFormat.rgba5551:
        v = rgba8888ToRgba5551(pixel);
        break;
      case ImageFormat.rgba8888:
        v = pixel;
        break;
      default:
        throw new Error(
          `Unsupported image format for palette ${ImageFormat[format]}`
        );
    }
    row.push(v);
  }
  return row;
};
const populatePixelData = (data: ImageData, pixels: number[][]) => {
  let xStride = alignAny(align(8, data.width * data.bpp) >> 3, data.pitchAlign);
  let yHeight = alignAny(data.height, data.heightAlign);
  data.pixelData = new Uint8Array(xStride * yHeight);
  data.pixelEnd = data.pixelStart + data.pixelData.byteLength;
  let dv = toDataView(data.pixelData);
  for (let y = 0; y < data.height; y++) {
    for (let x = 0; x < data.width; x++) {
      let xOff = (x * data.bpp) >> 3;
      let off = 0;
      switch (data.pixelFormat) {
        case PixelOrder.Faster:
          //data is stored in 16x8 byte blocks.  number of pixels in the x direction is based on bpp, height is always 8
          off =
            (xOff & 0xf) +
            0x10 * (y & 7) +
            0x80 * ((xOff >> 4) + (y >> 3) * (xStride >> 4));
          break;
        case PixelOrder.Normal:
          off = xOff + y * xStride;
          break;
      }
      switch (data.imageFormat) {
        case ImageFormat.rgb5650:
          dv.setUint16(off, rgba8888ToRgb5650(pixels[y][x]), true);
          break;
        case ImageFormat.rgba5551:
          dv.setUint16(off, rgba8888ToRgba5551(pixels[y][x]), true);
          break;
        case ImageFormat.rgba4444:
          dv.setUint16(off, rgba8888ToRgba4444(pixels[y][x]), true);
          break;
        case ImageFormat.rgba8888:
          dv.setUint32(off, pixels[y][x], true);
          break;
        case ImageFormat.index4:
          if (x & 1) data.pixelData[off] |= pixels[y][x] << 4;
          else data.pixelData[off] = pixels[y][x];
          break;
        case ImageFormat.index8:
          data.pixelData[off] = pixels[y][x];
          break;
        default:
          throw new Error(
            `Unsupported pixel format ${ImageFormat[data.imageFormat]} (${
              data.imageFormat
            })`
          );
      }
    }
  }
};
export const gimFromImage = (img: Image, options: GimConvOptions) => {
  let format = options.pixelFormat ?? ImageFormat.rgba8888;
  let clt;
  let pxl;
  let root: Block = {
    blockId: BlockType.Root,
    children: [],
  };
  let picture: Block = {
    blockId: BlockType.Picture,
    children: [],
  };
  // console.log(options);
  switch (format) {
    case ImageFormat.index4:
    case ImageFormat.index8:
      if (options.palette) {
        let map: Record<number, number> = {};
        for (let i = 0; i < options.palette.length; i++) {
          map[options.palette[i]] = i;
        }
        clt = {
          colors: options.palette,
          map,
        };
      } else {
        clt = getPalette(img, format == ImageFormat.index4 ? 16 : 256);
      }
      console.log(clt.colors.length);
      let paletteFormat = options.paletteFormat ?? ImageFormat.rgba8888;
      let imgData: ImageData = {
        imageFormat: paletteFormat,
        pixelFormat: PixelOrder.Normal,
        width: 256,
        height: 1,
        bpp: ImageFormatBpp[paletteFormat].bpp,
        pitchAlign: 8,
        heightAlign: 1,
        pixelStart: 64,
        pixelEnd: 0,
        levelType: 2,
        pixelData: new Uint8Array(),
      };
      populatePixelData(imgData, [convertPalette(clt.colors, paletteFormat)]);
      picture.children.push({
        blockId: BlockType.Palette,
        ...imgData,
      });
      break;
  }
  pxl = getImageData(img, format, options, clt?.map);
  let imgData: ImageData = {
    imageFormat: format,
    pixelFormat: options.pixelOrder ?? PixelOrder.Normal,
    width: img.width,
    height: img.height,
    bpp: ImageFormatBpp[format].bpp,
    pitchAlign: ImageFormatBpp[format].pitchAlign,
    heightAlign: options.heightAlign ?? ImageFormatBpp[format].heightAlign,
    pixelStart: 64,
    pixelEnd: 0,
    levelType: 1,
    pixelData: new Uint8Array(),
  };
  populatePixelData(imgData, pxl);
  picture.children.push({ blockId: BlockType.Image, ...imgData });
  // picture.children.reverse();
  root.children.push(picture);
  return root;
};

const buildGimBlock = (block: Block) => {
  let blockHeader: StructType<typeof BlockHeader> = {
    blockId: block.blockId,
    unk: 0,
    size: 0,
    nextBlockOffset: 0,
  };
  let dataBuff;
  switch (block.blockId) {
    case BlockType.Image:
    case BlockType.Palette:
      dataBuff = new Uint8Array(block.pixelEnd + 16);
      ImageBlock.write(toStructBuffer(dataBuff, 16, true), block);
      dataBuff.set(block.pixelData, block.pixelStart + 16);
      blockHeader.nextBlockOffset = dataBuff.byteLength;
      break;
    case BlockType.Picture:
    case BlockType.Root:
      let blocks = block.children.map((b) => buildGimBlock(b));
      let size = 0;
      for (const block of blocks) {
        size += block.byteLength;
      }
      dataBuff = new Uint8Array(16 + size);
      let off = 16;
      for (const block of blocks) {
        dataBuff.set(block, off);
        off += block.byteLength;
      }
      blockHeader.nextBlockOffset = 16;
      break;
    default:
      throw new Error(`Bad block type`);
  }
  blockHeader.size = dataBuff.byteLength;
  BlockHeader.write(toStructBuffer(dataBuff, 0, true), blockHeader);
  return dataBuff;
};
export const buildGim = (block: Block) => {
  let blocks = buildGimBlock(block);
  let header: StructType<typeof GIMHeader> = {};
  let output = new Uint8Array(blocks.byteLength + 16);
  output.set(blocks, 16);
  GIMHeader.write(toStructBuffer(output, 0, true), header);
  return output;
};
