#!/usr/bin/env node
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import {
  closeFile,
  joinPath,
  mkdir,
  openFileRead,
  openFileWrite,
  readBinaryFile,
  readDir,
  readTextFile,
  writeBinaryFile,
} from "../lib/util/filesystem";
import * as bnp from "../lib/archive/bnp";
import * as ear from "../lib/archive/ear";
import * as par from "../lib/archive/par";
import * as txar from "../lib/archive/txar";
import { File, TOCEntry } from "../lib/archive/common";
import { gunzip } from "zlib";
import * as zlib from "zlib";
import { parseBNPFile } from "../lib/archive/bnp/file_types";
import { promisify } from "util";
import * as asynclib from "../lib/util/async";
import { alias, option, options } from "yargs";
import { cstr, fixedString, toStructBuffer } from "../lib/util/structlib";
const handlers: Record<
  string,
  {
    split: (buff: Uint8Array) => File[];
    build: (
      files: Uint8Array[],
      group: number
    ) => { data: Uint8Array; toc: TOCEntry[] };
  }
> = {
  ear,
  par,
  bnp,
  txar,
};

const argv = yargs(hideBin(process.argv))
  .command(
    "unpack <archive>",
    "Unpack contents of archive",
    (yargs) =>
      yargs
        .positional("archive", {
          type: "string",
          demandOption: true,
          normalize: true,
        })
        // .option("ear", {
        //   alias: "e",
        //   type: "boolean",
        // })
        // .option("par", {
        //   alias: "p",
        //   type: "boolean",
        // })
        // .option("bnp", {
        //   alias: "b",
        //   type: "boolean",
        // })
        .option("format", {
          alias: "f",
          type: "string",
          choices: ["ear", "par", "bnp", "txar"],
          demandOption: true,
        })
        .option("output", {
          alias: "o",
          type: "string",
          demandOption: true,
          normalize: true,
        })
        .option("decompress", {
          alias: "d",
          type: "boolean",
        }),
    async (args) => {
      const archive = await readBinaryFile(args.archive);
      const handler = handlers[args.format];
      const files = handler.split(archive);
      console.log(files);
      let i = 0;
      await mkdir(args.output);

      for (const file of files) {
        let data = file.data;
        let name = (i++).toString();
        if (args.decompress) {
          switch (args.format) {
            case "ear":
              console.log(data);
              data = new Uint8Array(await promisify(gunzip)(data));
              break;
            case "bnp":
              {
                let tmp = await parseBNPFile(file.data);
                data = tmp.data;
                name = `${name}_${tmp.tag}`;
              }
              break;
          }
        }
        console.log(name);
        await writeBinaryFile(joinPath(args.output, name), data);
      }
    }
  )
  .command(
    "pack <directory>",
    "Pack contents of directory into archive.",
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
        })
        .option("base", {
          type: "number",
          describe:
            "interpret filenames as number in base, overrides alphabetical sorting",
        })
        .option("order", {
          type: "string",
          normalize: true,
          describe:
            "List of files in order they should appear in the archive. If unspecified, directory is sorted case-insensitively",
        })
        .option("format", {
          alias: "f",
          type: "string",
          choices: ["ear", "par", "bnp"],
          demandOption: true,
        })
        .option("compress", {
          alias: "c",
          type: "boolean",
        })
        .option("group", {
          alias: "g",
          type: "number",
          desc: "For BNP, controls how often extra padding is added between files",
        }),
    async (args) => {
      const handler = handlers[args.format];

      let files: Uint8Array[];
      let order: string[] = [];
      if (args.order) {
        order = (await readTextFile(args.order)).split("\n");
      } else {
        let names = await readDir(args.directory);
        names.sort((a, b) => {
          if (args.base) return parseInt(a, args.base) - parseInt(b, args.base);
          if (a.toLocaleLowerCase() < b.toLocaleLowerCase()) return -1;
          if (a.toLocaleLowerCase() == b.toLocaleLowerCase()) return 0;
          return 1;
        });
        order = names;
      }
      files = await asynclib.map(order, async (file) => {
        return await readBinaryFile(joinPath(args.directory, file));
      });

      if (args.compress) {
        switch (args.format) {
          case "ear":
            files = await asynclib.map(files, async (data, i) => {
              let name = order[i];
              let zipped = await promisify(zlib.gzip)(data);
              let newLen = zipped.byteLength + 2 + name.length;
              let buff = new Uint8Array(newLen);
              buff.set(zipped.subarray(0, 9));
              buff[9] = 0xb;
              for (let i = 0; i < name.length; i++)
                buff[i + 10] = name.charCodeAt(i);
              buff.set(zipped.subarray(9), 9 + name.length + 2);
              return buff;
            });
            break;
        }
      }
      await writeBinaryFile(
        args.output,
        handler.build(files, args.group ?? 0).data
      );
      //   }
    }
  )
  .command(
    "names <archive>",
    "dump name of files in archive",
    (yargs) =>
      yargs
        .positional("archive", {
          type: "string",
          demandOption: true,
          normalize: true,
        })
        // .option("ear", {
        //   alias: "e",
        //   type: "boolean",
        // })
        // .option("par", {
        //   alias: "p",
        //   type: "boolean",
        // })
        // .option("bnp", {
        //   alias: "b",
        //   type: "boolean",
        // })
        .option("format", {
          alias: "f",
          type: "string",
          choices: ["ear", "par", "bnp"],
          demandOption: true,
        })
        .option("decompress", {
          alias: "d",
          type: "boolean",
        }),
    async (args) => {
      const archive = await readBinaryFile(args.archive);
      const handler = handlers[args.format];
      const files = handler.split(archive);
      console.log(files);
      let i = 0;

      // let names
      for (const file of files) {
        let data = file.data;
        let name = (i++).toString();
        if (args.decompress) {
          switch (args.format) {
            case "ear":
              // console.log(data);
              name = cstr.read(toStructBuffer(data, 10));
              data = new Uint8Array(await promisify(gunzip)(data));
              break;
            case "bnp":
              {
                let tmp = await parseBNPFile(file.data);
                data = tmp.data;
                name = `${name}_${tmp.tag.toString(16).padStart(4, "0")}`;
              }
              break;
          }
        }
        console.log(name);
        // await writeBinaryFile(joinPath(args.output, name), data);
      }
    }
  )
  // .command(
  //   "pack <directory>",
  //   "Pack directory into archive",
  //   (yargs) =>
  //     yargs
  //       .positional("directory", {
  //         type: "string",
  //         demandOption: true,
  //         normalize: true,
  //       })
  //       .option("output", {
  //         alias: "o",
  //         type: "string",
  //         demandOption: true,
  //         normalize: true,
  //       }),
  //   // .option("index-file", {
  //   //   type: "string",
  //   //   normalize: true,
  //   //   alias: "i",
  //   // })
  //   async (args) => {
  //     //   let cpk = await createCPK(args.output);
  //     //   const folder = await readDir(args.directory);
  //     //   for (let file of folder) {
  //     //     let [name, id, ext] = file.split(/[\[\]]/);
  //     //     addFileToCPK(
  //     //       cpk,
  //     //       joinPath(args.directory, file),
  //     //       `${name}${ext}`,
  //     //       parseInt(id)
  //     //     );
  //     //   }
  //     //   console.time(`CPK Build`);
  //     //   await buildCPK(cpk);
  //     //   console.timeEnd(`CPK Build`);
  //   }

  .demandCommand()
  .help()
  .showHelpOnFail(false)
  .strict().argv;
