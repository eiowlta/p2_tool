import { Game } from "../util/context";
import { EncodingScheme } from "../util/encoding";
import { CommandParser } from "./commands/command_types";
import * as ep_event from "./commands/ep_event";
import * as ep_font from "./commands/ep_font";
import * as is_event from "./commands/is_event";
import * as is_font from "./commands/is_font";
import { MessageScriptContext } from "./msg";

let ep = {
  event: ep_event.opMap,
  font: ep_font.opMap,
};
let is = {
  event: is_event.opMap,
  font: is_font.opMap,
};

export const getCommandHandler = (
  cmd: string,
  ctx: MessageScriptContext
): CommandParser | undefined => {
  let commands: typeof ep.event.byName;
  switch (ctx.game) {
    case Game.EP:
      commands = ep[EncodingScheme[ctx.encoding]].byName;
      break;
    case Game.IS:
      commands = is[EncodingScheme[ctx.encoding]].byName;
      break;
    default:
      throw `${ctx.game} not supported yet`;
  }
  return commands[cmd];
};

export const getCommandHandlerBin = (
  cmd: number,
  ctx: MessageScriptContext
): CommandParser | undefined => {
  let commands: typeof ep.event.byOp;
  switch (ctx.game) {
    case Game.EP:
      commands = ep[EncodingScheme[ctx.encoding]].byOp;
      break;
    case Game.IS:
      commands = is[EncodingScheme[ctx.encoding]].byOp;
      break;
    default:
      throw `${ctx.game} not supported yet`;
  }
  return commands[cmd];
};

// export enum KnownCommand {
//   Wait = "wait",
//   Ret = "ret",
//   Delay = "delay",
//   End_diag = "end_diag",
//   Choice = "choice",
//   End_choice = "end_choice",
//   Var = "var",
//   Suou = "suou",
//   Tatsuya = "tatsuya",
//   Tatsu = "tatsu",
//   If = "if",
//   IfNot = "if_not",
//   IfAll = "if_all",
//   IfNone = "if_none",
//   IfAny = "if_any",
//   IfNotAll = "if_not_all",
//   Col = "col",
//   DblTab = "dbl_tab",
//   Tab = "tab",
//   HalfTab = "half_tab",
//   Item_with_type = "item_with_type",

//   Newline = "nl",

//   //special
//   PixelSpace = "pixel_space",
//   // String = "string",
// }
// export enum ArgType {
//   Color,
//   Unsigned,
//   Bit,
//   BitArr,
//   Var,
//   ItemOrVar,
//   Unknown,
//   Constant,
// }

// // interface Command {
// //   arguments: ArgType[];
// //   constants?: { [n: number]: number };
// // }
// // const cmds_ep: { [k in KnownCommand]: Command } = {
// //   ret: {
// //     arguments: [],
// //   },
// //   col: {
// //     arguments: [ArgType.Color],
// //   },
// //   wait: {
// //     arguments: [],
// //   },
// //   end_diag: {
// //     arguments: [],
// //   },
// //   nl: {
// //     arguments: [],
// //   },
// //   pixel_space: {
// //     arguments: [],
// //   },
// //   delay: {
// //     arguments: [ArgType.Unsigned],
// //   },
// //   choice: {
// //     arguments: [ArgType.Unsigned],
// //   },
// //   end_choice: {
// //     arguments: [],
// //   },

// //   var: { arguments: [ArgType.Var] },
// //   suou: { arguments: [] },
// //   tatsuya: { arguments: [] },
// //   tatsu: { arguments: [] },
// //   if: { arguments: [ArgType.Bit] },
// //   if_not: { arguments: [ArgType.Bit] },
// //   if_all: { arguments: [ArgType.BitArr] },
// //   if_none: { arguments: [ArgType.BitArr] },
// //   if_any: { arguments: [ArgType.BitArr] },
// //   if_not_all: { arguments: [ArgType.BitArr] },
// //   dbl_tab: { arguments: [] },
// //   tab: { arguments: [] },
// //   half_tab: { arguments: [] },
// //   item_with_type: { arguments: [ArgType.ItemOrVar] },
// // };

// // const cmds_is = {
// //   ...cmds_ep,
// //   col: {
// //     arguments: [ArgType.Constant, ArgType.Constant, ArgType.Color],
// //     constants: { 0: 0, 1: 0 },
// //   },
// // };

// // export const ops = {
// //   [Game.EP]: cmds_ep,
// //   [Game.IS]: cmds_is,
// // };

// // export interface CommandInfo {
// //   terminates?: boolean;
// //   newline?: boolean;
// // }
// // export const commandInfo = {
// //   [KnownCommand.Ret]: {
// //     terminates: true,
// //   },
// //   [KnownCommand.Newline]: {
// //     newline: true,
// //   },
// // };
// // export const isKnownCommand = (cmd: string): cmd is KnownCommand => {
// //   if (KnownCommand[cmd as keyof typeof KnownCommand] !== undefined) {
// //     return cmd[0].toLowerCase() == cmd[0];
// //   }
// //   return false;
// // };
