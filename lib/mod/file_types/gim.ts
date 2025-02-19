import {
  GimConvOptions,
  ImageFormat,
  PixelOrder,
  buildGim,
  getGimBpp,
  getGimPalette,
  getGimPixelOrder,
  getPalette,
  gimFromImage,
  imageFromGim,
  parseGim,
} from "../../img/gim";
import {
  colorArrToRgb8888,
  colorDistance,
  rgb8888toColorArr,
} from "../../img/img";
import { palettize } from "../../img/palette";
import { imgFromPng, pngFromImage } from "../../img/png";
import { GameContext } from "../../util/context";
import {
  dirname,
  joinPath,
  mkdir,
  readBinaryFile,
  writeBinaryFile,
} from "../../util/filesystem";
import {
  FileInfo,
  TypeHandler,
  loadLastFile,
  needBuildLastFile,
} from "./common";

let handler: TypeHandler = {
  extract: async (
    src: string,
    info: FileInfo,
    dst: string,
    gameContext: GameContext
  ): Promise<void> => {
    // throw new Error("Unable to extract gim");
    let data = await readBinaryFile(src);
    let gim = parseGim(data);
    let img = imageFromGim(gim);
    await mkdir(dst);
    let png = await pngFromImage(img);
    await writeBinaryFile(joinPath(dst, "image.png"), png);
    // let decrypted = await decrypt_eboot(data);
    // await mkdir(dst);
    // await writeBinaryFile(joinPath(dst, info.fileList![0].path), decrypted);
  },
  needBuild:
    //   async () => true,
    needBuildLastFile,
  build: async (buildInfo): Promise<void> => {
    let { info, input, dst } = buildInfo;
    let data = await loadLastFile(input[0]);
    let img = await imgFromPng(data);
    let ent = input[0].pop()!;
    let args = ent.args ?? {};
    let options: GimConvOptions = { ...args };
    let original = await readBinaryFile(buildInfo.original);
    let original_gim = parseGim(original);
    let bpp = args.bpp ?? getGimBpp(original_gim);
    options.matchPalette = args.matchPalette ?? true;

    options.pixelOrder = getGimPixelOrder(original_gim);
    if (args.pixelOrder) {
      options.pixelOrder = PixelOrder[args.pixelOrder] as unknown as PixelOrder;
    }
    if (args.automaticPalette) {
      palettize(img, 1 << bpp);
    } else if (args.useSourcePalette ?? true) {
      options.palette = getGimPalette(original_gim);
    }
    switch (bpp) {
      case 4:
        options.pixelFormat = ImageFormat.index4;
        break;
      case 8:
        options.pixelFormat = ImageFormat.index8;
        break;
      case 16:
        options.pixelFormat = ImageFormat.rgba5551;
        break;
      case 32:
        options.pixelFormat = ImageFormat.rgba8888;
        break;
      default:
        throw new Error(`Unknown bpp`);
    }

    let gim = await gimFromImage(img, options);

    // patchFileLoading(data);
    await mkdir(dirname(dst));
    // console.log("Writing");
    await writeBinaryFile(dst, buildGim(gim));
  },
};
export default handler;
