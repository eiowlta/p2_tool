import {
  GameContext,
  lookupConstantFromBin,
  lookupConstantToBin,
} from "../../util/context";
import { Command, CommandParser } from "./command_types";

export const opMap = {
  byName: {} as Record<string, CommandParser>,
  byOp: {} as Record<number, CommandParser>,
};

const makeBasicCommand = (name: string, opcode: number) => {
  let parser: CommandParser = {
    name,
    fromText: (name, args, ctx) => {
      if (args.length != 0) throw `Command ${name} does not expect arguments`;
      return {
        cmd: name,
        arguments: [],
      };
    },
    toText: (command, ctx) => {
      return command.cmd;
    },
    fromBin: (id, args, ctx) => {
      if (args.length != 0) throw `Command ${name} does not expect arguments`;
      return {
        cmd: name,
        arguments: [],
      };
    },
    toBin: (command, ctx) => {
      if (command.arguments.length != 0)
        throw `Command ${name} does not expect arguments`;
      return [0x1100 | opcode];
    },
  };
  opMap.byName[name] = parser;
  opMap.byOp[opcode] = parser;
};

/**
 * iirc in psx the lsb could be used to invert the color and outline but
 * as far as I can tell this wasn't used
 * these were offsets into a psx palette.  the colors were paired
 * with the second color being the outline color. color 0 I think was transparent
 */
const colors: Record<string, number> = {
  white: 1,
  white_inv: 2,
  gray: 3,
  gray_inv: 4,
  pink: 5,
  pink_inv: 6,
  blue: 7,
  blue_inv: 8,
  green: 9,
  green_inv: 10,
  yellow: 11,
  yellow_inv: 12,
  orange: 13,
  orange_inv: 14,
};
const colorInv: Record<number, string> = {};

const defaultToText = (command: Command, ctx: GameContext) => {
  if (command.arguments.length)
    return `${command.cmd}(${command.arguments.join(", ")})`;
  return command.cmd;
};

let colorParser: CommandParser = {
  name: "color",
  fromText: (name, args, ctx) => {
    if (args.length != 1) throw new Error(`Color expects exactly one argument`);
    if (colors[args[0]] === undefined)
      throw new Error(`Unknown event color ${args[0]}`);
    return {
      cmd: "color",
      arguments: [args[0]],
    };
  },
  toText: defaultToText,
  fromBin: (id, args, ctx) => {
    if (args.length != 1) throw new Error(`Color expects exactly one argument`);
    if (colorInv[args[0]] === undefined)
      throw new Error(`Unknown event color ${args[0]}`);
    return {
      cmd: "color",
      arguments: [colorInv[args[0]]],
    };
  },
  toBin: (command, ctx) => {
    let args = command.arguments;
    if (args.length != 1) throw new Error(`Color expects exactly one argument`);
    if (colors[args[0]] === undefined)
      throw new Error(`Unknown event color ${args[0]}`);
    return [0x122e, colors[command.arguments[0]]];
  },
};
opMap.byName.color = colorParser;
opMap.byOp[0x2e] = colorParser;
for (const color in colors) {
  colorInv[colors[color]] = color;
  // opMap.byOp[colors[color]] = colorParser;
}

const makeLookupCommand = (name: string, field: string, opcode: number) => {
  let parser: CommandParser = {
    name,
    fromText: (name, args, ctx) => {
      if (args.length != 0) throw `Command ${name} expects single argument`;
      return {
        cmd: name,
        arguments: args,
      };
    },
    toText: defaultToText,
    fromBin: (id, args, ctx) => {
      if (args.length != 1) throw `Command ${name} expects single argument`;

      return {
        cmd: name,
        arguments: [lookupConstantFromBin(ctx, field, args[0])],
      };
    },
    toBin: (command, ctx) => {
      if (command.arguments.length != 1)
        throw `Command ${name} expects single argument`;
      return [
        0x1200 | opcode,
        lookupConstantToBin(ctx, field, command.arguments[0]),
      ];
    },
  };
  opMap.byName[name] = parser;
  opMap.byOp[opcode] = parser;
};

const makeNumberCommand = (name: string, opcode: number) => {
  let parser: CommandParser = {
    name,
    fromText: (name, args, ctx) => {
      if (args.length != 0) throw `Command ${name} expects single argument`;

      return {
        cmd: name,
        arguments: args,
      };
    },
    toText: (command, ctx) => {
      return `${command.cmd}(${command.arguments[0]})`;
    },
    fromBin: (id, args, ctx) => {
      if (args.length != 1) throw `Command ${name} expects single argument`;

      return {
        cmd: name,
        arguments: args.map((a) => a.toString()),
      };
    },
    toBin: (command, ctx) => {
      if (command.arguments.length != 1)
        throw `Command ${name} expects single argument`;
      return [0x1200 | opcode, parseInt(command.arguments[0])];
    },
  };
  opMap.byName[name] = parser;
  opMap.byOp[opcode] = parser;
};

const makeBitCommand = (name: string, opcode: number) => {
  let parser: CommandParser = {
    name,
    fromText: (name, args, ctx) => {
      if (args.length == 0)
        throw `Command ${name} expects at least one argument`;

      return {
        cmd: name,
        arguments: args,
      };
    },
    toText: defaultToText,
    fromBin: (id, args, ctx) => {
      if (args.length == 0)
        throw `Command ${name} expects at least one argument`;
      let tmpArgs = [...args];
      let numTrue = tmpArgs.shift()!;
      if (numTrue > tmpArgs.length) throw `Invalid number of true bits`;
      let trueBits = tmpArgs
        .splice(0, numTrue)
        .map((a) => lookupConstantFromBin(ctx, "bit", a));
      let numFalse = tmpArgs.shift();
      if (numFalse === undefined || numFalse != tmpArgs.length)
        throw `Invalid number of false bits`;
      let falseBits = tmpArgs.map((a) => lookupConstantFromBin(ctx, "bit", a));
      return {
        cmd: name,
        arguments: [...trueBits, ...falseBits.map((a) => `!${a}`)],
      };
    },
    toBin: (command, ctx) => {
      if (command.arguments.length == 0)
        throw `Command ${name} expects at least one argument`;
      let trueBits = [];
      let falseBits = [];
      for (let arg of command.arguments) {
        arg = arg.trim();
        if (arg.startsWith("!")) falseBits.push(arg.slice(1).trim());
        else trueBits.push(arg);
      }
      let len = trueBits.length + falseBits.length + 3;
      return [
        0x1000 | (len << 8) | opcode,
        trueBits.length,
        ...trueBits.map((a) => lookupConstantToBin(ctx, "bit", a)),
        falseBits.length,
        ...falseBits.map((a) => lookupConstantToBin(ctx, "bit", a)),
      ];
    },
  };
  opMap.byName[name] = parser;
  opMap.byOp[opcode] = parser;
};

makeBasicCommand("nl", 0x01);
makeBasicCommand("clear", 0x02); //marks end of dialog
makeBasicCommand("end", 0x03);
//4 is undefined
makeNumberCommand("delay", 0x5);

makeBasicCommand("wait", 0x06);
makeBasicCommand("sync", 7);

makeNumberCommand("choice", 0x8);
makeBasicCommand("end_choice", 0x09); //marks end of choice
//a is undefined

makeLookupCommand("play_sound", "sndeff", 0xb); //plays the sound
makeLookupCommand("load_sound", "sndeff", 0xc); //ensure sound is loaded in psx, in psp it is dummy
//d exists but is semmingly unused?

makeLookupCommand("var", "msg_var", 0xe);

//f-1f undefined

makeBasicCommand("suou", 0x20); //last name
makeBasicCommand("tatsuya", 0x21); //first name
makeBasicCommand("tatsu", 0x22); //nick name

makeNumberCommand("pact_demon", 0x23); //names of current pacts
makeBasicCommand("yen", 0x24); //player money
makeBasicCommand("coins", 0x25); //casino money

makeLookupCommand("if", "bit", 0x26);
makeLookupCommand("if_not", "bit", 0x27);
makeBitCommand("if_all", 0x28);
makeBitCommand("if_none", 0x29);
makeBitCommand("if_any", 0x2a);
makeBitCommand("if_not_all", 0x2b);
//2c exists, seemingly unused and seemingly useless?
makeNumberCommand("line_height", 0x2d);
// 2e is color, from above

//2f might be related to text speed??
makeNumberCommand("unk2f", 0x2f);

makeBasicCommand("dbl_tab", 0x30); //0xe*2
makeBasicCommand("tab", 0x31); //0xe
makeBasicCommand("half_tab", 0x32); //7 I think

makeNumberCommand("set_x", 0x33); //moves both current x and line start to x
makeNumberCommand("set_y", 0x34); //moves both current y and line start to y

makeLookupCommand("item_with_type", "item", 0x35);

//0x36 - 0x41 unused
//42, show's last item given
//43 related to theater, checks your score and shows your rank, unused
//44 one parameter, seemingly random characters displayed?
//45 icon
//46-52 are direct color setting commands
