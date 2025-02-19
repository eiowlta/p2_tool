import { extractFile, readTOC } from "../../iso/iso";
import { GameContext } from "../../util/context";
import { closeFile, mkdir, openFileRead } from "../../util/filesystem";
import { FileInfo, TypeHandler } from "./common";

let handler: TypeHandler = {
  extract: async (
    src: string,
    info: FileInfo,
    dst: string,
    gameContext: GameContext
  ) => {
    const iso = await openFileRead(src);
    const toc = await readTOC(iso);
    await mkdir(dst);
    await extractFile(iso, toc, dst);
    await closeFile(iso);
  },
  build: async ({ input, dst, gameContext }) => {},
  needBuild: async (input, dst) => {
    return false; //handled seperately
  },
};
export default handler;
