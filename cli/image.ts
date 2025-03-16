#!/usr/bin/env node
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import {
  extname,
  fromTools,
  hasExtension,
  joinPath,
  mkdir,
  readBinaryFile,
  readTextFile,
  writeBinaryFile,
  writeTextFile,
} from "../lib/util/filesystem";
import { imgFromPng, pngFromImage } from "../lib/img/png";
import { Image } from "../lib/img/img";
import {
  BlockType,
  ImageFormat,
  PixelOrder,
  buildGim,
  gimFromImage,
  imageFromGim,
  parseGim,
} from "../lib/img/gim";
import { loadFontEncoding, loadLocale } from "../lib/util/encoding";
import { stack } from "../lib/img/util";
import { toDataView } from "../lib/util/structlib";
import { imgFromTim, timFromPxlClt } from "../lib/img/tim";

const argv = yargs(hideBin(process.argv))
  .usage("Tools for interacting with images")
  .command(
    "gimconv <input> <output>",
    "Convert png to gim",
    (yargs) =>
      yargs
        .positional("input", {
          type: "string",
          alias: "i",
          demandOption: true,
          normalize: true,
        })
        .positional("output", {
          alias: "o",
          type: "string",
          default: "out.gim",
          demandOption: true,
          normalize: true,
        })
        .option("format", {
          alias: "f",
          default: "index8",
          type: "string",
          choices: [
            "rgba8888",
            "rgba4444",
            "rgba5551",
            "rgb5650",
            "index4",
            "index8",
          ],
        })
        .option("pformat", {
          alias: "p",
          describe: "Format of palette entries",
          default: "rgba8888",
          type: "string",
          choices: ["rgba8888", "rgba4444", "rgba5551", "rgb5650"],
        }),
    async (args) => {
      let png = await readBinaryFile(args.input);
      let img = await imgFromPng(png);
      let gim = gimFromImage(img, {
        pixelFormat: ImageFormat[args.format as keyof typeof ImageFormat],
        paletteFormat: ImageFormat[args.pformat as keyof typeof ImageFormat],
      });
      let data = buildGim(gim);
      await writeBinaryFile(args.output, data);
    }
  )
  .command(
    "giminfo <gim>",
    "Print info about GIM",
    (yargs) =>
      yargs.positional("gim", {
        type: "string",
        demandOption: true,
        normalize: true,
      }),
    async (args) => {
      let data = await readBinaryFile(args.gim);
      let gim = parseGim(data);
      let recurse = (block: typeof gim) => {
        switch (block.blockId) {
          case BlockType.Root:
          case BlockType.Picture:
            block.children.forEach(recurse);
            break;
          case BlockType.Image:
          case BlockType.Palette:
            console.log(
              `Found ${block.blockId === BlockType.Palette ? "Palette" : "Image"
              }`
            );
            console.log(`BPP:\t${block.bpp}`);
            console.log(`ImgFmt:\t${ImageFormat[block.imageFormat]}`);
            console.log(`PxlFmt:\t${PixelOrder[block.pixelFormat]}`);
            console.log(`Width:\t${block.width}`);
            console.log(`Height:\t${block.height}`);
            console.log(`Stride:\t${block.pitchAlign}`);
            console.log(`VAlign:\t${block.heightAlign}`);

            break;
        }
      };
      recurse(gim);
    }
  )
  .command(
    "pxlclt2png",
    false,
    (yargs) =>
      yargs
        .option("output", {
          type: "string",
          demandOption: true,
          normalize: true,
        })
        .option("pxl", {
          type: "string",
          demandOption: true,
          normalize: true,
        })
        .option("clt", {
          type: "string",
          demandOption: true,
          normalize: true,
        }),
    async (args) => {
      let pxl = await readBinaryFile(args.pxl);
      let clt = await readBinaryFile(args.clt);
      if (pxl[0] != 0x11 && pxl[0] != 0x12) {
        let n = new Uint8Array(pxl.length + 12);
        n.set(pxl, 12);
        n[0] = 0x11;
        n[4] = 1;
        toDataView(n).setUint32(8, pxl.length + 4, true);
        pxl = n;
      }
      if (clt[0] != 0x11 && clt[0] != 0x12) {
        let n = new Uint8Array(clt.length + 12);
        n.set(clt, 12);
        n[0] = 0x12;
        n[4] = 0x2;
        toDataView(n).setUint32(8, clt.length + 4, true);
        clt = n;
      }
      let tim = timFromPxlClt(pxl, clt);
      await writeBinaryFile(args.output + ".tim", tim);
      await writeBinaryFile(args.output, await pngFromImage(imgFromTim(tim)));
    }
  )
  .command(
    "fontinfo <image...>",
    "Output information regarding font for use in game",
    (yargs) =>
      yargs
        .positional("image", {
          type: "string",
          normalize: true,
          demandOption: true,
          describe: "gim or png",
        })
        .option('localePath', {
          type: 'string',
          normalize: true,
          conflicts: ['game', 'encoding']
        })
        .option("game", {
          type: "string",
          default: "ep",
          alias: "g",
        })
        .option("encoding", {
          type: "string",
          default: "en",
          alias: "e",
        })
        .option("space", {
          type: "number",
          default: 3,
        })
        .option("output", {
          type: "string",
          alias: "o",
        })
        .option("override", {
          type: "array",
        }),
    async (args) => {
      let image: Image | undefined;
      for (const filename of args.image) {
        let data = await readBinaryFile(filename);
        let tmp;
        switch (extname(filename)) {
          case ".gim":
            tmp = imageFromGim(parseGim(data));
            break;
          case ".png":
            tmp = await imgFromPng(data);
            break;
          default:
            throw new Error(`Unsupported image type ${extname(filename)}`);
        }
        if (image == undefined) {
          image = tmp;
        } else {
          image = stack(image, tmp);
        }
      }
      if (image == undefined) throw new Error(`No files specified`);
      let encoding = (
        await loadLocale(args.localePath ??
          fromTools(`game/${args.game}/encoding/${args.encoding}`)
        )
      ).font;

      let overrides: Record<number, [number, number]> = {};
      if (args.override) {
        while (args.override.length > 2) {
          let c = parseInt(args.override.shift()!.toString());
          let l = parseInt(args.override.shift()!.toString());
          let w = parseInt(args.override.shift()!.toString());
          overrides[c] = [l, w];
        }
        if (args.override.length) throw new Error(`Invalid overrides`);
      }
      let info: any[] = [];
      let cw = image.width / 16;
      let ch = image.height / 16;
      for (let i = 0; i < ch; i++) {
        for (let j = 0; j < cw; j++) {
          let char = image.getSubImage(j * 16, i * 16, 16, 16);
          let minx = 16;
          let maxx = 0;
          for (let ii = 0; ii < 16; ii++) {
            for (let jj = 0; jj < 16; jj++) {
              if (char.getPixel(jj, ii) >> 24) {
                if (minx > jj) minx = jj;
                if (maxx < jj) maxx = jj;
              }
            }
          }
          let left = minx;
          let width = Math.min(maxx - left + 2, 14);
          if (minx == 16) {
            left = 0;
            width = args.space;
          }
          if (overrides[i * 16 + j]) {
            [left, width] = overrides[i * 16 + j];
          }
          if (encoding.bin2utf[i * 16 + j] === undefined) continue;
          info.push({
            char: encoding.bin2utf[i * 16 + j],
            left,
            width,
          });
        }
      }
      if (args.output) await writeTextFile(args.output, JSON.stringify(info));
      else console.log(JSON.stringify(info));
      console.log("Done.");
    }
  )
  .command(
    "split <image>",
    "split image into [width]x[height] chunks",
    (yargs) =>
      yargs
        .positional("image", {
          type: "string",
          normalize: true,
          demandOption: true,
          describe: "gim or png",
        })
        .option("width", {
          type: "number",
          alias: "w",
          demandOption: true,
        })
        .option("height", {
          type: "number",
          alias: "h",
          demandOption: true,
        })
        .option("outdir", {
          type: "string",
          alias: "o",
          demandOption: true,
          normalize: true,
        }),
    async (args) => {
      await mkdir(args.outdir);
      let data = await readBinaryFile(args.image);
      let image;
      switch (extname(args.image)) {
        case ".gim":
          image = imageFromGim(parseGim(data));
          break;
        case ".png":
          image = await imgFromPng(data);
          break;
        default:
          throw new Error(`Unsupported image type ${extname(args.image)}`);
      }
      let cw = image.width / args.width;
      let ch = image.height / args.height;
      let pad = Math.floor(Math.log10(Math.max(cw, ch)));
      for (let i = 0; i < ch; i++) {
        for (let j = 0; j < cw; j++) {
          let img = image.getSubImage(
            j * args.width,
            i * args.height,
            args.width,
            args.height
          );
          await writeBinaryFile(
            joinPath(
              args.outdir,
              `${i.toString().padStart(pad, "0")}_${j
                .toString()
                .padStart(pad, "0")}.png`
            ),
            await pngFromImage(img)
          );
        }
      }
    }
  )
  .command(
    "unpack <image> <output>",
    false,
    (yargs) =>
      yargs
        .positional("image", {
          type: "string",
          normalize: true,
          demandOption: true,
          describe: "gim or png",
        })
        .option("outdir", {
          type: "string",
          alias: "o",
          demandOption: true,
          normalize: true,
        })
        .option("image_data", {
          type: "string",
          normalize: true,
          demandOption: true,
        }),
    async (args) => {
      let data = await readBinaryFile(args.image);
      let image;
      switch (extname(args.image)) {
        case ".gim":
          image = imageFromGim(parseGim(data));
          break;
        case ".png":
          image = await imgFromPng(data);
          break;
        default:
          throw new Error(`Unsupported image type ${extname(args.image)}`);
      }
      let info = JSON.parse(await readTextFile(args.image_data));
      await mkdir(args.outdir);
      for (let i = 0; i < info.length; i++) {
        let subImage = info[i];
        let imgData = image.getSubImage(
          subImage.x,
          subImage.y,
          subImage.w,
          subImage.h
        );
        await writeBinaryFile(
          joinPath(args.outdir, `${i}.png`),
          await pngFromImage(imgData)
        );
      }
    }
  )
  .demandCommand()
  .help()
  .showHelpOnFail(true).argv;
