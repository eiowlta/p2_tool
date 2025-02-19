import {
  u32,
  u32be,
  structType,
  u16be,
  BinaryStruct,
  u8,
  pad,
  fixedArrayType,
  prependLength,
  padToEven,
  i8,
  StructType,
  mapType,
  choice,
  exact,
  u32le,
  u16le,
  fixedString,
  u16,
  withDefault,
} from "../util/structlib";

/**
 * For string with fixed length, padded with 0x20 (space)
 * Ascii only
 * @param len
 * @returns
 */
export function paddedString(len: number): BinaryStruct<string> {
  return {
    read: (b) => {
      const bytes: number[] = [];
      for (let i = 0; i < len; i++) {
        bytes.push(u8.read(b));
      }
      return String.fromCharCode(...bytes).trimEnd();
    },
    write: (b, str) => {
      for (let i = 0; i < len; i++) {
        if (i < str.length) u8.write(b, str.charCodeAt(i));
        else u8.write(b, 0x20);
      }
    },
    size: () => len,
  };
}

/**
 * For string with variable length where the length is prepended.
 * Ascii only, no null terminator
 * @param lenType underlying type of the length field
 * @returns
 */
export function stringWithLength(
  lenType: BinaryStruct<number>
): BinaryStruct<string> {
  return {
    read: (b) => {
      const len = lenType.read(b);
      const bytes: number[] = [];
      for (let i = 0; i < len; i++) {
        bytes.push(u8.read(b));
      }
      return String.fromCharCode(...bytes).trimEnd();
    },
    write: (b, str) => {
      lenType.write(b, str.length);
      for (let i = 0; i < str.length; i++) {
        u8.write(b, str.charCodeAt(i));
      }
    },
    size: (v) => v.length + lenType.size(v.length),
  };
}

/**
 * used to make the bi-endian data fields used in ISO 9660
 * basically the data is replicated twice in both formats
 * so any device reading the disc can use their native format.
 * @param le little endian type
 * @param be big endian type
 * @returns
 */
const makeBi = (
  le: BinaryStruct<number>,
  be: BinaryStruct<number>
): BinaryStruct<number> => {
  return {
    read: (b) => {
      const v1 = le.read(b);
      const v2 = be.read(b);
      if (v1 != v2) throw `Both endian number doesn't match`;
      return v1;
    },
    write: (b, v) => {
      le.write(b, v);
      be.write(b, v);
    },
    size: (v) => le.size(v) + be.size(v),
  };
};

const u32bi = makeBi(u32le, u32be);
const u16bi = makeBi(u16le, u16be);

/**
 * Path table with little endian fields
 */
export const PathTableEntL = structType({
  attributeLength: exact(u8, 0 as const),
  lba: u32le,
  parent: u16le,
});
/**
 * Path table with big endian fields
 */
export const PathTableEntB = structType({
  attributeLength: exact(u8, 0 as const),
  lba: u32be,
  parent: u16be,
});

type PathTableEntCommon = StructType<typeof PathTableEntL>;
export type PathTableEntType = PathTableEntCommon & { name: string };

/**
 *
 * @param dent PathTableEntL or PathTableEntB
 * @returns
 */
export const PathTableEnt = (
  dent: BinaryStruct<PathTableEntCommon>
): BinaryStruct<PathTableEntType> => {
  return {
    read: (b) => {
      const len = u8.read(b);
      const ent = dent.read(b);
      const v = { ...ent, name: fixedString(len).read(b) };
      if (b.ptr & 1) b.ptr++;
      return v;
    },
    write: (b, v) => {
      const len = v.name.length;
      u8.write(b, len);
      dent.write(b, v);
      fixedString(len).write(b, v.name);
      if (b.ptr & 1) b.ptr++;
    },
    size: (v) => {
      let len = v.name.length;
      len++; //len
      len += dent.size(v);
      if (len & 1) len++;
      return len;
    },
  };
};

/**
 * read or write PathTable.
 * unknown what behaviour is expected if table
 * exceeds the size of a sector
 * currently allows split entries
 * @param dent PathTableEntL or PathTableEntB
 * @returns
 */
export const PathTable = (
  dent: BinaryStruct<PathTableEntType>
): BinaryStruct<PathTableEntType[]> => {
  return {
    read: (b) => {
      const res: PathTableEntType[] = [];
      while (b.buff.getUint8(b.ptr) != 0) {
        res.push(dent.read(b));
      }
      return res;
    },
    write: (b, v) => {
      v.forEach((c) => dent.write(b, c));
    },
    size: (v) => v.reduce((p, c) => p + dent.size(c), 0),
  };
};
/**
 * Used in the directory entries, PVD has separate type
 */
const DirEntTimeType = structType({
  year: mapType(u8, {
    from: (v) => v + 1900,
    to: (v) => v - 1900,
  }),
  month: u8,
  day: u8,
  hour: u8,
  minute: u8,
  second: u8,
  timezone: u8,
});
/**
 * Utilities for DirEntTime
 */
export const DirEntTime = {
  ...DirEntTimeType,
  default: (): StructType<typeof DirEntTimeType> => {
    return {
      year: 1999,
      month: 12,
      day: 31,
      hour: 23,
      minute: 59,
      second: 59,
      timezone: 0,
    };
  },
  fromDate: (d: Date): StructType<typeof DirEntTimeType> => {
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      day: d.getDay(),
      hour: d.getHours(),
      minute: d.getMinutes(),
      second: d.getSeconds(),
      timezone: Math.floor((d.getTimezoneOffset() / 60) * 4),
    };
  },
  toDate: (d: StructType<typeof DirEntTimeType>) => {
    let tz: string;
    if (d.timezone < 0) {
      const hours = Math.floor(-d.timezone / 60);
      const minutes = -d.timezone % 60;
      tz = `-${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;
    } else {
      const hours = Math.floor(d.timezone / 60);
      const minutes = d.timezone % 60;
      tz = `+${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;
    }
    const yyyy = d.year.toString().padStart(4, "0");
    const mm = d.month.toString().padStart(2, "0");
    const dd = d.day.toString().padStart(2, "0");
    const hh = d.hour.toString().padStart(2, "0");
    const MM = d.minute.toString().padStart(2, "0");
    const ss = d.second.toString().padStart(2, "0");
    return new Date(`${yyyy}-${mm}-${dd}T${hh}:${MM}:${ss}.000${tz}`);
  },
};

export enum DirEntFlags {
  hidden = 1 << 0,
  isDirectory = 1 << 1,
  isAssociatedFile = 1 << 2,
  exaFormat = 1 << 3,
  exaPermissions = 1 << 4,
  entContinues = 1 << 7,
}
/**
 * Common to both the normal directory entry (used in the PVD) and the extended (UXA) ones in the directory files.
 */
const DirEntMid = {
  extendedLength: exact(u8, 0 as const),
  lba: u32bi,
  length: u32bi,
  created: DirEntTime,
  flags: u8,
  unitSize: exact(u8, 0 as const),
  gap: exact(u8, 0 as const),
  volumeSeqNumber: exact(u16bi, 1 as const),
  name: padToEven(stringWithLength(u8)),
};

export const DirEnt = prependLength(structType(DirEntMid));

export enum XA_ATTR {
  ReadSys = 1,
  ExecuteSys = 4,
  ReadUser = 0x10,
  ExecuteUser = 0x40,
  ReadGroup = 0x100,
  ExecuteGroup = 0x400,
  Read = ReadSys | ReadUser | ReadGroup,
  Execute = ExecuteSys | ExecuteUser | ExecuteGroup,
  PermAll = Read | Execute,

  Mode2Form1 = 1 << 11,
  Mode2Form2 = 1 << 12,
  Interleaved = 1 << 13,
  CDDA = 1 << 14,
  Directory = 1 << 15,

  Form1Dir = Directory | Mode2Form1 | PermAll,
  Form1File = Mode2Form1 | PermAll,
  Form2File = Mode2Form2 | PermAll,
}
export const XA = structType({
  groupID: exact(u16be, 0 as const),
  userID: exact(u16be, 0 as const),
  attributes: u16be,
  signature: exact(fixedString(2), "XA" as const),
  filenum: pad(withDefault(u8, 0 as const), 5),
});

export const DirEntExt = prependLength(
  structType({
    ...DirEntMid,
    exaData: XA,
  })
);

export type DirEntExtType = StructType<typeof DirEntExt>;

/**
 * Special handling since dirents can't cross sector boundaries
 */
export const DirFile: BinaryStruct<DirEntExtType[]> = {
  read: (b) => {
    const ents: DirEntExtType[] = [DirEntExt.read(b), DirEntExt.read(b)];
    const size = ents[0].length;
    while (b.ptr < size) {
      if (b.buff.getUint8(b.ptr) == 0) {
        b.ptr = (b.ptr + 2047) & ~2047;
      } else {
        ents.push(DirEntExt.read(b));
      }
    }
    return ents;
  },
  write: (b, v) => {
    v.forEach((ent) => {
      const rem = b.ptr & 2047;
      if (DirEntExt.size(ent) > rem) {
        b.ptr = (b.ptr + 2047) & ~2047;
      }
      DirEntExt.write(b, ent);
    });
  },
  size: (v) =>
    v.reduce((sum, c) => {
      const size = DirEntExt.size(c);
      if (sum + size > 2048) sum += 2048 - (sum & 2047);
      return sum + size;
    }, 0),
};

/**
 * used in PVD, text based
 */
const DecDateTimeType = structType({
  year: paddedString(4),
  month: paddedString(2),
  day: paddedString(2),
  hour: paddedString(2),
  minute: paddedString(2),
  second: paddedString(2),
  decisecond: paddedString(2),
  timezone: i8,
});
export const DecDateTime = {
  ...DecDateTimeType,
  default: (): StructType<typeof DecDateTimeType> => {
    return {
      year: "0000",
      month: "00",
      day: "00",
      hour: "00",
      minute: "00",
      second: "00",
      decisecond: "00",
      timezone: 0,
    };
  },
  never: (): StructType<typeof DecDateTimeType> => {
    return {
      year: "0000",
      month: "00",
      day: "00",
      hour: "00",
      minute: "00",
      second: "00",
      decisecond: "00",
      timezone: 0,
    };
  },
  now: (): StructType<typeof DecDateTimeType> => {
    return DecDateTime.fromDate(new Date(Date.now()));
  },
  fromDate: (d: Date): StructType<typeof DecDateTimeType> => {
    return {
      year: d.getFullYear().toString().padStart(4, "0"),
      month: d.getMonth().toString().padStart(2, "0"),
      day: d.getDay().toString().padStart(2, "0"),
      hour: d.getHours().toString().padStart(2, "0"),
      minute: d.getMinutes().toString().padStart(2, "0"),
      second: d.getSeconds().toString().padStart(2, "0"),
      decisecond: Math.floor(d.getMilliseconds() / 10)
        .toString()
        .padStart(2, "0"),
      timezone: Math.floor((d.getTimezoneOffset() / 60) * 4),
    };
  },
  toDate: (d: StructType<typeof DecDateTimeType>) => {
    let tz: string;
    if (d.timezone < 0) {
      const hours = Math.floor(-d.timezone / 60);
      const minutes = -d.timezone % 60;
      tz = `-${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;
    } else {
      const hours = Math.floor(d.timezone / 60);
      const minutes = d.timezone % 60;
      tz = `+${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;
    }
    return new Date(
      `${d.year}-${d.month}-${d.day}T${d.hour}:${d.minute}:${d.second}.${d.decisecond}0${tz}`
    );
  },
};

export enum VolumeDescriptorType {
  BootRecord = 0,
  PrimaryVolumeDescriptor = 1,
  SupplementaryVolumeDescriptor = 2,
  VolumePartitionDescriptor = 3,
  VolumeDescriptorSetTerminator = 255,
}
export const PVD = structType({
  type: exact(u8, 1 as const),
  standardIdentifier: exact(paddedString(5), "CD001" as const),
  version: exact(pad(u8, 1), 1),
  systemIdentifier: withDefault(paddedString(32), ""),
  volumeIdentifier: withDefault(pad(paddedString(32), 8), ""),
  volumeSpaceSize: pad(u32bi, 32),
  volumeSetSize: withDefault(u16bi, 1),
  volumeSequenceNumber: withDefault(u16bi, 1),
  logicalBlockSize: withDefault(u16bi, 2048),
  pathTableSize: u32bi,
  lPathTable: u32le,
  lPathTableOpt: u32le,
  mPathTable: u32be,
  mPathTableOpt: u32be,
  root: DirEnt,
  volumeSetIdentifier: withDefault(paddedString(128), ""),
  publisherIdentifier: withDefault(paddedString(128), ""),
  dataPreparerIdentifier: withDefault(paddedString(128), ""),
  applicationIdentifier: withDefault(paddedString(128), ""),
  copyrightFileIdentifier: withDefault(paddedString(37), ""),
  abstracteFileIdentifier: withDefault(paddedString(37), ""),
  bibliograhpicFileIdentifier: withDefault(paddedString(37), ""),
  created: withDefault(DecDateTime, DecDateTime.default()),
  modified: withDefault(DecDateTime, DecDateTime.default()),
  expires: withDefault(DecDateTime, DecDateTime.default()),
  effective: withDefault(DecDateTime, DecDateTime.default()),
  structure: pad(u8, 1),
  application: pad(fixedArrayType(u8, 512), 653),
});
export const VolumeDescriptorSetTerminator = structType({
  type: exact(u8, 255 as const),
  standardIdentifier: exact(paddedString(5), "CD001" as const),
  version: pad(exact(u8, 1), 1),
});

export const VolumeDescriptor = choice(u8, "type", {
  1: PVD,
  255: VolumeDescriptorSetTerminator,
});

export interface TOCFile {
  type: "file";
  name: string;
  lba: number;
  length: number;
  created: Date;
}
export interface TOCFolder {
  type: "folder";
  name: string;
  lba: number;
  length: number;
  created: Date;
  children: { [k: string]: TOCEntry };
}
export type TOCEntry = TOCFolder | TOCFile;

/**
 * TODO: figure out actual structure
 */
export const CDXAApplicationData = structType({
  id: paddedString(0x8d),
  cdxa: paddedString(512 - 0x8d),
});
