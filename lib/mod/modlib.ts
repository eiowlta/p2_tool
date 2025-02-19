import { extractFile, readTOC } from "../iso/iso";
import { Game, GameContext, loadScriptConstants } from "../util/context";
import {
  basename,
  closeFile,
  copyFile,
  exists,
  extname,
  fromTools,
  joinPath,
  mkdir,
  openFileRead,
  readBinaryFile,
  readBinaryFileSync,
  readDir,
  readDirRecursive,
  readDirSync,
  readDirWithTypes,
  readTextFile,
  readTextFileSync,
  stat,
  withExtension,
  withoutExtension,
  writeBinaryFile,
  writeTextFile,
} from "../util/filesystem";
import { VFS, VFSEnt } from "./vfs";
import * as ear from "../archive/ear";
import * as par from "../archive/par";
import * as bnp from "../archive/bnp";
import { promisify } from "util";
import { gunzip } from "zlib";
import { parseBNPFile } from "../archive/bnp/file_types";
import {
  readCPKTOC,
  extractFile as extractFileCpk,
  createCPK,
  addFileToCPK,
  buildCPK,
} from "../cpk/cpk";
import { EncodingScheme, loadLocale } from "../util/encoding";
import {
  initScriptContext,
  parseScriptBin,
  scriptToString,
} from "../event_script/escript";
import { writeMessageFile } from "../msg/msg_file";
import { MessageScriptContext } from "../msg/msg";
import { dirname, resolve } from "path";
import { decrypt_eboot } from "../decrypt/eboot";
import { PSP_BASE, patchFileLoading } from "../elf/atlus_eboot";
import {
  File,
  FileInfo,
  checkFileExistsOrTime,
  checkFileTime,
  loadLastFile,
} from "./file_types/common";
import { typeLookup } from "./file_types";
import { parseElf } from "../elf/types";
import { buildRelocTable } from "../mips/reloc";
import { IReg, MIPS, RelocList, exportedFuncs, freg, ireg } from "../mips/mips";
import { MessageManager } from "./msg_manager";
import { Alignment, align } from "../util/misc";
import * as vm2 from "vm2";
import { importObj } from "../mips/objimport";
import { insertSection } from "../elf/insert_mem_section";
import { TOCEntry } from "../archive/common";
import { imgFromPng } from "../img/png";
import {
  GimConvOptions,
  ImageFormat,
  buildGim,
  gimFromImage,
} from "../img/gim";
import { writeFileSync } from "fs";
import * as vm from 'vm';

interface ModConfig {
  name: string;
  game: Game;
  locale: "string";
  asmOrder?: string[];
}

// interface ModFiles {
//   path: string;
//   files: Record<string, string>;
// }
// interface Mod {
//   config: ModConfig;
//   root: string;
// }

export interface ModFileEntry {
  realPaths: File[];
  convert?: {
    type: string;
    args: any;
  };
  // mtime: Date;
  // realPath: string;
}
export const parseModInfo = async (root: string, vfs: VFS<ModFileEntry>) => {
  // let structure = await readDirRecursive(root);
  let config = JSON.parse(await readTextFile(joinPath(root, "mod.json")));
  let modfiles = [];
  // let vfs = new VFS<ModFileEntry>();
  let recurse = async (path: string, realpath: string) => {
    let promises: Promise<void>[] = [];
    let files = await readDirWithTypes(realpath);
    let excluded = new Set();
    let fileMap: Record<string, string | string[]> = {};
    if (await exists(joinPath(realpath, "files.json"))) {
      let files = JSON.parse(
        await readTextFile(joinPath(realpath, "files.json"))
      );
      // console.log(files);
      excluded = new Set(files.exclude ?? []);
      excluded.add("files.json"); //ignore files.json!
      path = files.path ?? path;
      if (files.files) {
        // console.log(files.files);
        fileMap = files.files;
      }
      // if (files.convert) {
      //   for (const conv of files.convert) {
      //     let ent = vfs.getFile(joinPath(path, conv.out));
      //     if (ent == null) {
      //       ent = vfs.addFile(joinPath(path, conv.out), { realPaths: [] });
      //     }
      //     ent.realPaths.push({ path: joinPath(realpath, conv.in) });
      //     ent.convert = {
      //       ...conv,
      //     };
      //   }
      // }
    }
    for (const file of files) {
      if (excluded.has(file.name)) continue;
      let vnames: (string | File)[] = [file.name];
      let map = fileMap[file.name];
      if (map !== undefined) {
        if (typeof map === "string") vnames = [map];
        else vnames = map;
      }
      for (const vname of vnames) {
        let tmp: File;
        if (typeof vname === "string") {
          tmp = { path: vname };
        } else {
          tmp = vname;
        }

        if (file.isFile) {
          let ent = vfs.getFile(joinPath(path, tmp.path));
          if (ent == null)
            ent = vfs.addFile(joinPath(path, tmp.path), {
              realPaths: [],
            });
          ent.realPaths.push({ ...tmp, path: joinPath(realpath, file.name) });
        } else {
          promises.push(
            recurse(joinPath(path, file.name), joinPath(realpath, file.name))
          );
        }
      }
    }
    await Promise.all(promises);
  };
  await recurse("/", root);
  return { ...config, vfs };
};

export const parseBaseInfo = async (
  path: string,
  clean: string,
  vfs: VFS<ModFileEntry>
) => {
  let info = JSON.parse(await readTextFile(path));
  // let vfs = new VFS<BaseFileEntry>();
  let recurse = (entry: FileInfo, path: string, clean: string) => {
    if (entry.fileList) {
      let folderName = withoutExtension(entry.path);
      let basePath = joinPath(path, folderName);
      let outPath = joinPath(clean, folderName);
      for (const file of entry.fileList) {
        recurse(file, basePath, outPath);
      }
    }
    if (entry.type != "folder") {
      let ent = vfs.getFile(
        joinPath(path, withExtension(entry.path, entry.type))
      );
      if (ent == null)
        ent = vfs.addFile(
          joinPath(path, withExtension(entry.path, entry.type)),
          {
            realPaths: [],
            // mtime: new Date(0),
          }
        );
      ent.realPaths.push({ path: joinPath(clean, entry.path) });
      // vfs.addFile(joinPath(path, withExtension(entry.path, entry.type)), info);
    }
  };
  recurse(info, "/", clean);
  return vfs;
};

export const extractISO = async (isoPath: string, cleanDir: string) => {
  if (!(await exists(cleanDir))) {
    await mkdir(cleanDir);
    const iso = await openFileRead(isoPath);
    const toc = await readTOC(iso);
    await extractFile(iso, toc, cleanDir);
    await closeFile(iso);
  }
  return cleanDir;
};

export const augmentInfo = (info: FileInfo) => {
  switch (info.type) {
    case "gim":
      if (info.fileList === undefined)
        info.fileList = [{ path: "image.png", type: "png" }];
      break;
    case "pdemo":
      if (info.fileList === undefined)
        info.fileList = [
          {
            type: "msg",
            path: "pdemo.msg",
          },
        ];
      break;
    case "efb":
      if (info.fileList === undefined)
        info.fileList = [
          {
            type: "ef",
            path: "script.ef",
          },
          {
            type: "msg",
            path: "script.msg",
          },
        ];
      break;
    case "cfb":
      if (info.fileList === undefined)
        info.fileList = [
          {
            type: "cf",
            path: "script.cf",
          },
          {
            type: "msg",
            path: "script.msg",
          },
        ];
      break;
  }
  if (info.fileList) {
    let map: Record<string, FileInfo> = {};
    for (const file of info.fileList) {
      if (file.type == "folder") map[file.path] = file;
      else map[withExtension(file.path, file.type)] = file;
      augmentInfo(file);
    }
    info.fileMap = map;
  }
};

export const extractAll = async (
  info: FileInfo,
  iso: string,
  clean: string,
  gameCtx: GameContext
): Promise<void> => {
  // export const extractAll = async (
  //   isoPath: string,
  //   path: string,
  //   game: string = "ep",
  //   encoding: string = "jp"
  // ) => {

  const extractImpl = async (info: FileInfo, path: string) => {
    // console.log(info, clean);
    // console.log(path);
    let filename = withExtension(info.path, info.type);
    // if (info.type != "folder") {
    if (info.fileList) await ensureClean(info, path, gameCtx);
    let promises: Promise<void>[] = [];
    for (const file of info.fileList ?? []) {
      let subPath = joinPath(path, filename + "$");
      if (info.type == "folder") subPath = joinPath(path, filename);
      promises.push(
        // await
        extractImpl(file, subPath)
        //  ;
      );
    }
    await Promise.all(promises);
    // }
  };
  // info.path = iso;
  // info.path = resolve(clean, iso);
  clean = await extractISO(iso, clean);
  for (const file of info.fileList!) {
    await extractImpl(file, clean);
  }
  // await extractImpl(info, clean);
};

export const ensureClean = async (
  info: FileInfo,
  path: string,
  gameCtx: GameContext
) => {
  if (info.type == "iso") return;
  if (info.type == "folder") return;
  let filename = withExtension(info.path, info.type);
  let arname = filename;
  let cleanDir = filename + "$";

  if (!(await exists(joinPath(path, cleanDir)))) {
    console.log(`Extracting ${joinPath(path, arname)}`);
    let handler = typeLookup[info.type];
    if (handler) {
      await mkdir(joinPath(path, cleanDir));
      await handler.extract(
        joinPath(path, arname),
        info,
        joinPath(path, cleanDir),
        gameCtx
      );
    } else {
      console.log(path, info);
      throw new Error(`Cannot extract file type ${info.type}`);
    }
  }
};

export const buildFile = async (
  info: FileInfo,
  clean: string,
  input: File[][],
  out: string,
  gameContext: GameContext
) => {
  let handler = typeLookup[info.type];
  if (handler) {
    if (await handler.needBuild(input, out)) {
      console.log(`building ${out}`);
      await handler.build({
        info,
        original: clean,
        input,
        dst: out,
        gameContext,
      });
    }
  } else {
    throw new Error(`${out}\nBuilding ${info.type} unsupported`);
  }
};

export const buildIsoDir = async (
  info: FileInfo,
  clean: string,
  build: string,
  outDir: string
) => {
  let recurse = async (
    info: FileInfo,
    clean: string,
    build: string,
    out: string
  ) => {
    // console.log(`Processing ${out}`);
    if (info.type == "folder" || info.type == "iso") {
      if (info.type == "folder") {
        await mkdir(joinPath(out));
      }
      for (const child of info.fileList!) {
        await recurse(
          child,
          joinPath(clean, child.path),
          joinPath(build, child.path),
          joinPath(out, child.path)
        );
      }
    } else {
      let sources = [build, clean];
      let outTime = await checkFileExistsOrTime(out);

      for (const source of sources) {
        try {
          let inTime = await checkFileTime(source);
          if (inTime > outTime) {
            await copyFile(source, out);
          }
          return;
        } catch { }
      }
      throw new Error(
        `Unable to find iso file ${out} from ${sources.join(", ")}`
      );
    }
  };
  await recurse(info, clean, build, outDir);
};

export const buildMod = async (
  entry: VFSEnt<ModFileEntry>,
  info: FileInfo,
  vpath: string,
  clean: string,
  build: string,
  gameContextClean: GameContext,
  gameContextMod: GameContext
): Promise<void> => {
  let name = entry.name;
  let vfile = joinPath(vpath, info.path);
  let cleanPath = joinPath(clean, name);
  let buildPath = joinPath(build, name);
  // console.log(name, buildPath, cleanPath);
  switch (entry.type) {
    case "dir":
      await ensureClean(info, clean, gameContextClean);

      let children = Object.keys(entry.children);
      let promises: Promise<void>[] = [];

      if (info.fileList == undefined) {
        return;
      }
      for (const child of children) {
        let childInfo;
        childInfo = info.fileMap?.[child];
        if (!childInfo) {
          childInfo = info.fileMap?.[child.replace("$", "")];
        }

        if (childInfo) {
          promises.push(
            buildMod(
              entry.children[child],
              childInfo,
              vfile,
              cleanPath,
              buildPath,
              gameContextClean,
              gameContextMod
            )
          );
        }
      }

      // for await (const p of promises);
      await Promise.all(promises);

      if (name.endsWith("$")) {
        // console.log(name);
        let paths: File[][] = [];
        for (const file of info.fileList!) {
          let fileName = withExtension(file.path, file.type);
          let path: File[] = [];
          path.push({ path: joinPath(cleanPath, fileName) });
          if (entry.children[fileName]) {
            let child = entry.children[fileName];
            if (child.type == "file") {
              path.push(...child.data.realPaths);
            } else {
              //uhh what do I do here again?
              throw `shouldn't be possible, says the error message that just occured`;
            }
          }
          if (entry.children[fileName + "$"]) {
            path.push({ path: joinPath(buildPath, fileName) });
          }
          paths.push(path);
        }
        await buildFile(
          info,
          joinPath(clean, withExtension(info.path, info.type)),
          paths,
          joinPath(build, withExtension(info.path, info.type)),
          gameContextMod
        );
      }
      break;
    case "file":
      let files = entry.data.realPaths;
      if (files.length > 1)
        throw new Error(`Merging multiple files not yet supported`);
  }
};

interface TOCSizePatch {
  reg_hi?: IReg;
  reg_lo?: IReg;
  lo?: string;
  hi?: string;
  reg?: IReg;
}
interface TOCInfo {
  type:
  | "event"
  | "bnp_sector"
  | "bnp_sector_files"
  | "bnp_files_off32"
  | "psp_arch";
  size?: TOCSizePatch | TOCSizePatch[];
  location: string | string[];
}
let TOCSizeAlign = {
  event: 2048,
  bnp_sector: 2048,
  bnp_sector_files: 2048,
  bnp_files_off32: 2048,
  psp_arch: 16,
};
export const applyTOC = async (
  tocs: Record<string, TOCInfo>,
  dir: string,
  mips: MIPS
) => {
  let files = await readDirWithTypes(dir);
  let promises = [];
  for (const file of files) {
    if (file.isFile) {
      if (file.name.endsWith(".toc")) {
        let name = withoutExtension(file.name);
        if (tocs[name]) {
          console.log(`Applying ${name} TOC`);
          let toc = JSON.parse(
            await readTextFile(joinPath(dir, file.name))
          ) as TOCEntry[];
          let tocInfo = tocs[name];
          if (tocInfo.size) {
            let lastEnt = toc[toc.length - 1];
            let size = align(
              TOCSizeAlign[tocInfo.type] as Alignment,
              lastEnt.offset + lastEnt.size
            );
            let sizeLocs: TOCSizePatch[] = [];
            let sz = tocInfo.size!;
            if ("length" in sz) {
              sizeLocs = sz as TOCSizePatch[];
            } else {
              sizeLocs = [sz as TOCSizePatch];
            }
            let seenHi = false;

            // let loType = 0;
            for (const patch of sizeLocs) {
              // if(patch.reg_hi) {
              //   if(!patch.reg_lo) throw new Error(`Missing corresponding low reg`);
              //   seenHi = true;
              // }
              if (patch.hi) {
                mips.org(parseInt(patch.hi));
                mips.lui(patch.reg_hi ?? patch.reg ?? "t0", size >> 16);
                seenHi = true;
              }
              if (patch.lo) {
                mips.org(parseInt(patch.lo));
                mips.ori(
                  patch.reg_lo ?? patch.reg ?? "t0",
                  seenHi ? patch.reg_hi ?? patch.reg ?? "t0" : "zero",
                  size & 0xffff
                ); //some of the instructions use ori instead of addiu
                // loType = Math.max(loType, mips.read_u16() >> 10);
              }
            }
            if (!seenHi) {
              if (size >= 0x10000) {
                console.error(`Warning ${name} needs manual size patching`);
              }
            }
          }
          if (tocInfo.location) {
            let locs = [];
            if (typeof tocInfo.location === "string") {
              locs.push(parseInt(tocInfo.location));
            } else {
              locs.push(...tocInfo.location.map((a) => parseInt(a)));
            }
            switch (tocInfo.type) {
              case "event":
                for (const loc of locs) {
                  mips.org(loc);
                  for (const ent of toc) {
                    mips.write_u32(ent.offset);
                    mips.write_u32(ent.offset + align(2048, ent.size));
                  }
                }
                break;
              case "bnp_sector":
                for (const loc of locs) {
                  mips.org(loc);
                  for (const ent of toc) {
                    let off = ent.offset;
                    let len = ent.size;
                    let sector = off >> 11;
                    let sector_off = off & 0x7ff;
                    mips.write_u16(sector_off);
                    mips.write_u16(sector);
                    mips.write_u16(len);
                  }
                }
                break;
              case "bnp_sector_files":
                for (let loc of locs) {
                  let off = 0;
                  for (let i = 0; i < toc.length;) {
                    mips.org(loc + 6);
                    let numFiles = mips.read_u16();

                    mips.org(loc);
                    let ent = toc[i];
                    let lastEnt = toc[i + numFiles - 1];
                    let end = lastEnt.offset + align(2048, lastEnt.size);
                    let numSectors = (end - ent.offset) >> 11;

                    mips.write_u16(0);
                    mips.write_u16(off);
                    mips.write_u16(numSectors);
                    mips.write_u16(numFiles);
                    off += numSectors;
                    i += numFiles;
                    loc += 8;
                  }
                }
                break;
              case "bnp_files_off32":
                for (let loc of locs) {
                  mips.org(loc);
                  for (let i = 0; i < toc.length;) {
                    let entry = mips.read_u32(true);
                    let off = toc[i].offset;
                    let numFiles = entry >> 0x19;
                    mips.write_u32(off | (numFiles << 0x19));
                    i += numFiles;
                  }
                  mips.write_u32(
                    align(
                      2048,
                      toc[toc.length - 1].offset + toc[toc.length - 1].size
                    )
                  );
                }
                break;
              default:
                throw new Error(`TOC type not yet supported ${tocInfo.type}`);
            }
          }
        } else {
          console.warn(`Unknown TOC ${name}`);
        }
      }
    } else {
      await applyTOC(tocs, joinPath(dir, file.name), mips);
    }
  }
  // await Promise.all(promises);
};

export const patchEboot = async (
  eboot: string,
  path: string, //path to mod
  buildDir: string,
  dst: string,
  gameCtx: GameContext,
  asmOrder: string[],
  symout: string
) => {
  const input = await readBinaryFile(eboot);
  const elf = parseElf(input, PSP_BASE);
  const relocTable = buildRelocTable(elf);
  const relocInfo: RelocList = {};
  const variantSuffix = gameCtx.variant ? `_${gameCtx.variant}` : "";

  const relocInfo_in = JSON.parse(
    await readTextFile(
      `game/${gameCtx.game}/eboot_references${variantSuffix}.json`
    )
  );
  // let modInfo = JSON.parse(await readTextFile(joinPath(path, "mod.json")));

  for (const ent of Object.keys(relocInfo_in)) {
    const num = parseInt(ent, 16);
    relocInfo[num] = relocInfo_in[ent].map((n: string) => parseInt(n, 16));
  }

  //   patchFileLoading(input);
  const mips = new MIPS({
    info: relocInfo,
    table: relocTable,
    relocBuff: input,
  });
  const msgManager = new MessageManager(gameCtx, mips);
  mips.addSection(
    "eboot",
    elf.buff.subarray(elf.programHeaders[0].offset),
    true,
    elf.baseAddress
  );
  const startAddress = align(
    16,
    elf.programHeaders[1].vaddr + elf.programHeaders[1].memsz
  );
  let modData = new Uint8Array(2 * 1024 * 1024);
  console.log(`Mod data at ${(startAddress + elf.baseAddress).toString(16)}`);
  mips.addSection(
    "mod",
    modData,
    false,
    startAddress + elf.baseAddress,
    startAddress + modData.byteLength + elf.baseAddress
  );

  //   console.log(vm.sandbox);
  let sandbox: any = {
    console: console,
    locale: gameCtx.locale,
    mips,
    gameCtx,
    msgManager,
  };
  for (const func of exportedFuncs) {
    sandbox[func] = (mips as any)[func].bind(mips);
  }
  for (const k in ireg) {
    sandbox[`$${k}`] = k;
  }
  for (const k in freg) {
    sandbox[`$${k}`] = k;
  }
  sandbox.game = gameCtx.game;
  sandbox.variant = gameCtx.variant;
  sandbox.resolve = mips.resolveLocOrThrow.bind(mips);

  let asm_files: string[] = [];
  let asm_path = joinPath(path, "eboot", "asm");
  console.log(`Looking for asm patches in ${asm_path}`);
  try {
    asm_files = await readDir(asm_path);
  } catch (e) {
    //no asm files
  }

  let order = asmOrder as string[];
  let len = order.length;
  let map: Record<string, number> = {};
  asm_files.forEach((f, i) => {
    let idx = order.indexOf(f);
    if (idx < 0) idx = i + len;
    map[f] = idx;
  });
  asm_files.sort((a, b) => {
    return map[a] - map[b];
  });

  for (const file of asm_files) {
    console.log(`Applying ${file}`);
    let runvm: vm2.VM;
    if (!process.versions.bun) {
      runvm = new vm2.VM({
        // sandbox,
        sandbox: {
          ...sandbox,
          joinPath: joinPath,
          readDirectory: (p: string) => readDirSync(joinPath(path, p)),
          readBinaryFile: (p: string) => readBinaryFileSync(joinPath(path, p)),
          readTextFile: (p: string) => readTextFileSync(joinPath(path, p)),
        },
      });
    }

    try {
      if (!process.versions.bun) {
        runvm!.runFile(joinPath(asm_path, file));
      } else {
        let script = await readTextFile(joinPath(asm_path, file));
        let ctx = vm.createContext({
          ...sandbox,
          joinPath: joinPath,
          readDirectory: (p: string) => readDirSync(joinPath(path, p)),
          readBinaryFile: (p: string) => readBinaryFileSync(joinPath(path, p)),
          readTextFile: (p: string) => readTextFileSync(joinPath(path, p)),
        })
        vm.runInContext(script, ctx);
      }
    } catch (e) {
      console.log(`Error applying ${file}`);
      console.log(e);
      console.log((e as Error).stack);
      throw e; //rethrow
    }
  }

  let objs: string[];
  try {
    objs = (await readDir(joinPath(path, "eboot", "obj"))).filter((o) =>
      o.endsWith(".o")
    );
  } catch {
    objs = [];
  }
  for (const obj of objs) {
    console.log(`Processing ${obj}`);
    let data = await readBinaryFile(joinPath(path, "eboot", "obj", obj));
    importObj(mips, data);
  }

  mips.section("eboot");
  console.log(`Updating TOC`);

  let tocs = JSON.parse(await readTextFile(`game/${gameCtx.game}/toc${variantSuffix}.json`));
  await applyTOC(tocs, buildDir, mips);

  mips.section("mod");

  // let obj_files = await readDir(joinPath(args.path, "eboot","obj"));

  if (Object.keys(mips.delayedWrites).length > 0) {
    console.warn(
      `Unresolved symbols ${Object.keys(mips.delayedWrites).join(",")}.`
    );
    console.log(mips.delayedWrites);
  }

  let newElf = insertSection(
    elf,
    modData.subarray(
      0,
      align(
        16,
        mips.sections.mod.currentAddress - startAddress - elf.baseAddress
      )
    ),
    ".mod",
    align(16, startAddress)
  );

  await writeBinaryFile(dst, newElf.buff);
  if (symout !== "") {
    await writeTextFile(
      symout,
      mips
        .exportSymbols()
        .filter((sym) => !sym.name.includes("@@"))
        .map(
          (sym) =>
            `${sym.address.toString(16).padStart(8, "0")} ${sym.name},${sym.size
              .toString(16)
              .padStart(4, "0")}`
        )
        .join("\n")
    );
  }
};
