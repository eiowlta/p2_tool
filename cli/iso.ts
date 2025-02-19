#!/usr/bin/env node
import yargs, { boolean } from "yargs";
import { hideBin } from "yargs/helpers";
import * as structlib from "../lib/util/structlib";
import {
  CDXAApplicationData,
  DirEnt,
  DirEntExtType,
  DirFile,
  PVD,
  TOCEntry,
  TOCFolder,
} from "../lib/iso/iso_types";
// import * as fs from "fs/promises";
import {
  closeFile,
  extname,
  joinPath,
  openFileRead,
  openFileWrite,
} from "../lib/util/filesystem";
import { toDataView, toStructBuffer } from "../lib/util/structlib";
import { createIso, extractFile, readPVD, readTOC } from "../lib/iso/iso";
import { sizeToHuman } from "../lib/util/misc";
import { basename } from "path";

const argv = yargs(hideBin(process.argv))
  .usage(`Tool for working with PSP style ISO-9660 ISO files.`)
  .version(`1.0.0.0`)
  .command(
    "print-toc <iso>",
    "Print contents of ISO files",
    (yargs) =>
      yargs
        .positional("iso", {
          type: "string",
          demandOption: true,
          normalize: true,
        })
        .option("format", {
          choices: ["tree", "json", "modjson", "modjson2"],
          default: "tree",
          type: "string",
          alias: "f",
        })
        .option("show-size", {
          type: "boolean",
          default: true,
          alias: "s",
        })
        .option("human", {
          type: "boolean",
          alias: "h",
          default: true,
        }),
    async (args) => {
      const iso = await openFileRead(args.iso);
      const toc = await readTOC(iso);
      const formatNumber = args.human ? sizeToHuman : (n: number) => n;

      switch (args.format) {
        case "json":
          {
            const recurse = (t: TOCEntry): any => {
              if (t.type == "file") {
                if (args.showSize)
                  return {
                    name: t.name,
                    size: formatNumber(t.length),
                  };
                return t.name;
              } else {
                if (args.showSize)
                  return {
                    name: t.name,
                    size: formatNumber(t.length),
                    contents: Object.values(t.children).map(recurse),
                  };
                return {
                  name: t.name,
                  contents: Object.values(t.children).map(recurse),
                };
              }
            };

            const obj = recurse(toc);
            console.log(JSON.stringify(obj, null, 2));
          }
          break;
        case "modjson":
          {
            const recurse = (t: TOCEntry): any => {
              if (t.type == "file") {
                return {
                  path: t.name,
                  type: extname(t.name).toLowerCase().slice(1) ?? "unk",
                };
              } else {
                return {
                  name: t.name,
                  type: "folder",
                  fileList: Object.values(t.children).map(recurse),
                };
              }
            };

            const obj = recurse(toc);
            console.log(JSON.stringify(obj, null, 2));
          }

          break;
        case "modjson2":
          {
            const recurse = (t: TOCEntry): any => {
              if (t.type == "file") {
                return {
                  path: t.name,
                  type: extname(t.name).toLowerCase().slice(1) ?? "unk",
                };
              } else {
                // console.log(t);
                if (t.name === "\0") t.name = "";
                return Object.values(t.children)
                  .map(recurse)
                  .flat()
                  .map((v) => {
                    return {
                      ...v,
                      path: joinPath(t.name, v.path),
                    };
                  });
              }
            };

            const obj = recurse(toc);
            console.log(JSON.stringify(obj, null, 2));
          }

          break;
        case "tree":
          {
            const recurse = (prefix: string, t: TOCFolder) => {
              // console.log(`${prefix}┠─${t.name}`);
              Object.values(t.children).forEach((c, i, arr) => {
                console.log(
                  `${prefix}${i == arr.length - 1 ? "┖─" : "┠─"}${c.name}${
                    args.showSize ? " " + formatNumber(c.length) : ""
                  }`
                );
                if (c.type == "folder") {
                  recurse(`${prefix}${i == arr.length - 1 ? "  " : "┃  "}`, c);
                }
              });
            };
            recurse("", toc as TOCFolder);
          }
          break;
        default:
          throw `Unrecognized format ${args.format}`;
      }
    }
  )
  .command(
    "extract <iso>",
    "Extract contents of iso to directory",
    (yargs) =>
      yargs
        .positional("iso", {
          type: "string",
          describe: "ISO to extract",
          demandOption: true,
          normalize: true,
        })
        .option("output", {
          type: "string",
          describe: "directory to place extracted files, defaults to iso name",
          normalize: true,
          alias: "o",
          // demandOption: true,
        }),
    async (args) => {
      const iso = await openFileRead(args.iso);
      const toc = await readTOC(iso);
      await extractFile(
        iso,
        toc,
        args.output ?? joinPath(process.cwd(), basename(args.iso, ".iso"))
      );
      await closeFile(iso);
    }
  )
  .command(
    "make <dir>",
    "Convert dir into an iso",
    (yargs) =>
      yargs
        .positional("dir", {
          type: "string",
          describe: "Directory to make into ISO",
          demandOption: true,
          normalize: true,
        })
        .option("output", {
          type: "string",
          describe: "name of output ISO file, defaults to <dir>.iso",
          normalize: true,
          alias: "o",
          // demandOption: true,
        })
        .option("system", {
          type: "string",
          default: "PSP GAME",
        })
        .option("volume", {
          type: "string",
          default: "PERSONA2",
        })
        .option("publisher", {
          type: "string",
          default: "ATLUS",
        })
        .option("application", {
          type: "string",
          default: "PSP GAME",
        })
        .option("gameID", {
          type: "string",
        }),

    async (args) => {
      const iso = await openFileWrite(
        args.output ?? `${basename(args.dir)}.iso`
      );
      const applicationData = new Uint8Array(512);
      CDXAApplicationData.write(
        toStructBuffer(toDataView(applicationData)),
        // { id: "NPJH-50581|0000000000000000|0001", cdxa: "CD-XA001" }
        {
          id: `${(args.gameID ?? "NPJH-50581").padStart(10)}|0000000000000000|0001`,
          cdxa: "CD-XA001",
        }
      );
      await createIso(iso, args.dir, {
        systemIdentifier: args.system,
        volumeIdentifier: args.volume,
        publisherIdentifier: args.publisher,
        applicationIdentifier: args.application,
        application: [...applicationData],
      });
    }
  )
  .demandCommand()
  .help()
  .strict().argv;
// console.log(argv);

// const file = fs.openSync(argv.iso, "r");
// const readData = async (start: number, len: number) => {
//   let buff = new Uint8Array(len);
//   return await fs.readSync(file, buff, 0, len, start * 2048);
// };

// // let dv = new DataView(sector.buffer, sector.byteOffset, sector.byteLength);
// // let pvd = PVD.read(toStructBuffer(toDataView(readData(16, 2048))));
// // console.log(JSON.stringify(pvd));
// // let root = DirFile.read(toStructBuffer(toDataView(readData(pvd.root.lba, pvd.root.length))));
// // console.log(root);

// // const isDirEntExt = (v: any): v is DirEntExtType => {
// //   return v.exaData !== undefined;
// // };

// (async () => {
//   const iso = await openFileRead(argv.iso);
//   const toc = await readTOC(iso);
//   // console.log(JSON.stringify(toc, null, 2));
//   const start = new Date();
//   // await extractFile(iso, toc, "tmp/iso", 16 * 1024 * 1024);
//   console.log(new Date().getTime() - start.getTime());
//   const applicationData = new Uint8Array(512);
//   CDXAApplicationData.write(
//     toStructBuffer(toDataView(applicationData)),
//     // { id: "NPJH-50581|0000000000000000|0001", cdxa: "CD-XA001" }
//     { id: "", cdxa: "CD-XA001" }
//   );
//   // await createIso("tmp/iso", {
//   //   systemIdentifier: "PSP GAME",
//   //   volumeIdentifier: "PERSONA2",
//   //   publisherIdentifier: "ATLUS",
//   //   applicationIdentifier: "PSP GAME",
//   //   application: [...applicationData],
//   // });
// })();
