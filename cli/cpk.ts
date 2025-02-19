#!/usr/bin/env node
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import {
  closeFile,
  joinPath,
  mkdir,
  openFileRead,
  readDir,
} from "../lib/util/filesystem";
import {
  addFileToCPK,
  buildCPK,
  createCPK,
  extractFile,
  readCPKTOC,
} from "../lib/cpk/cpk";

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
        }),
    async (args) => {
      const cpk = await openFileRead(args.cpk);
      const toc = await readCPKTOC(cpk);
      await mkdir(args.output);
      console.time(`CPK unpacked`);
      for (let entry of toc) {
        let [name, ext] = entry.FileName.split(".");
        let fname = joinPath(args.output, `${name}[${entry.ID}].${ext}`);
        console.log(`Extracting ${entry.FileName} to ${fname}`);
        await extractFile(cpk, fname, entry);
      }
      console.timeEnd(`CPK unpacked`);
      await closeFile(cpk);
    }
  )
  .command(
    "info <cpk>",
    "Info about cpk",
    (yargs) =>
      yargs.positional("cpk", {
        type: "string",
        demandOption: true,
        normalize: true,
      }),
    async (args) => {
      const cpk = await openFileRead(args.cpk);
      const toc = await readCPKTOC(cpk);
      for (const entry of toc) {
        console.log(`${entry.FileName} ID: ${entry.ID}`);
      }
      await closeFile(cpk);
    }
  )
  .command(
    "pack <directory>",
    "Pack directory into cpk",
    (yargs) =>
      yargs
        .positional("directory", {
          type: "string",
          demandOption: true,
          normalize: true,
        })
        .option("output", {
          alias: "o",
          type: "string",
          demandOption: true,
          normalize: true,
        }),
    // .option("index-file", {
    //   type: "string",
    //   normalize: true,
    //   alias: "i",
    // })
    async (args) => {
      let cpk = await createCPK(args.output);
      const folder = await readDir(args.directory);
      for (let file of folder) {
        let [name, id, ext] = file.split(/[\[\]]/);
        addFileToCPK(
          cpk,
          joinPath(args.directory, file),
          `${name}${ext}`,
          parseInt(id)
        );
      }
      console.time(`CPK Build`);
      await buildCPK(cpk);
      console.timeEnd(`CPK Build`);
    }
  )
  .demandCommand()
  .help()
  .showHelpOnFail(false)
  .strict().argv;
