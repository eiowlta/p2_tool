#!/usr/bin/env node
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import {
  closeFile,
  joinPath,
  mkdir,
  openFileRead,
  readDir,
  readTextFile,
  stat,
} from "../lib/util/filesystem";
import {
  addFileToCPK,
  buildCPK,
  createCPK,
  extractFile,
  readCPKTOC,
} from "../lib/cpk/cpk";
import { extract } from "../lib/game_cpk/extract";
import { FileInfo } from "../lib/game_cpk/types";

import * as fs from "fs";
const argv = yargs(hideBin(process.argv))
  .command(
    "unpack <cpk>",
    "Unpack contents of cpk",
    (yargs) =>
      yargs
        .positional("cpk", {
          type: "string",
          demandOption: true,
          normalize: true,
        })
        .option("output", {
          alias: "o",
          type: "string",
          demandOption: true,
          normalize: true,
        })
        .option("game", {
          alias: "g",
          type: "string",
          default: "ep",
        }),
    async (args) => {
      const cpk = await openFileRead(args.cpk);
      const info = JSON.parse(
        await readTextFile(`game/${args.game}/cpk_template.json`)
      ) as FileInfo;

      //   await mkdir(args.output);
      console.time(`Extracting CPK`);
      let res = await extract(args.output, info, cpk);
      console.timeEnd(`Extracting CPK`);
      //   const toc = await readCPKTOC(cpk);
      fs.writeFileSync(
        `game/${args.game}/cpk.json`,
        JSON.stringify(res, null, 2)
      );

      await closeFile(cpk);
    }
  )
  .demandCommand()
  .help()
  .showHelpOnFail(false)
  .strict().argv;
