import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import * as vm2 from "vm2";
import {
  MIPS,
  RelocInfo,
  RelocList,
  exportedFuncs,
  freg,
  ireg,
} from "../lib/mips/mips";
import {
  dirname,
  joinPath,
  readBinaryFile,
  readBinaryFileSync,
  readTextFile,
  readTextFileSync,
  writeBinaryFile,
} from "../lib/util/filesystem";
import { parseElf } from "../lib/elf/types";
import { buildRelocTable } from "../lib/mips/reloc";
import { PSP_BASE, patchFileLoading } from "../lib/elf/atlus_eboot";
import { align } from "../lib/util/misc";
import { insertSection } from "../lib/elf/insert_mem_section";

const args = yargs(hideBin(process.argv))
  .usage(`Tool for doing asm mods`)
  .command(
    "$0 <eboot> [files]",
    false,
    (yargs) =>
      yargs
        .positional("eboot", {
          type: "string",
          describe: "eboot",
          demandOption: true,
          normalize: true,
        })
        .option("output", {
          type: "string",
          describe: "output",
          alias: "o",
          demandOption: true,
          normalize: true,
        })
        .option("files", {
          type: "string",
          describe: "eboot",
          normalize: true,
        })
        .array("files"),
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
      let modData = new Uint8Array(2 * 1024 * 1024);
      console.log(
        `Mod data at ${(startAddress + elf.baseAddress).toString(16)}`
      );
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
        mips,
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
      for (const file of args.files ?? []) {
        let dir = dirname(file);

        let vm = new vm2.VM({
          sandbox: {
            ...sandbox,

            readBinaryFile: (path: string) =>
              readBinaryFileSync(joinPath(dirname(file), path)),
            readTextFile: (path: string) =>
              readTextFileSync(joinPath(dirname(file), path)),
          },
        });
        try {
          vm.runFile(file);
        } catch (e) {
          console.log(`ERROR!!`);
          console.log(e);
        }
      }
      mips.section("mod");

      if (Object.keys(mips.delayedWrites)) {
        console.warn(
          `Unresolved symbols ${Object.keys(mips.delayedWrites).join(",")}`
        );
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

      await writeBinaryFile(args.output, newElf.buff);
    }
  )
  .demandCommand()
  .showHelpOnFail(true)
  .help().argv;
