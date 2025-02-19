// type StructFunc =

import { array, number } from "yargs";

// type Type<T> = (off: number, d: DataView) => T;
export interface TypeImpl<T> {
  get: () => T;
  set: (v: T) => void;
}
export interface Type<T> {
  size: number;
  align: number;
  offsetOf?: (name: string) => number;
  handler: (off: number, d: DataView) => TypeImpl<T>;
}
export type TypeType<T> = T extends Type<infer T> ? T : never;

export const u8: Type<number> = {
  size: 1,
  align: 1,
  handler: (off, d) => ({
    get: () => {
      return d.getUint8(off);
    },
    set: (v) => d.setUint8(off, v),
  }),
};
export const u32: Type<number> = {
  size: 4,
  align: 4,
  handler: (off, d) => ({
    get: () => {
      return d.getUint32(off, true);
    },
    set: (v) => d.setUint32(off, v, true),
  }),
};
export const align = (off: number, align: number): number => {
  while (off & (align - 1)) off++;
  return off;
};
export const struct = <T extends Record<string, Type<any>>>(
  st: T
): Type<{ [k in keyof T]: TypeType<T[k]> }> => {
  let offs: Record<string, number> = {};
  let size = Object.entries(st).reduce((p, [k, c]) => {
    p = align(p, c.align);
    offs[k] = p;
    return p + c.size;
  }, 0);
  let alignment = Object.values(st).reduce((p, c) => {
    return Math.max(p, c.align);
  }, 1);
  // console.log(offs, alignment);
  return {
    size,
    align: alignment,
    offsetOf: (name) => {
      return offs[name];
    },
    handler: (off, view) => {
      let obj = {} as { [k in keyof T]: TypeType<T[k]> };
      Object.keys(st).forEach((k) => {
        Object.defineProperty(obj, k, {
          ...st[k].handler(off + offs[k], view),
          enumerable: true,
          configurable: false,
        });
      });
      // return obj as { [k in keyof T]: TypeType<T[k]> };
      return {
        get: () => obj,
        set: (v) => {
          Object.keys(obj).forEach((k) => {
            obj[k as keyof T] = v[k];
          });
        },
      };
    },
  };
};

export const u8array = (size: number): Type<Uint8Array> => {
  return {
    size,
    align: 1,
    handler: (off, view) => {
      let arr = new Uint8Array(view.buffer, view.byteOffset + off, size);
      return {
        get: () => {
          return arr;
        },
        set: (v) => {
          arr.set(v);
        },
      };
    },
  };
};

export const ref = <T>(t: Type<T>, arr: Uint8Array | DataView, off: number) => {
  return t
    .handler(off, new DataView(arr.buffer, arr.byteOffset, arr.byteLength))
    .get();
};
