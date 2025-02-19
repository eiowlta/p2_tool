import { build, split } from "../../archive/bnp";
import { packBNPFile, parseBNPFile } from "../../archive/bnp/file_types";
import {
  Message,
  MessageScriptContext,
  messageToBin,
  parseMessageBinary,
} from "../../msg/msg";
import { MessageFile, writeMessageFile } from "../../msg/msg_file";
import {
  GameContext,
  lookupConstantFromBin,
  lookupConstantToBin,
} from "../../util/context";
import { EncodingScheme } from "../../util/encoding";
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
import { toDataView } from "../../util/structlib";
import {
  FileInfo,
  TypeHandler,
  loadLastFile,
  loadMergedMessageFile,
  needBuildAny,
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
    let msgctx: MessageScriptContext = {
      ...gameContext,
      terminator: 0x1103,
      encoding: EncodingScheme.event,
      base: 0,
      file: src,
    };
    let messages = data
      .map((buff) => {
        return { data: parseBNPFile(buff.data).data, offset: buff.offset };
      })
      .map((m) => {
        msgctx.base = m.offset;
        return parseMessageBinary(toDataView(m.data), msgctx);
      });
    let order: string[] = [];
    let map: Record<string, Message> = {};
    let comments: string[] = [""];
    for (let i = 0; i < messages.length; i++) {
      let personaName = lookupConstantFromBin(msgctx, "persona", i);
      map[`msg_${personaName}`] = messages[i];
      comments.push("");
      order.push(`msg_${personaName}`);
    }
    let msgFile: MessageFile = {
      messages: map,
      order,
      comments,
    };
    let str = writeMessageFile(msgFile, msgctx);
    await mkdir(dst);
    await writeTextFile(joinPath(dst, "pdemo.msg"), str);
  },
  build: async (buildInfo) => {
    let { info, input, dst, gameContext } = buildInfo;
    let msgctx: MessageScriptContext = {
      ...gameContext,
      terminator: 0x1103,
      encoding: EncodingScheme.event,
      base: 0,
      file: dst,
    };
    let messages = await loadMergedMessageFile(input[0], msgctx);
    let buffs = messages.order
      .map((m) => {
        let data = messageToBin(messages.messages[m], msgctx);
        let buff = new Uint8Array(data.length * 2);
        let dv = toDataView(buff);
        for (let i = 0; i < data.length; i++) {
          dv.setUint16(i * 2, data[i], true);
        }
        return buff;
      })
      .map((buff, i) => {
        return packBNPFile(buff, 1, 0, true);
      });

    let ar = build(buffs, info.group ?? 0);
    // console.log(info);
    await mkdir(dirname(dst));
    await writeBinaryFile(dst, ar.data);
    if (info.cpkName) await writeTextFile(dst + ".toc", JSON.stringify(ar.toc));
  },
  needBuild: needBuildAny,
};
export default handler;
