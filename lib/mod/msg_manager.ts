import { MIPS } from "../mips/mips";
import {
  Message,
  MessageScriptContext,
  messageToBin,
  parseMessage,
} from "../msg/msg";
import { parseMessageFile } from "../msg/msg_file";
import { GameContext } from "../util/context";
import { EncodingScheme } from "../util/encoding";
import { toDataView } from "../util/structlib";

/**
 * used to manage strings in the eboot.  could be used elsewhere as well
 */
export class MessageManager {
  context: GameContext;
  mips: MIPS;
  strings: Record<EncodingScheme, Record<string, number>>;
  fallbackSection = "mod";
  constructor(context: GameContext, mips: MIPS) {
    this.context = context;
    this.mips = mips;
    this.strings = { event: {}, font: {} };
  }
  /**
   * parses and adds string
   */
  addStringWithName(
    str: string,
    name: string,
    type: EncodingScheme,
    terminator?: number,
    swapEndian?: boolean
  ) {
    if (this.strings[type][name]) return this.strings[type][name];
    if (terminator === undefined)
      terminator = type == "event" ? 0x1103 : 0xffff;
    let ctx: MessageScriptContext = {
      terminator,
      encoding: type,
      swapEndian,
      file: "eboot",
      base: 0,
      ...this.context,
    };
    let msg = parseMessage(str, ctx);
    let data = messageToBin(msg, ctx);
    console.log(str, msg, data);
    this.mips.spaceManager.allocSymbol(
      2,
      data.length,
      this.fallbackSection,
      name,
      () => {
        for (let v of data) this.mips.write_u16(v, swapEndian);
      }
    );
    this.strings[type][name] = this.mips.resolveLocOrThrow(name);
    return this.strings[type][name];
  }
  addString(
    str: string,
    type: EncodingScheme,
    terminator?: number,
    swapEndian?: boolean
  ) {
    return this.addStringWithName(str, str, type, terminator, swapEndian);
  }
  /**
   * measure length
   */
  measureLength(str: string, type: EncodingScheme, terminator?: number) {
    let name = `str_${type}_${str}`;
    if (this.strings[type][name]) return this.strings[type][name];
    if (terminator === undefined)
      terminator = type == "event" ? 0x1103 : 0xffff;
    let ctx: MessageScriptContext = {
      terminator,
      encoding: type,
      swapEndian: false,
      file: "eboot",
      base: 0,
      ...this.context,
    };
    let msg = parseMessage(str, ctx);
    let data = messageToBin(msg, ctx);
    return data.length;
  }
  addMessage(
    msg: Message,
    name: string,
    type: EncodingScheme,
    terminator?: number,
    swapEndian?: boolean
  ) {
    if (this.strings[type][name]) return this.strings[type][name];
    if (terminator === undefined)
      terminator = type == "event" ? 0x1103 : 0xffff;
    let ctx: MessageScriptContext = {
      terminator,
      encoding: type,
      swapEndian,
      file: `eboot/${name}`,
      base: 0,
      ...this.context,
    };
    // console.log(msg);
    let data = messageToBin(msg, ctx);
    this.mips.spaceManager.allocSymbol(
      2,
      data.length,
      this.fallbackSection,
      name,
      () => {
        for (let v of data) this.mips.write_u16(v, swapEndian);
      }
    );
    this.strings[type][name] = this.mips.resolveLocOrThrow(name);
    return this.strings[type][name];
  }

  parseMessageFile(name: string, data: string, type?: EncodingScheme) {
    return parseMessageFile(data, {
      terminator: 0x1103,
      encoding: type ?? EncodingScheme.event,
      file: name,
      base: 0,
      ...this.context,
    });
  }
}
