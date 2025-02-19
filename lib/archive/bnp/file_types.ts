import * as NullCompression from "./nop";
import * as RLECompression from "./rle";
import * as LZSSCompression from "./lzss";
import {
  structType,
  toDataView,
  toStructBuffer,
  u16,
  u16le,
} from "../../util/structlib";

enum FileType {
  Other = 1,
  Image = 2,
  Audio = 3,
}
enum Compression {
  Null,
  RLE,
  LZSS,
}
const compressions = {
  [Compression.Null]: { ...NullCompression, headerLen: 8 },
  [Compression.RLE]: { ...RLECompression, headerLen: 12 },
  [Compression.LZSS]: { ...LZSSCompression, headerLen: 12 },
};

const ImageHeader = structType({
  x: u16le,
  y: u16le,
  w: u16le,
  h: u16le,
});

export const parseBNPFile = (input: Uint8Array) => {
  const dv = toDataView(input);
  let compressedSize = dv.getUint32(4, true);
  let uncompressedSize = dv.getUint32(8, true);
  const compression = input[1];
  const compressionInfo = compressions[compression as Compression];
  if (compressionInfo === undefined) throw `Unknown compression ${compression}`;
  let start = compressionInfo.headerLen;
  if (compression == Compression.Null) {
    // start -= 4;
    uncompressedSize = compressedSize - 8;
  }
  let imgHeader;

  const tag = dv.getUint16(2, true);
  //   console.log(FileType[input[0]], Compression[input[1]]);
  switch (input[0]) {
    case FileType.Other:
      break;
    case FileType.Image:
      const header = ImageHeader.read(toStructBuffer(dv, 8));
      if (
        header.x + header.w < 2048 &&
        header.y + header.h < 512 &&
        header.w != 0 &&
        header.h != 0
      ) {
        uncompressedSize = header.w * header.h * 2;
        start = 16;
        imgHeader = header;
      } else {
        //TM_UNIT mysteriously just has whole clt/pxl files instead of just the xywh header and pixel data
      }
      break;
    case FileType.Audio:
      if (input[1] != 1) throw `Audio not using 1`;
      return { data: input.subarray(8), tag, type: FileType.Audio };
    default:
      throw `Unknown file type ${input[0]}`;
  }
  let uncompressed = compressionInfo.decompress(
    input.subarray(start),
    uncompressedSize
  );
  if (input[0] == FileType.Image && imgHeader !== undefined) {
    let tmp = new Uint8Array(uncompressed.byteLength + 20);
    tmp.set(uncompressed, 20);
    let dv = toDataView(tmp);
    ImageHeader.write(toStructBuffer(tmp, 12, true), imgHeader);
    let isClt = imgHeader.w == 256 && imgHeader.h == 1;
    dv.setUint32(0, isClt ? 0x12 : 0x11, true);
    dv.setUint32(4, isClt ? 2 : 0, true);
    dv.setUint32(8, 12 + uncompressed.byteLength);
    uncompressed = tmp;
  }
  return {
    data: uncompressed,
    imgHeader,
    tag,
    type: input[0],
  };
};

export const packBNPFile = (
  input: Uint8Array,
  type: number,
  tag: number,
  compress: boolean,
  imageNoHeader?: boolean
): Uint8Array => {
  let buff;
  let dv;
  let usedCompression = 0;
  let start = 8;
  let payloadData;
  switch (type) {
    case FileType.Other:
      buff = new Uint8Array(input.byteLength + 8);
      payloadData = input;
      dv = toDataView(buff);
      break;

    case FileType.Audio:
      {
        buff = new Uint8Array(input.byteLength + 8);
        payloadData = input;
        buff.set(input, 8);
        dv = toDataView(buff);
        usedCompression = 1; //is this always true? seems to be
        compress = false;
      }
      break;
    case FileType.Image:
      if (imageNoHeader) {
        buff = new Uint8Array(input.byteLength + 8);
        payloadData = input;
        //basically just type 0
      } else {
        buff = new Uint8Array(input.byteLength + 12 - 20);
        buff.set(input.subarray(12, 20), 8);
        payloadData = input.subarray(20);
        start = 16;
      }
      dv = toDataView(buff);
      break;
    default:
      throw new Error(`Bad bnp entry type ${type}`);
  }

  buff[0] = type;
  buff[1] = usedCompression; //write this first cause audio is weird
  if (!compress) {
    usedCompression = 0;
  }
  dv.setUint16(2, tag, true);
  dv.setUint32(4, buff.byteLength, true);
  switch (usedCompression) {
    case Compression.Null:
      buff.set(payloadData, start);
      break;
    default:
      throw new Error(`Unsupported compression ${usedCompression}`);
  }
  return buff;
};
