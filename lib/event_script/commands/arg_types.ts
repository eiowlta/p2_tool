import { lookupConstantFromBin, lookupConstantToBin } from "../../util/context";
import { toDataView } from "../../util/structlib";
import { ScriptContext } from "../escript";

export interface ArgType {
  name: string;
  fromBin: (value: number, ctx: ScriptContext) => string;
  toBin: (name: string, ctx: ScriptContext) => number;
}

const helperBuff = new Uint8Array(4);
const helperDv = toDataView(helperBuff);

export const varOr = (base: ArgType): ArgType => {
  return {
    name: `var or ${base.name}`,
    fromBin: (value, ctx) => {
      if (value < 0) {
        let varNum = value & 0x7fffffff;
        return lookupConstantFromBin(ctx, "var", varNum);
      } else {
        helperDv.setUint32(0, value, true);
        helperBuff[3] |= (helperBuff[3] & 0x40) << 1;
        return base.fromBin(helperDv.getInt32(0, true), ctx);
      }
    },
    toBin: (value, ctx) => {
      try {
        return variable.toBin(value, ctx);
        // return lookupConstantToBin(ctx, "var", value);
      } catch {
        return base.toBin(value, ctx) & 0x7fffffff;
      }
    },
  };
};
export const variable: ArgType = {
  name: `variable`,
  fromBin: (value, ctx) => {
    if (value < 0) {
      let varNum = value & 0x7fffffff;
      return lookupConstantFromBin(ctx, "var", varNum);
    } else {
      throw `Not a variable`;
    }
  },
  toBin: (value, ctx) => {
    let v = lookupConstantToBin(ctx, "var", value);
    helperDv.setUint32(0, v, true);
    helperBuff[3] |= 0x80;
    return helperDv.getInt32(0, true);
  },
};

export const makeEnumType = (name: string): ArgType => {
  return {
    name,
    fromBin: (value, ctx) => {
      return lookupConstantFromBin(ctx, name, value);
    },
    toBin: (value, ctx) => {
      return lookupConstantToBin(ctx, name, value);
    },
  };
};

export const color: ArgType = {
  name: "color",
  fromBin: (value, ctx) => {
    let r = value & 0xff;
    let g = (value >> 8) & 0xff;
    let b = (value >> 16) & 0xff;
    return `rgb(${r},${g},${b})`;
    // return "rgb(" + [r, g, b].map((a) => a.toString(16).padStart(2, "0")).join("");
  },
  toBin: (value, ctx) => {
    let parts = value
      .slice(4, value.length - 1)
      .split(", ")
      .map((a) => parseInt(a));

    // let v = parseInt(value.slice(2), 16);
    let b = parts[2];
    let g = parts[1];
    let r = parts[0];
    return r | (g << 8) | (b << 16);
  },
};

export const int: ArgType = {
  name: "int",
  fromBin: (value) => {
    return value.toString();
  },
  toBin: (value) => {
    return parseInt(value);
  },
};
export const short: ArgType = {
  name: "number",
  fromBin: (value) => {
    helperDv.setInt32(0, value, true);
    return helperDv.getInt16(0, true).toString();
  },
  toBin: (value) => {
    let v = parseInt(value);
    helperDv.setInt16(0, v, true);
    helperDv.setInt16(2, 0);
    return helperDv.getInt32(0, true);
  },
};

export const makeFixedPoint = (size: number): ArgType => {
  return {
    name: "directionShort",
    fromBin: (value, ctx) => {
      let v = value / size;
      return v.toString();
    },
    toBin: (value, ctx) => {
      let v = parseFloat(value);
      v = Math.floor(v * size); //or maybe round?
      return v;
    },
  };
};
export const fixedPoint = makeFixedPoint(4096);
// export const fixedPoint: ArgType = {
//   name: "directionShort",
//   fromBin: (value, ctx) => {
//     let v = value / 4096;
//     return v.toString();
//   },
//   toBin: (value, ctx) => {
//     let v = parseFloat(value);
//     v = Math.floor(v * 4096); //or maybe round?
//     return v;
//   },
// };

// export const msg = makeEnumType("msg");
export const msg: ArgType = {
  name: "msg",
  fromBin: (value, ctx) => {
    if (ctx.msgMap[value] === undefined)
      ctx.msgMap[value] = `msg_${ctx.msgCounter++}`;
    return ctx.msgMap[value];
  },
  toBin: (value, ctx) => {
    return lookupConstantToBin(ctx, "msg", value);
  },
};
export const varOrFixed = varOr(fixedPoint);

export const label = makeEnumType("label");
// export const variable = makeEnumType("var");
export const varOrInt = varOr(int);
export const func = makeEnumType("function");
export const ref = makeEnumType("ref");
export const item = makeEnumType("item");
export const itemSlot = makeEnumType("itemSlot");
export const varOrItem = varOr(item);
export const msgVar = makeEnumType("msgvar");
export const demon = varOr(makeEnumType("demon"));
export const persona = varOr(makeEnumType("persona"));
export const spell = varOr(makeEnumType("spell"));
export const bustup = varOr(makeEnumType("bustup"));
export const bustup_pos = makeEnumType("bustupPos");
export const bustup_ref = makeEnumType("ref");
export const bool = makeEnumType("bool");
export const sprite = makeEnumType("sprite");
export const unit = varOr(makeEnumType("unit"));

export const bit = makeEnumType("bit");

export const direction = makeEnumType("direction");
export const unitFade = makeEnumType("unitFade");
export const movementSpeed = makeEnumType("movementSpeed");
export const movementEffect = makeEnumType("movementEffect");

export const animation = makeEnumType("animation");
export const spriteEffect = makeEnumType("spriteEffect");
export const animationRevolve = makeEnumType("animrevolve");
export const relDirection = makeEnumType("direction_rel");
export const lookDirection = makeEnumType("lookDir");

export const obj = makeEnumType("obj");
export const blend = makeEnumType("blend");
export const soundeffect = makeEnumType("sfx");
export const varOrsoundeffect = varOr(soundeffect);
export const sound = makeEnumType("sound");
export const varOrSound = varOr(sound);

export const eventType = makeEnumType("eventType"); //
export const dungeon = makeEnumType("dungeon");
export const mmap = makeEnumType("mmap");
export const event = makeEnumType("event");
export const varOrEvent = varOr(event);
export const encounter = makeEnumType("encounter");
export const cutscene = makeEnumType("cutscene");
export const casinoGame = makeEnumType("casinoGame");
export const shopInventory = makeEnumType("shopInventory");

export const sweepstakes = makeEnumType("sweepstakes");
export const counter = makeEnumType("counter");
export const partyMember = makeEnumType("party");
export const personaStock = makeEnumType("personaStock");
export const partyInfoField = makeEnumType("partyInfoField");
export const partyStatus = makeEnumType("partyStatus");
export const evtbg = makeEnumType("evtbg");
export const evtbg_handle = varOr(makeEnumType("evtbg_handle"));
export const varOrEvtbg = varOr(evtbg);
export const screenFade = makeEnumType("screenFade");
export const dungeonInfoField = makeEnumType("dungeonInfoField");

export const collisionObj = makeEnumType("coll");
export const collisionType = makeEnumType("collision");
export const tod = makeEnumType("tod");
export const effect = makeEnumType("effect");
export const effect_handle = makeEnumType("efct");
//
export const dungeonFloorCombo: ArgType = varOr({
  name: "dungeonFloorCombo",
  fromBin: (value, ctx) => {
    let dng = dungeon.fromBin(value >> 8, ctx);
    let floor = value & 0xff;
    return `${dng}-${floor}`;
  },
  toBin: (value, ctx) => {
    let parts = value.split("-");
    if (parts.length != 2) throw new Error(`Invalid dungeon or floor`);
    let floor = parseInt(parts[1]);
    let dng = dungeon.toBin(parts[0], ctx);
    return (dng << 8) | floor;
  },
});

export const directionShort: ArgType = {
  name: "directionShort",
  fromBin: (value, ctx) => {
    return direction.fromBin(value << 1, ctx);
  },
  toBin: (value, ctx) => {
    let v = direction.toBin(value, ctx);
    if (v & 1) throw `Invalid cardinal direction`;
    return v >> 1;
  },
};

// export const movementSpeed: ArgType = {
//     name: "movementSpeed",
//     fromBin: (value, ctx) => {
//       return direction.fromBin(value << 1, ctx);
//     },
//     toBin: (value, ctx) => {
//       let v = direction.toBin(value, ctx);
//       if (v & 1) throw `Invalid cardinal direction`;
//       return v >> 1;
//     },
//   };

// const labelBase = makeEnumType("label");
// export const label: ArgType = {
//     name: "label",
//     fromBin:
// }
