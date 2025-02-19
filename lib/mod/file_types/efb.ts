import { build, split } from "../../archive/par";
import {
  initScriptContext,
  parseScriptBin,
  parseScriptText,
  scriptToBin,
  scriptToString,
} from "../../event_script/escript";
import { MessageScriptContext } from "../../msg/msg";
import {
  MessageFile,
  parseMessageFile,
  writeMessageFile,
} from "../../msg/msg_file";
import { GameContext, loadScriptConstants } from "../../util/context";
import { EncodingScheme } from "../../util/encoding";
import {
  dirname,
  joinPath,
  mkdir,
  readBinaryFile,
  readTextFile,
  withExtension,
  writeBinaryFile,
  writeTextFile,
} from "../../util/filesystem";
import {
  FileInfo,
  TypeHandler,
  checkFileExistsOrTime,
  checkFileTime,
  checkFileTimeMax,
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
    let data = await readBinaryFile(src);
    let ctx = initScriptContext(gameContext, src);
    let parsed = parseScriptBin(data, ctx);
    let script = scriptToString(parsed, ctx);
    let msgctx: MessageScriptContext = {
      ...ctx,
      terminator: 0x1103,
      encoding: EncodingScheme.event,
      base: 0,
    };
    let msg = writeMessageFile(parsed.messages, msgctx);
    // console.log(dst);
    await mkdir(dst);
    await writeTextFile(joinPath(dst, info.fileList![0].path), script);
    await writeTextFile(joinPath(dst, info.fileList![1].path), msg);
  },
  build: async ({ input, dst, gameContext }) => {
    let scriptSrc = input[0][input[0].length - 1];
    let ctx = initScriptContext(gameContext, scriptSrc.path);
    let scriptText = await readTextFile(scriptSrc.path);
    let messageFile: MessageFile | undefined;
    for (const msgFile of input[1]) {
      let text = await readTextFile(msgFile.path);
      let file = await parseMessageFile(text, {
        ...gameContext,
        terminator: 0x1103,
        encoding: EncodingScheme.event,
        file: msgFile.path,
        base: 0,
      });
      // console.log(file.messages);
      if (!messageFile) messageFile = file;
      else {
        for (const name of file.order) {
          if (messageFile.messages[name] === undefined) {
            messageFile.order.push(name);
          }
          messageFile.messages[name] = file.messages[name];
        }
      }
    }
    let script = parseScriptText(scriptText, messageFile!, ctx);
    let data = scriptToBin(script, ctx);
    await mkdir(dirname(dst));
    await writeBinaryFile(dst, data);
  },
  needBuild: async (input, dst) => {
    let outTime = checkFileExistsOrTime(dst);
    let scriptTime = checkFileTime(input[0][input[0].length - 1]);
    let msgTime = await checkFileTimeMax(input[1]);
    // console.log(info, outTime, scriptTime, msgTime);
    // return true;

    return (await outTime) < (await scriptTime) || (await outTime) < msgTime;
  },
};
export default handler;
