import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { Game, GameContext, loadScriptConstants } from "../lib/util/context";
import {
  fromTools,
  joinPath,
  mkdir,
  readBinaryFile,
  readDir,
  writeBinaryFile,
  writeTextFile,
} from "../lib/util/filesystem";
import { EncodingScheme, loadLocale } from "../lib/util/encoding";
import {
  initScriptContext,
  parseScriptBin,
  parseScriptText,
  scriptToBin,
  scriptToString,
} from "../lib/event_script/escript";
import { messageToString } from "../lib/msg/msg";
import { writeMessageFile } from "../lib/msg/msg_file";

import {
  initScriptContext as initCScriptContext,
  scriptToString as cscriptToString,
  parseScriptBin as parseCScriptBin,
} from "../lib/contact_script/cscript";

const args = yargs(hideBin(process.argv))
  .usage(`Tools for interacting with escript`)
  .command(
    "decompile <file>",
    false,
    (yargs) =>
      yargs
        .positional("file", {
          type: "string",
          describe: "path to file to decompile",
          demandOption: true,
          normalize: true,
        })
        .option("locale", {
          type: "string",
          default: "en",
        })
        .option("format", {
          type: "string",
          default: "event",
        })
        .option("output", {
          type: "string",
          demandOption: false,
          normalize: true,
          alias: "o",
        }),
    async (args) => {
      const data = await readBinaryFile(args.file);
      const locale = await loadLocale(
        fromTools(`game/ep/encoding/${args.locale}`)
      );
      switch (args.format) {
        default:
          {
            let ctx = initScriptContext(
              {
                game: Game.EP,
                locale,
                constants: {},
              },
              args.file
            );
            await loadScriptConstants(ctx);
            let parsed = parseScriptBin(data, ctx);
            let str = scriptToString(parsed, ctx);
            if (args.output) {
              await writeTextFile(args.output, str);
            } else {
              console.log(str);
            }
          }
          break;
        case "contact":
          {
            let ctx = initCScriptContext(
              {
                game: Game.EP,
                locale,
                constants: {},
              },
              args.file
            );
            let parsed = parseCScriptBin(data, ctx);
            console.log(parsed);
            let str = cscriptToString(parsed, ctx);
            if (args.output) {
              await writeTextFile(args.output, str);
            } else {
              console.log(str);
            }
          }
          break;
      }
    }
  )
  .command(
    "decompileAll <dir>",
    false,
    (yargs) =>
      yargs
        .positional("dir", {
          type: "string",
          describe: "path to dir to decompile",
          demandOption: true,
          normalize: true,
        })
        .option("locale", {
          type: "string",
          default: "en",
        })
        .option("game", {
          type: "string",
          choices: ["ep", "is"],
          default: "ep",
        })
        .option("output", {
          type: "string",
          demandOption: true,
          normalize: true,
          alias: "o",
        })
        .option("validate", {
          type: "boolean",
          demandOption: false,
        }),
    async (args) => {
      let dir = await readDir(args.dir);
      await mkdir(args.output);
      const locale = await loadLocale(
        fromTools(`game/${args.game}/encoding/${args.locale}`)
      );
      let gameCtx: GameContext = {
        game: args.game as Game,
        locale,
        constants: {},
      };
      await loadScriptConstants(gameCtx);
      for (const file of dir) {
        // if (file == "M006C.efb") continue;
        const data = await readBinaryFile(joinPath(args.dir, file));
        try {
          let ctx = initScriptContext(gameCtx, file);
          let parsed = parseScriptBin(data, ctx);
          let str = scriptToString(parsed, ctx);
          await writeTextFile(joinPath(args.output, file), str);
          if (args.validate) {
            let txt = writeMessageFile(parsed.messages, {
              ...ctx,
              encoding: EncodingScheme.event,
              terminator: 0x1103,
              base: 0,
            });
            let reparsed = parseScriptText(str, txt, ctx);
            if (parsed.functions.length != reparsed.functions.length)
              throw `bad ${file}`;
            for (let i = 0; i < parsed.functions.length; i++) {
              let fa = parsed.functions[i];
              let fb = reparsed.functions[i];
              if (fa.name != fb.name) throw `bad fname ${file}`;
              // console.log(fa.instructions.slice(fa.instructions.length-3), fb.instructions.slice(fb.instructions.length-3))
              if (fa.instructions.length != fb.instructions.length)
                throw `bad ilen ${file}`;
              for (let j = 0; j < fa.instructions.length; j++) {
                let a = fa.instructions[j];
                let b = fb.instructions[j];
                if (
                  a.name != b.name ||
                  a.label != b.label ||
                  a.reference != b.reference
                )
                  throw `bad instr`;
              }
            }
            let recompiled = scriptToBin(reparsed, ctx);
            await writeBinaryFile(
              joinPath(args.output, file + ".bin"),
              recompiled
            );
            if (recompiled.byteLength != data.byteLength) {
              throw new Error(
                `Bad data length ${recompiled.byteLength} ${data.byteLength}`
              );
            }
            // console.log(
            //   recompiled.byteLength.toString(16),
            //   data.byteLength.toString(16)
            // );
            for (let i = 0; i < recompiled.byteLength; i++) {
              if (recompiled[i] != data[i])
                throw new Error(
                  `Bad data at ${i.toString(16)} ${recompiled[i]} ${data[i]}`
                );
            }
          }
        } catch (e) {
          console.log(`failed to decompile ${file}`, e);
          break;
        }
      }
    }
  )
  .demandCommand()
  .showHelpOnFail(true)
  .help().argv;
