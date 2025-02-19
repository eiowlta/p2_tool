import { CommandParser } from "./command_types";

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
      return [0xff00 | opcode];
    },
  };
  opMap.byName[name] = parser;
  opMap.byOp[opcode] = parser;
};

makeBasicCommand("nl", 0x03);
makeBasicCommand("half_nl", 0x04);
makeBasicCommand("end", 0xff);
makeBasicCommand("suou", 0x10);
makeBasicCommand("tatsuya", 0x11);
makeBasicCommand("tatsu", 0x12);

const colors: Record<string, number> = {
  white1: 0x20,
  white: 0x21,
  green: 0x22,
  teal: 0x23,
  yellow: 0x24,
  purple: 0x25,
  gray: 0x26,
  lime: 0x27,
  black: 0x28,
  orange: 0x29,
  pink: 0x2a,
  name_green: 0x2b, //in IS this unindents the name
  dark_green: 0x2c,
  teal2: 0x2d,
  blue: 0x2e,
  white2: 0x2f,
  white3: 0x30,
  white4: 0x31,
  white5: 0x32,
  white6: 0x33,
  white7: 0x34,
  white8: 0x35,
  white9: 0x36,
};
const colorInv: Record<number, string> = {};

let colorParser: CommandParser = {
  name: "color",
  fromText: (name, args, ctx) => {
    if (args.length != 1) throw `Color expects exactly one argument`;
    if (colors[args[0]] === undefined) throw `Unknown font color ${args[0]}`;
    return {
      cmd: "color",
      arguments: [args[0]],
    };
  },
  toText: (command, ctx) => {
    return `${command.cmd}(${command.arguments[0]})`;
  },
  fromBin: (id, args, ctx) => {
    if (args.length != 1) throw `Color expects exactly one argument`;
    if (colors[args[0]] === undefined)
      throw new Error(`Unknown font color ${args[0]}`);
    return {
      cmd: "color",
      arguments: [colorInv[args[0]]],
    };
  },
  toBin: (command, ctx) => {
    if (colors[command.arguments[0]] === undefined)
      throw new Error(`Unknown font color ${command.arguments[0]}`);
    return [0xff00 | colors[command.arguments[0]]];
  },
};
opMap.byName.color = colorParser;
for (const color in colors) {
  colorInv[colors[color]] = color;
  opMap.byOp[colors[color]] = colorParser;
}
const icons: Record<string, number> = {
  item: 0x40,
  item2: 0x41,
  cd: 0x42,
  card: 0x43,
  key: 0x44,
  sword: 0x45,
  coin: 0x46,
  rapier: 0x47,
  gun: 0x48,
  fist: 0x49,
  map: 0x4a,
  helmet: 0x4b,
  armor: 0x4c,
  leg: 0x4d,
  accessory: 0x4e,
  //   item: 0x4f,
  fire: 0x50,
  water: 0x51,
  wind: 0x52,
  earth: 0x53,
  ice: 0x54,
  electric: 0x55,
  nuclear: 0x56,
  almighty: 0x57,
  holy: 0x58,
  dark: 0x59,
  nerve: 0x5a,
  mind: 0x5b,
  heal: 0x5c,
  support: 0x5d,
  utility: 0x60,
};
for (const icon in icons) {
  makeBasicCommand(`icon_${icon}`, icons[icon]);
}
