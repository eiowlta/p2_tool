import { build, split } from "../../archive/bnp";
import { packBNPFile, parseBNPFile } from "../../archive/bnp/file_types";
import { GameContext } from "../../util/context";
import {
  dirname,
  joinPath,
  mkdir,
  readBinaryFile,
  withExtension,
  withoutExtension,
  writeBinaryFile,
  writeTextFile,
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
  ) => {
    let file = await readBinaryFile(src);
    let data = split(file);
    await Promise.all(
      data.map(async (f, i) => {
        let data = parseBNPFile(f.data);
        await writeBinaryFile(
          joinPath(
            dst,
            withExtension(
              info.fileList?.[i]?.path ?? `${i}_${data.tag}`,
              info.fileList?.[i]?.type ?? "unk"
            )
          ),
          data.data
        );
      })
    );
  },
  build: async (buildInfo) => {
    let { info, input, dst } = buildInfo;
    let data = await Promise.all(input.map(loadLastFile));
    for (let i = 0; i < info.fileList!.length; i++) {
      let fileInfo = info.fileList![i];
      let fileData = data[i];
      data[i] = packBNPFile(
        fileData,
        fileInfo.bnpType!,
        parseInt(withoutExtension(fileInfo.path).split("_")[1], 16),
        false,
        fileInfo.bnpImageNoHeader
      );
    }
    let ar = build(data, info.group ?? 0);
    // console.log(info);
    await mkdir(dirname(dst));
    await writeBinaryFile(dst, ar.data);
    if (info.cpkName) await writeTextFile(dst + ".toc", JSON.stringify(ar.toc));
  },
  needBuild: needBuildLastFile,
};
export default handler;
