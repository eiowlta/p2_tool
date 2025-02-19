export interface StructBuffer {
  buff: DataView;
  ptr: number;
  le: boolean;
}
export const toStructBuffer = (
  buff: DataView | Uint8Array,
  ptr?: number,
  le?: boolean
): StructBuffer => {
  return {
    buff: new DataView(buff.buffer, buff.byteOffset, buff.byteLength),
    ptr: ptr ?? 0,
    le: le ?? true,
  };
};
export const addOffset = (buff: StructBuffer, off: number): StructBuffer => {
  return {
    ...buff,
    ptr: buff.ptr + off,
  };
};
export const toDataView = (buff: Uint8Array): DataView => {
  return new DataView(buff.buffer, buff.byteOffset, buff.byteLength);
};
export interface BinaryStruct<T> {
  /**
   * Read from buffer
   */
  read: (b: StructBuffer) => T;
  /**
   * Write into buffer
   */
  write: (b: StructBuffer, v: T) => void;
  /**
   * Calculate size of data written
   */
  size: (v: T) => number;
}

type UndefinedProperties<T> = {
  [P in keyof T]-?: undefined extends T[P] ? P : never;
}[keyof T];

type ToOptional<T> = T extends Record<string, unknown>
  ? Partial<Pick<T, UndefinedProperties<T>>> &
      Pick<T, Exclude<keyof T, UndefinedProperties<T>>>
  : T;

export type StructType<T> = T extends BinaryStruct<infer T> ? T : never;
// export type StructType<T extends { read: (...args: any[]) => any }> =
//   ReturnType<T["read"]>;

/**
 * Helper function to reduce duplicate code
 * Constructs the function name to use based on the arguments
 * Internally is a data view
 * @param method method of dataView to call, prefixed with get/set as appropriate
 * @param littleEndian
 * @returns
 */
const makeDataViewReader = <
  K extends string,
  T extends `get${K}` extends keyof DataView
    ? ReturnType<DataView[`get${K}`]>
    : never
>(
  method: K
): BinaryStruct<T> => {
  const size = parseInt(method.match(/\d+/)![0]) / 8;
  const get = `get${method}` as keyof DataView;
  const set = `set${method}` as keyof DataView;
  return {
    read: (b) => {
      const v = (b.buff[get] as (n: number, b: boolean) => T)(b.ptr, b.le);
      b.ptr += size;
      return v as T;
    },
    write: (b, v) => {
      (b.buff[set] as (n: number, v: T, b: boolean) => void)(b.ptr, v, b.le);
      b.ptr += size;
    },
    size: () => size,
  };
};

const makeDataViewReaderEndian = <
  K extends string,
  T extends `get${K}` extends keyof DataView
    ? ReturnType<DataView[`get${K}`]>
    : never
>(
  method: K,
  le: boolean
): BinaryStruct<T> => {
  const size = parseInt(method.split("int")[1]) / 8;
  const get = `get${method}` as keyof DataView;
  const set = `set${method}` as keyof DataView;
  return {
    read: (b) => {
      const v = (b.buff[get] as (n: number, b: boolean) => T)(b.ptr, le);
      b.ptr += size;
      return v as T;
    },
    write: (b, v) => {
      (b.buff[set] as (n: number, v: T, b: boolean) => void)(b.ptr, v, le);
      b.ptr += size;
    },
    size: () => size,
  };
};

export const u8 = makeDataViewReader("Uint8");
export const u16 = makeDataViewReader("Uint16");
export const u32 = makeDataViewReader("Uint32");
export const u64 = makeDataViewReader("BigUint64");
export const i8 = makeDataViewReader("Int8");
export const i16 = makeDataViewReader("Int16");
export const i32 = makeDataViewReader("Int32");
export const i64 = makeDataViewReader("BigInt64");
export const f32 = makeDataViewReader("Float32");
export const f64 = makeDataViewReader("Float64");

export const u16be = makeDataViewReaderEndian("Uint16", false);
export const u16le = makeDataViewReaderEndian("Uint16", true);
export const u32be = makeDataViewReaderEndian("Uint32", false);
export const u32le = makeDataViewReaderEndian("Uint32", true);
export const u64be = makeDataViewReaderEndian("BigUint64", false);
export const u64le = makeDataViewReaderEndian("BigUint64", true);
export const i16be = makeDataViewReaderEndian("Int16", false);
export const i16le = makeDataViewReaderEndian("Int16", true);
export const i32be = makeDataViewReaderEndian("Int32", false);
export const i32le = makeDataViewReaderEndian("Int32", true);
export const i64be = makeDataViewReaderEndian("BigInt64", false);
export const i64le = makeDataViewReaderEndian("BigInt64", true);
export const f32be = makeDataViewReaderEndian("Float32", false);
export const f32le = makeDataViewReaderEndian("Float32", true);
export const f64be = makeDataViewReaderEndian("Float64", false);
export const f64le = makeDataViewReaderEndian("Float64", true);

const ENSURE_PAD_ZERO = false;
/**
 * Parse obj and then skip pad bytes.  the pad bytes are not modified
 * @param obj
 * @param pad
 * @returns
 */
export function pad<T>(
  obj: BinaryStruct<T>,
  pad: number,
  zeroOkay: boolean = false
): BinaryStruct<T> {
  return {
    read: (b) => {
      const v = obj.read(b);
      if (ENSURE_PAD_ZERO && !zeroOkay) {
        for (let i = 0; i < pad; i++) {
          if (b.buff.getUint8(i + b.ptr) != 0) console.warn("Padding not 0");
        }
      }
      b.ptr += pad;
      return v;
    },
    write: (b, o) => {
      obj.write(b, o);
      if (ENSURE_PAD_ZERO && !zeroOkay) {
        for (let i = 0; i < pad; i++) {
          if (b.buff.getUint8(i + b.ptr) != 0) console.warn("Padding not 0");
        }
      }
      b.ptr += pad;
    },
    size: (o) => {
      return obj.size(o) + pad;
    },
  };
}
/**
 * create a type from multiple types
 * @param obj
 * @returns
 */
export function structType<T>(obj: {
  [k in keyof T]: BinaryStruct<T[k]>;
}): BinaryStruct<ToOptional<T>> {
  return {
    read: (b) => {
      const o: Partial<T> = {};
      Object.keys(obj).forEach((k) => {
        o[k as keyof T] = obj[k as keyof T].read(b);
      });
      return o as ToOptional<T>;
    },
    write: (b, o) => {
      Object.keys(obj).forEach((k) => {
        obj[k as keyof T].write(b, o[k as keyof ToOptional<T>] as T[keyof T]);
      });
    },
    size: (o) =>
      Object.keys(obj).reduce(
        (sum, k) =>
          sum +
          obj[k as keyof T].size(o[k as keyof ToOptional<T>] as T[keyof T]),
        0
      ),
  };
}

// export const dummy: BinaryStruct<undefined> = {
//   read: b => undefined,
//   write: (b, o) => { },
//   size: _ => 0
// }
export const constant = <T>(value: T): BinaryStruct<T> => ({
  read: () => value,
  write: () => {},
  size: (_) => 0,
});
export const dummy = constant(undefined);

export function prefixedArrayType<T>(
  sizeType: BinaryStruct<number>,
  base: BinaryStruct<T>
): BinaryStruct<T[]> {
  return {
    read: (b) => {
      const length = sizeType.read(b);
      const arr: T[] = [];
      for (let i = 0; i < length; i++) {
        arr.push(base.read(b));
      }
      return arr;
    },
    write: (b, arr) => {
      sizeType.write(b, arr.length);
      arr.forEach((v) => {
        base.write(b, v);
      });
    },
    size: (arr) =>
      sizeType.size(arr.length) + arr.reduce((sum, v) => sum + base.size(v), 0),
  };
}
export function fixedArrayType<T>(
  base: BinaryStruct<T>,
  length: number
): BinaryStruct<T[]> {
  return {
    read: (b) => {
      const arr: T[] = [];
      for (let i = 0; i < length; i++) {
        arr.push(base.read(b));
      }
      return arr;
    },
    write: (b, arr) => {
      arr.forEach((v) => {
        base.write(b, v);
      });
    },
    size: (arr) => arr.reduce((sum, v) => sum + base.size(v), 0),
  };
}

// export function expected<T>(base: BinaryStruct<T>, value: T): BinaryStruct<T> {
//   return {
//     read: (b) => {
//       const v = base.read(b);
//       if (v != value) throw `Expected ${value} found ${v}`;
//       return v;
//     },
//     write: (b, v) => {
//       if (v != value) throw `Expected ${value} found ${v}`;
//       base.write(b, v);
//     },
//     size: base.size,
//   };
// }
export function padToEven<T>(base: BinaryStruct<T>): BinaryStruct<T> {
  return {
    read: (b) => {
      const start = b.ptr;
      const v = base.read(b);
      if ((b.ptr - start) & 1) b.ptr++;
      return v;
    },
    write: (b, v) => {
      const start = b.ptr;
      base.write(b, v);
      if ((b.ptr - start) & 1) b.ptr++;
    },
    size: (v) => {
      let s = base.size(v);
      if (s & 1) s++;
      return s;
    },
  };
}
export function prependLength<T>(base: BinaryStruct<T>): BinaryStruct<T> {
  return {
    read: (b) => {
      const start = b.ptr;
      const len = u8.read(b);
      const v = base.read(b);

      if (b.ptr - start != len)
        throw `Length doesn't match ${b.ptr - start} ${len}`;
      return v;
    },
    write: (b, v) => {
      const start = b.ptr++;
      base.write(b, v);
      b.buff.setUint8(start, b.ptr - start);
    },
    size: (v) => base.size(v) + 1,
  };
}

export function extend<T, S>(
  base: BinaryStruct<T>,
  ext: BinaryStruct<S>
): BinaryStruct<T & S> {
  return {
    read: (b) => {
      return {
        ...base.read(b),
        ...ext.read(b),
      };
    },
    write: (b, o) => {
      base.write(b, o);
      ext.write(b, o);
    },
    size: (o) => base.size(o) + ext.size(o),
  };
}

// function exact<T>(t: T): BinaryStruct<T> {
//     return {

//     }
// }
export function exact<T, S extends T>(
  base: BinaryStruct<T>,
  value: S
): BinaryStruct<S | undefined> {
  return {
    read: (b) => {
      const v = base.read(b);
      if (v != value) throw new Error(`Expected ${value} found ${v}`);
      return value;
    },
    write: (b, v) => {
      if (v != undefined && v != value) throw new Error(`Expected ${value} found ${v}`);
      base.write(b, value);
    },
    size: () => base.size(value),
  };
}
export function withDefault<T>(
  base: BinaryStruct<T>,
  value: T
): BinaryStruct<T | undefined> {
  return {
    read: (b) => {
      const v = base.read(b);
      return v;
    },
    write: (b, v) => {
      base.write(b, v ?? value);
    },
    size: (v) => base.size(v ?? value),
  };
}

export function mapType<T, S>(
  base: BinaryStruct<T>,
  mapper: { from: (v: T) => S; to: (v: S) => T }
): BinaryStruct<S> {
  return {
    read: (b) => mapper.from(base.read(b)),
    write: (b, o) => base.write(b, mapper.to(o)),
    size: (o) => base.size(mapper.to(o)),
  };
}

export function choice<
  V extends string | number | symbol,
  T extends { [k in V]: BinaryStruct<any> },
  K extends string | number | symbol
>(
  keyType: BinaryStruct<any>,
  key: K,
  options: T
): BinaryStruct<{ [k in keyof T]: StructType<T[k]> }[keyof T]> {
  return {
    read: (b) => {
      const root = keyType.read(b);
      const p = options[root[key] as V]; //is there any way to properly typecheck this??
      if (p === undefined)
        throw `Expected one of ${Object.keys(options)} in choice found ${root}`;
      return {
        [key]: root,
        ...p.read(b),
      };
    },
    write: (b, o) => {
      options[o.a as V].write(b, o);
    },
    size: (o) => options[o.a as V].size(o),
  };
}

export const cchar = mapType(u8, {
  from: (v: number) => String.fromCharCode(v),
  to: (v: string) => v.charCodeAt(0),
});
export const cstr: BinaryStruct<string> = {
  read: (b) => {
    const s: string[] = [];
    while (true) {
      const v = u8.read(b);
      if (v == 0) return s.join("");
      s.push(String.fromCharCode(v));
    }
  },
  write: (b, o) => {
    o.split("").forEach((v) => u8.write(b, v.charCodeAt(0)));
    u8.write(b, 0);
  },
  size: (o) => o.length + 1,
};
export const fixedString = (len: number): BinaryStruct<string> => ({
  read: (b) => {
    const s: string[] = [];
    for (let i = 0; i < len; i++) {
      const v = u8.read(b);
      s.push(String.fromCharCode(v));
    }
    return s.join("");
  },
  write: (b, o) => {
    if (o.length != len) throw `Expected string of length ${len} found '${o}'`;
    for (let i = 0; i < len; i++) u8.write(b, o.charCodeAt(i));
  },
  size: () => len,
});
