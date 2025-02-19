import { decrypt_eboot } from "../../decrypt/eboot";
import { patchFileLoading } from "../../elf/atlus_eboot";
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
    let data = await readBinaryFile(src);
    let decrypted = await decrypt_eboot(data);
    await mkdir(dst);
    await writeBinaryFile(joinPath(dst, info.fileList![0].path), decrypted);
  },
  needBuild: needBuildLastFile,
  build: async (buildInfo): Promise<void> => {
    let { input, dst } = buildInfo;
    let data = await loadLastFile(input[0]);
    patchFileLoading(data);
    await mkdir(dirname(dst));
    await writeBinaryFile(dst, data);
  },
};
export default handler;
