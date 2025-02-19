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
import { patchFileLoading } from "../lib/elf/atlus_eboot";
import {
  SectionHeaderFlags,
  SectionHeaderType,
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
  messageToString,
  parseMessageBinary,
} from "../lib/msg/msg";
import { Game } from "../lib/util/context";
import { parseMessageFile } from "../lib/msg/msg_file";

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
      let offset = args.offset ?? (args.address ?? 0) - 0x8804000 + 0xc0;
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
