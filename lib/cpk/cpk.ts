import { string } from "yargs";
import {
  FileType,
  buffAsWriteStream,
  closeFile,
  joinPath,
  openFileRead,
  openFileWrite,
  pipeline,
  read,
  readAsStream,
  stat,
  write,
  writeAsStream,
} from "../util/filesystem";
import { range, sectorAlign } from "../util/misc";
import { StructType, toDataView, toStructBuffer } from "../util/structlib";
import { TOCHeader, UTF } from "./cpk_types";

interface TOCFormat {
  FileName: string;
  FileSize: number;
  ExtractSize: number;
  FileOffset: number;
  ID: number;
}
interface ITOCFormat {
  ID: number;
  TocIndex: number;
}

interface CPKHeader {
  ContentOffset: number;
  ContentSize: number;
  TocOffset: number;
  TocSize: number;
  ItocOffset: number;
  ItocSize: number;
  EnabledPackedSize: number;
  EnabledDataSize: number;
  Files: number;
  Version: number;
  Revision: number;
  Align: number;
  Sorted: number;
  EID: number;
  CpkMode: number;
  Tvers: string;
}

/**
 * read TOC from CPK
 * @param cpk cpk file
 * @returns
 */
export const readCPKTOC = async (cpk: FileType) => {
  const header = (await readTOC(cpk, 0, 2048, "CPK ")).data[0];

  //now we have to figure out what we're working with

  const readtoc = async (name: string) => {
    let off = header[`${name}Offset`];
    let size = header[`${name}Size`];
    let id = name.toUpperCase().padEnd(4);
    return await readTOC(cpk, off, size, id);
  };
  const toc = await readtoc("Toc");
  if (toc.typeName != "CpkTocInfoEx") throw `Unexpected Toc type`;

  //   const itoc = await readtoc("Itoc");
  return (toc.data as TOCFormat[]).map((m) => ({
    ...m,
    FileOffset: m.FileOffset + header.TocOffset,
  }));
};

/**
 * Extract the file specified in ent to dst
 * @param cpk cpk file handle
 * @param dst name of file to write to
 * @param ent TOC entry
 */
export const extractFile = async (
  cpk: FileType,
  dst: string,
  ent: TOCFormat
) => {
  const out = await openFileWrite(joinPath(dst));
  const outStream = await writeAsStream(out, 0);
  if (ent.FileSize != ent.ExtractSize) {
    const bytes = await read(cpk, ent.FileOffset, ent.FileSize);
    await write(out, decompress(bytes), 0);
  } else {
    const bytes = await readAsStream(cpk, ent.FileOffset, ent.FileSize);
    await pipeline(bytes, outStream);
  }
  await closeFile(out);
};

/**
 * Extract the file specified in ent to dst
 * @param cpk cpk file handle
 * @param dst name of file to write to
 * @param ent TOC entry
 */
export const extractFileBuffer = async (cpk: FileType, ent: TOCFormat) => {
  if (ent.FileSize != ent.ExtractSize) {
    const bytes = await read(cpk, ent.FileOffset, ent.FileSize);
    return decompress(bytes);
  } else {
    const bytes = await readAsStream(cpk, ent.FileOffset, ent.FileSize);
    const out = new Uint8Array(ent.FileSize);
    const outStream = buffAsWriteStream(out);
    await pipeline(bytes, outStream);
    return out;
  }
};

/**
 * read a TOC (and CPK header) from the cpk
 * @param cpk
 * @param offset
 * @param size
 * @param type
 * @returns
 */
const readTOC = async (
  cpk: FileType,
  offset: number,
  size: number,
  type: string
) => {
  const headerBuff = await read(cpk, offset, size);
  const header = TOCHeader.read(toStructBuffer(headerBuff, 0, true));
  if (header.type != type)
    throw `Bad TOC. Expected ${type} found ${header.type}`;
  const utfData = UTF.read(toStructBuffer(headerBuff, 16, false));
  return utfData;
};

interface CPKBuilderFile {
  path: string;
  name: string;
  id: number;
}

interface CPKBuilder {
  fp: FileType;
  fileList: CPKBuilderFile[];
}

/**
 * Begin creating a cpk, after this you must add files using addFileToCPK
 * @param path path to output file
 * @returns
 */
export const createCPK = async (path: string): Promise<CPKBuilder> => {
  const fp = await openFileWrite(path);
  return { fp, fileList: [] };
};
/**
 * Add file to cpk with name and id
 * @param build
 * @param file
 * @param name
 * @param id
 */
export const addFileToCPK = (
  build: CPKBuilder,
  file: string,
  name: string,
  id: number
) => {
  build.fileList.push({
    path: file,
    name,
    id,
  });
};
/**
 * build the cpk
 * @param builder
 */
export const buildCPK = async (builder: CPKBuilder) => {
  //build TOC
  const toc: TOCFormat[] = await Promise.all(
    builder.fileList.map(async (m) => {
      const info = await stat(m.path);
      if (info.type != "file") throw `Unable to insert folder into cpk`;
      const size = info.size;
      return {
        ID: m.id,
        FileName: m.name,
        FileOffset: 0,
        FileSize: size,
        ExtractSize: size,
      };
    })
  );
  //sort by file name
  toc.sort((a, b) =>
    a.FileName == b.FileName ? a.ID - b.ID : a.FileName < b.FileName ? -1 : 1
  );
  //generate ITOC
  const itoc: ITOCFormat[] = builder.fileList.map((m) => {
    return {
      ID: m.id,
      TocIndex: toc.findIndex((t) => t.ID == m.id),
    };
  });
  //sort by id
  itoc.sort((a, b) => a.ID - b.ID);

  //update file offsets
  let base = 0;
  for (let i of itoc) {
    toc[i.TocIndex].FileOffset = base;
    base += sectorAlign(toc[i.TocIndex].FileSize);
  }

  //initialize cpk header
  const header: CPKHeader = {
    ContentOffset: 0,
    ContentSize: 0,
    TocOffset: 0,
    TocSize: 0,
    ItocOffset: 0,
    ItocSize: 0,
    EnabledPackedSize: 0,
    EnabledDataSize: 0,
    Files: toc.length,
    Version: 7,
    Revision: 0,
    Align: 2048,
    Sorted: 1,
    EID: 1,
    CpkMode: 5,
    Tvers: "",
  };
  header.TocOffset = 2048;
  header.TocSize = UTF.size({ typeName: "CpkTocInfoEx", data: toc }) + 16;
  header.ItocOffset = header.TocOffset + sectorAlign(header.TocSize);
  header.ItocSize = UTF.size({ typeName: "CpkExtendedId", data: itoc }) + 16;
  header.ContentSize = base;
  base = header.ItocOffset + sectorAlign(header.ItocSize);
  header.ContentOffset = base;

  //update file positions
  for (let i of itoc) {
    toc[i.TocIndex].FileOffset += base - header.TocOffset;
  }

  //create TOCs
  const tocData = makeTOC("TOC", "CpkTocInfoEx", toc);
  const itocData = makeTOC("ITOC", "CpkExtendedId", itoc);
  const headerData = makeTOC("CPK", "CpkHeader", [header]);
  //write TOCs
  let funcs = [
    write(builder.fp, headerData, 0),
    write(builder.fp, tocData, header.TocOffset),
    write(builder.fp, itocData, header.ItocOffset),
    write(
      builder.fp,
      new Uint8Array("(c)CRI".split("").map((a) => a.charCodeAt(0))),
      0x7fa
    ),
  ];
  //write files
  for (let file of builder.fileList) {
    funcs.push(
      (async (file) => {
        const fileInfo = toc.find((a) => a.ID == file.id)!;
        const input = await openFileRead(file.path);
        const stream = await readAsStream(input, 0, fileInfo.FileSize);
        const out = writeAsStream(
          builder.fp,
          fileInfo.FileOffset + header.TocOffset
        );
        await pipeline(stream, out);
        console.log(`Wrote ${file.path} to cpk`);
        await closeFile(input);
      })(file)
    );
  }
  //wait for everything to finish and clean up
  await Promise.all(funcs);
  await closeFile(builder.fp);
};

/**
 * Allocate necessary space and populate the TOC and UTF data
 * Slightly inefficient as we process the data twice
 * first to calculate size and second to actually write
 * @param type
 * @param typeName
 * @param data
 * @returns
 */
const makeTOC = <T>(type: string, typeName: string, data: T[]) => {
  const size = UTF.size({ typeName, data }) + 8;
  let header: StructType<typeof TOCHeader> = {
    type: type.padEnd(4),
    size: BigInt(size),
  };
  const buff = new Uint8Array(size + 16);
  TOCHeader.write(toStructBuffer(buff, 0, true), header);
  UTF.write(toStructBuffer(buff, 16, false), { typeName, data });
  return buff;
};

/**
 * decompresses crilayla compressed file
 * special thanks to https://github.com/wmltogether/CriPakTools
 * @param bytes
 * @returns
 */
const decompress = (bytes: Uint8Array): Uint8Array => {
  if (String.fromCharCode(...bytes.subarray(0, 8)) != `CRILAYLA`)
    throw `Not CRILAYLA compressed`;
  const dv = toDataView(bytes);
  const size = dv.getUint32(8, true);
  const header = dv.getUint32(12, true);
  const out = new Uint8Array(size + 0x100);

  out.set(bytes.subarray(header + 0x10, header + 0x110));
  let off = bytes.byteLength - 0x100 - 1; //input_end;
  let output_end = 0x100 + size - 1;

  let bitrem = 0;
  let bitcurr = 0;
  function* vle_lens() {
    yield 2;
    yield 3;
    yield 5;
    while (1) yield 8;
  }
  let len = 0;

  const getBits = (n: number) => {
    let bits = 0;
    while (n > 0) {
      if (bitrem == 0) {
        bitcurr = bytes[off--];
        bitrem = 8;
      }
      let copy = Math.min(bitrem, n);
      bits <<= copy;
      bits |= (bitcurr >> (bitrem - copy)) & ((1 << copy) - 1);
      bitrem -= copy;
      n -= copy;
    }
    return bits;
  };
  while (len < size) {
    if (getBits(1) == 0) {
      //single byte
      out[output_end - len++] = getBits(8);
    } else {
      let backref_off = getBits(13) + (output_end - len + 3);
      let backref_len = 3;
      for (let vle of vle_lens()) {
        let l = getBits(vle);
        backref_len += l;
        if (l != (1 << vle) - 1) break;
      }
      for (let _ of range(0, backref_len))
        out[output_end - len++] = out[backref_off--];
    }
  }
  return out;
};
