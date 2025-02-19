import yargs, { number } from "yargs";
import { hideBin } from "yargs/helpers";
import fs, { readFile } from "fs/promises";
import { decrypt_eboot } from "../lib/decrypt/eboot";
import {
  basename,
  joinPath,
  mkdir,
  readBinaryFile,
  readDir,
  readDirWithTypes,
  readTextFile,
  readTextFileSync,
  withoutExtension,
  writeBinaryFile,
  writeTextFile,
} from "../lib/util/filesystem";
import { PSP_BASE, patchFileLoading } from "../lib/elf/atlus_eboot";
import {
  SectionHeaderFlags,
  SectionHeaderType,
  parseElf,
  parseFlags,
} from "../lib/elf/types";
import { buildRelocTable, parseRelocs } from "../lib/mips/reloc";
import { disassemble } from "../lib/mips/disassemble";
import * as ear from "../lib/archive/ear";
import * as bnp from "../lib/archive/bnp";
import * as par from "../lib/archive/par";
import { fileToTOC } from "../lib/archive/common";
import { StringDecoder } from "string_decoder";
import {
  cchar,
  cstr,
  exact,
  fixedArrayType,
  fixedString,
  structType,
  toDataView,
  toStructBuffer,
  u16le,
  u32,
  u32le,
} from "../lib/util/structlib";
import { EncodingScheme, loadLocale } from "../lib/util/encoding";
import {
  MessageScriptContext,
  messageToString,
  parseMessage,
  parseMessageBinary,
} from "../lib/msg/msg";
import { MessageFile, writeMessageFile } from "../lib/msg/msg_file";
import { MIPS } from "../lib/mips/mips";
import { ops, ops_dngscn } from "../lib/event_script/commands/commands_ep";
import { split } from "../lib/archive/txar";
import { parseBNPFile } from "../lib/archive/bnp/file_types";
import { BlockType, imageFromGim, parseGim } from "../lib/img/gim";
import { imgFromPng, pngFromImage } from "../lib/img/png";
import { Image } from "../lib/img/img";
import {
  Game,
  GameContext,
  createContext,
  loadScriptConstants,
} from "../lib/util/context";
import efb from "../lib/mod/file_types/efb";
import {
  compareScripts,
  initScriptContext,
  parseScriptText,
} from "../lib/event_script/escript";
import { readFileSync, readdir, rm, rmSync } from "fs";
import { trimWidth, pack } from "../lib/img/util";
/**
 * this is largely just temporary tools I write for myself during research
 * they may not be useable, don't at me
 */

const args = yargs(hideBin(process.argv))
  .usage(`Tools for interacting with eboot`)
  .command(
    "$0 <eboot>",
    false,
    (yargs) =>
      yargs
        .positional("eboot", {
          type: "string",
          describe: "path to eboot to decrypt",
          demandOption: true,
          normalize: true,
        })
        .option("output", {
          type: "string",
          describe: "path to write decrypted eboot to",
          demandOption: true,
          normalize: true,
          alias: "o",
        }),
    async (args) => {
      const eboot = await readBinaryFile(args.eboot);
      const elf = parseElf(eboot, PSP_BASE);
      console.log(eboot.byteLength.toString(16));
      await mkdir(args.output);
      for (const section of elf.sectionHeaders) {
        // if(section.type == SectionHeaderType.Null) continue;
        let name = section.name;
        console.log(
          name,
          SectionHeaderType[section.type] ?? section.type.toString(16),
          parseFlags(section.flags)
        );
        if (
          section.type == SectionHeaderType.NoBits ||
          section.type == SectionHeaderType.Null
        )
          continue;
        // if (section.entsize) {
        //   console.log(section);
        // }
        let dst = joinPath(args.output, `${section.name}`);
        let data = eboot.subarray(
          section.offset,
          section.offset + section.size
        );
        if (section.type == SectionHeaderType.MipsReloc) {
          let relocs = parseRelocs(data);
          console.log(relocs);
        }
      }
      //   console.log(buildRelocTable(elf));
      console.log(
        Object.entries(buildRelocTable(elf))
          .slice(0, 10)
          .map((a) => [parseInt(a[0]).toString(16), a[1]])
      );
    }
  )
  .command(
    "toc <eboot>",
    false,
    (yargs) =>
      yargs
        .positional("eboot", {
          type: "string",
          describe: "path to eboot to decrypt",
          demandOption: true,
          normalize: true,
        })
        .option("archive", {
          type: "string",
          describe: "path to write decrypted eboot to",
          demandOption: true,
          normalize: true,
          alias: "a",
        }),
    async (args) => {
      const eboot = await readBinaryFile(args.eboot);
      const elf = parseElf(eboot, PSP_BASE);
      const file = await readBinaryFile(args.archive);
      const data = ear.split(file);
      const TOC = fileToTOC(data);
      console.log(TOC);
      console.log(ear.findTOC(TOC, elf).map((a) => a.toString(16)));
      // console.log(par.findTOC(TOC, elf).toString(16));
      // console.log(bnp.findTOC_files_off32(TOC, elf).map((a) => a.toString(16)));

      // for (const section of elf.sectionHeaders) {
      //   if (section.type != SectionHeaderType.ProgBits) continue;
      //   let name = section.name;
      //   console.log(
      //     name,
      //     SectionHeaderType[section.type] ?? section.type.toString(16),
      //     parseFlags(section.flags)
      //   );

      //   // if (section.entsize) {
      //   //   console.log(section);
      //   // }
      // }
    }
  )
  .command(
    "fontmap <eboot>",
    false,
    (yargs) =>
      yargs.positional("eboot", {
        type: "string",
        describe: "path to eboot to decrypt",
        demandOption: true,
        normalize: true,
      }),
    async (args) => {
      const eboot = await readBinaryFile(args.eboot);
      const elf = parseElf(eboot, PSP_BASE);
      let offset = 0x8c76f94 - 0x8804000 + 0xc0;
      //  offset = 0x8c7cf74 - 0x8804000 + 0xc0;
      // let count = 0x8c7cdb0 - 0x8c76f94;
      let count = 0x8c7ccb4 - 0x8c76f94;
      let data = elf.buff.subarray(offset);
      // console.log(data);
      let dec = new StringDecoder("utf-8");
      let chars = [];
      for (let i = 0; i < 256 * 31 + 16 * 2; i++) {
        if (data[i * 3 + 2] == 0)
          chars.push(dec.write(Buffer.from(data.subarray(i * 3, i * 3 + 2))));
        else
          chars.push(dec.write(Buffer.from(data.subarray(i * 3, i * 3 + 3))));
      }
      let other = JSON.parse(
        await readTextFile("game/ep/encoding/jp/font.json")
      );
      let jp = JSON.parse(JSON.stringify(other));
      for (let i = 0; i < 32; i++) {
        for (let j = 0; j < 16; j++) {
          for (let k = 0; k < 16; k++) {
            let n = i * 256 + j * 16 + k;
            if (chars[n] != other[i][j][k]) {
              if (other[i][j][k] == "" && chars[n] == "・") continue;
              // console.log(`${i} ${j} ${k} ${chars[n]} ${other[i][j][k]}`);
              if (i < 2) jp[i][j][k] = chars[n];
            }
          }
        }
      }

      let view = toDataView(eboot);
      offset = 0x8c7d56c - 0x8804000 + 0xc0;
      let event: any = {};
      let used: any = {};
      for (let i = 0; i < 2886; i++) {
        let c_v = view.getUint16(offset + 2 * i, true);
        let c = "";
        if (c_v == 0x8140) c = " ";
        else if (other[c_v >> 8]) {
          c = other[c_v >> 8][(c_v & 0xf0) >> 4][c_v & 0xf];
        } else {
          c = `[${c_v.toString(16)}]`;
        }
        event[i.toString(16).padStart(4, "0")] = c;
        if (c == "") console.log(`Blank ${i} ${c_v.toString(16)}`);
        else if (used[c] !== undefined) console.log(`Used: ${used[c]}, ${i}`);
        else used[c] = i;
      }
      // await writeTextFile(
      //   "game/ep/encoding/jp/event.json",
      //   JSON.stringify(event, null, 2)
      // );
      // // offset = 0x8c7ec90 - 0x8804000 + 0xc0;
      // // for (let i = 0; i < 38; i++) {
      // //   let c = view.getUint16(i * 2 + offset, true);
      // //   console.log(chars[c]);
      // // }
      // // let str = [...new StringDecoder("utf-8").write(Buffer.from(data))];
      // let data2 = elf.buff.subarray();
      // let c = 0;
      // let lines = [];
      // while (chars.length) {
      //   if (c % 16 == 0) lines.push(`\n${(c / 16).toString()}`);
      //   c++;
      //   lines.push(chars.splice(0, 16).join(""));
      // }
      // await writeTextFile("font_pages.txt", lines.join("\n"));
      // await writeTextFile(
      //   "game/ep/encoding/jp/font.json",
      //   JSON.stringify(jp, null, 2)
      // );
    }
  )
  .command(
    "fontconv",
    false,
    (yargs) =>
      yargs
        .option("input", {
          alias: "i",
          type: "string",
          normalize: true,
          demandOption: true,
        })
        .option("output", {
          alias: "o",
          type: "string",
          normalize: true,
          demandOption: true,
        }),
    async (args) => {
      let locale = await loadLocale("game/ep/encoding/en");
      let inputData = JSON.parse(await readTextFile(args.input));
      let output: any[] = [];
      for (let i = 0; i < 0x120; i++) {
        let v = inputData.font_map[i];
        let l = v >> 4;
        let w = v & 0xf;
        if (locale.font.bin2utf[i]) {
          output.push({
            char: locale.font.bin2utf[i],
            left: l,
            width: w,
          });
        }
      }
      await writeTextFile(args.output, JSON.stringify(output, null, 2));
    }
  )
  .command(
    "strtable",
    false,
    (yargs) => yargs,
    async (args) => {
      let data: any[] = JSON.parse(
        await readTextFile("example/eboot/strings/old_tables.json")
      );
      let desc: any = data.find((a) => a.addr == "8d2fad4");
      let name: any = data.find((a) => a.addr == "8d30610");
      let len = name.len;
      let messages = [];
      let locale = await loadLocale("game/ep/encoding/en");
      let dummyCtx = {
        terminator: 0x1103,
        game: "ep",
        encoding: "event",
        file: "dummy",
        base: 0,
      };

      let msgFile: MessageFile = {
        comments: [""],
        messages: {},
        order: [],
      };
      for (let i = 0; i < len; i++) {
        msgFile.comments.push("");
        let msgNameStr = `search_${i}_name`;
        let msgDescStr = `search_${i}_desc`;
        let msgName = parseMessage(
          (name.table[i] as string) + "[end]",
          dummyCtx as MessageScriptContext
        );
        let msgDesc = parseMessage(
          (desc.table[i] as string) + "[end]",
          dummyCtx as MessageScriptContext
        );
        msgFile.order.push(msgNameStr, msgDescStr);
        msgFile.messages[msgNameStr] = msgName;
        msgFile.messages[msgDescStr] = msgDesc;
      }

      await writeTextFile(
        "example/eboot/strings/search.msg",
        writeMessageFile(msgFile, dummyCtx as MessageScriptContext)
      );
    }
  )
  .command(
    "script_handlers <eboot>",
    false,
    (yargs) =>
      yargs.positional("eboot", {
        type: "string",
        describe: "path to eboot to decrypt",
        demandOption: true,
        normalize: true,
      }),
    async (args) => {
      const eboot = await readBinaryFile(args.eboot);
      const elf = parseElf(eboot, PSP_BASE);

      const relocTable = buildRelocTable(elf);
      const mips = new MIPS({ table: relocTable, info: {}, relocBuff: eboot });
      mips.addSection(
        "eboot",
        elf.buff.subarray(elf.programHeaders[0].offset),
        true,
        elf.baseAddress
      );

      // ops

      let offset = 0x8c76f94 - 0x8804000 + 0xc0;

      let handler_sets = [0x8cbc194, 0x8cbd474, 0x8cbdde4, 0x8cbcb04];
      let count = 302;

      let sets: { unk: number; ptr: number }[][] = [];
      for (let set of handler_sets) {
        mips.org(set);
        let arr = [];
        for (let i = 0; i < count; i++) {
          let unk = mips.read_u32();
          let ptr = mips.read_u32();
          arr.push({ ptr, unk });
        }
        sets.push(arr);
      }
      let lookup: Record<number, string> = {
        0: "unused",
      };
      let lookup_sets = [ops, ops_dngscn];
      // for (let j = 0; j < lookup_sets.length; j++)
      let ops_out: string[][] = [[], [], []];
      for (let i = 0; i < count; i++) {
        if (lookup[sets[0][i].ptr] !== undefined) {
          // console.log(
          //   `Duplicate at ${i.toString(16)}`,
          //   lookup[sets[0][i].ptr],
          //   sets[0][i].ptr
          // );
        }
        // if(sets[0][i].ptr == 0)
        else {
          lookup[sets[0][i].ptr] = `escr_${i.toString(16).padStart(3, "0")}${ops[i] ? "_" + ops[i] : ""
            }`;
        }
        for (let j = 1; j < 4; j++) {
          if (sets[j][i].ptr == sets[0][i].ptr) {
            if (ops[i]) {
              ops_out[j][i] = ops[i];
            } else if (sets[0][i].ptr == 0) {
              ops_out[j][i] = `unused_${i.toString(16)}`;
            }
          } else {
            ops_out[j][i] = ops[i];
          }
        }
      }
      let out = sets.map((a, j) =>
        a.map((b, i) => {
          let name = lookup[b.ptr] ?? `escr_${j}_${i.toString(16)}`;
          if (lookup[b.ptr] === undefined) lookup[b.ptr] = name;
          return {
            name,
            unk: b.unk,
            ptr: (b.ptr + 0x8804000).toString(16),
            // id: `${j}_${i.toString(16)}`,
          };
        })
      );
      let common = [];
      for (let i = 0; i < count; i++) {
        let ptr = out[0][i].ptr;
        let good = true;
        let count = 1;
        for (let j = 1; j < 4; j++) {
          count += ptr == out[j][i].ptr ? 1 : 0;
        }
        // common.push({
        //   id: i.toString(16),
        //   good
        // })
        console.log(out[0][i].name, count);
      }
      for (let i = 0; i < 4; i++) {
        await writeTextFile(
          `script_sets_${i}.json`,
          JSON.stringify(out[i], null, 2)
        );
      }
    }
  )
  .command(
    "event_ids <eboot>",
    false,
    (yargs) =>
      yargs.positional("eboot", {
        type: "string",
        describe: "path to eboot to decrypt",
        demandOption: true,
        normalize: true,
      }),
    async (args) => {
      const eboot = await readBinaryFile(args.eboot);
      const elf = parseElf(eboot, PSP_BASE);

      const relocTable = buildRelocTable(elf);
      const mips = new MIPS({ table: relocTable, info: {}, relocBuff: eboot });
      mips.addSection(
        "eboot",
        elf.buff.subarray(elf.programHeaders[0].offset),
        true,
        elf.baseAddress
      );

      mips.org(0x8cbb668);
      let count = 352;
      let funcs = [];
      for (let i = 0; i < count; i++) {
        funcs.push(mips.performReloc(mips.here(), mips.read_u32()));
      }
      let map: any = {};
      for (let i = 0; i < funcs.length; i++) {
        let func = funcs[i];
        console.log(func.toString(16));
        mips.org(func);
        let instr = mips.read_u32();
        let t = "unk";
        if (((instr >> 16) & 0xffff) == 0x2402) {
          let v = instr & 0xffff;
          let l = "E";
          if (v > 0x130) {
            v -= 0x130;
            l = "M";
          }
          t = `${l}${v.toString(16).padStart(4, "0")}`;
        }
        map[i] = t;
      }
      await writeTextFile("tmp/loadevent.json", JSON.stringify(map, null, 2));
    }
  )

  .command(
    "trig_tables <eboot>",
    false,
    (yargs) =>
      yargs.positional("eboot", {
        type: "string",
        describe: "path to eboot to decrypt",
        demandOption: true,
        normalize: true,
      }),
    async (args) => {
      const eboot = await readBinaryFile(args.eboot);
      const elf = parseElf(eboot, PSP_BASE);

      const relocTable = buildRelocTable(elf);
      const mips = new MIPS({ table: relocTable, info: {}, relocBuff: eboot });
      mips.addSection(
        "eboot",
        elf.buff.subarray(elf.programHeaders[0].offset),
        true,
        elf.baseAddress
      );

      mips.org(0x8c50ca0);
      let count = 0x1000;
      let table0: number[] = [];
      let table1: number[] = [];
      for (let i = 0; i < count; i++) {
        table0.push(mips.read_i16() / 4096);
        table1.push(mips.read_i16() / 4096);
        // funcs.push(mips.performReloc(mips.here(), mips.read_u32()));
      }
      await writeTextFile("tmp/trig_table0.csv", table0.join("\n"));
      await writeTextFile("tmp/trig_table1.csv", table1.join("\n"));

      // await writeTextFile("tmp/loadevent.json", JSON.stringify(map, null, 2));
    }
  )
  .command(
    "txar <path>",
    false,
    (yargs) =>
      yargs.positional("path", {
        type: "string",
        describe: "path ",
        demandOption: true,
        normalize: true,
      }),
    async (args) => {
      let recurse = async (path: string) => {
        let files = await readDirWithTypes(path);
        for (const file of files) {
          if (file.isFile) {
            if (file.name.endsWith("txar")) {
              let data = await readBinaryFile(joinPath(path, file.name));
              let files = split(data);
              if (files.length & 1) {
                console.warn(
                  `Odd number of files in ${joinPath(path, file.name)}`
                );
                continue;
              }
              for (let i = 0; i < files.length; i += 2) {
                let clt = files[i];
                let pxl = files[i + 1];
                if (clt.data.byteLength > pxl.data.byteLength) {
                  console.warn(`clt longer in ${joinPath(path, file.name)}`);
                  // console.log(files.map((f) => f.data.byteLength));
                  break;
                }
              }
            }
          } else {
            recurse(joinPath(path, file.name));
          }
        }
      };
      await recurse(args.path);
    }
  )
  .command(
    "psxaudio <path>",
    false,
    (yargs) =>
      yargs.positional("path", {
        type: "string",
        describe: "path ",
        demandOption: true,
        normalize: true,
      }),
    async (args) => {
      let recurse = async (path: string) => {
        let files = await readDirWithTypes(path);
        for (const file of files) {
          let name = joinPath(path, file.name);
          if (file.isFile) {
            if (file.name.endsWith("psxaudio")) {
              let data = await readBinaryFile(name);
              if (data[1] != 1) {
                console.warn(name);
              }

              let dv = toDataView(data);
              let headerSize = dv.getUint32(8);
              let headerData = data.subarray(8, 8 + headerSize);
              let wavData = data.subarray(8 + headerSize);
            }
          } else {
            recurse(name);
          }
        }
      };
      await recurse(args.path);
    }
  )
  .command(
    "bnpimg <path>",
    false,
    (yargs) =>
      yargs.positional("path", {
        type: "string",
        describe: "path ",
        demandOption: true,
        normalize: true,
      }),
    async (args) => {
      let recurse = async (path: string) => {
        let files = await readDirWithTypes(path);
        for (const file of files) {
          let name = joinPath(path, file.name);
          if (file.isFile) {
            if (file.name.toLowerCase().endsWith("bnp")) {
              // console.log(name);
              let data = await readBinaryFile(name);
              let subFiles = bnp.split(data);
              for (const file of subFiles) {
                if (file.data[0] == 2) {
                  let imageData = parseBNPFile(file.data);
                  let header = imageData.imgHeader;
                  if (header && imageData.data[0] == 0x12) {
                    // if (header.h == 1 || header.h == 16) console.log(header);
                  }
                  if (!header) {
                    console.log(Buffer.from(imageData.data));
                  }
                }
              }
            }
          } else {
            recurse(name);
          }
        }
      };
      await recurse(args.path);
    }
  )
  .command(
    "giminfo <path>",
    false,
    (yargs) =>
      yargs.positional("path", {
        type: "string",
        describe: "path ",
        demandOption: true,
        normalize: true,
      }),
    async (args) => {
      let formatsSeen: any = {};
      let allSeen: any = {};
      let recurse = async (path: string) => {
        let files = await readDirWithTypes(path);
        for (const file of files) {
          let name = joinPath(path, file.name);
          if (file.isFile) {
            if (file.name.toLowerCase().endsWith("gim")) {
              // console.log(name);
              try {
                let data = await readBinaryFile(name);
                let gim = parseGim(data);
                if (gim.blockId == BlockType.Root) {
                  for (const v of (gim.children[0] as typeof gim).children) {
                    if (v.blockId != BlockType.Image) continue;
                    let info = {
                      pitchAlign: v.pitchAlign,
                      heightAlign: v.heightAlign,
                      bpp: v.bpp,
                    };
                    if (formatsSeen[v.imageFormat] === undefined) {
                      formatsSeen[v.imageFormat] = info;
                    }
                    if (
                      JSON.stringify(formatsSeen[v.imageFormat]) !=
                      JSON.stringify(info)
                    ) {
                      // console.log(formatsSeen[v.imageFormat], info);
                    }

                    if (v.pixelFormat != 1) {
                      console.log(name);
                    }
                    // if (v.height % v.heightAlign) console.log(name);
                  }
                }
                // await writeBinaryFile(
                //   name + ".png",
                //   await pngFromImage(imageFromGim(gim))
                // );
                // console.log(gim);
              } catch (e) {
                console.log(e);
                console.warn(`${name} is bad`);
                throw e;
              }
            }
          } else {
            recurse(name);
          }
        }
      };
      await recurse(args.path);
      console.log(formatsSeen);
    }
  )
  .command(
    "contactIdentical <path>",
    false,
    (yargs) =>
      yargs.positional("path", {
        type: "string",
        describe: "path ",
        demandOption: true,
        normalize: true,
      }),
    async (args) => {
      let entries: any = [];
      let recurse = async (path: string) => {
        let files = await readDirWithTypes(path);
        for (const file of files) {
          let name = joinPath(path, file.name);
          if (file.isFile) {
            if (file.name.toLowerCase().endsWith("cfb")) {
              let data = await readBinaryFile(name);
              let dv = toDataView(data);
              let idxs = data.subarray(
                dv.getUint16(4, true),
                dv.getUint16(6, true)
              );
              let idxDv = toDataView(idxs);
              let seenIdx: any = {};
              let last = -1;
              for (let i = 0; i < idxs.byteLength; i += 2) {
                let v = idxDv.getUint16(i, true);
                // if(v < last) console.log("lower", v, last);
                last = v;
                if (seenIdx[v]) {
                  // console.log(`duplicate`);
                }
                seenIdx[v] = true;
              }
              data = data.subarray(
                dv.getUint16(0, true),
                dv.getUint16(6, true)
              );
              let found = false;
              for (const entry of entries) {
                let s = entry[0];
                if (s.length == data.length) {
                  if (
                    data.every((v, i) => {
                      return s[i] == v;
                    })
                  ) {
                    found = true;
                    entry[1].push(file.name);
                    break;
                  }
                }
              }
              if (!found) {
                entries.push([data, [file.name]]);
              }
            }
          } else {
            recurse(name);
          }
        }
      };
      await recurse(args.path);
      console.log(entries.map((v: any) => v[1]));
      console.log(entries.length);
    }
  )
  .command(
    "contactOps <path>",
    false,
    (yargs) =>
      yargs.positional("path", {
        type: "string",
        describe: "path ",
        demandOption: true,
        normalize: true,
      }),
    async (args) => {
      let eboot = await readBinaryFile(args.path);
      let offset = 0x8d03f98 - 0x8804000 + 0xc0;
      let script_ent = structType({
        opcode: u32le,
        name: fixedString(24),
        argCount: u32le,
        argTypes: fixedArrayType(cchar, 8),
        unk: u32le,
        handler: u32le,
      });
      let scriptEntReader = fixedArrayType(script_ent, 158);
      let sb = toStructBuffer(eboot, offset, true);
      let entries = scriptEntReader.read(sb);
      // for(let i = 0; i < entries.length; i++) {
      //   if(entries[i].opcode != i) console.log(entries[i]);
      // }
      let data = entries.map((e) => {
        return `${e.name.replaceAll("\0", "")}(${e.argTypes
          .slice(0, e.argCount)
          .join(", ")})${e.opcode > 158 ? "!" : ""}`;
      });
      await writeTextFile("contactScript.txt", data.join("\n"));
    }
  )
  .command(
    "contacttest <path>",
    false,
    (yargs) =>
      yargs.positional("path", {
        type: "string",
        describe: "path ",
        demandOption: true,
        normalize: true,
      }),
    async (args) => {
      let entries: any = [];
      let recurse = async (path: string) => {
        let files = await readDirWithTypes(path);
        for (const file of files) {
          let name = joinPath(path, file.name);
          if (file.isFile) {
            if (file.name.toLowerCase().endsWith("cfb")) {
              let data = await readBinaryFile(name);
              let dv = toDataView(data);
              let idxData = data.subarray(
                dv.getUint16(0, true),
                dv.getUint16(2, true)
              );
              let idxDv = toDataView(idxData);
              let idxs: number[] = [];
              for (let i = 0; i < idxData.byteLength; i += 2) {
                idxs.push(idxDv.getUint16(i, true));
              }
              for (let i = 0; i < idxs.length - 1; i++) {
                if (idxs[i] > idxs[i + 1]) {
                  throw new Error("bad assumption");
                }
              }
              // console.log(file.name + " is ok");

              idxData = data.subarray(
                dv.getUint16(4, true),
                dv.getUint16(6, true)
              );
              idxDv = toDataView(idxData);
              idxs = [];
              for (let i = 0; i < idxData.byteLength; i += 2) {
                idxs.push(idxDv.getUint16(i, true));
              }

              let lookup: Record<number, number> = {};
              let count = 0;
              let max = -1;
              let duplicates = 0;
              for (const idx of idxs) {
                if (lookup[idx] === undefined) {
                  if (idx < max) console.log("no");
                  lookup[idx] = count++;
                  max = idx;
                } else {
                  duplicates++;
                }
              }
              console.log(name, duplicates);
              // console.log(idxs.map(a=>lookup[a]).slice(0, 20));
            }
          } else {
            recurse(name);
          }
        }
      };
      await recurse(args.path);
      console.log(entries.map((v: any) => v[1]));
      console.log(entries.length);
    }
  )
  .command(
    "contactConv <inpath> <outpath>",
    false,
    (yargs) =>
      yargs
        .positional("inpath", {
          type: "string",
          demandOption: true,
          normalize: true,
        })
        .positional("outpath", {
          type: "string",
          demandOption: true,
          normalize: true,
        }),
    async (args) => {
      //convert old contact message scripts to new, cause the old ones are different on a binary level..
      console.log(args);
      let inFiles = (await readDir(args.inpath)).filter((a) =>
        a.endsWith(".msg")
      );
      let itemMap = JSON.parse(await readTextFile("game/ep/context/item.json"));
      let map: any = {};
      let fileMap: any = {};
      for (const file of inFiles) {
        console.log(file);
        let data = await readTextFile(joinPath(args.inpath, file));
        let id = file.split(".")[0];
        if (map[data] === undefined) {
          map[data] = file;
          fileMap[file] = [];
          let tmp = data
            .replaceAll("[ret]", "[end]")
            .replaceAll("[wait]", "[clear]")
            .replaceAll("[col(", "[color(")
            .replaceAll("[23", "[pact_demon")
            .replaceAll("[end_diag]", "[wait]")
            .replaceAll("[07]", "[sync]");
          let match = tmp.match(/\[item_with_type\((\w\w\))\]/);
          while (match) {
            let num = parseInt(match[1], 16);
            // console.log( num);
            tmp = tmp.replaceAll(
              `[item_with_type(${match[1]})]`,
              `[item_with_type(${itemMap[`0x${num.toString(16).padStart(4, "0")}`]
              })]`
            );
            match = tmp.match(/\[item_with_type\((\w\w)\)\]/);
          }
          match = tmp.match(/\[0([bc])\((\w+)\)\]/);
          while (match) {
            // console.log(match[1], match[2])
            let type = match[1];
            let num = parseInt(match[2]);
            // console.log( num);
            let name = type == "b" ? "play_sound" : "load_sound";
            tmp = tmp.replaceAll(
              `[0${type}(${match[2]})]`,
              `[${name}(sndeff_${num.toString(16)})]`
            );
            match = tmp.match(/\[0([bc])\((\w+)\)\]/);
          }
          await writeTextFile(joinPath(args.outpath, file), tmp);
        }

        fileMap[map[data]].push(`${id}.cfb$/script.msg`);
      }
      await writeTextFile(
        joinPath(args.outpath, "files.json"),
        JSON.stringify({ files: fileMap })
      );
    }
  )
  .command(
    "eventConv <inpath> <outpath>",
    false,
    (yargs) =>
      yargs
        .positional("inpath", {
          type: "string",
          demandOption: true,
          normalize: true,
        })
        .positional("outpath", {
          type: "string",
          demandOption: true,
          normalize: true,
        })
        // .positional("archive", {
        //   type: "string",
        //   demandOption: true,
        //   normalize: true,
        // })
        .option("game", {
          type: "string",
          default: "ep",
        })
        .option("encoding", {
          type: "string",
          default: "en",
        }),
    async (args) => {
      //re extract old event scripts
      console.log(args);
      let inFiles = (await readDir(args.inpath)).filter((a) =>
        a.endsWith(".efb")
      );
      let ctx: GameContext = {
        game: Game.EP,
        locale: await loadLocale(`game/${args.game}/encoding/${args.encoding}`),
        constants: {},
      };
      await loadScriptConstants(ctx);
      await mkdir(args.outpath);

      let map: any = {};
      let fileMap: any = {};
      inFiles.sort((a, b) => {
        if (a[0] != b[0]) {
          if (a[0].toUpperCase() == "E") return -1;
          return 1;
        }
        return parseInt(a.slice(1), 16) - parseInt(b.slice(1), 16);
      });
      for (const file of inFiles) {
        console.log(file);
        let id = file.split(".")[0];
        efb.extract(
          joinPath(args.inpath, file),
          {
            path: "",
            type: "",
            fileList: [
              { path: `${id}.script`, type: "" },
              { path: `${id}.msg`, type: "" },
            ],
          },
          args.outpath,
          ctx
        );

        // let data = await readTextFile(joinPath(args.inpath, file));

        fileMap[`${id}.script`] = `${id}.efb$/script.ef`;
        fileMap[`${id}.msg`] = `${id}.efb$/script.msg`;
      }
      // await writeTextFile(
      //   joinPath(args.outpath, "files.json"),
      //   JSON.stringify(
      //     {
      //       path: `/PSP_GAME/USRDIR/pack/P2PT_ALL.cpk$/${args.archive}$`,
      //       files: fileMap,
      //     },
      //     null,
      //     2
      //   )
      // );
    }
  )
  .command(
    "mmapConv <inpath> <outpath>",
    false,
    (yargs) =>
      yargs
        .positional("inpath", {
          type: "string",
          demandOption: true,
          normalize: true,
        })
        .positional("outpath", {
          type: "string",
          demandOption: true,
          normalize: true,
        }),
    async (args) => {
      //re extract old event scripts
      console.log(args);
      let fileMap: any = {};
      let ctx: GameContext = {
        game: Game.EP,
        locale: await loadLocale("game/ep/encoding/en"),
        constants: {},
      };
      await loadScriptConstants(ctx);
      for (let i = 1; i <= 7; i++) {
        let dir = joinPath(args.inpath, `MMAP0${i}.BNP`);
        let inFile = (await readDir(dir)).filter((a) => a.endsWith(".efb"))[0];

        let map: any = {};
        const file = inFile;
        console.log(file);
        let id = file.split(".")[0];
        efb.extract(
          joinPath(dir, file),
          {
            path: "",
            type: "",
            fileList: [
              { path: `MMAP0${i}.script`, type: "" },
              { path: `MMAP0${i}.msg`, type: "" },
            ],
          },
          args.outpath,
          ctx
        );

        // let data = await readTextFile(joinPath(args.inpath, file));

        fileMap[`MMAP0${i}.script`] = `MMAP0${i}.BNP$/${id}.efb$/script.ef`;
        fileMap[`MMAP0${i}.msg`] = `MMAP0${i}.BNP$/${id}.efb$/script.msg`;
      }

      // console.log(JSON.stringify(fileMap));
      await writeTextFile(
        joinPath(args.outpath, "files.json"),
        JSON.stringify(
          {
            path: "/PSP_GAME/USRDIR/pack/P2PT_ALL.cpk$/",
            files: fileMap,
          },
          null,
          2
        )
      );
    }
  )

  .command(
    "eventCompare <src> <compare>",
    false,
    (yargs) =>
      yargs
        .positional("src", {
          type: "string",
          demandOption: true,
          normalize: true,
        })
        .positional("compare", {
          type: "string",
          demandOption: true,
          normalize: true,
        })
        .positional("archive", {
          type: "string",
          demandOption: true,
          normalize: true,
        }),
    async (args) => {
      //re extract old event scripts
      console.log(args);
      let inFiles = (await readDir(args.src)).filter((a) => a.endsWith(".bin"));
      let ctx: GameContext = {
        game: Game.EP,
        locale: await loadLocale("game/ep/encoding/en"),
        constants: {},
      };
      await loadScriptConstants(ctx);

      let map: any = {};
      let fileMap: any = {};
      inFiles.sort((a, b) => {
        if (a[0] != b[0]) {
          if (a[0] == "E") return -1;
          return 1;
        }
        return parseInt(a.slice(1), 16) - parseInt(b.slice(1), 16);
      });
      for (const file of inFiles) {
        // console.log(file);
        try {
          let id = file.split(".")[0];
          let dataSrc = await readTextFile(
            joinPath(args.src, file + "$", "8.efb$", "script.ef")
          );
          let messageSrc = await readTextFile(
            joinPath(args.src, file + "$", "8.efb$", "script.msg")
          );
          let scriptSrc = parseScriptText(
            dataSrc,
            messageSrc,
            initScriptContext(ctx, args.src)
          );

          let dataComp = await readTextFile(
            joinPath(args.compare, `${id}.script`)
          );
          let messageComp = await readTextFile(
            joinPath(args.compare, `${id}.msg`)
          );
          let scriptComp = parseScriptText(
            dataComp,
            messageComp,
            initScriptContext(ctx, id)
          );
          if (!compareScripts(scriptSrc, scriptComp)) {
            console.log(`${id} differs`);
          } else {
            // await fs.rm(joinPath(args.compare, `${id}.script`));
          }
        } catch (e) {
          // console.log(e);
        }
      }
    }
  )
  .command(
    "mmapCompare <src> <compare>",
    false,
    (yargs) =>
      yargs
        .positional("src", {
          type: "string",
          demandOption: true,
          normalize: true,
        })
        .positional("compare", {
          type: "string",
          demandOption: true,
          normalize: true,
        })
        .positional("archive", {
          type: "string",
          demandOption: true,
          normalize: true,
        }),
    async (args) => {
      //re extract old event scripts
      console.log(args);
      let inFiles = (await readDir(args.src)).filter((a) => a.endsWith(".bin"));
      let ctx: GameContext = {
        game: Game.EP,
        locale: await loadLocale("game/ep/encoding/en"),
        constants: {},
      };
      await loadScriptConstants(ctx);

      for (let i = 1; i <= 7; i++) {
        let srcDir = joinPath(args.src, `MMAP0${i}.BNP$`);
        let file = joinPath(
          srcDir,
          (await readDir(srcDir)).find((a) => a.endsWith(".efb$"))!,
          "script."
        );
        let id = file.split(".")[0];
        let dataSrc = await readTextFile(file + "ef");
        let messageSrc = await readTextFile(file + "msg");
        let scriptSrc = parseScriptText(
          dataSrc,
          messageSrc,
          initScriptContext(ctx, args.src)
        );

        let dataComp = await readTextFile(
          joinPath(args.compare, `MMAP0${i}.script`)
        );
        let messageComp = await readTextFile(
          joinPath(args.compare, `MMAP0${i}.msg`)
        );
        let scriptComp = parseScriptText(
          dataComp,
          messageComp,
          initScriptContext(ctx, id)
        );
        if (!compareScripts(scriptSrc, scriptComp)) {
          console.log(`${id} differs`);
        } else {
          console.log("same");
          // await fs.rm(joinPath(args.compare, `${id}.script`));
        }
      }
    }
  )
  .command(
    "generateImageList",
    false,
    (yargs) => yargs,
    async (args) => {
      let fileMap: Record<string, string> = {};
      for (let i = 5; i < 36; i++) {
        fileMap[`syscg_${i}`] = `font_${i - 5}`;
      }
      fileMap[`syscg_43`] = "font_small";

      let archives: [string, number, number][] = [
        ["syscg.bin", 0x35, 6],
        ["ch_menu.bin", 0x32, 0x3c],
        ["cm_menu.bin", 0x24, 0x6f],
        ["bt_menu.bin", 0x14, 0x94],
        ["map_w.bin", 0x34, 0xa9],
        ["advcg.bin", 0x4, 0xde],
        ["btef.bin", 0xe, 0xe3],
        ["entry.bin", 0x2, 0xf2],
        ["edit.bin", 0x15, 0xf5],
      ];
      let headerList: string[] = [];
      let map: Record<string, string> = {};
      for (const [name, count, start] of archives) {
        for (let i = 0; i <= count; i++) {
          let num = start + i;
          let id = `${name.replace(".bin", "")}_${i.toString()}`;
          if (fileMap[id]) id = fileMap[id];
          map[id] = num.toString(16);
          headerList.push(`${id} = ${num},`);
        }
      }
      console.log(headerList.join("\n"));
    }
  )
  .command(
    "extractImageArr <eboot>",
    false,
    (yargs) =>
      yargs
        .positional("eboot", {
          type: "string",
          normalize: true,
          demandOption: true,
        })
        .option("offset", {
          type: "number",
          demandOption: true,
          default: 0x8caed88,
        })
        .option("count", {
          type: "number",
          default: 34,
        }),
    async (args) => {
      let eboot = await readBinaryFile(args.eboot);
      let offset = args.offset - 0x8804000 + 0xc0;
      let dv = toStructBuffer(eboot, offset, true);
      let struct = structType({
        image: exact(u32, 0x84),
        x: u32,
        y: u32,
        w: u32,
        h: u32,
        left: u32,
        top: u32,
        textLeft: u32,
        textTop: u32,
      });
      let data = fixedArrayType(struct, args.count).read(dv);
      console.log(JSON.stringify(data));
    }
  )
  .command(
    "breakUiHeader <gim> <output>",
    false,
    (yargs) =>
      yargs
        .positional("gim", {
          type: "string",
          normalize: true,
          demandOption: true,
        })
        .positional("output", {
          type: "string",
          normalize: true,
          demandOption: true,
        }),
    async (args) => {
      let gim = imageFromGim(parseGim(await readBinaryFile(args.gim)));
      let data = JSON.parse(
        await readTextFile(`game/ep/ui_data/ui_header_raw.json`)
      );
      await mkdir(args.output);
      for (let i = 0; i < data.length; i++) {
        let subImage = data[i];
        let imgData = gim.getSubImage(
          subImage.x,
          subImage.y,
          subImage.w,
          subImage.h
        );
        await writeBinaryFile(
          joinPath(args.output, `${i}.png`),
          await pngFromImage(imgData)
        );
      }
    }
  )
  .command(
    "genuiheaderlist",
    false,
    (yargs) => yargs,
    async (args) => {
      let order = [
        "command",
        "status",
        "item",
        "battle",
        "guard",
        "result",
        "analysis",
        "skill",
        "link_skill",
        "attack",
        "order",
        "auto",
        "contact",
        "persona",
        "equip",
        "use_item",
        "event_item",
        "config",
        "card",
        "entry",
        "gallery",
        "conditions",
        "sync_skill",
        "tool_menu",
        "new_quest",
        "phase_edit",
        "enemy_edit",
        "npc_edit",
        "event_edit",
        "system",
        "quest_menu",
        "quest_room",
        "contract",
        "strategy",
        "town_map",
        "city_map",
        "shopping_mall",
        "music",
      ];
      let types: any[] = [
        ["struct", 0x8caed88, 34],
        ["struct", 0x8cb090c, 3],
        ["patch", 0, 1],
      ];
      let i = 0;
      let stride = 36;
      let arr: any[] = [];
      for (const type of types) {
        let addr = type[1];
        for (let j = 0; j < type[2]; j++) {
          arr.push({
            name: order[i++],
            type: type[0],
            addr: addr.toString(16),
          });
          addr += stride;
        }
      }
      console.log(JSON.stringify(arr));
    }
  )

  .command(
    "packtest <path>",
    false,
    (yargs) =>
      yargs
        .positional("path", {
          normalize: true,
          demandOption: true,
          type: "string",
        })
        .option("output", {
          normalize: true,
          demandOption: true,
          alias: "o",
          type: "string",
        }),
    async (args) => {
      let files = await readDir(args.path);
      files.sort((a, b) => parseInt(a) - parseInt(b));
      let images: Image[] = [];
      for (const file of files) {
        let data = await readBinaryFile(joinPath(args.path, file));
        let img = await imgFromPng(data);
        img = trimWidth(img);
        images.push(img);
      }
      let output = await pack(images);
      console.log(JSON.stringify(output.mapping));
      await writeBinaryFile(args.output, await pngFromImage(output.output));
    }
  )
  .command(
    "isEventConv <inpath> <outpath>",
    false,
    (yargs) =>
      yargs
        .positional("inpath", {
          type: "string",
          demandOption: true,
          normalize: true,
        })
        .positional("outpath", {
          type: "string",
          demandOption: true,
          normalize: true,
        })
        .option("game", {
          type: "string",
          default: "ep",
        })
        .option("locale", {
          type: "string",
          default: "jp",
        }),
    async (args) => {
      //find event ones
      console.log(args);

      let inFiles = (await readDir(args.inpath)).filter((a) =>
        a.endsWith(".bin")
      );
      let ctx: GameContext = {
        game: args.game as Game,
        locale: await loadLocale(`game/${args.game}/encoding/${args.locale}`),
        constants: {},
      };
      await mkdir(args.outpath);
      await loadScriptConstants(ctx);

      // let map: any = {};
      let fileMap: any = {};
      // inFiles.sort((a, b) => {
      //   if (a[0] != b[0]) {
      //     if (a[0] == "E") return -1;
      //     return 1;
      //   }
      //   return parseInt(a.slice(1), 16) - parseInt(b.slice(1), 16);
      // });
      for (const folder of inFiles) {
        console.log(folder);
        try {
          let file = joinPath(withoutExtension(folder), "8.efb");
          console.log(file);
          let id = withoutExtension(folder);
          await efb.extract(
            joinPath(args.inpath, file),
            {
              path: "",
              type: "",
              fileList: [
                { path: `${id}.script`, type: "" },
                { path: `${id}.msg`, type: "" },
              ],
            },
            args.outpath,
            ctx
          );
          fileMap[`${id}.script`] = `${id}.efb$/script.ef`;
          fileMap[`${id}.msg`] = `${id}.efb$/script.msg`;
        } catch (e) {
          console.log(e);
          // return;
        }

        // let data = await readTextFile(joinPath(args.inpath, file));
      }
      await writeTextFile(
        joinPath(args.outpath, "files.json"),
        JSON.stringify(
          {
            path: `/PSP_GAME/USRDIR/pack/P2PT_ALL.cpk$/event.bin$`,
            files: fileMap,
          },
          null,
          2
        )
      );
    }
  )
  .command(
    "strArrExtract <input> <output>",
    false,
    (yargs) =>
      yargs
        .positional("input", {
          type: "string",
          demandOption: true,
          normalize: true,
        })
        .positional("output", {
          type: "string",
          demandOption: true,
          normalize: true,
        })
        .option("start", {
          type: "number",
          demandOption: true,
        })
        .option("end", {
          type: "number",
          demandOption: true,
        })
        .option("size", {
          type: "number",
          demandOption: true,
        }),
    async (args) => {
      //find event ones
      // console.log(args);
      let data = await readBinaryFile(args.input);
      let str = fixedString(args.size);
      let strings = [];
      let sb = toStructBuffer(data, args.start);
      let dummyCount = 0;
      while (sb.ptr < args.end) {
        let string = str.read(sb).replaceAll("\0", "");
        if (string == "EBIT_DUMMY") {
          string = `EBIT_DUMMY_${(dummyCount++).toString(16).padStart(2, "0")}`;
        }
        strings.push(string);
      }
      await writeTextFile(args.output, JSON.stringify(strings));
    }
  )
  .command(
    "eventCharacterMap <input> <output>",
    false,
    (yargs) =>
      yargs
        .positional("input", {
          type: "string",
          demandOption: true,
          normalize: true,
        })
        .positional("output", {
          type: "string",
          demandOption: true,
          normalize: true,
        })
        .option("start", {
          type: "number",
          demandOption: true,
        })
        .option("end", {
          type: "number",
          demandOption: true,
        }),
    async (args) => {
      //find event ones
      // console.log(args);
      let locale = await loadLocale("game/is/encoding/jp");
      let data = await readBinaryFile(args.input);
      let sb = toStructBuffer(data, args.start - 0x8804000 + 0xc0);
      // let sb = toStructBuffer(data, args.start);

      let end = args.end - 0x8804000 + 0xc0;
      let i = 0;
      let map: Record<string, string> = {};

      while (sb.ptr < end) {
        let value = u16le.read(sb);
        console.log(value);
        let c = locale.font.bin2utf[value];
        map[i.toString(16).padStart(4, "0")] = c;
        i++;
      }
      await writeTextFile(args.output, JSON.stringify(map, null, 2));
    }
  )
  .command(
    "patchFont <input> <output>",
    false,
    (yargs) =>
      yargs
        .positional("input", {
          type: "string",
          demandOption: true,
          normalize: true,
        })
        .positional("output", {
          type: "string",
          demandOption: true,
          normalize: true,
        }),
    async (args) => {
      //find event ones
      let data = await readBinaryFile(args.input);
      let img = await imgFromPng(data);
      for (let i = 0; i < 16; i++) {
        inner: for (let j = 0; j < 16 - 3; j++) {
          let sub = img.getSubImage(16 * i, 16 * j, 16, 16);
          for (let k = 0; k < 16; k++) {
            if (sub.getPixel(k, 0) >> 24) {
              continue inner;
            }
          }
          img.setSubImage(16 * i, 16 * j, sub.getSubImage(0, 1, 16, 15));
          img.setSubImage(16 * i, 16 * j + 15, sub.getSubImage(0, 0, 16, 1));
        }
      }
      await writeBinaryFile(args.output, await pngFromImage(img));

      // await writeTextFile(args.output, JSON.stringify(strings));
    }
  )
  .command(
    "generateScriptNames",
    false,
    (yargs) => yargs,
    () => {
      let names = [];
      for (let i = 0; i < 302; i++) {
        names.push(`script_${ops[i] ?? i.toString(16)}`);
      }
      console.log(names.map((a) => `'${a}'`).join(","));
    }
  )
  .command(
    "analyzeScriptFuncs <json>",
    false,
    (yargs) =>
      yargs
        .positional("json", {
          type: "string",
          normalize: true,
          demandOption: true,
        })
        .option("output", {
          type: "string",
          normalize: true,
          demandOption: false,
        }),
    async (args) => {
      let arr = JSON.parse(await readTextFile(args.json));
      let map: any = {};
      let unique: any = {};
      for (const data of arr) {
        if (map[data[1]] != undefined) {
          // console.log(map[data[1]], data[0]);
          unique[data[0]] = false;
          unique[map[data[1]]] = false;
        } else {
          unique[data[0]] = true;
        }
        map[data[1]] = data[0];
      }
      let funcs = arr.filter((f: any) => unique[f[0]]);
      if (args.output) await writeTextFile(args.output, JSON.stringify(funcs));
      // funcs.map((f:any)=>f[0])
    }
  )
  .command(
    "dumpEbootCompare <eboot> <symbols>",
    false,
    (yargs) =>
      yargs
        .positional("eboot", {
          type: "string",
          normalize: true,
          demandOption: true,
        })
        .positional("symbols", {
          type: "string",
          normalize: true,
          demandOption: true,
        })
        .option("output", {
          type: "string",
          normalize: true,
          demandOption: true,
        }),
    async (args) => {
      let eboot = parseElf(await readBinaryFile(args.eboot), 0x8804000);
      // let eboot2 = parseElf(await readBinaryFile(args.eboot2!), 0x8804000);
      let syms = await readTextFile(args.symbols);
      let text = eboot.sectionHeaders.find((a) => a.name == ".text")!;
      let relocs = buildRelocTable(eboot);
      let funcMap: Record<number, string> = {};
      for (const line of syms.split("\n")) {
        let addr = parseInt(line.split(" ")[0], 16);
        funcMap[addr] = addr.toString(16);
      }

      // console.log(relocs);
      let base = text.addr + 0x8804000;
      console.log(base);
      let sb = toStructBuffer(text.data);
      // let funcs: string[] = [];
      let func: string[] = [];
      let count = 0;
      let funcList = [];
      while (sb.ptr < text.data.byteLength) {
        if (funcMap[base + sb.ptr]) {
          // if (func.length) funcs.push(...func);
          // func = [funcMap[sb.ptr]];
          // func.push(funcMap[sb.ptr + base]);
          funcList.push(`func_${count}=${funcMap[sb.ptr + base]}`);
          func.push(`func_${count++}`);
        }
        let hasReloc = relocs[sb.ptr + base] != undefined;
        let instr = u32le.read(sb);
        func.push(JSON.stringify(disassemble(instr, hasReloc)));
      }
      // if(func.length) func.push(...func);
      await writeTextFile(args.output, func.concat(funcList).join("\n"));
    }
  )
  .command(
    "compareDataSections <eboot1> <eboot2>",
    false,
    (yargs) =>
      yargs
        .positional("eboot1", {
          type: "string",
          normalize: true,
          demandOption: true,
        })
        .positional("eboot2", {
          type: "string",
          normalize: true,
          demandOption: true,
        })
        // .positional("symbols1", {
        //   type: "string",
        //   normalize: true,
        //   demandOption: true,
        // })
        // .positional("symbols2", {
        //   type: "string",
        //   normalize: true,
        //   demandOption: true,
        // })
        .option("output", {
          type: "string",
          normalize: true,
          demandOption: false,
        }),
    async (args) => {
      let eboot1 = parseElf(await readBinaryFile(args.eboot1), 0x8804000);
      let eboot2 = parseElf(await readBinaryFile(args.eboot2), 0x8804000);
      let relocs1 = buildRelocTable(eboot1);
      let relocs2 = buildRelocTable(eboot2);

      let dataSections1 = eboot1.sectionHeaders.filter(
        (a) => a.name.startsWith(".data") || a.name.startsWith(".rodata")
      );
      let dataSections2 = eboot2.sectionHeaders.filter(
        (a) => a.name.startsWith(".data") || a.name.startsWith(".rodata")
      );
      console.log(dataSections1.map((a) => a.name));
      console.log(dataSections2.map((a) => a.name));

      console.log(
        eboot1.sectionHeaders
          .filter((a) => a.name.startsWith(".bss"))
          .map((a) => ({ a, data: [] }))
      );
      console.log(
        eboot2.sectionHeaders
          .filter((a) => a.name.startsWith(".bss"))
          .map((a) => ({ a, data: [] }))
      );
      // await mkdir(args.output);

      for (let i = 0; i < dataSections1.length; i++) {
        console.log(dataSections1[i].name);
        console.log(dataSections1[i].size - dataSections2[i].size);
        console.log(dataSections1[i].size.toString(16));
        let base1 = 0x8804000 + dataSections1[i].addr;
        let base2 = 0x8804000 + dataSections2[i].addr;
        // await writeBinaryFile(
        //   joinPath(args.output, dataSections1[i].name + "_1.bin"),
        //   dataSections1[i].data
        // );
        // await writeBinaryFile(
        //   joinPath(args.output, dataSections1[i].name + "_2.bin"),
        //   dataSections2[i].data
        // );
        let offsets1: Record<number, number | number[]> = {
          0x8bb62bc: 4,
          0x8bce5e8: 12,
          0x8bcfe4c: [8, 20],

          0x8bdc7d8: [24, 88],
          0x8c55a44: 12,
          0x8ca1dd4: 4,
          0x8bd01a0: [-4, 0x8bfd09d0 - 0x8bcff4c],
        };
        let offsets2: Record<number, number> = {
          0x8bc733c: 4,
        };
        let offset1 = 0;
        let offset2 = 0;
        let out1: string[] = [];
        let out2: string[] = [];
        for (let j = 0; j < dataSections1[i].size; j += 4) {
          let v1 = relocs1[j + base1]
            ? 0
            : j >= dataSections1[i].data.byteLength
              ? -1
              : new DataView(
                dataSections1[i].data.buffer,
                dataSections1[i].data.byteOffset,
                dataSections1[i].data.byteLength
              ).getUint32(j);
          let v2 = relocs2[j + base2]
            ? 0
            : j >= dataSections2[i].data.byteLength
              ? -1
              : new DataView(
                dataSections2[i].data.buffer,
                dataSections2[i].data.byteOffset,
                dataSections2[i].data.byteLength
              ).getUint32(j);
          out1.push((v1 ?? -1).toString(16));
          out2.push((v2 ?? -1).toString(16));
        }
        loop: for (let j = 0; j < dataSections1[i].size; j += 4) {
          if (offsets1[j + base1]) {
            let ent = offsets1[j + base1];
            if (typeof ent !== "number") {
              j += ent[1];
              ent = ent[0];
            }
            offset1 += ent;
            base1 += ent;
            j -= 4;
            continue;
          }
          if (offsets2[j + base2]) {
            offset2 += offsets2[j + base2];
            base2 += offsets2[j + base2];
            j -= 4;
            continue;
          }
          if (relocs1[j + base1]) {
            if (relocs2[j + base2] === undefined) {
              console.log("Mismatch1 " + j);
              console.log(relocs1[j + base1], relocs2[j + base2]);
              console.log((base1 + j).toString(16));
              console.log((base2 + j).toString(16));
              break;
            }
            continue;
          } else if (relocs2[j + base2]) {
            console.log("Mismatch2 " + j);
            console.log(relocs1[j + base1], relocs2[j + base2]);
            console.log((base1 + j).toString(16));
            console.log((base2 + j).toString(16));
            break;
            continue;
          }
          for (let k = 0; k < 4; k++) {
            if (
              dataSections1[i].data[j + k + offset1] !=
              dataSections2[i].data[j + k + offset2]
            ) {
              console.log("Mismatch3 " + j);
              console.log((base1 + j).toString(16));
              console.log((base2 + j).toString(16));
              console.log(
                dataSections1[i].data[j + k + offset1],
                dataSections2[i].data[j + k + offset2]
              );
              console.log(offset1, offset2, j.toString(16));
              break loop;
            }
          }
        }
        await writeTextFile(
          joinPath(args.output!, dataSections1[i].name + "_1.txt"),
          [base1.toString(16)].concat(out1).join("\n")
        );
        await writeTextFile(
          joinPath(args.output!, dataSections2[i].name + "_2.txt"),
          [base2.toString(16)].concat(out2).join("\n")
        );
      }
    }
  )
  .command(
    "updateISSym <sym>",
    false,
    (yargs) =>
      yargs
        .positional("sym", {
          type: "string",
          normalize: true,
          demandOption: true,
        })
        .option("output", {
          type: "string",
          normalize: true,
          demandOption: true,
        }),
    async (args) => {
      let offsets_eu: Record<number, number> = {
        [0x8809740 + 0x9c]: 0x124 - 0x9c,
        [0x884de20 + 0x83c]: 0x884 - 0x83c,
        [0x884efe4 + 0x295c]: 0x2a6c - 0x295c,
        [0x895be78 + 0x4b8]: 0x510 - 0x4b8,

        0x8bb62bc: 4,
        0x8bce5e8: 12,
        0x8bcfe4c: 8,

        0x8bdc7d8: 24,
        0x8c55a44: 12,
        0x8ca1dd4: 4,
        0x8bd01a0: -4,
        0x8bd3660: 8,
      };
      let offsets_us: Record<number, number> = {
        0x8bc733c: 4,
        // 0x8bd01a0: 4
      };
      let syms = (await readTextFile(args.sym))
        .split("\n")
        .filter((a) => a.length)
        .map((a) => {
          let [addr, info] = a.split(" ");
          let [name, size] = info.split(",");
          return {
            addr: parseInt(addr, 16),
            name,
            size: parseInt(size, 16),
          };
        });
      let newSyms: typeof syms = [];
      let addr = 0x8804000;
      let addr_us = 0x8804000;
      syms.sort((a, b) => a.addr - b.addr);
      for (const sym of syms) {
        while (addr_us < sym.addr) {
          addr++;
          addr_us++;
          if (offsets_eu[addr]) {
            let change = offsets_eu[addr];
            delete offsets_eu[addr];
            addr += change;
          }
          if (offsets_us[addr_us]) {
            let change = offsets_us[addr_us];
            delete offsets_us[addr_us];
            addr_us += change;
          }
        }
        newSyms.push({
          ...sym,
          addr,
        });
      }
      await writeTextFile(
        args.output,
        newSyms
          .map(
            (a) =>
              `${a.addr.toString(16).padStart(8, "0").toLocaleUpperCase()} ${a.name
              },${a.size.toString(16).padStart(4, "0").toLocaleUpperCase()}`
          )
          .join("\n")
      );
    }
  )
  .command(
    "readUtf8 <eboot>",
    false,
    (yargs) =>
      yargs
        .positional("eboot", {
          type: "string",
          normalize: true,
          demandOption: true,
        })
        .option("offset", {
          type: "number",
          demandOption: true,
        }),
    async (args) => {
      let data = await readBinaryFile(args.eboot);
      let ptr = args.offset - 0x8804000 + 0xc0;
      let str = [];
      while (data[ptr]) {
        str.push(data[ptr++]);
      }
      let buff = Buffer.from(str);
      console.log(buff.toString("utf8"));
    }
  )
  .command(
    "extractStringTableIS <eboot>",
    false,
    (yargs) =>
      yargs.positional("eboot", {
        type: "string",
        normalize: true,
        demandOption: true,
      }),
    async (args) => {
      let data = (await readBinaryFile(args.eboot)).slice(0xc0);
      // console.log(data);
      // let ptr = args.offset - 0x8804000 + 0xc0;
      let ctx = createContext(Game.IS, await loadLocale(`game/is/encoding/en`));
      let msgCtx: MessageScriptContext = {
        ...ctx,
        terminator: 0xffff,
        encoding: EncodingScheme.font,
        swapEndian: true,
        file: "eboot",
        base: 0,
      };

      // let desc: any = data.find((a) => a.addr == "8d2fad4");
      // let name: any = data.find((a) => a.addr == "8d30610");
      // let len = name.len;

      let msgFile: MessageFile = {
        comments: [""],
        messages: {},
        order: [],
      };
      let tables = [
        {
          title: "persona",
          name: [0x08c1a5f8, 0x96],
          desc: [0x08c1a3a0, 0x96],
        },
        { title: "demons", name: [0x08c1aa94, 0xa0], desc: [0x08c1a850, 0x91] },
      ];
      let dv = toDataView(data);
      for (const table of tables) {
        let prefix = table.title;
        let count = table.name[1];
        let namePtr = table.name[0] - 0x8804000;
        let descPtr = table.desc[0] - 0x8804000;
        let dataOff = 0x3d1c80 - 0xc0;
        // let dataOff = -0x8804000 ;
        for (let i = 0; i < count; i++) {
          msgFile.comments.push("");
          let msgNameStr = `${prefix}_${i}_name`;
          let nameOff = dv.getUint32(namePtr, true) + dataOff;
          namePtr += 4;
          msgCtx.base = nameOff;
          let msgName = parseMessageBinary(
            toDataView(data.slice(nameOff)),
            msgCtx
          );
          msgFile.order.push(msgNameStr);
          msgFile.messages[msgNameStr] = msgName;
          if (table.desc[1] > i) {
            let msgDescStr = `${prefix}_${i}_desc`;
            let descOff = dv.getUint32(descPtr, true) + dataOff;
            descPtr += 4;
            msgCtx.base = descOff;
            let msgDesc = parseMessageBinary(
              toDataView(data.slice(descOff)),
              msgCtx
            );
            msgFile.order.push(msgDescStr);
            msgFile.messages[msgDescStr] = msgDesc;
          }
        }
        await writeTextFile(
          `tmp/is_tables/${prefix}.msg`,
          writeMessageFile(msgFile, msgCtx)
        );
      }
    }
  )
  .command(
    "extractStringTable <eboot>",
    false,
    (yargs) =>
      yargs.positional("eboot", {
        type: "string",
        normalize: true,
        demandOption: true,
      }).option("addr", {
        type: "number",
        demandOption: true,
        alias: "a"
      }).option("count", {
        type: "number",
        alias: "c",
        demandOption: true
      }).option("output", {
        type: "string",
        normalize: true,
        demandOption: true,
        alias: "o"

      }),
    async (args) => {
      let data = (await readBinaryFile(args.eboot)).slice(0xc0);
      // console.log(data);
      // let ptr = args.offset - 0x8804000 + 0xc0;
      let ctx = createContext(Game.EP, await loadLocale(`game/ep/encoding/jp`));
      let msgCtx: MessageScriptContext = {
        ...ctx,
        terminator: 0xffff,
        encoding: EncodingScheme.font,
        swapEndian: true,
        file: "eboot",
        base: 0,
      };

      // let desc: any = data.find((a) => a.addr == "8d2fad4");
      // let name: any = data.find((a) => a.addr == "8d30610");
      // let len = name.len;
      let outputPath = args.output;
      let name = basename(outputPath, ".msg");

      let msgFile: MessageFile = {
        comments: [""],
        messages: {},
        order: [],
      };
      let old: any = JSON.parse(await readTextFile("tmp/old_tables.json"));

      let dv = toDataView(data);
      let count = args.count;
      let ptr = args.addr - 0x8804000;
      // let namePtr = table.name[0] - 0x8804000;
      // let descPtr = table.desc[0] - 0x8804000;
      let dataOff = 0x472800;
      // let dataOff = -0x8804000 ;
      for (let i = 0; i < count; i++) {
        msgFile.comments.push("");
        let msgNameStr = `${name}_${i}`;
        console.log(msgNameStr)
        let nameOff = dv.getUint32(ptr, true) + dataOff;
        ptr += 4;
        if (dv.getUint32(ptr - 4, true) == 0) continue;
        msgCtx.base = nameOff;
        let addr = (nameOff + 0x8804000).toString(16);
        let msgName = parseMessageBinary(
          toDataView(data.slice(nameOff)),
          msgCtx
        );
        for (const ent of old) {
          for (const entaddr of ent.addr) {
            if (addr == entaddr) {
              msgName = parseMessage(ent.str_en, msgCtx);
              break;
            }
          }
        }
        msgFile.order.push(msgNameStr);
        msgFile.messages[msgNameStr] = msgName;
      }
      await writeTextFile(
        outputPath,
        writeMessageFile(msgFile, msgCtx)
      );
      await writeTextFile(
        outputPath.replace(".msg", ".json"),
        JSON.stringify({
          name,
          length: count,
          tables: [{
            type: "pointer",
            addr: args.addr.toString(16),
            format: "font"
          }]

        })
      );
    }

  )
  .command(
    "extractElevators <eboot>",
    false,
    (yargs) =>
      yargs.positional("eboot", {
        type: "string",
        normalize: true,
        demandOption: true,
      }).option("output", {
        type: "string",
        normalize: true,
        demandOption: true,
        alias: "o"

      }),
    async (args) => {
      let data = (await readBinaryFile(args.eboot)).slice(0xc0);
      // console.log(data);
      // let ptr = args.offset - 0x8804000 + 0xc0;
      let ctx = createContext(Game.EP, await loadLocale(`game/ep/encoding/jp`));
      let msgCtx: MessageScriptContext = {
        ...ctx,
        terminator: 0xffff,
        encoding: EncodingScheme.font,
        swapEndian: true,
        file: "eboot",
        base: 0,
      };

      // let desc: any = data.find((a) => a.addr == "8d2fad4");
      // let name: any = data.find((a) => a.addr == "8d30610");
      // let len = name.len;
      let outputPath = args.output;
      let name = basename(outputPath, ".msg");

      let msgFile: MessageFile = {
        comments: [""],
        messages: {},
        order: [],
      };
      let old: any = JSON.parse(await readTextFile("tmp/old_tables.json"));

      let dv = toDataView(data);
      let count = (0x8d1516c - 0x8d14d2c) / 4 / 8;
      let ptr = 0x8d14d2c - 0x8804000;
      let dataOff = 0x472800;
      let elevators: string[][] = [];
      console.log(count);
      for (let i = 0; i < count; i++) {
        let num = dv.getUint32(ptr, true);
        let elev: string[] = [];
        for (let j = 0; j < num; j++) {
          msgFile.comments.push("");
          // let msgNameStr = `${name}_${i}_${j}`;
          let nameOff = dv.getUint32(ptr + 4 + j * 4, true) + dataOff;
          // if (dv.getUint32(ptr - 4, true) == 0) continue;
          msgCtx.base = nameOff;
          let addr = (nameOff + 0x8804000).toString(16);
          let msgName = parseMessageBinary(
            toDataView(data.slice(nameOff)),
            msgCtx
          );
          for (const ent of old) {
            for (const entaddr of ent.addr) {
              if (addr == entaddr) {
                msgName = parseMessage(ent.str_en, msgCtx);
                break;
              }
            }
          }
          elev.push(messageToString(msgName, msgCtx));
          // msgFile.order.push(msgNameStr);
          // msgFile.messages[msgNameStr] = msgName;
        }
        ptr += 4 * 8;
        elevators.push(elev)
      }
      await writeTextFile(outputPath, JSON.stringify(elevators, null, 2))
      // await writeTextFile(
      //   outputPath,
      //   writeMessageFile(msgFile, msgCtx)
      // );
    }

  )
  .command(
    "raw_table_from_desc <eboot> <input>",
    false,
    (yargs) =>
      yargs
        .positional("eboot", {
          type: "string",
          normalize: true,
          demandOption: true,
        })
        .positional("input", {
          type: "string",
          normalize: true,
          demandOption: true,
        })
        .option("output", {
          type: "string",
          normalize: true,
        }),
    async (args) => {
      let eboot = await readBinaryFile(args.eboot);
      let input = JSON.parse(await readTextFile(args.input));
      let output = [];
      // for(let i = 0; i < )
    }
  )
  .demandCommand()
  .showHelpOnFail(true)
  .help().argv;
