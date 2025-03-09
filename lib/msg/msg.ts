import {
  Constants,
  Game,
  GameContext,
  Lookup,
  loadLookupFile,
} from "../util/context";
import { Encoding, EncodingScheme, Locale } from "../util/encoding";
import { char, str2chars } from "./util";
import { getCommandHandler, getCommandHandlerBin } from "./msg_cmds";
import { Command } from "./commands/command_types";

// interface Command {
//   cmd: string | number;
//   arguments: any[];
// }
type MessageEntry = string | number | Command;

export interface MessageScriptContext extends GameContext {
  terminator: number;
  encoding: EncodingScheme;
  // constants: Constants;
  // locale: Locale;
  // game: Game;
  swapEndian?: boolean;
  file: string; //file
  base: number; //line number or address, used for debugging
}
// interface MessageContext {
//   bits: LookupType;
//   key_items: LookupType;
// }

export interface Message {
  data: MessageEntry[];
}

export const parseMessage = (
  text: string,
  context: MessageScriptContext
): Message => {
  let characters = str2chars(text);

  let current_str: char[] = [];
  let data: MessageEntry[] = [];
  let push_str = () => {
    if (current_str.length > 0) data.push(current_str.join(""));
    current_str = [];
  };
  let lines = 0;
  while (characters.length) {
    let c = characters.shift()!;
    switch (c) {
      case "\\":
        if (characters.length == 0) {
          throw new Error(
            `Unexpected end of message in ${context.file} at ${
              context.base + lines
            }`
          );
          break; //this means stray \ at the end of text will just disappear
        }
        switch (characters[0]) {
          case "[":
          case "\\": {
            current_str.push(characters.shift()!);
            break;
          }
          case " ":
            push_str();
            data.push({ cmd: "pxl", arguments: [] }); //1 pixel wide space
            characters.shift();
            break;
          case "x":
            data.push(parseInt(characters.splice(0, 5).join("").slice(1), 16)); //0xDD
            break;
          default:
            push_str();
            data.push(characters.shift()!); //"special character?"
        }
        break;
      case "\r": //ignore
        break;
      case "\n":
        push_str();
        data.push({ cmd: "nl", arguments: [] });
        lines++;
        break;
      // case "\t":
      //   push_str();
      //   data.push({ cmd: "tab", arguments: [] });
      //   break;
      case "[":
        push_str();
        let command = [];
        while (characters.length && characters[0] != "]")
          command.push(characters.shift());
        if (characters.length == 0)
          throw new Error(`Invalid command in ${text}`);
        characters.shift(); //consume ']'
        let args: string[] = [];
        let cmd = command.join("").trim();
        if (command.indexOf("(") >= 0) {
          let start = command.indexOf("(");
          let end = command.indexOf(")");
          if (end != command.length - 1)
            throw new Error(`Invalid command in ${text}`);
          args = command
            .splice(start, end - start + 1)
            .slice(1, -1)
            .join("")
            .split(",")
            .map((a) => a.trim());
          cmd = command.slice(0, start).join("").trim();
        }

        // const handler = getCommandHandler(cmd, context);
        // if (handler) {
        // data.push(handler.fromText(cmd, args, context));
        if (cmd == "end") {
          if (characters.join("").trim().length)
            console.warn(`Extra data after end command ${characters.join("")}`);
          characters = [];
        } else data.push({ cmd, arguments: args });
        // } else {
        //   throw new Error(
        //     `Unknown command ${cmd} in ${context.file} at ${
        //       context.base + lines
        //     }`
        //   );

        // data.push({
        //   cmd: parseInt(cmd, 16),
        //   arguments: args,
        // });
        // }
        break;
      default:
        current_str.push(c);
        break;
    }
  }
  push_str();
  return { data };
};

export const messageToString = (
  msg: Message,
  ctx: MessageScriptContext
): string => {
  return msg.data
    .map((v) => {
      switch (typeof v) {
        case "number":
          return `\\x${v.toString(16).padStart(4, "0")}`;
        case "string":
          return v;
        default:
          if (v.cmd == "nl") return "\n";
          if (v.cmd == "space") return " ";
          // console.log(v);
          const handler = getCommandHandler(v.cmd, ctx);
          return `[${handler!.toText(v, ctx)}]`;
      }
    })
    .join("");
};

const unknownCharacters: Record<string, boolean> = {}
export const messageToBin = (
  msg: Message,
  ctx: MessageScriptContext
): number[] => {
  let endian = ctx.swapEndian !== true;
  let chars: Encoding;
  switch (ctx.encoding) {
    case EncodingScheme.event:
      chars = ctx.locale.event;
      break;
    case EncodingScheme.font:
      chars = ctx.locale.font;
      break;
    default:
      throw new Error(`Unsupported encoding ${ctx.encoding}`);
  }
  return [
    ...msg.data
      .map((v) => {
        switch (typeof v) {
          case "number":
            return v;
          case "string":
            return [...v].map((a) => {
              let c = chars.utf2bin[a];
              if (c === undefined) {
                // throw new Error(`Unknown character ${a}`);
                c = chars.utf2bin["@"];
                if(!unknownCharacters[a]) 
                console.warn(`Unknown character ${a}`);
                unknownCharacters[a] = true;
              }
              return c;
            });
          default:
            // if (v.cmd == "nl") return "\n";
            const handler = getCommandHandler(v.cmd, ctx);
            if (handler === undefined) throw `Unknown command ${v.cmd}`;

            return handler!.toBin(v, ctx);
        }
      })
      .flat(),
    ctx.terminator,
  ];
};

export const calculateSize = (msg: Message): number => {
  return msg.data
    .map((dat) => {
      switch (typeof dat) {
        case "string":
          return 2 * dat.length;
        case "number":
          return 2;
        case "object":
          return 2 + 2 * dat.arguments.length;
      }
    })
    .reduce((p, c) => p + c, 0);
};

// interface BinaryMessageContext {
//   encoding: EncodingScheme;
//   terminator: number;
//   game: GameContext;
//   big?: boolean;
// }

export const parseMessageBinary = (
  buff: DataView,
  ctx: MessageScriptContext
): Message => {
  let data: MessageEntry[] = [];
  let endian = ctx.swapEndian !== true;
  let chars: Encoding;
  switch (ctx.encoding) {
    case EncodingScheme.event:
      chars = ctx.locale.event;
      break;
    case EncodingScheme.font:
      chars = ctx.locale.font;
      break;
    default:
      throw new Error(`Unsupported encoding ${ctx.encoding}`);
  }
  let ptr = 0;

  const getLocation = () =>
    `${ctx.file} at ${(ctx.base + ptr - 2).toString(16)}`;
  // console.log(getLocation());
  let getNext = () => {
    ptr += 2;
    if (ptr > buff.byteLength)
      throw new Error(`Unexpected end of message in ${getLocation()}`);
    return buff.getUint16(ptr - 2, endian);
  };

  let current_str: char[] = [];
  let push_str = () => {
    if (current_str.length > 0) data.push(current_str.join(""));
    current_str = [];
  };
  while (true) {
    let next = getNext();
    // console.log(next.toString(16), current_str);
    if (next == ctx.terminator) break;
    // console.log(next.toString(16));
    if ((next & 0xF000) != 0) {
      switch (ctx.encoding) {
        case EncodingScheme.event:
          {
            push_str();
            let cmdLength = (next >> 8) & 0xf;
            if (cmdLength == 0)
              throw new Error(
                `Invalid estr command ${next.toString(16)} in ${getLocation()}`
              );
            let numArgs = cmdLength - 1;
            let args: number[] = [];
            for (let i = 0; i < numArgs; i++) {
              args.push(getNext());
            }
            // console.log(next.toString(16), args);
            const handler = getCommandHandlerBin(next & 0xff, ctx);
            if (!handler)
              throw new Error(
                `Unknown command ${(next & 0xff).toString(
                  16
                )} in ${getLocation()}`
              );
            data.push(handler.fromBin(next & 0xff, args, ctx));
          }
          break;
        case EncodingScheme.font:
          {
            push_str();
            if (next >> 8 != 0xff) {
              if (next == 0x8140) {
                data.push(" ");
                break;
              } else {
                throw new Error(
                  `Unknown data ${next.toString(16)} in ${getLocation()}`
                );
              }
            }
            const handler = getCommandHandlerBin(next & 0xff, ctx);
            if (!handler)
              throw new Error(
                `Unknown command ${(next & 0xff).toString(
                  16
                )} in ${getLocation()}`
              );
            //TODO: parse command
            data.push(handler.fromBin(next & 0xff, [], ctx));
          }
          break;
      }
    } else {
      if (chars.bin2utf[next] !== undefined) {
        let c = chars.bin2utf[next];
        if (c == "") {
          console.warn(
            `Found unknown char ${next.toString(16)} in ${getLocation()}`
          );
        }
        current_str.push(c);
      } else {
        throw new Error(
          `Unknown data ${next.toString(16)} in ${getLocation()}`
        );
      }
    }
    push_str(); //push any remaining text
  }
  return { data };
};
