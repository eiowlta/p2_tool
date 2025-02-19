import {
  FileType,
  openFileRead,
  openFileWrite,
  mkdir,
  stat,
  readDir,
  read,
  writeAsStream,
  readAsStream,
  write,
  closeFile,
  joinPath,
  DEFAULT_CHUNK_SIZE,
  pipeline,
} from "../util/filesystem";
import {
  BinaryStruct,
  StructType,
  toDataView,
  toStructBuffer,
} from "../util/structlib";
import {
  TOCEntry,
  PVD,
  DirEnt,
  DirFile,
  TOCFolder,
  DirEntTime,
  DirEntFlags,
  DirEntExtType,
  PathTableEnt,
  PathTableEntType,
  PathTableEntL,
  DecDateTime,
  VolumeDescriptorSetTerminator,
  PathTable,
  PathTableEntB,
  TOCFile,
  XA_ATTR,
} from "./iso_types";
// import { pipeline } from "stream/promises";

// const mut = Mutex.new();
const readData = async (file: FileType, sector: number, len: number) => {
  // const buff = new Uint8Array(len);
  // await file.seek(start*2048);
  // console.log(`Reading..`);
  // await mut.take();
  // const res = await io.readRange(file, {
  //   start: sector * 2048,
  //   end: sector * 2048 + len - 1,
  // });
  // mut.give();
  // console.log(`Read ${sector}:${len}`, res);
  // return res;
  const res = await read(file, sector * 2048, len);

  return res;
  // return new DataView(buff.buffer, buff.byteOffset, buff.byteLength);
};
const readSector = async (file: FileType, sector: number) => {
  return await readData(file, sector, 2048);
};
const readDirFileRecursive = async (
  file: FileType,
  ent: StructType<typeof DirEnt>
): Promise<TOCEntry> => {
  const buff = toStructBuffer(
    toDataView(await readData(file, ent.lba, ent.length))
  );
  const entries = DirFile.read(buff);
  const children: Record<string, TOCEntry> = {};
  await Promise.all(
    entries.slice(2).map(async (ent) => {
      if (ent.flags & ~DirEntFlags.isDirectory)
        throw `Unknow flags ${ent.flags}`;
      if (ent.flags & DirEntFlags.isDirectory) {
        children[ent.name] = await readDirFileRecursive(file, ent);
      } else {
        // console.log(ent.name, ent.lba, ent.length);
        children[ent.name] = {
          type: "file",
          name: ent.name,
          lba: ent.lba,
          length: ent.length,
          created: DirEntTime.toDate(ent.created),
        };
      }
    })
  );
  return {
    type: "folder",
    name: ent.name,
    lba: ent.lba,
    length: ent.length,
    created: DirEntTime.toDate(ent.created),
    children,
  };
};

export const readTOC = async (file: FileType): Promise<TOCEntry> => {
  const pvdBuff = toStructBuffer(toDataView(await readSector(file, 16)));
  const pvd = PVD.read(pvdBuff);
  // console.log(pvd);
  return await readDirFileRecursive(file, pvd.root);
};
export const readPVD = async (
  file: FileType
): Promise<StructType<typeof PVD>> => {
  const pvdBuff = toStructBuffer(toDataView(await readSector(file, 16)));
  return PVD.read(pvdBuff);
};

export const extractFile = async (
  iso: FileType,
  toc: TOCEntry,
  dst: string,
  maxSize = DEFAULT_CHUNK_SIZE
) => {
  switch (toc.type) {
    case "file":
      {
        const fp = await openFileWrite(dst);
        console.log(
          `Extracting ${toc.name} to ${dst} (${toc.length / 1024 / 1024}mb)`
        );
        await pipeline(
          readAsStream(iso, toc.lba * 2048, toc.length, maxSize),
          writeAsStream(fp, 0)
        );
        await closeFile(fp);
        console.log(`${toc.name} extracted.`);
      }
      break;
    case "folder":
      await mkdir(dst);
      await Promise.all(
        Object.entries(toc.children).map(([name, child]) => {
          return extractFile(iso, child, joinPath(dst, name), maxSize);
        })
      );
      break;
  }
};

/*************** Output ********************/
const TOCEntry = {
  foreach: (ent: TOCEntry, fun: (ent: TOCEntry) => void, pre = false) => {
    if (pre) fun(ent);
    if (ent.type == "folder") {
      Object.values(ent.children).forEach((child) =>
        TOCEntry.foreach(child, fun, pre)
      );
    }
    if (!pre) fun(ent);
  },
  foreachFolder: (
    ent: TOCEntry,
    fun: (ent: TOCFolder) => void,
    pre = false
  ) => {
    TOCEntry.foreach(
      ent,
      (e) => {
        if (e.type == "folder") fun(e);
      },
      pre
    );
  },
  foreachFile: (ent: TOCEntry, fun: (ent: TOCFile) => void, pre = false) => {
    TOCEntry.foreach(
      ent,
      (e) => {
        if (e.type == "file") fun(e);
      },
      pre
    );
  },
};

export const directoryToTOC = async (
  path: string,
  name: string
): Promise<TOCEntry> => {
  const s = await stat(path);
  switch (s.type) {
    case "file":
      return {
        type: "file",
        name: name,
        lba: -1,
        length: s.size,
        created: new Date("1999-12-31T23:59:99.999Z"), //now? actual mtime?
      };
    case "folder": {
      const children = await Promise.all(
        (await readDir(path))
          .sort()
          .map((d) => directoryToTOC(joinPath(path, d), d))
      );
      const map: TOCFolder["children"] = {};
      children.forEach((c) => (map[c.name] = c));
      const dummyEnt = {
        lba: 0,
        length: 0,
        created: DirEntTime.default(),
        flags: 0,
        exaData: {
          attributes: XA_ATTR.Form1File,
        },
      };
      const ents: StructType<typeof DirFile> = [];
      ents.push({ ...dummyEnt, name: "\x00" });
      ents.push({ ...dummyEnt, name: "\x01" });

      for (const child of children) {
        ents.push({ ...dummyEnt, name: child.name });
      }
      const length = DirFile.size(ents);
      return {
        type: "folder",
        name,
        lba: -1,
        length: (length + 2047) & ~2047,
        children: map,
        created: new Date("1999-12-31T23:59:59.999Z"), //now? actual mtime?
      };
    }
    default:
      throw "Bad stat.";
  }
};

export const generateDirEntry = (ent: TOCEntry): DirEntExtType => {
  let isFile = ent.type == "file";
  const ret: DirEntExtType = {
    extendedLength: 0,
    lba: ent.lba,
    length: ent.length,
    created: DirEntTime.fromDate(ent.created), //now?
    unitSize: 0,
    gap: 0,
    volumeSeqNumber: 1,
    name: ent.name,
    exaData: {
      attributes: isFile ? XA_ATTR.Form1File : XA_ATTR.Form1Dir,
    },
    flags: isFile ? 0 : DirEntFlags.isDirectory,
  };
  return ret;
};
export const generateDirEnts = (
  ent: TOCFolder,
  parent: TOCFolder
): DirEntExtType[] => {
  const ents: DirEntExtType[] = [
    generateDirEntry({ ...ent, name: "\x00" }),
    generateDirEntry({ ...parent, name: "\x01" }),
    ...Object.values(ent.children).map(generateDirEntry),
  ];
  return ents;
};

export const createIso = async (
  output: FileType,
  directory: string,
  pvd_options: Partial<StructType<typeof PVD>>
) => {
  //sector 14 and 15 = 2048 spaces
  //16 = PVD
  //17 = end volume descriptor
  //from 18
  //ltable1
  //ltable2
  //mtable1
  //mtable2
  //directory entries
  //files
  const toc = await directoryToTOC(directory, "\x00");
  let currentSector = 18 + 4;
  const dirents: Map<TOCFolder, DirEntExtType[]> = new Map();
  const pathTable: PathTableEntType[] = [];
  const writes: Promise<any>[] = [];
  TOCEntry.foreachFolder(
    toc,
    (ent) => {
      ent.lba = currentSector;
      currentSector += Math.ceil(ent.length / 2048);
    },
    true
  );
  TOCEntry.foreachFile(
    toc,
    (ent) => {
      ent.lba = currentSector;
      currentSector += Math.ceil(ent.length / 2048);
    },
    false
  );
  const q: [TOCEntry, TOCFolder, number, string][] = [
    [toc, toc as TOCFolder, 1, directory],
  ];
  while (q.length) {
    const next = q.shift()!;
    if (next[0].type == "folder") {
      dirents.set(next[0], generateDirEnts(next[0], next[1]));
      pathTable.push({
        attributeLength: 0,
        lba: next[0].lba,
        parent: next[2],
        name: next[0].name,
      });
      const p = pathTable.length;
      q.push(
        ...Object.values(next[0].children)
          .sort()
          .map(
            (m) =>
              [m, next[0], p, joinPath(next[3], m.name)] as [
                TOCEntry,
                TOCFolder,
                number,
                string
              ]
          )
      );
    } else {
      writes.push(writeFileToSector(output, next[0], next[3], 2 * 1024 * 1024));
    }
  }
  const pvd: StructType<typeof PVD> = {
    volumeSpaceSize: currentSector + 1,
    pathTableSize: pathTable.reduce(
      (p, c) => p + PathTableEnt(PathTableEntL).size(c),
      0
    ),
    lPathTable: 18,
    lPathTableOpt: 19,
    mPathTable: 20,
    mPathTableOpt: 21,
    root: dirents.get(toc as TOCFolder)![0],
    structure: 2,
    application: [...new Uint8Array(512)],
    ...pvd_options,
  };
  // console.log(pvd);
  //sector 14 and 15 = 2048 spaces
  //16 = PVD
  //17 = end volume descriptor
  //from 18
  //ltable1
  //ltable2
  //mtable1
  //mtable2
  //directory entries
  //files
  const sector = new Uint8Array(2048);
  sector.fill(0x20);
  await write(output, sector, 14 * 2048);
  await write(output, sector, 15 * 2048);
  const pad = new Uint8Array(2048);
  pad.fill(0);
  writes.push(write(output, pad, currentSector * 2048));
  const vdst: StructType<typeof VolumeDescriptorSetTerminator> = {
    type: 255,
    standardIdentifier: "CD001",
    version: 1,
  };

  writes.push(
    ...[
      writeStructToSector(output, PVD, pvd, 16),
      writeStructToSector(output, VolumeDescriptorSetTerminator, vdst, 17),
      writeStructToSector(
        output,
        PathTable(PathTableEnt(PathTableEntL)),
        pathTable,
        18
      ),
      writeStructToSector(
        output,
        PathTable(PathTableEnt(PathTableEntL)),
        pathTable,
        19
      ),
      writeStructToSector(
        output,
        PathTable(PathTableEnt(PathTableEntB)),
        pathTable,
        20
      ),
      writeStructToSector(
        output,
        PathTable(PathTableEnt(PathTableEntB)),
        pathTable,
        21
      ),
      ...[...dirents.entries()].map(([ent, val]) => {
        return writeStructToSector(output, DirFile, val, ent.lba);
      }),
    ]
  );
  await Promise.all(writes);
  await closeFile(output);
};

const writeStructToSector = async <T>(
  output: FileType,
  st: BinaryStruct<T>,
  t: T,
  sector: number
) => {
  const size = st.size(t);
  const buffer = new Uint8Array(size);
  st.write(toStructBuffer(toDataView(buffer)), t);
  await write(output, buffer, sector * 2048);
};
const writeFileToSector = async (
  output: FileType,
  toc: TOCFile,
  path: string,
  maxSize: number = DEFAULT_CHUNK_SIZE
) => {
  const fp = await openFileRead(path);
  console.log(`Writing ${path} to ${toc.name} (${toc.length / 1024 / 1024}mb)`);
  await pipeline(
    readAsStream(fp, 0, toc.length, maxSize),
    writeAsStream(output, toc.lba * 2048)
  );
  // const buff = new Uint8Array(MAX_SIZE);
  // let size = toc.length;
  // let srcOff = 0;
  // let off = toc.lba * 2048;
  // while (size > 0) {
  //   const read = Math.min(MAX_SIZE, size);
  //   const res = await fp.read(buff, 0, read, srcOff);
  //   console.assert(res.bytesRead == read);
  //   const write_res = await output.write(buff, 0, read, off);
  //   console.assert(write_res.bytesWritten == read);
  //   size -= read;
  //   off += read;
  //   srcOff += read;
  // }
  console.log(`${toc.name} written.`);
  await closeFile(fp);
};
