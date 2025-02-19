import { MessageScriptContext } from "../../msg/msg";
import { MessageFile, parseMessageFile } from "../../msg/msg_file";
import { GameContext } from "../../util/context";
import { EncodingScheme } from "../../util/encoding";
import {
  basename,
  joinPath,
  readBinaryFile,
  readTextFile,
  stat,
} from "../../util/filesystem";

export interface File {
  path: string;
  args?: Record<string, any>;
}

export interface FileInfo {
  path: string;
  type: string;
  cpkName?: string;
  cpkId?: number;
  bpp?: number;
  group?: number;
  compressed?: boolean;
  fileList?: FileInfo[];
  fileMap?: Record<string, FileInfo>;
  bnpType?: number;
  bnpImageNoHeader?: boolean;
}

export interface BuildInfo {
  info: FileInfo;
  input: File[][];
  original: string;
  dst: string;
  gameContext: GameContext;
}
export interface TypeHandler {
  extract: (
    src: string,
    info: FileInfo,
    dst: string,
    gameContext: GameContext
  ) => Promise<void>;
  needBuild: (input: File[][], dst: string) => Promise<boolean>;
  build: (info: BuildInfo) => Promise<void>;
  //   convert: (src: string, dst: string, args: any, gameContext: GameContext) => Promise<void>;
}

export const checkFileTime = async (file: string | File): Promise<Date> => {
  let path;
  if (typeof file === "string") {
    path = file;
  } else {
    path = file.path;
  }
  let status = await stat(path);
  if (status.type != "file") throw new Error(`Expected file not folder`);
  return status.modified;
};
export const checkFileExistsOrTime = async (
  file: string | File
): Promise<Date> => {
  try {
    return await checkFileTime(file);
  } catch {
    return new Date(0);
  }
};
export const checkFileTimeMax = async (
  files: string[] | File[]
): Promise<Date> => {
  return (await Promise.all(files.map((f) => checkFileTime(f)))).reduce(
    (p, c) => (p < c ? c : p),
    new Date(0)
  );
};

export const loadLastFile = async (input: File[]): Promise<Uint8Array> => {
  return await readBinaryFile(input[input.length - 1].path);
};
export const checkLatestLast = async (input: File[][]): Promise<Date> => {
  let times = await Promise.all(
    input.map((arr) => checkFileTime(arr[arr.length - 1].path))
  );
  return times.reduce((p, c) => (p < c ? c : p), new Date(0));
};
export const loadMergedMessageFile = async (
  input: File[],
  msgContext: MessageScriptContext
): Promise<MessageFile> => {
  let files = await Promise.all(
    input.map(async (msgFile) => {
      let text = await readTextFile(msgFile.path);
      let file = await parseMessageFile(text, {
        ...msgContext,
        terminator: 0x1103,
        encoding: EncodingScheme.event,
        file: msgFile.path,
        base: 0,
      });
      return file;
    })
  );
  return files.reduce(
    (p: MessageFile, c: MessageFile) => {
      for (const name of c.order) {
        if (p.messages[name] === undefined) {
          p.order.push(name);
        }
        p.messages[name] = c.messages[name];
      }
      return p;
    },
    {
      messages: {},
      order: [],
      comments: [],
    }
  );
};

export const needBuildLastFile = async (
  input: File[][],
  dst: string
): Promise<boolean> => {
  let outTime = checkFileExistsOrTime(dst);
  let inTime = await checkFileTimeMax(input.map((i) => i[i.length - 1].path));
  return (await outTime) < inTime;
};

export const needBuildAny = async (
  input: File[][],
  dst: string
): Promise<boolean> => {
  let outTime = checkFileExistsOrTime(dst);

  let inTime = (
    await Promise.all(input.map((i) => checkFileTimeMax(i)))
  ).reduce((p, c) => (p < c ? c : p), new Date(0));
  return (await outTime) < inTime;
};
