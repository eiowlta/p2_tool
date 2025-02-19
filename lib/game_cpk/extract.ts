import { extractFile, extractFileBuffer, readCPKTOC } from "../cpk/cpk";
import {
  FileType,
  basename,
  dirname,
  exists,
  joinPath,
  mkdir,
  writeBinaryFile,
} from "../util/filesystem";
import { BNPPattern, BNPPatterns, FileInfo, Templates } from "./types";
import * as bnp from "../archive/bnp";
import * as ear from "../archive/ear";
import * as par from "../archive/par";
import { range } from "../util/misc";
import { parseBNPFile } from "../archive/bnp/file_types";
import { gunzip } from "zlib";
import * as zlib from "zlib";
import { checkType } from "../archive/file";
import { promisify } from "util";
import { getGimBpp, parseGim } from "../img/gim";
import { cstr, toStructBuffer } from "../util/structlib";
interface Context {
  cpk: FileType;
  templates: Templates;
  bnp_patterns: BNPPatterns;
  file_template: FileInfo;
}
const addTemplates = (ctx: Context, templates: Templates): Context => {
  return { ...ctx, templates: { ...ctx.templates, ...templates } };
};
const addPatterns = (ctx: Context, templates: BNPPatterns): Context => {
  return { ...ctx, bnp_patterns: { ...ctx.bnp_patterns, ...templates } };
};
const updateFileTemplate = (
  ctx: Context,
  template: string | FileInfo
): Context => {
  if (typeof template === "string") template = { type: template };
  return { ...ctx, file_template: { ...ctx.file_template, ...template } };
};

// const updateWithBnpTemplate = (
//     ctx: Context,
//     template: BNPPattern
//   ): Context => {
//     if (typeof template === "string") template = { type: template };
//     return { ...ctx, file_template: { ...ctx.file_template, ...template } };
//   };

export const extract = async (
  path: string,
  info: FileInfo,
  cpk: FileType,
  maxDepth?: number
) => {
  let ctx: Context = {
    cpk,
    templates: {},
    bnp_patterns: {},
    file_template: { type: "auto" },
  };
  await mkdir(path);
  return await extract_impl(path, info, maxDepth ?? 32, ctx, new Uint8Array(0));
};

const isParrallel = false;
const mapPromise = async <T, S>(
  arr: T[],
  fn: (v: T, ind: number) => Promise<S>
) => {
  if (isParrallel) return await Promise.all(arr.map(fn));
  else {
    let res: S[] = [];
    for (const i of range(arr.length)) res.push(await fn(arr[i], i));
    // for (const t of arr) res.push(await fn(t));
    return res;
  }
};
const withExt = (path: string, ext: string) => {
  if (basename(path).includes(".")) return path;
  if (path.endsWith(ext)) return path;
  return `${path}.${ext}`;
};
const withoutExt = (path: string) => {
  if (path.includes(".")) {
    return path.slice(0, path.lastIndexOf("."));
  }
  return path;
};
const regexLookup: Record<string, RegExp | undefined> = {};

interface ExtractOutput {
  path: String;
  type: string;
  cpkName?: string;
  cpkId?: number;
  bnpType?: number;
  bnpImageNoHeader?: boolean;
  fileList?: ExtractOutput[];
  bpp?: number;
  compressed?: boolean;
  group?: number;
}

export const extract_impl = async (
  path: string,
  curr: FileInfo,
  maxDepth: number,
  ctx: Context,
  buff: Uint8Array
): Promise<ExtractOutput> => {
  console.log(path);
  if (maxDepth == 0) throw `bad`;
  if (curr.bnp_patterns) ctx = addPatterns(ctx, curr.bnp_patterns);
  if (curr.templates) ctx = addTemplates(ctx, curr.templates);
  if (curr.file_template) ctx = updateFileTemplate(ctx, curr.file_template);
  // if (curr.bpp) {
  //   ctx = { ...ctx, file_template: { ...ctx.file_template, bpp: curr.bpp } };
  // }
  const getInfo = (v: string | FileInfo | undefined) => {
    if (v === undefined) v = { ...ctx.file_template };
    else if (typeof v == "string") v = { type: v };
    v = { ...ctx.file_template, ...v };
    if (ctx.templates[v.type]) v = { ...v, ...ctx.templates[v.type] };
    return { ...v };
  };
  const getName = (index: number, template: string) =>
    curr.filenames ? curr.filenames[index] ?? template : template;
  if (ctx.templates[curr.type]) curr = { ...curr, ...ctx.templates[curr.type] };

  let output: ExtractOutput = {
    type: curr.type,
    path: path.split("\\").pop()!,
  };
  switch (curr.type) {
    case "auto": {
      let type = checkType(buff);
      return await extract_impl(path, { ...curr, type }, maxDepth, ctx, buff);
      // return;
    }
    default:
      console.log(`Unknown type ${curr.type}`);
    case "pxl":
    case "clt":
    case "pxldat":
    case "cltdat":
    case "dng":
    case "tim":
    case "tod2":
    case "txar":
    case "spg":
    case "asg":
    case "phd":
    case "pbd":
    case "pef":
    case "tmd":
    case "efct":
    case "gim":
    case "unk":
    case "script":
    case "cscript":
    case "psxaudio":
      if (!(await exists(withExt(path, curr.type))))
        await writeBinaryFile(withExt(path, curr.type), buff);
      if (curr.type == "gim") {
        output.bpp = getGimBpp(parseGim(buff));
        // output.bpp = curr.bpp;
      }
      if (curr.type == "efb") {
        // output.type = "efb";
        output.fileList = [
          {
            type: "ef",
            path: "script.ef",
          },
          {
            type: "msg",
            path: "script.msg",
          },
        ];
      }
      if (curr.type == "cfb") {
        // output.type = "cfb";
        output.fileList = [
          {
            type: "cf",
            path: "script.cf",
          },
          {
            type: "msg",
            path: "script.msg",
          },
        ];
      }
      //TODO: check if we want pngs instead
      break;
    case "par":
      {
        await writeBinaryFile(withExt(path, curr.type), buff);
        let subPath = withoutExt(path);
        const files = par.split(buff);
        await mkdir(`${subPath}`);
        output.fileList = [];
        for (const i of range(files.length)) {
          let name = getName(i, i.toString());
          let info = getInfo(curr.files?.[name]);
          output.fileList.push(
            await extract_impl(
              joinPath(`${subPath}`, name),
              info,
              maxDepth - 1,
              ctx,
              files[i].data
            )
          );
        }
      }
      break;
    case "ear":
      {
        await writeBinaryFile(withExt(path, curr.type), buff);
        let subPath = withoutExt(path);

        let files = ear.split(buff).map((f) => f.data);
        let names: string[] = [];
        if (curr.compressed) {
          files = await mapPromise(files, async (buff) => {
            names.push(cstr.read(toStructBuffer(buff, 10)));
            return new Uint8Array(await promisify(gunzip)(buff));
          });
        }
        output.compressed = curr.compressed;
        output.fileList = [];
        await mkdir(`${subPath}`);
        for (const i of range(files.length)) {
          let name = getName(i, names[i] ?? i.toString());
          let info = getInfo(curr.files?.[name]);
          output.fileList.push(
            await extract_impl(
              joinPath(`${subPath}`, name),
              info,
              maxDepth - 1,
              ctx,
              files[i]
            )
          );
        }
      }
      break;
    case "bnp":
      //ugh
      {
        await writeBinaryFile(withExt(path, curr.type), buff);
        let subPath = withoutExt(path);
        await mkdir(`${subPath}`);

        const files = bnp.split(buff).map((f) => {
          return parseBNPFile(f.data);
        });
        let tagMask = curr.lowerTag ? 0xff : 0xffff;

        let getInfoBnp = (
          info: string | FileInfo | undefined,
          tag: number,
          ind: number
        ) => getInfo(info);
        // if(curr.)
        if (curr.bnp_pattern) {
          if (curr.groups) throw `Can't have both groups and pattern`;
          if (ctx.bnp_patterns[curr.bnp_pattern] === undefined)
            throw `Unknown bnp pattern ${curr.bnp_pattern}`;
          const pattern = Object.entries(ctx.bnp_patterns[curr.bnp_pattern]!);

          getInfoBnp = (
            info: string | FileInfo | undefined,
            tag: number,
            ind: number
          ) => {
            if (info !== undefined) return getInfo(info);
            for (const [p, t] of pattern) {
              if (p.includes("*")) {
                if (regexLookup[p] === undefined) {
                  regexLookup[p] = new RegExp(p.replaceAll("*", "."));
                }
                // console.log(regexLookup[p]);
                // console.log(regexLookup[p]?.test(tag.toString(16)));
                // throw "";
                if (regexLookup[p]!.test(tag.toString(16))) {
                  return getInfo(t);
                }
              } else if (tag.toString(16) == p) return getInfo(t);
            }
            return getInfo(info);
          };
        }
        if (curr.groups !== undefined) {
          getInfoBnp = (
            info: string | FileInfo | undefined,
            tag: number,
            ind: number
          ) => {
            if (info !== undefined) return getInfo(info);
            return getInfo(curr.groups![ind % curr.groups!.length]);
          };
        }
        output.group = curr.group;
        output.fileList = [];
        let lastTag = 0;
        let ind = 0;
        for (let i of range(files.length)) {
          const file = files[i];
          const name = getName(
            i,
            `${i}_${file.tag.toString(16).padStart(4, "0")}`
          );
          if (curr.resetOnTagZero) {
            if ((file.tag & tagMask) == 0) ind = 0;
          }
          if (curr.resetOnTagChange) {
            if ((file.tag & tagMask) != lastTag) {
              ind = 0;
            }
            lastTag = file.tag & tagMask;
          }
          const info = getInfoBnp(curr.files?.[name], file.tag & tagMask, ind);

          output.fileList.push(
            await extract_impl(
              joinPath(`${subPath}`, name),
              info,
              maxDepth - 1,
              ctx,
              files[i].data
            )
          );
          output.fileList[i].bnpType = file.type;
          if (file.type == 2 && !file.imgHeader)
            output.fileList[i].bnpImageNoHeader = true;
          ind++;
        }
      }
      break;
    case "cpk":
      const toc = await readCPKTOC(ctx.cpk);
      if (curr.files === undefined) throw `Expected files for cpk`;
      output.fileList = [];
      await mapPromise(toc, async (entry) => {
        // if (entry.FileName != "event.bin") return;
        let info = getInfo(
          curr.files![`${entry.ID}_${entry.FileName}`] ?? {
            ...ctx.file_template,
          }
        );
        let name = info.extractName ?? entry.FileName;
        // const path = joinPath(path, entry.FileName);
        // await mkdir(joinPath(path, `${entry.ID.toString().padStart(5, "0")}_${entry.FileName}`));
        const buff = await extractFileBuffer(ctx.cpk, entry);
        output.fileList!.push(
          await extract_impl(
            joinPath(path, `${name}`),
            info,
            maxDepth - 1,
            ctx,
            buff
          )
        );
        output.fileList![output.fileList!.length - 1].cpkName = entry.FileName;
        output.fileList![output.fileList!.length - 1].cpkId = entry.ID;
      });
      break;

    // default:
    //   console.log(curr, ctx);
    //   throw `Unknown type ${curr.type}`;
  }
  return output;
};

// export const extractPath = async (
//   to: string,
//   path: string,
//   info: FileInfo
// ) => {
//     const parts = path.split('/');

// };
