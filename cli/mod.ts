#!/usr/bin/env node
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
  basename,
  dirname,
  fromTools,
  joinPath,
  openFileWrite,
  readBinaryFile,
  readBinaryFileSync,
  readDir,
  readDirRecursive,
  readDirSync,
  readTextFile,
  readTextFileSync,
  withoutExtension,
  writeBinaryFile,
  writeTextFile,
} from "../lib/util/filesystem";
import { parseElf } from "../lib/elf/types";
import { buildRelocTable } from "../lib/mips/reloc";
import { PSP_BASE, patchFileLoading } from "../lib/elf/atlus_eboot";
import { align } from "../lib/util/misc";
import { insertSection } from "../lib/elf/insert_mem_section";
import { loadLocale } from "../lib/util/encoding";
import {
  Constants,
  Game,
  GameContext,
  loadScriptConstants,
} from "../lib/util/context";
import { MessageManager } from "../lib/mod/msg_manager";
import { importObj } from "../lib/mips/objimport";
import {
  ModFileEntry,
  augmentInfo,
  buildIsoDir,
  buildMod,
  extractAll,
  extractISO,
  parseModInfo,
  patchEboot,
} from "../lib/mod/modlib";
import { VFS } from "../lib/mod/vfs";
import { createIso } from "../lib/iso/iso";
import { CDXAApplicationData } from "../lib/iso/iso_types";
import { toDataView, toStructBuffer } from "../lib/util/structlib";

const args = yargs(hideBin(process.argv))
  .usage(`Tool for doing asm mods`)
  .command(
    "$0 <iso> <modpath>",
    false,
    (yargs) =>
      yargs
        .positional("iso", {
          type: "string",
          describe: "iso",
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
        .positional("modpath", {
          type: "string",
          default: ".",
          normalize: true,
        })
        .option("iso_output", {
          type: "string",
          describe: "Build ISO?",
          normalize: true,
        })
        .option("variant", {
          type: "string",
          describe: "for IS, choose eu or us",
        }),
    async (args) => {
      console.log(args);
      // const input = await readBinaryFile(args.eboot);
      let vfs = new VFS<ModFileEntry>();
      let modInfo = await parseModInfo(args.modpath, vfs);
      let gameContextIso: GameContext = {
        game: modInfo.game,
        locale: await loadLocale(
          fromTools(
            `game/${modInfo.game}/encoding/${modInfo.isoLocale ?? "jp"}`
          )
        ),
        variant: args.variant,
        constants: {},
      };
      let localePath = joinPath(args.modpath, modInfo.locale);
      if (modInfo.locale.length < 3) {
        localePath = fromTools(`game/${modInfo.game}/encoding/${modInfo.locale}`);
      }
      let gameContextMod: GameContext = {
        game: modInfo.game,
        locale: await loadLocale(localePath),
        variant: args.variant,
        constants: {},
      };
      await loadScriptConstants(gameContextIso);
      await loadScriptConstants(gameContextMod);

      let isoName = basename(args.iso);
      const buildPath = joinPath(args.output, "build", isoName + "$");
      const isoPath = joinPath(args.output, "iso", isoName + "$");

      let isoInfo = JSON.parse(
        await readTextFile(
          fromTools(
            `game/${modInfo.game}/iso${args.variant ? `_${args.variant}` : ""
            }.json`
          )
        )
      );
      augmentInfo(isoInfo);

      let clean_base = await extractISO(
        args.iso,
        joinPath(args.output, "clean", isoName + "$")
      );

      await buildMod(
        vfs.root,
        isoInfo,
        "/",
        clean_base,
        buildPath,
        gameContextIso,
        gameContextMod
      );
      await buildIsoDir(isoInfo, clean_base, buildPath, isoPath);
      await patchEboot(
        joinPath(buildPath, modInfo.ebootPath),
        args.modpath,
        buildPath,
        joinPath(isoPath, modInfo.ebootPath),
        gameContextMod,
        (modInfo.asmOrder ?? []) as string[],
        joinPath(isoPath, modInfo.symname)
      );
      if (args.iso_output) {
        let fd = await openFileWrite(args.iso_output);

        //TODO: don't hardcode this here
        let gameIDs = {
          [Game.EP]: "NPHJ-50581",
          [Game.IS]: "ULUS-10584",
        };

        const applicationData = new Uint8Array(512);
        CDXAApplicationData.write(toStructBuffer(toDataView(applicationData)), {
          id: `${(gameIDs[modInfo.game as Game] ?? "").padStart(
            10
          )}|0000000000000000|0001`,
          cdxa: "CD-XA001",
        });
        await createIso(fd, isoPath, {
          systemIdentifier: "PSP GAME",
          volumeIdentifier: "PERSONA2",
          publisherIdentifier: "ATLUS",
          applicationIdentifier: "PSP GAME",
          application: [...applicationData],
        });
        // await build
      }
    }
  )
  .command(
    "extractAll <iso>",
    false,
    (yargs) =>
      yargs
        .positional("iso", {
          type: "string",
          describe: "iso",
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
        .option("game", {
          type: "string",
          demandOption: true,
          alias: "g",
          choices: ["is", "ep"],
        })
        .option("locale", {
          type: "string",
          demandOption: false,
          default: "jp",
        }),
    async (args) => {
      // const input = await readBinaryFile(args.eboot);
      let game: Game = args.game as Game;
      let gameContextIso: GameContext = {
        game,
        locale: await loadLocale(
          fromTools(`game/${game}/encoding/${args.locale}`)
        ),
        constants: {},
      };
      await loadScriptConstants(gameContextIso);

      // let isoName = basename(args.iso);

      let isoInfo = JSON.parse(
        await readTextFile(fromTools(`game/${game}/iso.json`))
      );
      augmentInfo(isoInfo);

      // let clean_base = await extractISO(args.iso, joinPath(args.output));

      await extractAll(isoInfo, args.iso, args.output, gameContextIso);
    }
  )
  .demandCommand()
  .strict()
  .showHelpOnFail(true)
  .help().argv;
