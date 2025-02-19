import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import fs from "fs/promises";
import { decrypt_eboot } from "../lib/decrypt/eboot";
import {
  readBinaryFile,
  readTextFile,
  writeBinaryFile,
  writeTextFile,
} from "../lib/util/filesystem";
import { PSP_BASE, patchFileLoading } from "../lib/elf/atlus_eboot";
import { parseElf } from "../lib/elf/types";
import { buildRelocTable, parseRelocs } from "../lib/mips/reloc";
import { RelocList } from "../lib/mips/mips";
import { MIPS } from "../lib/mips/mips";
import { insertSection } from "../lib/elf/insert_mem_section";
import { align } from "../lib/util/misc";

const cmds = yargs(hideBin(process.argv))
  .usage(`Tools for interacting with eboot`)
  .command(
    ["decrypt <eboot>"],
    "Attempt to decrypt eboot and save file to output",
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
      const input = await fs.readFile(args.eboot);
      const parsed = await decrypt_eboot(input);
      await fs.writeFile(args.output, parsed);
    }
  )
  .command(
    "patch <in>",
    "Patch eboot to allow files to be loaded freely",
    (yargs) =>
      yargs
        .positional("in", {
          demandOption: true,
          normalize: true,
          type: "string",
        })
        .option("output", {
          type: "string",
          normalize: true,
          alias: "o",
          describe: "If unspecified, default to in",
        }),
    async (args) => {
      const input = await readBinaryFile(args.in);
      patchFileLoading(input);
      await writeBinaryFile(args.output ?? args.in, input);
    }
  )
  .command(
    "info <in>",
    "Log information about eboot",
    (yargs) =>
      yargs.positional("in", {
        demandOption: true,
        normalize: true,
        type: "string",
      }),
    async (args) => {
      const input = await readBinaryFile(args.in);
      let elf = parseElf(input, PSP_BASE);
      console.log(elf);
      // let sections = elf.sectionHeaders.slice(0);
      // sections.sort((a, b) => {
      //   return a.offset - b.offset;
      // });
      // insertSection(elf, new Uint8Array());
      // console.log(sections.map((a) => a.name));
      delete (elf as any).buff;
      elf.sectionHeaders.forEach((s) => delete (s as any).data);
      await writeTextFile("out.json", JSON.stringify(elf, null, 2));
    }
  )
  .command(
    "mod <eboot>",
    "",
    (yargs) =>
      yargs
        .positional("eboot", {
          demandOption: true,
          normalize: true,
          type: "string",
        })
        .option("output", {
          type: "string",
          normalize: true,
          demandOption: true,
          alias: "o",
          describe: "If unspecified, default to eboot",
        }),
    async (args) => {
      const input = await readBinaryFile(args.eboot);
      const elf = parseElf(input, PSP_BASE);
      const relocTable = buildRelocTable(elf);
      const relocInfo: RelocList = {};
      const relocInfo_in = JSON.parse(
        await readTextFile("game/ep/eboot_references.json")
      );
      for (const ent of Object.keys(relocInfo_in)) {
        const num = parseInt(ent, 16);
        // console.log(relocInfo_in[ent])
        relocInfo[num] = relocInfo_in[ent].map((n: string) => parseInt(n, 16));
      }
      patchFileLoading(input);
      const mips = new MIPS({
        info: relocInfo,
        table: relocTable,
        relocBuff: input,
      });
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
      mips.addSection(
        "mod",
        new Uint8Array(2 * 1024 * 1024),
        false,
        startAddress,
        startAddress + 2 * 1024 * 1024
      );

      const section = new Uint8Array(1024);
      for (let i = 0; i < 1024; i++) section[i] = i & 0xff;

      let offset = 0xc0;
      let sections = elf.sectionHeaders.slice(0);
      sections.sort((a, b) => {
        return a.offset - b.offset;
      });
      for (let i = 0; i < sections.length; i++) {
        if (sections[i].size == 0) continue;
        offset = align(sections[i].addralign as 1 | 2 | 4, offset);
        if (offset != sections[i].offset) {
          console.log(sections[i].name);
          break;
        }
        offset += sections[i].size;
      }
      let newElf = insertSection(elf, section, ".mod", align(16, startAddress));

      await writeBinaryFile(args.output, newElf.buff);
    }
  )
  .command(
    "relocs <in>",
    "Attempt to construct list of relocations needed for each address",
    (yargs) =>
      yargs
        .positional("in", {
          demandOption: true,
          normalize: true,
          type: "string",
        })
        .option("output", {
          type: "string",
          normalize: true,
          demandOption: true,
          alias: "o",
        }),
    async (args) => {
      const elf = parseElf(await readBinaryFile(args.in), 0x8804000);
      
      // patchFileLoading(input);
      // await writeBinaryFile(args.output ?? args.in, input);
    }
  )
  // .command(
  //   "extract_table <in>",
  //   "",
  //   (yargs) =>
  //     yargs
  //       .positional("in", {
  //         demandOption: true,
  //         normalize: true,
  //         type: "string",
  //       })
  //       .option("address", { type: "number", alias: "a", demandOption: true }),
  //   async (args) => {
  //     const input = await readBinaryFile(args.in);

  //   }
  // )
  .recommendCommands()
  .strict()
  .help().argv;

export default cmds;

// (async ()=>{

// }
