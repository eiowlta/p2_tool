import fs from "fs/promises";
import fs_sync from "fs";
import pathlib from "path";
import {
  Mutex,
  Semaphore,
  giveMutex,
  giveSemaphore,
  takeMutex,
  takeSemaphore,
} from "./mutex";

export const DEFAULT_CHUNK_SIZE = 64 * 1024;

export interface FileType {
  handle: fs.FileHandle;
  lock: Mutex;
}

export const lockFile = (file: FileType): Promise<void> => takeMutex(file.lock);
export const unlockFile = (file: FileType) => giveMutex(file.lock);

const MAX_OPEN_FILES = 100;
const fileSem = Semaphore.new(MAX_OPEN_FILES);

export const openFileRead = async (path: string): Promise<FileType> => {
  await takeSemaphore(fileSem);
  return {
    handle: await fs.open(path, "r"),
    lock: Mutex.new(),
  };
};
export const openFileWrite = async (path: string): Promise<FileType> => {
  await takeSemaphore(fileSem);
  return {
    handle: await fs.open(path, "w+"),
    lock: Mutex.new(),
  };
};
export const closeFile = async (file: FileType) => {
  await lockFile(file);
  await file.handle.close();
  unlockFile(file); //here to catch errors
  giveSemaphore(fileSem);
};

export const copyFile = async (from: string, to: string) => {
  await fs.cp(from, to);
};

export async function* readAsStream(
  file: FileType,
  offset: number,
  length: number,
  maxSize = DEFAULT_CHUNK_SIZE
): AsyncIterable<Uint8Array> {
  let start = offset;
  while (length > 0) {
    let toRead = Math.min(maxSize, length);
    yield await read(file, start, toRead);
    length -= toRead;
    start += toRead;
  }
}
export const writeAsStream = (file: FileType, offset: number) => {
  return async (src: AsyncIterable<Uint8Array>) => {
    for await (let buff of src) {
      await write(file, buff, offset);
      offset += buff.byteLength;
    }
  };
};
export async function* buffAsReadStream(
  buff: Uint8Array
): AsyncIterable<Uint8Array> {
  yield buff;
  return;
}
export const buffAsWriteStream = (buff: Uint8Array) => {
  return async (src: AsyncIterable<Uint8Array>) => {
    let off = 0;
    for await (let incoming of src) {
      buff.set(incoming, off);
      off += incoming.byteLength;
    }
  };
};

export const read = async (
  file: FileType,
  offset: number,
  length: number
): Promise<Uint8Array> => {
  let arr = new Uint8Array(length);
  await lockFile(file);
  await file.handle.read(arr, 0, length, offset);
  unlockFile(file);
  return arr;
};
export const write = async (
  file: FileType,
  data: Uint8Array,
  offset: number
) => {
  // console.log(file, data, offset, data.byteLength, data.byteOffset);
  await lockFile(file);
  await file.handle.write(data, data.byteOffset, data.byteLength, offset);
  unlockFile(file);
};

export const mkdir = async (path: string): Promise<void> => {
  await fs.mkdir(path, { recursive: true });
};
export const readTextFile = async (path: string): Promise<string> => {
  return await fs.readFile(path, { encoding: "utf-8" });
};
export const readBinaryFile = async (path: string): Promise<Uint8Array> => {
  return await fs.readFile(path);
};
export const readTextFileSync = (path: string): string => {
  return fs_sync.readFileSync(path, { encoding: "utf-8" });
};
export const readBinaryFileSync = (path: string): Uint8Array => {
  return fs_sync.readFileSync(path);
};
export const writeTextFile = async (path: string, data: string) => {
  await fs.writeFile(path, data);
};
export const writeBinaryFile = async (path: string, data: Uint8Array) => {
  await fs.writeFile(path, data);
};

interface FileStat {
  type: "file";
  size: number;
  modified: Date;
}
interface FolderStat {
  type: "folder";
}
export type StatType = FileStat | FolderStat;
/**
 *
 * @param path
 * @returns object containing
 */
export const stat = async (path: string): Promise<StatType> => {
  let stat = await fs.stat(path);
  if (stat.isFile()) {
    return {
      type: "file",
      size: stat.size,
      modified: stat.mtime,
    };
  }
  return {
    type: "folder",
  };
};

export const exists = async (path: string): Promise<boolean> => {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
};

/**
 *
 * @param path
 * @returns list of files in path
 */
export const readDir = async (path: string): Promise<string[]> => {
  const res: string[] = [];
  for (const dir of await fs.readdir(path)) {
    res.push(dir);
  }
  return res;
};
export const readDirWithTypes = async (
  path: string
): Promise<{ name: string; isFile: boolean }[]> => {
  const res = [];
  for (const dir of await fs.readdir(path, { withFileTypes: true })) {
    res.push({
      name: dir.name,
      isFile: dir.isFile(),
    });
  }
  return res;
};
export const readDirSync = (path: string): string[] => {
  const res: string[] = [];
  for (const dir of fs_sync.readdirSync(path)) {
    res.push(dir);
  }
  return res;
};

type DirEnt =
  | {
    type: "file";
    name: string;
    modified: Date;
  }
  | {
    type: "folder";
    name: string;
    modified: Date;
    files: DirEnt[];
  };
export const readDirRecursive = async (path: string): Promise<DirEnt> => {
  let files = await readDir(path);
  let ret: DirEnt[] = [];
  let modified = new Date(0);
  for (const file of files) {
    let fstat = await stat(joinPath(path, file));
    switch (fstat.type) {
      case "file":
        ret.push({
          type: "file",
          name: file,
          modified: fstat.modified,
        });
        if (fstat.modified > modified) modified = fstat.modified;
        break;
      case "folder":
        let dir = await readDirRecursive(joinPath(path, file));
        ret.push(dir);
        if (dir.modified > modified) modified = dir.modified;
        break;
    }
  }
  return {
    type: "folder",
    name: basename(path),
    modified,
    files: ret,
  };
};

//rexport path functions
export const extname = pathlib.extname;
export const hasExtension = (path: string) => extname(path) != "";
export const withExtension = (path: string, ext: string) => {
  if (ext == "folder") return path;
  if (hasExtension(path)) return path;
  return `${path}.${ext}`;
};
export const withoutExtension = (path: string) => {
  if (hasExtension(path)) {
    return path.substring(0, path.lastIndexOf("."));
  }

  return path;
  // return `${path}.${ext}`;
};

export const basename = pathlib.basename;
export const joinPath = pathlib.join;
export const dirname = pathlib.dirname;

export const fromTools = (...path: string[]) => {
  return joinPath(libpath, ...path);
}
export { pipeline } from "stream/promises";

export const libpath = joinPath(__dirname, `${__filename.endsWith(".js") ? '../' : ''}../../`);
