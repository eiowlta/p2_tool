// import _, { Dictionary } from "lodash";
import { EncodingScheme, Locale } from "./encoding";
import { joinPath, libpath, readTextFileSync } from "./filesystem";
// import { loadGameFile } from "./filesystem.ts";
// import * as _ from "https://deno.land/std/collections/mod.ts";

export enum Game {
  EP = "ep",
  IS = "is",
}

// export type LookupToBin = Record<string, number>;
// export type LookupFromBin = Record<number, string>;
// export interface LookupType {
//   toBin: Record<string, number>;
//   fromBin: Record<number, string>;
//   closed: boolean; //prevent auto creation
// }

export interface Lookup {
  toBin: Record<string, number>;
  fromBin: Record<number, string>;
  closed: boolean; //prevent auto creation
}

export type Constants = Record<string, Lookup>;

export interface GameContext {
  game: Game;
  variant?: string;
  locale: Locale;
  constants: Constants;
}

// let defaultConstants: Constants = {
//   bool: {
//     toBin: { true: 1, false: 0 },
//     fromBin: { 0: "false", 1: "true" },
//   },
// };
export const createContext = (
  game: Game,
  locale: Locale,
  constants?: Constants
): GameContext => {
  return {
    game,
    locale,
    constants: { ...(constants || {}) },
  };
};

export const loadScriptConstants = async (ctx: GameContext) => {
  if (ctx.constants.__scriptConstantsLoaded) return;
  let path = joinPath(libpath, "game", ctx.game, "context", `script.json`);
  try {
    let file = JSON.parse(await readTextFileSync(path));
    let keys = Object.keys(file);
    for (const key of keys) {
      addLookup(ctx, key, file[key]);
    }
    addLookup(ctx, "__scriptConstantsLoaded", []);
  } catch (e) {
    console.warn("Could not find script constants");
    addLookup(ctx, "__scriptConstantsLoaded", []);
  }
};

export const addLookup = (
  ctx: GameContext,
  name: string,
  data: Record<number, string> | string[],
  closed: boolean = false
) => {
  let lookup: Lookup = { toBin: {}, fromBin: {}, closed };

  if (Array.isArray(data)) {
    for (let k = 0; k < data.length; k++) {
      let v = data[k];
      if (lookup.toBin[v] !== undefined)
        throw new Error(`Duplicate constant value in ${name}: ${v}`);
      lookup.toBin[v] = k;
      lookup.fromBin[k] = v;
    }
  } else {
    for (const ent of Object.entries(data)) {
      let k = parseInt(ent[0]);
      let v = ent[1] as string;
      if (lookup.toBin[v] !== undefined)
        throw new Error(`Duplicate constant value in ${name}: ${v}`);
      if (lookup.fromBin[k] !== undefined)
        throw new Error(`Duplicate constant key in ${name}: ${k}`);
      lookup.toBin[v] = k;
      lookup.fromBin[k] = v;
    }
  }
  ctx.constants[name] = lookup;
};
export const addLookupInv = (
  ctx: GameContext,
  name: string,
  data: Record<string, number>,
  closed: boolean = false
) => {
  let lookup: Lookup = { toBin: {}, fromBin: {}, closed };

  for (const ent of Object.entries(data)) {
    let k = ent[1];
    let v = ent[0];
    if (lookup.toBin[v] !== undefined)
      throw new Error(`Duplicate constant value in ${name}: ${v}`);
    if (lookup.fromBin[k] !== undefined)
      throw new Error(`Duplicate constant key in ${name}: ${k}`);
    lookup.toBin[v] = k;
    lookup.fromBin[k] = v;
  }
  ctx.constants[name] = lookup;
};

export enum ConstantStrategy {
  default,
  message,
}
export const lookupConstantToBin = (
  ctx: GameContext,
  name: string,
  value: string
) => {
  if (ctx.constants[name] === undefined) {
    loadLookupFile(ctx, name);
  }
  let lookup = ctx.constants[name];

  if (lookup.toBin[value] !== undefined) return lookup.toBin[value];

  if (!lookup.closed && value.startsWith(name + "_"))
    return parseInt(value.split("_").pop()!, 16);

  throw new Error(`Unknown constant of type ${name}: ${value}`);
};
export const lookupConstantFromBin = (
  ctx: GameContext,
  name: string,
  value: number
) => {
  if (ctx.constants[name] === undefined) {
    loadLookupFile(ctx, name);
  }
  let lookup = ctx.constants[name];

  if (lookup.fromBin[value] === undefined) {
    if (lookup.closed)
      throw new Error(`Unknown constant of type ${name} ${value}`);
    let k = `${name}_${value.toString(16)}`;
    lookup.fromBin[value] = k;
    lookup.toBin[k] = value;
  }
  return lookup.fromBin[value];
  // return `${name}_${value.toString(16)}`;
  // if (value.startsWith(name)) return parseInt(value.split("_")[1], 16);
  // throw new Error(`Unknown constant of type ${name}: ${value}`);
};

export const loadLookupFile = (context: GameContext, name: string) => {
  let path = joinPath(libpath, "game", context.game, "context", `${name}.json`);
  try {
    let data = JSON.parse(readTextFileSync(path));
    addLookup(context, name, data);
  } catch (e) {
    context.constants[name] = { toBin: {}, fromBin: {} } as Lookup;
  }
};

// export interface GameContext {
//   bits: LookupType;
//   bustup: LookupType;
//   key_items: LookupType;
//   party: LookupType;
//   // smd: LookupType;
//   msg_op: { [k in keyof typeof EncodingScheme]: LookupType };
//   // msg_op_estr: LookupType;
//   // msg_op_fstr: LookupType;
//   // script_op: LookupType;
//   // msg_op: { [k in keyof typeof EncodingScheme]: LookupType };
//   // locale: Locale;
// }

// let context: Partial<GameContext> | undefined;
// const keyBy = (arr: string[]): LookupFromBin => {
//   let res: LookupFromBin = {};
//   for (let i = 0; i < arr.length; i++) res[i] = arr[i];
//   return arr;
// };

// export const loadContext = async () => {
//   if (!context) {
//     context = {
//       bits: await loadContextFile("context/bits.txt", (data) =>
//         keyBy(data.split("\n"))
//       ),
//       bustup: await loadContextFile("context/bustup.json", (data) =>
//         _.mapValues(
//           _.mapKeys(JSON.parse(data), (a) => parseInt(a).toString()),
//           (v) => v.name
//         )
//       ),
//       key_items: await loadContextFile("context/key_items.json", (data) =>
//         keyBy(JSON.parse(data))
//       ),
//       party: await loadContextFile("context/party.json", (data) =>
//         keyBy(JSON.parse(data))
//       ),
//       msg_op: {
//         estr: await loadContextFile("context/msg_op_map.js", (data) => {
//           return eval(data); //EEEEVIIILLL
//         }),
//         fstr: await loadContextFile("context/msg_op_map_fstr.js", (data) => {
//           return eval(data); //EEEEVIIILLL
//         }),
//       },
//     };
//   }
//   console.log(context.msg_op);
//   return context;
// };

// const loadContextFile = async (
//   path: string,
//   mapper: (data: string) => LookupFromBin
// ): Promise<LookupType> => {
//   let data = await loadGameFile(path);
//   let fromBin = mapper(data);
//   let toBin = _.invert(fromBin) as unknown as LookupToBin;
//   return {
//     fromBin,
//     toBin,
//   };
// };
