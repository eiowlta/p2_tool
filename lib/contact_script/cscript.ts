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

interface Instruction {
  name: string;
  args: string[];
  unk: number; //seemingly safe to ignore?
}
interface Block {
  name: string;
  instructions: Instruction[];
}

export interface ScriptContext extends GameContext {
  file: string;
  msgCounter: number;
  msgMap: Record<number, string>;
}

const ContactScriptHeaderType = structType({
  labels: u16,
  script: u16,
  msgs: u16,
  msgData: u16,
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

export const parseBlock = (
  data: Uint8Array,
  ctx: ScriptContext
): Instruction[] => {
  let ptr = 0;
  let sb = toStructBuffer(data);
  let instr: Instruction[] = [];
  while (sb.ptr < data.byteLength) {
    let opRaw = u16.read(sb);
    let op = opRaw & 0xfff;

    let name = lookupConstantFromBin(ctx, "op", op);
    let info = functions[name];

    //   name = info ? name : `op_${inst.op.toString(16)}`;
    let args: string[] = [];
    if (info !== undefined) {
      for (let i = 0; i < info.args.length; i++) {
        let arg = u16.read(sb);
        if (info.args[i] == null) {
          if (arg != 0) throw `Expected 0 found ${arg}`;
        } else {
          if (info.args[i] == "$") {
            args.push(arg.toString());
          } else {
            args.push(lookupConstantFromBin(ctx, info.args[i], arg));
          }
        }
      }
    } else {
      throw new Error("Unknown op");
    }
    instr.push({
      name,
      args,
      unk: opRaw >> 12,
    });
  }
  return instr;
};

interface ContactScript {
  blocks: Block[];
  messages: MessageFile;
}
export const parseScriptBin = (
  buff: Uint8Array,
  ctx: ScriptContext
): ContactScript => {
  ctx.msgCounter = 0;
  ctx.msgMap = {};
  switch (ctx.game) {
    case Game.EP:
      addLookup(ctx, "op", ep_ops);
      break;
    default:
      throw `Unsupported game`;
  }

  let sb = toStructBuffer(buff);
  let header = ContactScriptHeaderType.read(sb);
  let labelData = toStructBuffer(buff.subarray(header.labels, header.script));
  let instrData = buff.subarray(header.script, header.msgs);
  let msgIdx = toStructBuffer(buff.subarray(header.msgs, header.msgData));
  let msgData = buff.subarray(header.msgData);

  // let labels = {};
  let numLabels = labelData.buff.byteLength / 2;
  let labelOffsets = fixedArrayType(u16, numLabels).read(labelData);
  let numMsgs = msgIdx.buff.byteLength / 2;
  let msgOffsets = fixedArrayType(u16, numMsgs).read(msgIdx);

  labelOffsets.push(instrData.byteLength);
  let blocksRaw = [];
  for (let i = 0; i < labelOffsets.length - 1; i++) {
    blocksRaw.push({
      idx: i,
      offset: labelOffsets[i],
      data: instrData.subarray(labelOffsets[i], labelOffsets[i + 1]),
    });
  }

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

  msgFile.comments.push("");

  let msgMap: Record<number, string> = {};
  let msgCount = 0;
  ctx.constants.msg = { toBin: {}, fromBin: {}, closed: true };
  for (let i = 0; i < msgOffsets.length; i++) {
    let off = msgOffsets[i];
    if (msgMap[off] === undefined) {
      let name = `msg_${msgCount++}`;
      msgMap[off] = name;
      let data = parseMessageBinary(toDataView(msgData.subarray(off)), {
        ...mctx,
        base: off,
      });

      msgFile.comments.push("");
      msgFile.messages[name] = data;
      msgFile.order.push(name);
    }
    ctx.constants.msg.fromBin[i] = msgMap[off];
  }

  addLookup(
    ctx,
    "label",
    blocksRaw.map((f) => `L_${f.idx}`)
  );

  let blocks = blocksRaw.map((func, i): Block => {
    let instr = parseBlock(func.data, ctx);
    return {
      name: "L_" + func.idx,
      instructions: instr,
    };
  });

  return {
    blocks,
    // references,
    // labels,
    messages: msgFile,
  };
};

export const scriptToString = (script: ContactScript, ctx: ScriptContext) => {
  let scriptFile = [];
  let msgctx: MessageScriptContext = {
    ...ctx,
    terminator: 0x1103,
    encoding: EncodingScheme.event,
    base: 0,
  };
  for (const func of script.blocks) {
    scriptFile.push(`${func.name}:`);
    //skip end
    for (let i = 0; i < func.instructions.length; i++) {
      // for (const instr of func.instructions) {
      const instr = func.instructions[i];

      // if (instr.label) scriptFile.push(`  ${instr.label}:`);
      let line = `    `;
      // if (instr.name == "end" && instr.args[0] == func.name)
      // if (i != func.instructions.length - 1)
      line += `${instr.name}(${instr.args.join(", ")})`;
      if (instr.name == "msgShow") {
        line += `\n/***************************************\n${messageToString(
          script.messages.messages[instr.args[0]],
          msgctx
        )}\n***************************************/`;
      }
      if (line != "    ") scriptFile.push(line);
    }

    scriptFile.push("");
  }
  return scriptFile.join("\n");
};

//TODO: share code with event_script?
export const parseScriptText = (
  script: string,
  messages: string | MessageFile,
  ctx: ScriptContext
): ContactScript => {
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
  let save = () => {
    return idx;
  };
  let restore = (to: number) => {
    idx = to;
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
      // case "=":
      // case "{":
      case "(":
      // case "}":
      case ")":
        // case ";":
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
  let parseInstruction = (funcName: string): Instruction | null => {
    let start = save();
    let name = parseIdent();
    let reference;
    let label;

    skipWhitespace();
    switch (peekChar()) {
      case ":":
        restore(start);
        return null;
      default:
        expect("(");
        let args = collectArgs();
        return {
          name,
          args,
          unk: 8,
        };
    }
    // loop: while (1) {
    //   skipWhitespace();
    //   switch (peekChar()) {
    //     case ":":
    //       restore(start);
    //       nextChar();
    //       if (label !== undefined) error(`Duplicate label ${label} ${name}`);
    //       label = name;
    //       skipWhitespace();
    //       if (peekChar() == "}") {
    //         //
    //         return {
    //           name: "end",
    //           args: [funcName],
    //           reference,
    //           label,
    //         };
    //       }
    //       name = parseIdent();
    //       break;
    //     default:
    //       break loop; //not a fan
    //   }
    // }
    // // console.log(peekChar(), name, reference, label);
    // expect("(");
    // let args = collectArgs();
    // expect(";");
    // // expect("(");
    // // let args
    // return {
    //   name,
    //   reference,
    //   label,
    //   args,
    // };
  };
  let parseBlock = (): Block => {
    let instructions: Instruction[] = [];
    let name = parseIdent();
    expect(":");
    // expect("(");
    while (true) {
      skipWhitespace();
      switch (peekChar()) {
        case "<<EOF>>":
          return { name, instructions };
        case "/": {
          nextChar();
          expect("*");
          parseComment();
          break;
        }

        // case "}":
        //   nextChar();
        //   let last = instructions[instructions.length - 1] ?? {};
        //   if (last.name != "end" || last.args[0] != name) {
        //   }
        //   return { name, instructions };
        default:
          let instr = parseInstruction(name);
          if (instr) {
            instructions.push(instr);
          } else {
            return { name, instructions };
          }
          break;
      }
    }
  };
  let blocks: Block[] = [];
  while (true) {
    skipWhitespace();
    if (peekChar() == "<<EOF>>") break;
    blocks.push(parseBlock());
  }

  return {
    blocks,
    messages: msgFile,
  };
};

// const MAX_FUNC_SECT_SIZE = 0x4000;
// const MAX_MSG_SECT_SIZE = 0x10000;

export const scriptToBin = (script: ContactScript, ctx: ScriptContext) => {
  // let funcs = labels;
  switch (ctx.game) {
    case Game.EP:
      addLookup(ctx, "op", ep_ops);
      addLookup(
        ctx,
        "label",
        script.blocks.map((b) => b.name)
      );
      // ops = ep_ops;
      break;
    default:
      throw `Unsupported game`;
  }

  let labelOffsets = [];
  let messageOffsets: string[] = [];

  let msgSect = new Uint8Array(128 * 1024); //is this big enough?
  let instrSect = new Uint8Array(128 * 1024);

  let msgBuff = toDataView(msgSect);

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

  let instrBuff = toStructBuffer(instrSect);

  // addLookupInv(ctx, "msg", msgLookup, true);
  addLookup(
    ctx,
    "labels",
    script.blocks.map((a) => a.name),
    true
  );

  for (const block of script.blocks) {
    labelOffsets.push(instrBuff.ptr);
    for (const instr of block.instructions) {
      let info = functions[instr.name];
      if (info === undefined) throw new Error(`Unknown function ${instr.name}`);
      if (instr.args.length != info.args.length) {
        throw new Error(
          `Invalid number of arguments to ${instr.name}.  Expected ${
            instr.name
          }(${info.args.join(", ")}) received ${instr.name}(${instr.args.join(
            ", "
          )})`
        );
      }
      u16.write(instrBuff, lookupConstantToBin(ctx, "op", instr.name));
      for (let i = 0; i < info.args.length; i++) {
        let v = 0;

        switch (info.args[i]) {
          case "msg":
            v = messageOffsets.length;
            messageOffsets.push(instr.args[i]);
            break;
          case "$":
            v = parseInt(instr.args[i]);
            break;
          default:
            v = lookupConstantToBin(ctx, info.args[i], instr.args[i]);
        }
        u16.write(instrBuff, v);
      }
    }
  }
  let headerSize = 8;
  let labelOffsetSize = labelOffsets.length * 2;
  let msgOffsetSize = messageOffsets.length * 2;
  let totalSize =
    headerSize + labelOffsetSize + msgOffsetSize + msgOff + instrBuff.ptr;
  let out = new Uint8Array(totalSize);
  let outsb = toStructBuffer(out);
  let scale = 2;
  u16.write(outsb, 8 / scale);
  u16.write(outsb, (8 + labelOffsetSize) / scale);
  u16.write(outsb, (8 + labelOffsetSize + instrBuff.ptr) / scale);
  u16.write(
    outsb,
    (8 + labelOffsetSize + instrBuff.ptr + msgOffsetSize) / scale
  );
  for (const off of labelOffsets) {
    u16.write(outsb, off / scale);
  }
  outsb.ptr += instrBuff.ptr;
  // console.log(messageOffsets);
  for (const off of messageOffsets) {
    u16.write(outsb, msgLookup[off] / scale);
  }
  out.set(instrSect.subarray(0, instrBuff.ptr), 8 + labelOffsetSize);
  out.set(
    msgSect.subarray(0, msgOff),
    8 + labelOffsetSize + instrBuff.ptr + msgOffsetSize
  );
  return out;
};


