import { GameContext } from "../../util/context";
import {
  FileType,
  closeFile,
  exists,
  joinPath,
  mkdir,
  openFileRead,
} from "../../util/filesystem";
import { FileInfo, TypeHandler, needBuildLastFile } from "./common";
import {
  addFileToCPK,
  buildCPK,
  createCPK,
  extractFile,
  readCPKTOC,
} from "../../cpk/cpk";
import { dirname } from "path";

let handler: TypeHandler = {
  extract: async (
    src: string,
    info: FileInfo,
    dst: string,
    gameContext: GameContext
  ) => {
    const cpk = await openFileRead(src);
    const toc = await readCPKTOC(cpk);
    await mkdir(dst);
    console.log(dst);
    console.log(await exists(dst));
    for (const entry of toc) {
      let name = info.fileList!.find((f) => f.cpkId == entry.ID)?.path;
      name ??= `${entry.FileName}`;
      await extractFile(cpk, joinPath(dst, name), entry);
    }
    await closeFile(cpk);
  },
  build: async ({ info, input, dst }) => {
    await mkdir(dirname(dst));
    let cpk = await createCPK(dst);
    for (let i = 0; i < info.fileList!.length; i++) {
      let file = info.fileList![i];
      let name = file.cpkName!;
      let id = file.cpkId!;
      addFileToCPK(cpk, input[i].pop()!.path, name, id);
    }
    await buildCPK(cpk);
  },
  needBuild: needBuildLastFile,
};
export default handler;
