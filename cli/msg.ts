import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import fs from "fs/promises";
import { decrypt_eboot } from "../lib/decrypt/eboot";
import {
  fromTools,
  joinPath,
  mkdir,
  readBinaryFile,
  readTextFile,
  writeBinaryFile,
  writeTextFile,
} from "../lib/util/filesystem";
import { patchFileLoading, PSP_BASE } from "../lib/elf/atlus_eboot";
import {
  SectionHeaderFlags,
  SectionHeaderType,
  addrToOffset,
  parseElf,
  parseFlags,
} from "../lib/elf/types";
import { buildRelocTable, parseRelocs } from "../lib/mips/reloc";
import * as ear from "../lib/archive/ear";
import * as bnp from "../lib/archive/bnp";
import * as par from "../lib/archive/par";
import { fileToTOC } from "../lib/archive/common";
import { StringDecoder } from "string_decoder";
import { toDataView } from "../lib/util/structlib";
import { EncodingScheme, loadLocale } from "../lib/util/encoding";
import {
  MessageScriptContext,
  messageToBin,
  messageToString,
  parseMessageBinary,
} from "../lib/msg/msg";
import { Game } from "../lib/util/context";
import { MessageFile, parseMessageFile, writeMessageFile } from "../lib/msg/msg_file";

const args = yargs(hideBin(process.argv))
  .usage(`Tools for interacting with messages`)
  .command(
    "$0 <file>",
    false,
    (yargs) =>
      yargs
        .positional("file", {
          type: "string",
          describe: "path to file to extract string from",
          demandOption: true,
          normalize: true,
        })
        .option("offset", {
          type: "number",
          alias: "off",
        })
        .option("address", {
          type: "number",
          alias: "addr",
        })
        .option("locale", {
          type: "string",
          default: "jp",
        })
        .option("encoding", {
          type: "string",
          choices: ["font", "event"],
          default: "font",
        })
        .option("terminator", {
          type: "number",
        })
        .option("swapBytes", {
          type: "boolean",
        }),
    // .option("output", {
    //   type: "string",
    //   describe: "path to write decrypted eboot to",
    //   demandOption: true,
    //   normalize: true,
    //   alias: "o",
    // }),
    async (args) => {
      const eboot = await readBinaryFile(args.file);
      let offset = args.offset ?? (args.address ?? 0) - PSP_BASE + 0xc0;
      const locale = await loadLocale(fromTools(`game/ep/encoding/${args.locale}`));
      let ctx: MessageScriptContext = {
        terminator:
          args.terminator ?? args.encoding == "font" ? 0xffff : 0x1103,
        encoding: args.encoding as EncodingScheme,
        game: Game.EP,
        swapEndian: args.swapBytes,
        file: args.file,
        base: args.address ?? args.offset ?? 0,
        locale,
        constants: {},
      };
      console.log(
        messageToString(
          parseMessageBinary(toDataView(eboot.subarray(offset)), ctx),
          ctx
        )
      );
    }
  )
  .command(
    "find_str <eboot> <str>",
    false,
    (yargs) =>
      yargs
        .positional("eboot", {
          type: "string",
          describe: "path to file to extract string from",
          demandOption: true,
          normalize: true,
        })
        .positional("string", {
          type: "string",
          demandOption: true,
          alias: "str",
        })
        .option("locale", {
          type: "string",
          default: "jp",
        })
        .option("encoding", {
          type: "string",
          choices: ["font", "event"],
          default: "font",
        })
        .option("game", {
          type: "string",
          choices: ["ep", "is"],
          default: "ep",
        })
        .option("swapBytes", {
          type: "boolean",
        }),
    async (args) => {
      const eboot = await readBinaryFile(args.eboot);
      // let offset = args.offset ?? (args.address ?? 0) - 0x8804000 + 0xc0;
      const locale = await loadLocale(fromTools(`game/${args.game}/encoding/${args.locale}`));
      let ctx: MessageScriptContext = {
        terminator:
          args.terminator ?? args.encoding == "font" ? 0xffff : 0x1103,
        encoding: args.encoding as EncodingScheme,
        game: Game.EP,
        swapEndian: args.swapBytes,
        file: "cli",
        // base: args.address ?? args.offset ?? 0,
        base: 0,
        locale,
        constants: {},
      };
      let msg = args.string;
      let data = messageToBin({
        data: [args.string]
      }, ctx);
      data.pop();
      let dv = toDataView(eboot);
      for (let i = 0; i < eboot.length; i += 2) {
        let found = true;
        for (let j = 0; j < data.length; j++) {
          if (dv.getUint16(i + j * 2) != data[j]) {
            found = false;
            break;
          }
        }
        if (found) {
          console.log((i + 0x8804000 - 0xc0).toString(16).padStart(8, '0'))
        }
      }
      // console.log(
      //   messageToString(
      //     parseMessageBinary(toDataView(eboot.subarray(offset)), ctx),
      //     ctx
      //   )
      // );
    }
  )
  .command(
    "extract_table <eboot> <table>",
    false,
    (yargs) =>
      yargs
        .positional("eboot", {
          type: "string",
          describe: "path to file to extract string from",
          demandOption: true,
          normalize: true,
        })
        .positional("table", {
          type: "string",
          describe: "path to json with table information",
          demandOption: true,
          normalize: true,
        })
        .option("output", {
          type: 'string',
          describe: "output message file",
          demandOption: true,
          normalize: true,
          alias: "o"
        })
        .option("locale", {
          type: "string",
          default: "jp",
        })
        .option("game", {
          type: "string",
          choices: ["ep", "is"],
          default: "ep",
        }),
    async (args) => {
      const eboot = await readBinaryFile(args.eboot);
      // let offset = args.offset ?? (args.address ?? 0) - 0x8804000 + 0xc0;
      const locale = await loadLocale(fromTools(`game/${args.game}/encoding/${args.locale}`));
      const info = JSON.parse(await readTextFile(args.table));
      let messages: MessageFile = {
        order: [],
        messages: {},
        comments: [],
      };
      let groups: string[][] = [];
      let dv = toDataView(eboot);
      let elf = parseElf(eboot, PSP_BASE);
      let DATA_BASE = elf.programHeaders[1].vaddr;
      console.log(elf.programHeaders);

      for (let i = 0; i < info.length; i++) groups.push([]);
      for (const table of info.tables) {
        switch (table.type) {
          case 'pointer':
            {
              let len = table.length ?? info.length;
              let off = table.offset ?? 0;
              let addr = parseInt(table.addr, 16);
              let ctx: MessageScriptContext = {
                terminator:
                  table.format == "font" ? 0xffff : 0x1103,
                encoding: table.format as EncodingScheme,
                game: args.game as Game,
                file: "eboot",
                swapEndian: table.format == "font",
                // base: args.address ?? args.offset ?? 0,
                base: 0,
                locale,
                constants: {},
              };
              for (let i = 0; i < len; i++) {
                console.log(i);
                ctx.base = dv.getUint32(addr - PSP_BASE + 0xc0, true) + DATA_BASE + PSP_BASE;
                // console.log(ctx.base.toString(16));
                // console.log(dv.getUint32(addr - PSP_BASE + 0xc0, true).toString(16));
                addr += 4;
                let msg = parseMessageBinary(toDataView(eboot.subarray(ctx.base - PSP_BASE + 0xc0)), ctx);
                let name = `${info.name}_${i + off}`;
                if (table.suffix) {
                  name += `_${table.suffix}`;
                }
                groups[i + off].push(name);
                messages.messages[name] = msg
              }
              messages.order = groups.flat().filter(a => a.length);
            }
            break;
          case 'offset':
            throw new Error(`Not supported yet`);
            break;
        }
      }
      let ctx: MessageScriptContext = {
        terminator:0xffff,
        encoding: EncodingScheme.event,
        game: args.game as Game,
        file: "eboot",
        // base: args.address ?? args.offset ?? 0,
        base: 0,
        locale,
        constants: {},
      };
      let txt = writeMessageFile(messages, ctx)
      await writeTextFile(args.output, txt);

      // console.log(
      //   messageToString(
      //     parseMessageBinary(toDataView(eboot.subarray(offset)), ctx),
      //     ctx
      //   )
      // );
    }
  )
  .command(
    "msg_file <file>",
    false,
    (yargs) =>
      yargs
        .positional("file", {
          type: "string",
          describe: "path to file to extract string from",
          demandOption: true,
          normalize: true,
        })
        .option("locale", {
          type: "string",
          default: "jp",
        })
        .option("encoding", {
          type: "string",
          choices: ["font", "event"],
          default: "font",
        }),
    // .option("output", {
    //   type: "string",
    //   describe: "path to write decrypted eboot to",
    //   demandOption: true,
    //   normalize: true,
    //   alias: "o",
    // }),
    async (args) => {
      const file = await readTextFile(args.file);
      const locale = await loadLocale(fromTools(`game/ep/encoding/${args.locale}`));
      let ctx: MessageScriptContext = {
        terminator:
          args.terminator ?? args.encoding == "font" ? 0xffff : 0x1103,
        encoding: args.encoding as EncodingScheme,
        locale,
        game: Game.EP,
        file: args.file,
        constants: {},
        base: 0,
      };
      const messages = parseMessageFile(file, ctx);
      console.log(messages);
      messages.order.forEach((n) => console.log(messages.messages[n]));
    }
  )
  .demandCommand()
  .showHelpOnFail(true)
  .help().argv;
