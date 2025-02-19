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

const colors: Record<string, number> = {
  light_blue: 7,
  lime: 0xb, //0x13,0x32,0x33
  orange: 0xd,
  yellow: 0x14,
  teal: 0x15,
  fuschia: 0x16,
  light_gray: 0x17,
  green: 0x18,
  black: 0x19,
  blue: 0x20,
  pink: 0x21,
  name_green: 0x32,
  //   lime3: 0x33,
  //not a real color...
  rank: 0x33,

  lime2: 0x13,
  white1: 0x11,
  white: 0x12,
  default: 0x02,
  white_5: 5,
  white_1: 1,
  //   name_green: 0x34,
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
    if (args.length != 3) throw new Error(`Color expects exactly one argument`);
    if (args[0] != 0 || args[1] != 0) throw new Error(`Unexpected arguments`);
    let c = args[2] + 0x10;
    if (c == 0x33) {
      return {
        cmd: "theater_rank",
        arguments: [],
      };
    }
    if (colorInv[c] === undefined)
      throw new Error(`Unknown event color ${c.toString(16)}`);
    return {
      cmd: "color",
      arguments: [colorInv[c]],
    };
  },
  toBin: (command, ctx) => {
    let args = command.arguments;
    if (args.length != 1) throw new Error(`Color expects exactly one argument`);
    if (colors[args[0]] === undefined)
      throw new Error(`Unknown event color ${args[0]}`);
    return [0x1431, 0, 0, colors[command.arguments[0]] - 0x10];
  },
};
let theater_rankParser: CommandParser = {
  name: "color",
  fromText: (name, args, ctx) => {
    if (args.length != 0) throw new Error(`theater_rank expects no arguments`);

    return {
      cmd: "theater_rank",
      arguments: [],
    };
  },
  toText: defaultToText,
  fromBin: (id, args, ctx) => {
    throw new Error(`Unreachable`);
  },
  toBin: (command, ctx) => {
    let args = command.arguments;
    if (args.length != 0) throw new Error(`theater_rank expects no argument`);
    return [0x1431, 0, 0, 0x33 - 0x10]; //color command, don't ask
  },
};
opMap.byName.color = colorParser;
opMap.byOp[0x31] = colorParser;
opMap.byName.theater_rank = theater_rankParser;
for (const color in colors) {
  colorInv[colors[color]] = color;
}

let colorParser2: CommandParser = {
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
    let c = args[0] & 0xf;
    if (colorInv[c] === undefined)
      throw new Error(`Unknown event color ${c.toString(16)}`);
    return {
      cmd: "color",
      arguments: [colorInv[c]],
    };
  },
  toBin: (command, ctx) => {
    let args = command.arguments;
    if (args.length != 1) throw new Error(`Color expects exactly one argument`);
    if (colors[args[0]] === undefined)
      throw new Error(`Unknown event color ${args[0]}`);
    return [0x121d, colors[command.arguments[0]]];
  },
};
opMap.byName.color2 = colorParser2;
opMap.byOp[0x1d] = colorParser2;

const symbols: Record<string, number> = {
  unk1: 1,
  unk2: 2,
  unk3: 3,
  unk4: 4,
  unk5: 5,
  unk6: 6,
  heart: 7,
  unk8: 8,
  unk9: 9,
  unka: 0xa,
  unkb: 0xb,
  unkc: 0xc,
  unkd: 0xd,
  unke: 0xe,
  unkf: 0xf,
  unk10: 0x10,
  unk11: 0x11,
  unk12: 0x12,
  lquote: 0x13,
  rqoute: 0x14,
  unk15: 0x15,
};
const symbolInv: Record<number, string> = {};
const symParser: CommandParser = {
  name: "sym",
  fromText: (name, args, ctx) => {
    if (args.length != 1)
      throw new Error(`Symbol expects exactly one argument`);
    if (symbols[args[0]] === undefined)
      throw new Error(`Unknown event symbol ${args[0]}`);
    return {
      cmd: "sym",
      arguments: [args[0]],
    };
  },
  toText: defaultToText,
  fromBin: (id, args, ctx) => {
    if (args.length != 3)
      throw new Error(`symbol expects exactly one argument`);
    if (args[0] != 0 || args[1] != 0) throw new Error(`Unexpected arguments`);
    // console.log(args);
    let c = args[2];
    // if (c >= 16) c -= 6;
    // c--;
    if (symbolInv[c] === undefined)
      throw new Error(`Unknown event symbol ${c.toString(16)}`);
    return {
      cmd: "sym",
      arguments: [symbolInv[c]],
    };
  },
  toBin: (command, ctx) => {
    let args = command.arguments;
    if (args.length != 1)
      throw new Error(`symbol expects exactly one argument`);
    if (symbols[args[0]] === undefined)
      throw new Error(`Unknown event symbol ${args[0]}`);
    return [0x1432, 0, 0, symbols[args[0]]];
  },
};
opMap.byName.sym = symParser;
opMap.byOp[0x32] = symParser;
for (const symbol in symbols) {
  symbolInv[symbols[symbol]] = symbol;
  // opMap.byOp[symbols[symbol]] = symbolParser;
}

const makeLookupCommand3 = (name: string, field: string, opcode: number) => {
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
      if (args.length != 3) throw `Command ${name} expects single argument`;
      if (args[0] != 0 || args[1] != 0) throw new Error(`Unexpected arguments`);

      return {
        cmd: name,
        arguments: [lookupConstantFromBin(ctx, field, args[0])],
      };
    },
    toBin: (command, ctx) => {
      if (command.arguments.length != 1)
        throw `Command ${name} expects single argument`;
      return [
        0x1400 | opcode,
        0,
        0,
        lookupConstantToBin(ctx, field, command.arguments[0]),
      ];
    },
  };
  opMap.byName[name] = parser;
  opMap.byOp[opcode] = parser;
};

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
      //   if(field == 'bit')
      //   console.log(ctx.constants.bit);
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

//   makeLookupCommand("play_sound", "sndeff", 0xb); //plays the sound
//   makeLookupCommand("load_sound", "sndeff", 0xc); //ensure sound is loaded in psx, in psp it is dummy
//d exists but is semmingly unused?

makeLookupCommand("var", "msg_var", 0xe);

//f-1f undefined

makeBasicCommand("tatsu", 0x12); //nick name
makeBasicCommand("tatsuya", 0x13); //first name
makeBasicCommand("suou", 0x14); //last name

makeBasicCommand("space", 0x20);

// 0x1d

// makeNumberCommand("pact_demon", 0x23); //names of current pacts
// makeBasicCommand("yen", 0x24); //player money
// makeBasicCommand("coins", 0x25); //casino money

makeLookupCommand("if", "bit", 0x10);
makeLookupCommand("if_not", "bit", 0x11);
// makeLookupCommand("if_not", "bit", 0x27);
// makeBitCommand("if_all", 0x28);
// makeBitCommand("if_none", 0x29);
// makeBitCommand("if_any", 0x2a);
// makeBitCommand("if_not_all", 0x2b);
// //2c exists, seemingly unused and seemingly useless?
// makeNumberCommand("line_height", 0x2d);
// 2e is color, from above

//2f might be related to text speed??
// makeNumberCommand("unk2f", 0x2f);

makeBasicCommand("dbl_tab", 0x1f); //0xe*2
// makeBasicCommand("tab", 0x20); //0xe
makeBasicCommand("half_tab", 0x21); //7 I think

// makeNumberCommand("set_x", 0x33); //moves both current x and line start to x
// makeNumberCommand("set_y", 0x34); //moves both current y and line start to y

makeLookupCommand3("item_with_type", "item", 0x33);

//0x36 - 0x41 unused
//42, show's last item given
//43 related to theater, checks your score and shows your rank, unused
//44 one parameter, seemingly random characters displayed?
//45 icon
//46-52 are direct color setting commands
