import {
  Message,
  MessageScriptContext,
  messageToBin,
  messageToString,
  parseMessageBinary,
} from "../msg/msg";
import { MessageFile, parseMessageFile } from "../msg/msg_file";
import {
  Game,
  GameContext,
  addLookup,
  addLookupInv,
  loadScriptConstants,
  lookupConstantFromBin,
  lookupConstantToBin,
} from "../util/context";
import { EncodingScheme } from "../util/encoding";
import {
  StructBuffer,
  StructType,
  cstr,
  fixedArrayType,
  fixedString,
  mapType,
  pad,
  structType,
  toDataView,
  toStructBuffer,
  u16,
  u32,
  u8,
} from "../util/structlib";
import { functions } from "./commands/commands";
import { ops as ep_ops } from "./commands/commands_ep";
import { ops as is_ops } from "./commands/commands_is";

interface Instruction {
  name: string;
  args: string[];
  reference?: string;
  label?: string;
}
interface Function {
  name: string;
  instructions: Instruction[];
}
interface Script {
  entry: string;
  messages: Message[];
  functions: Function[];
}

export interface ScriptContext extends GameContext {
  file: string;
  msgCounter: number;
  msgMap: Record<number, string>;
}

const ScriptHeaderType = structType({
  startFunc: u32,
  funcSect: u32,
  numFunc: u32,
  instrSect: u32,
  argSect: u32,
  msgSect: u32,
});

const FunctionType = structType({
  name: mapType(fixedArrayType(u8, 64), {
    from: (arr): string => {
      let buff = new Uint8Array(arr);
      return cstr.read(toStructBuffer(buff));
    },
    to: (str) => {
      let buff = new Uint8Array(64);
      cstr.write(toStructBuffer(buff), str);
      return [...buff.values()];
    },
  }),
  offset: pad(u32, 4),
});
const InstructionType = structType({
  opcode: pad(u16, 2),
  args: u32,
});

interface InstructionPre {
  op: number;
  args: number[];
}

export const initScriptContext = (
  baseCtx: GameContext,
  file: string
): ScriptContext => {
  return {
    ...baseCtx,
    file,
    msgCounter: 0,
    msgMap: {},
  };
};

export const parseInstr = (
  inst: InstructionPre,
  ctx: ScriptContext
): Instruction => {
  let name = lookupConstantFromBin(ctx, "op", inst.op);
  let info = functions[name];

  //   name = info ? name : `op_${inst.op.toString(16)}`;
  let args: string[] = [];
  if (info !== undefined) {
    let infoArgs = info.variants?.[ctx.game] ?? info.args;
    if (infoArgs.length != inst.args.length) {
      throw `Mismatched length for arguments of ${name}`;
    }
    for (let i = 0; i < infoArgs.length; i++) {
      if (infoArgs[i] == null) {
        if (inst.args[i] != 0) throw `Expected 0 found ${inst.args[i]}`;
      } else {
        args.push(infoArgs[i]!.fromBin(inst.args[i], ctx));
      }
    }
  } else {
    name = `op_${inst.op.toString(16)}`;
    args = inst.args.map((a) => {
      if (a > 1000) return `0x${a.toString(16)}`;
      return a.toString();
    });
  }
  return {
    name,
    args,
    // reference: [],
  };
};

interface EventScript {
  functions: Function[];
  messages: MessageFile;
}
export const parseScriptBin = (
  buff: Uint8Array,
  ctx: ScriptContext
): EventScript => {
  let resetTypes = ["ref", "label"];
  ctx.msgCounter = 0;
  ctx.msgMap = {};
  switch (ctx.game) {
    case Game.EP:
      addLookup(ctx, "op", ep_ops);
      resetTypes.forEach((type) => addLookup(ctx, type, []));
      break;
    case Game.IS:
      addLookup(ctx, "op", is_ops);
      resetTypes.forEach((type) => addLookup(ctx, type, []));
      break;
    default:
      throw `Unsupported game`;
  }

  let sb = toStructBuffer(buff);
  let header = ScriptHeaderType.read(sb);
  let funcData = toStructBuffer(
    buff.subarray(header.funcSect, header.instrSect)
  );
  let instrData = toStructBuffer(
    buff.subarray(header.instrSect, header.argSect)
  );
  let argData = toDataView(buff.subarray(header.argSect, header.msgSect));
  let msgData = buff.subarray(header.msgSect);
  let numInstr = (header.argSect - header.instrSect) / 8;
  let funcs = fixedArrayType(FunctionType, header.numFunc).read(funcData);
  let instructions_raw = fixedArrayType(InstructionType, numInstr).read(
    instrData
  );

  addLookup(
    ctx,
    "function",
    funcs.map((f) => f.name)
  );

  // let sctx: ScriptContext = {
  //   // terminator: 0x1103,
  //   // encoding: EncodingScheme.event,
  //   // file: "script",
  //   // base: 0,
  //   ...ctx,
  // };

  let instructions = instructions_raw
    .map((instr, i): InstructionPre => {
      let args: number[] = [];
      let argEnd =
        (instructions_raw[i + 1]?.args ?? header.msgSect) - header.argSect;
      // console.log(argEnd, argData.byteLength);
      // console.log(argEnd, instr.args, instr.args - header.argSect);
      for (let i = instr.args - header.argSect; i < argEnd; i += 4) {
        let arg = argData.getInt32(i, true);
        args.push(arg);
      }
      return {
        op: instr.opcode,
        args,
      };
    })
    .map((instr) => parseInstr(instr, ctx));
  let functions = funcs.map((func, i): Function => {
    let instr_start = func.offset;
    let instr_end = funcs[i + 1]?.offset ?? instructions.length;
    if (instructions[instr_end - 1].name != "end") {
      console.warn(
        `Unexpected end of function ${instructions[instr_end - 1].name}`
      );
    }
    return {
      name: func.name,
      instructions: instructions.slice(instr_start, instr_end),
    };
  });
  let mctx: MessageScriptContext = {
    terminator: 0x1103,
    encoding: EncodingScheme.event,
    base: 0,
    ...ctx,
  };

  let msgFile: MessageFile = {
    comments: [],
    messages: {},
    order: [],
  };

  // if (ctx.constants.msg !== undefined) {
  // let names = Object.values(ctx.msgMap);
  // let names = Object.values(ctx.constants.msg.fromBin);
  for (const ent of Object.entries(ctx.msgMap)) {
    let name = ent[1];
    let off = parseInt(ent[0]);

    // for (const name of names) {
    //   let off = ctx.constants.msg.toBin[name];
    // let off = lookupConstantToBin(ctx, "msg", name);
    let data = parseMessageBinary(toDataView(msgData.subarray(off)), {
      ...mctx,
      base: off,
    });

    msgFile.comments.push("");
    msgFile.messages[name] = data;
    msgFile.order.push(name);
  }
  // }

  msgFile.comments.push("");
  let references = ctx.constants.ref;
  let labels = ctx.constants.label;
  for (const ref of Object.entries(references.toBin)) {
    if (instructions[ref[1]].reference !== undefined)
      throw `Duplicate reference`;
    // instructions[ref[1]].reference = [];
    instructions[ref[1]].reference = ref[0];
  }
  for (const label of Object.entries(labels.toBin)) {
    instructions[label[1]].label = label[0];
  }

  return {
    functions,
    // references,
    // labels,
    messages: msgFile,
  };
};

export const scriptToString = (script: EventScript, ctx: ScriptContext) => {
  let scriptFile = [];
  let msgctx: MessageScriptContext = {
    ...ctx,
    terminator: 0x1103,
    encoding: EncodingScheme.event,
    base: 0,
  };
  for (const func of script.functions) {
    scriptFile.push(`function ${func.name}()`, "{");
    //skip end
    for (let i = 0; i < func.instructions.length; i++) {
      // for (const instr of func.instructions) {
      const instr = func.instructions[i];

      if (instr.label) scriptFile.push(`  ${instr.label}:`);
      let line = `    `;
      if (instr.reference) {
        // for (const ref of instr.reference) {
        line += `${instr.reference} = `;
        // }
      }
      // if (instr.name == "end" && instr.args[0] == func.name)
      if (i != func.instructions.length - 1)
        line += `${instr.name}(${instr.args.join(", ")});`;
      if (instr.name == "msgShow") {
        line += `\n/***************************************\n${messageToString(
          script.messages.messages[instr.args[0]],
          msgctx
        )}\n***************************************/`;
      }
      if (line != "    ") scriptFile.push(line);
    }

    scriptFile.push("}", "");
  }
  return scriptFile.join("\n");
};

export const parseScriptText = (
  script: string,
  messages: string | MessageFile,
  ctx: ScriptContext
): EventScript => {
  let msgctx: MessageScriptContext = {
    ...ctx,
    terminator: 0x1103,
    encoding: EncodingScheme.event,
    file: "",
    base: 0,
  };
  let msgFile;
  if (typeof messages === "string")
    msgFile = parseMessageFile(messages, msgctx);
  else msgFile = messages;

  let chars = [...script, "<<EOF>>"];
  let idx = 0;
  let line = 0;
  let error = (msg: string) => {
    throw new Error(`In ${ctx.file}:${line}: ${msg}`);
  };
  let peekChar = (i?: number) => {
    return chars[idx + (i ?? 0)];
  };
  let nextChar = () => {
    if (chars[idx] == "<<EOF>>") error(`Unexpected end of input`);
    if (chars[idx] == "\n") line++;
    return chars[idx++];
  };
  let collectArgs = () => {
    let args: string[] = [];
    let curr = "";
    let c = nextChar();

    while (c != ")") {
      switch (c) {
        case ",":
          args.push(curr.trim());
          curr = " ";
          break;
        case "(":
          curr += `(${collectArgs().join(", ")})`;
          break;
        default:
          curr += c;
          break;
      }
      c = nextChar();
    }
    if (curr.length) args.push(curr.trim());
    return args;
  };
  let parseComment = () => {
    while (true) {
      let c = nextChar();
      if (c == "*" && peekChar() == "/") {
        nextChar();
        return;
      }
    }
  };
  let isWhitespace = (c: string) => {
    switch (c) {
      case " ":
      case "\n":
      case "\r":
      case "\t":
        return true;
      default:
        return false;
    }
  };
  let isPunct = (c: string) => {
    switch (c) {
      case ":":
      case "=":
      case "{":
      case "(":
      case "}":
      case ")":
      case ";":
        return true;
      default:
        return false;
    }
  };
  let skipWhitespace = () => {
    while (true) {
      let c = peekChar();
      if (isWhitespace(c)) nextChar();
      else if (c == "/" && peekChar(1) == "*") {
        parseComment();
      } else return;
    }
  };
  let parseIdent = () => {
    skipWhitespace();
    let ident = "";
    while (true) {
      let c = peekChar();
      // console.log(c);
      if (isWhitespace(c)) return ident;
      if (isPunct(c)) return ident;
      ident += nextChar();
    }
  };
  let expect = (c: string) => {
    skipWhitespace();
    let next = nextChar();
    if (next !== c) error(`Expected ${c} found ${next}`);
  };
  let parseInstruction = (funcName: string): Instruction => {
    let name = parseIdent();
    let reference;
    let label;

    loop: while (1) {
      skipWhitespace();
      switch (peekChar()) {
        case "=":
          nextChar();
          if (reference !== undefined)
            error(`Duplicate reference ${reference} ${name}`);
          reference = name;
          skipWhitespace();
          if (peekChar() == "}") {
            //
            return {
              name: "end",
              args: [funcName],
              reference,
              label,
            };
          }
          name = parseIdent();
          break;
        case ":":
          nextChar();
          if (label !== undefined) error(`Duplicate label ${label} ${name}`);
          label = name;
          skipWhitespace();
          if (peekChar() == "}") {
            //
            return {
              name: "end",
              args: [funcName],
              reference,
              label,
            };
          }
          name = parseIdent();
          break;
        default:
          break loop; //not a fan
      }
    }
    // console.log(peekChar(), name, reference, label);
    expect("(");
    let args = collectArgs();
    expect(";");
    // expect("(");
    // let args
    return {
      name,
      reference,
      label,
      args,
    };
  };
  let parseFunction = (): Function => {
    let func = parseIdent();
    if (func !== "function") error(`Expected function found ${func}`);
    let name = parseIdent();
    expect("(");
    let args = collectArgs();
    if (args.length != 0) error(`Arguments not supported: ${args.join(", ")}`);
    let instructions: Instruction[] = [];
    expect("{");
    while (true) {
      skipWhitespace();
      switch (peekChar()) {
        case "/": {
          nextChar();
          expect("*");
          parseComment();
          break;
        }
        case "}":
          nextChar();
          let last = instructions[instructions.length - 1] ?? {};
          if (last.name != "end" || last.args[0] != name) {
            instructions.push({ name: "end", args: [name] });
          }
          return { name, instructions };
        default:
          instructions.push(parseInstruction(name));
          break;
      }
    }
  };
  let functions: Function[] = [];
  while (true) {
    skipWhitespace();
    if (peekChar() == "<<EOF>>") break;
    functions.push(parseFunction());
  }

  return {
    functions: functions,
    messages: msgFile,
  };
};

export const scriptToBin = (script: EventScript, ctx: ScriptContext) => {
  let funcs = functions;

  let resetTypes = ["ref", "label"];

  switch (ctx.game) {
    case Game.EP:
      addLookup(ctx, "op", ep_ops);
      resetTypes.forEach((type) => addLookup(ctx, type, []));
      // ops = ep_ops;
      break;
    case Game.IS:
      addLookup(ctx, "op", is_ops);
      resetTypes.forEach((type) => addLookup(ctx, type, []));
      break;
    default:
      throw `Unsupported game`;
  }

  let msgSect = new Uint8Array(128 * 1024); //is this big enough?
  let instrSect = new Uint8Array(128 * 1024);
  let argSect = new Uint8Array(128 * 1024);
  let funcSect = new Uint8Array(16 * 1024);

  let funcBuff = toStructBuffer(funcSect);
  let instrBuff = toStructBuffer(instrSect);
  let startOff = 0;

  let msgBuff = toDataView(msgSect);
  let argBuff = toDataView(argSect);
  let argOff = 0;
  let msgs: Record<string, number> = {};
  let msgCtx: MessageScriptContext = {
    ...ctx,
    encoding: EncodingScheme.event,
    terminator: 0x1103,
    base: 0,
  };
  let msgLookup: Record<string, number> = {};
  let msgOff = 0;
  for (let i = 0; i < script.messages.order.length; i++) {
    // let str = messageToString(script.messages.messages[script.messages.order[i]]);
    let msg = script.messages.messages[script.messages.order[i]];
    msgLookup[script.messages.order[i]] = msgOff;
    let data = messageToBin(msg, msgCtx);
    for (let j = 0; j < data.length; j++) {
      msgBuff.setUint16(msgOff, data[j], true);
      msgOff += 2;
    }
  }
  addLookupInv(ctx, "msg", msgLookup, true);
  addLookup(
    ctx,
    "function",
    script.functions.map((a) => a.name),
    true
  );
  let refs: Record<string, number> = {};
  let labels: Record<string, number> = {};
  let argSectOff = 0x18;
  {
    let off = 0;
    script.functions.forEach((f) => {
      argSectOff += 0x48;
      f.instructions.forEach((i) => {
        if (i.label) labels[i.label] = off;
        if (i.reference) refs[i.reference] = off;
        off++;
        argSectOff += 8;
      });
    });
  }
  addLookupInv(ctx, "ref", refs, true);
  addLookupInv(ctx, "label", labels, true);

  let instrToBin = (instr: Instruction) => {
    let op = lookupConstantToBin(ctx, "op", instr.name);
    let handle = functions[instr.name];
    let args: number[];
    if (handle) {
      let handleArgs = handle.variants?.[ctx.game] ?? handle.args;
      args = handleArgs.map((f, i) => {
        if (f) return f.toBin(instr.args[i], ctx);
        return 0;
      });
    } else {
      args = instr.args.map((m) => parseInt(m));
    }
    let instrType = {
      opcode: op,
      args: argOff + argSectOff,
    };

    InstructionType.write(instrBuff, instrType);
    args.forEach((v) => {
      argBuff.setInt32(argOff, v, true);
      argOff += 4;
    });
  };
  let funcToBin = (func: Function) => {
    let funcType = {
      name: func.name,
      offset: instrBuff.ptr / 8,
    };
    // if (func.name == "START") startOff = funcType.offset;
    FunctionType.write(funcBuff, funcType);
    func.instructions.forEach((i) => instrToBin(i));
  };

  script.functions.forEach((f) => funcToBin(f));
  let headerSize = 0x18;
  let funcStart = headerSize;
  let instrStart = funcStart + funcBuff.ptr;
  let argStart = instrStart + instrBuff.ptr;
  let msgStart = argStart + argOff;
  if (argSectOff != argStart)
    throw new Error(`Something went wrong.. ${argSectOff} ${argStart}`); // bad error message
  let header = {
    startFunc:
      headerSize +
      (script.functions.findIndex((f) => f.name === "START") ?? 0) * 0x48,
    funcSect: funcStart,
    numFunc: script.functions.length,
    instrSect: instrStart,
    argSect: argStart,
    msgSect: msgStart,
  };
  let totalSize = msgStart + msgOff;
  let out = new Uint8Array(totalSize);
  ScriptHeaderType.write(toStructBuffer(out), header);
  out.set(funcSect.subarray(0, funcBuff.ptr), header.funcSect);
  out.set(instrSect.subarray(0, instrBuff.ptr), header.instrSect);
  out.set(argSect.subarray(0, argOff), header.argSect);
  out.set(msgSect.subarray(0, msgOff), header.msgSect);
  return out;
};

const compareInstructions = (a: Instruction, b: Instruction) => {
  if (a.name != b.name) {
    // let names = [a.name, b.name];
    // names.sort();
    // if (names[0] != "screenFadeInner" || names[1] != "screenFadeOuter")
    return false;
  }
  // if (a.label != b.label) return false;
  // if (a.reference != b.reference) return false;
  if (a.args.length != b.args.length) return false;
  for (let i = 0; i < a.args.length; i++) {
    if (a.args[i].startsWith("ref_") || a.args[i].startsWith("label_"))
      continue;
    if (a.args[i] != b.args[i]) return false;
  }
  return true;
};
const compareFunctions = (a: Function, b: Function) => {
  if (a.name != b.name) {
    console.log(a.name, b.name);
    return false;
  }
  if (a.instructions.length != b.instructions.length) {
    console.log("length " + a.name);
    return false;
  }
  for (let i = 0; i < a.instructions.length; i++) {
    if (!compareInstructions(a.instructions[i], b.instructions[i])) {
      console.log(a.instructions[i], b.instructions[i]);
      return false;
    }
  }
  return true;
};
export const compareScripts = (a: EventScript, b: EventScript) => {
  if (a.functions.length != b.functions.length) return false;
  for (let i = 0; i < a.functions.length; i++) {
    if (!compareFunctions(a.functions[i], b.functions[i])) return false;
  }
  return true;
};
