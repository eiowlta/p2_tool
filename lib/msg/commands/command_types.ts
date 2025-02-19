import { GameContext } from "../../util/context";
import { MessageScriptContext } from "../msg";

type CommandParserContext = GameContext;

export interface CommandParser {
  name: string;
  fromText: (
    name: string,
    args: string[],
    ctx: CommandParserContext
  ) => Command;
  toText: (command: Command, ctx: CommandParserContext) => string;
  fromBin: (id: number, args: number[], ctx: CommandParserContext) => Command;
  toBin: (command: Command, ctx: CommandParserContext) => number[];
}
export interface Command {
  cmd: string;
  arguments: string[];
}
