import {
  addOffset,
  BinaryStruct,
  cstr,
  dummy,
  exact,
  f32,
  fixedArrayType,
  fixedString,
  mapType,
  prefixedArrayType,
  StructBuffer,
  StructType,
  structType,
  toDataView,
  toStructBuffer,
  u16,
  u16be,
  u32,
  u32be,
  u32le,
  u64,
  u64be,
  u64le,
  u8,
} from "../util/structlib";

/**
 * Header for a TOC (and the CPK header)
 */
export const TOCHeader = structType({
  type: fixedString(4),
  unknown: exact(u32le, 0xff as const),
  size: u64le,
});
/**
 * UTF header
 */
export const UTFHeader = structType({
  utfMagic: exact(fixedString(4), "@UTF" as const),
  size: u32be,
  rowsOff: u32be,
  stringsOff: u32be,
  dataOff: u32be,
  name: u32be,
  columns: u16be,
  rowLen: u16be,
  numRows: u32be,
});

export enum DataType {
  u8,
  u8_2,
  u16,
  u16_2,
  u32,
  u32_2,
  u64,
  u64_2,
  float,
  string = 0xa,
  byteArray,
  none = 0xf,
}
const DataTypeSizes = {
  [DataType.u8]: 1,
  [DataType.u8_2]: 1,
  [DataType.u16]: 2,
  [DataType.u16_2]: 2,
  [DataType.u32]: 4,
  [DataType.u32_2]: 4,
  [DataType.u64]: 8,
  [DataType.u64_2]: 8,
  [DataType.float]: 4,
  [DataType.string]: 4,
  [DataType.byteArray]: 4,
  [DataType.none]: 0,
};

/**
 *
 * @param byteBuff data section buffer
 * @returns
 */
export const ByteArrayType = (
  byteBuff: StructBuffer
): BinaryStruct<Uint8Array> => {
  return {
    read: (b) => {
      let off = u32.read(b);
      let size = u32.read(b);
      return NByteArray(size).read(addOffset(byteBuff, off));
    },
    write: (b, o) => {
      throw "Unsupported";
    },
    size: (_) => 8,
  };
};

/**
 * Extracts buffer of n bytes
 * @param n number of bytes to extract
 * @returns
 */
export const NByteArray = (n: number): BinaryStruct<Uint8Array> => {
  return {
    read: (b) => {
      return new Uint8Array(b.buff.buffer.slice(b.ptr, b.ptr + n));
    },
    write: (b, o) => {
      for (let i = 0; i < n; i++) u8.write(b, o[i]);
    },
    size: (o) => n,
  };
};

/**
 * Reads an offset from the current buffer
 * @param strBuff string table location
 * @returns
 */
export const CPKStringType = (strBuff: StructBuffer): BinaryStruct<string> => {
  return {
    read: (b) => {
      let off = u32be.read(b);
      return cstr.read(addOffset(strBuff, off));
    },
    write: (b, o) => {
      throw `Unsupported`;
      //   u32be.write(b, o);
    },
    size: (_) => 4,
  };
};

export enum ColumnStorage {
  None,
  Zero = 0x1,
  Column = 0x3,
  Row = 0x5,
}
export interface Column {
  type: DataType;
  storage: ColumnStorage;
  name: number;
}

const validateEnum = <T, K extends T[keyof T]>(en: T, v: any): v is K => {
  return typeof (en as any)[v] === "string";
};

// const u8Except0: BinaryStruct<number> = {
//   read: (b) => {
//     let v = u8.read(b);
//     if (v) return v;
//     console.log("uh oh");
//     throw "0 is an invalid value";
//     for (let i = 0; i < 3; i++)
//       if (u8.read(b) != 0) {
//         console.log(b.buff.getUint8(b.ptr - 1).toString(16));
//       }
//     // b.ptr += 2;
//     return u8.read(b);
//   },
//   write: (b, o) => {
//     u8.write(b, o);
//   },
//   size: (_) => 1,
// };

interface UTFOBj<T> {
  typeName: string;
  data: T[];
}

/**
 * Calculate table size and column data type, prepare string table
 * @param name UTF type name
 * @param data array of objects for table
 * @returns
 */
const prepareUTFData = <T extends Record<string, string | number>>(
  name: string,
  data: T[]
) => {
  //   const name = o.name;
  //   const data = o.data;
  const columns: {
    key: string;
    type: DataType;
    value?: number;
  }[] = [];
  const strings: Record<string, number> = {};
  let stringSize = 0;
  const getString = (str: string): number => {
    if (strings[str] === undefined) {
      strings[str] = stringSize;
      stringSize += str.length + 1;
    }
    return strings[str];
  };
  getString("<NULL>");
  getString(name);
  let prototype = data[0];
  for (const [k, v] of Object.entries(prototype)) {
    getString(k);
    let type = TypeLookup[name]?.[k];
    let isConstant = true;
    for (const row of data) {
      if (row[k] != v) {
        isConstant = false;
        break;
      }
    }
    if (typeof v === "string") {
      let col: typeof columns[0] = {
        key: k,
        type: type ?? 10,
      };
      if (isConstant) {
        col.value = getString(v);
      } else {
        for (const row of data) {
          getString(row[k] as string);
        }
      }
      columns.push(col);
    } else {
      let max = data.reduce(
        (p, c) => (p < (c[k] as number) ? (c[k] as number) : p),
        v
      );
      let itype = 1;
      if (max > 255) itype = 2;
      if (max > 65535) itype = 4;

      let col: typeof columns[0] = {
        key: k,
        type: type ?? itype,
      };
      if (isConstant) col.value = v as number;
      columns.push(col);
    }
  }
  const columnSize = columns.reduce((p, c) => {
    p += 5;
    if (c.value === undefined || c.value === 0) return p;
    return p + DataTypeSizes[c.type];
  }, 0);

  const rowLen = columns.reduce((p, c) => {
    if (c.value !== undefined || c.value === 0) return p;
    return p + DataTypeSizes[c.type];
  }, 0);
  const rowSize = rowLen * data.length;

  const header: StructType<typeof UTFHeader> = {
    size: columnSize + rowSize + stringSize,
    rowsOff: columnSize,
    stringsOff: columnSize + rowSize,
    dataOff: columnSize + rowSize + stringSize,
    name: getString(name),
    columns: columns.length,
    rowLen,
    numRows: data.length,
  };
  const size = UTFHeader.size(header);
  header.size += size + 8;
  header.stringsOff += size - 8;
  header.dataOff += size - 8;
  header.rowsOff += size - 8;
  header.size = (header.size + 7) & ~7;
  return {
    header,
    strings,
    columns,
  };
};

// const RawColumnType = structType({
//   flags: u8,
//   name: u32be,
// });

const ColumnType = mapType<{ flags: number; name: number }, Column>(
  structType({
    flags: u8,
    name: u32be,
  }),
  {
    from: (v) => {
      if (
        validateEnum(DataType, v.flags & 0xf) &&
        validateEnum(ColumnStorage, v.flags >> 4)
      ) {
        return {
          type: v.flags & (0xf as DataType),
          storage: (v.flags >> 4) as ColumnStorage,
          name: v.name,
        };
      } else throw `Unknown column flags ${v.flags & 0xf} ${v.flags >> 4}`;
    },
    to: (v) => {
      return {
        flags: (v.type as number) | ((v.storage as number) << 4),
        name: v.name,
      };
    },
  }
);

const TypeLookup: Record<
  string,
  Record<string, number | undefined> | undefined
> = {
  CpkHeader: {
    UpdateDateTime: 6,
    FileSize: 6,
    ContentOffset: 6,
    ContentSize: 6,
    TocOffset: 6,
    TocSize: 6,
    TocCrc: 4,
    EtocOffset: 6,
    EtocSize: 6,
    ItocOffset: 6,
    ItocSize: 6,
    ItocCrc: 4,
    GtocOffset: 6,
    GtocSize: 6,
    GtocCrc: 4,
    EnabledPackedSize: 6,
    EnabledDataSize: 6,
    TotalDataSize: 6,
    Tocs: 4,
    Files: 4,
    Groups: 4,
    Attrs: 4,
    TotalFiles: 4,
    Directories: 4,
    Updates: 4,
    Version: 2,
    Revision: 2,
    Align: 2,
    Sorted: 2,
    EID: 2,
    CpkMode: 4,
    Tvers: 10,
    Comment: 10,
    Codec: 4,
    DpkItoc: 4,
    EnableTocCrc: 4,
    EnableFileCrc: 4,
  },
  CpkTocInfoEx: {
    DirName: 10,
    FileName: 10,
    FileSize: 4,
    ExtractSize: 4,
    FileOffset: 6,
    ID: 4,
    UserString: 10,
    CRC: 4,
  },
  CpkExtendedIndex: {
    ID: 5,
    TocIndex: 5,
  },
};

/**
 * Where the magic happens..
 */
export const UTF: BinaryStruct<UTFOBj<any>> = {
  read: (b) => {
    let base = b.ptr + 8;
    let header = UTFHeader.read(b);
    let stringsBuff = toStructBuffer(b.buff, base + header.stringsOff, b.le);
    let dataBuff = toStructBuffer(b.buff, base + header.dataOff, b.le);
    let rowsBuff = toStructBuffer(b.buff, base + header.rowsOff, b.le);
    let rowDataType: Record<string, BinaryStruct<any>> = {};
    let rowType: Record<string, BinaryStruct<any>> = {};
    let prototype: Record<string, any> = {};
    let rows: Record<any, any>[] = [];
    let columns: StructType<typeof ColumnType>[] = [];

    /**
     * here so we can pass in relevant buffers
     */
    let typeMap: Record<DataType, BinaryStruct<any>> = {
      [DataType.u8]: u8,
      [DataType.u8_2]: u8,
      [DataType.u16]: u16,
      [DataType.u16_2]: u16,
      [DataType.u32]: u32,
      [DataType.u32_2]: u32,
      [DataType.u64]: mapType(u64, {
        from: (v) => Number(v),
        to: (v) => BigInt(v),
      }),
      [DataType.u64_2]: mapType(u64, {
        from: (v) => Number(v),
        to: (v) => BigInt(v),
      }),
      [DataType.float]: f32,
      [DataType.string]: CPKStringType(stringsBuff),
      [DataType.byteArray]: ByteArrayType(dataBuff),
      [DataType.none]: dummy,
    };

    const typeName = cstr.read(addOffset(stringsBuff, header.name));

    //read columns and construct row prototype
    for (let i = 0; i < header.columns; i++) {
      let col = ColumnType.read(b);

      let name = cstr.read(addOffset(stringsBuff, col.name));
      columns.push(col);

      rowType[name] = typeMap[col.type];
      switch (col.storage) {
        case ColumnStorage.None:
          break;
        case ColumnStorage.Zero:
          rowType[name] = typeMap[col.type];
          switch (col.type) {
            case DataType.byteArray:
              prototype[name] = [];
              break;
            case DataType.string:
              prototype[name] = "";
              break;
            default:
              prototype[name] = 0;
              break;
          }
          break;
        case ColumnStorage.Column:
          prototype[name] = typeMap[col.type].read(b);
          break;
        case ColumnStorage.Row:
          rowDataType[name] = typeMap[col.type];
          break;
      }
    }
    let inst = structType(rowDataType);

    //read rows
    for (let i = 0; i < header.numRows; i++) {
      let data = inst.read(rowsBuff);
      rows.push({ ...prototype, ...data });
    }
    return { typeName, data: rows };
  },
  write: (b, o) => {
    const name = o.typeName;
    const data = o.data;
    const base = b.ptr + 8;

    //process data and allocate strings
    const { header, strings, columns } = prepareUTFData(name, data);

    //write header
    UTFHeader.write(b, header);

    let stringsBuff = toStructBuffer(b.buff, base + header.stringsOff, b.le);
    let dataBuff = toStructBuffer(b.buff, base + header.dataOff, b.le);
    let rowsBuff = toStructBuffer(b.buff, base + header.rowsOff, b.le);

    let typeMap: Record<DataType, BinaryStruct<any>> = {
      [DataType.u8]: u8,
      [DataType.u8_2]: u8,
      [DataType.u16]: u16,
      [DataType.u16_2]: u16,
      [DataType.u32]: u32,
      [DataType.u32_2]: u32,
      [DataType.u64]: mapType(u64, {
        from: (v) => Number(v),
        to: (v) => BigInt(v),
      }),
      [DataType.u64_2]: mapType(u64, {
        from: (v) => Number(v),
        to: (v) => BigInt(v),
      }),
      [DataType.float]: f32,
      [DataType.string]: {
        read: (b) => {
          throw "Unsupported";
        },
        write: (b, v) => u32be.write(b, strings[v]),
        size: (v) => 4,
      },

      [DataType.byteArray]: ByteArrayType(dataBuff),
      [DataType.none]: dummy,
    };

    //add strings
    for (let [str, off] of Object.entries(strings)) {
      cstr.write(addOffset(stringsBuff, off), str);
    }

    //write columns and construct row prototype
    const rowProto: Record<string, BinaryStruct<number | string>> = {};
    columns.forEach((col) => {
      let dtype = col.type;
      let type = typeMap[dtype];
      let storage =
        col.value === undefined
          ? ColumnStorage.Row
          : col.value === 0
          ? ColumnStorage.Zero
          : ColumnStorage.Column;
      let column: StructType<typeof ColumnType> = {
        storage,
        type: dtype,
        name: strings[col.key],
      };
      ColumnType.write(b, column);

      if (col.value === undefined) {
        rowProto[col.key] = type;
      } else {
        if (col.value !== 0) type.write(b, col.value);
      }
    });

    //write row data
    const rowWriter = structType(rowProto);
    for (const row of data) {
      rowWriter.write(rowsBuff, row);
    }
  },
  size: (o) => {
    const name = o.typeName;
    const data = o.data;
    return prepareUTFData(name, data).header.size + 8;
  },
};
