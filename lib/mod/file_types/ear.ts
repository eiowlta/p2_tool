import { promisify } from "util";
import { build, split } from "../../archive/ear";
import { GameContext } from "../../util/context";
import {
  dirname,
  joinPath,
  mkdir,
  readBinaryFile,
  withExtension,
  writeBinaryFile,
  writeTextFile,
} from "../../util/filesystem";
import {
  FileInfo,
  TypeHandler,
  checkFileExistsOrTime,
  checkFileTime,
  loadLastFile,
  needBuildLastFile,
} from "./common";
import { gunzip, gzip } from "zlib";

let handler: TypeHandler = {
  extract: async (
    src: string,
    info: FileInfo,
    dst: string,
    gameContext: GameContext
  ) => {
    let file = await readBinaryFile(src);
    let data = split(file);
    await Promise.all(
      data.map(async (f, i) => {
        let path = joinPath(
          dst,
          withExtension(
            info.fileList?.[i]?.path ?? i.toString(),
            info.fileList?.[i]?.type ?? "unk"
          )
        );
        let data = f.data;
        if (info.compressed) {
          await writeBinaryFile(path + ".gz", data);
          data = new Uint8Array(await promisify(gunzip)(data));
        }
        await writeBinaryFile(path, data);
      })
    );
  },
  build: async ({ info, input, dst }) => {
    let files = await Promise.all(
      input.map(async (f, i) => {
        let path = f[f.length - 1].path;
        if (await checkFileExistsOrTime(path + ".gz") > await checkFileTime(path)) {
          return await readBinaryFile(path + ".gz");
        } else {
          let data = await readBinaryFile(path);
          let name = info.fileList![i].path;
          let zipped = await promisify(gzip)(data);
          //   let out = new Uint8Array(zipped.byteLength + 2 + name.length);
          //   out.set(zipped.subarray(0, 9));
          //   out[9] = 0xb;
          //   for (let i = 0; i < name.length; i++) {
          //     out[10 + i] = name.charCodeAt(i);
          //   }
          //   out.set(zipped.subarray(9), 11 + name.length);
          await writeBinaryFile(path + ".gz", zipped);
          return zipped;
        }
      })
    );
    let ar = build(files);
    await mkdir(dirname(dst));
    await writeBinaryFile(dst, ar.data);
    if (info.cpkName) await writeTextFile(dst + ".toc", JSON.stringify(ar.toc));
  },
  needBuild: needBuildLastFile,
};
export default handler;
