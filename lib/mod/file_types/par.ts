import { build, split } from "../../archive/par";
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
        await writeBinaryFile(
          joinPath(
            dst,
            withExtension(
              info.fileList?.[i]?.path ?? i.toString(),
              info.fileList?.[i]?.type ?? "unk"
            )
          ),
          data[i].data
        );
      })
    );
  },
  build: async (buildInfo) => {
    let { info, input, dst } = buildInfo;
    let data = await Promise.all(input.map(loadLastFile));
    let ar = build(data);
    await mkdir(dirname(dst));
    await writeBinaryFile(dst, ar.data);
    if (info.cpkName) await writeTextFile(dst + ".toc", JSON.stringify(ar.toc));
  },
  needBuild: needBuildLastFile,
};
export default handler;
