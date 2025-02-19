import { Elf } from "../elf/types";
import { toDataView } from "../util/structlib";
import { RelocTable, RelocType, buildRelocTable } from "./reloc";
import { SpaceManager } from "./spaceManager";

export const ireg = {
  zero: 0,
  at: 1,
  v0: 2,
  v1: 3,
  a0: 4,
  a1: 5,
  a2: 6,
  a3: 7,
  t0: 8,
  t1: 9,
  t2: 10,
  t3: 11,
  t4: 12,
  t5: 13,
  t6: 14,
  t7: 15,
  s0: 16,
  s1: 17,
  s2: 18,
  s3: 19,
  s4: 20,
  s5: 21,
  s6: 22,
  s7: 23,
  t8: 24,
  t9: 25,
  k0: 26,
  k1: 27,
  gp: 28,
  sp: 29,
  fp: 30,
  ra: 31,
};
export const freg = {
  f0: 0,
  f1: 1,
  f2: 2,
  f3: 3,
  f4: 4,
  f5: 5,
  f6: 6,
  f7: 7,
  f8: 8,
  f9: 9,
  f10: 10,
  f11: 11,
  f12: 12,
  f13: 13,
  f14: 14,
  f15: 15,
  f16: 16,
  f17: 17,
  f18: 18,
  f19: 19,
  f20: 20,
  f21: 21,
  f22: 22,
  f23: 23,
  f24: 24,
  f25: 25,
  f26: 26,
  f27: 27,
  f28: 28,
  f29: 29,
  f30: 30,
  f31: 31,
};
export type IReg = keyof typeof ireg;
export type FReg = keyof typeof freg;

export const exportedFuncs = [
  "section",
  "org",
  "incrementLocation",
  "reserve",
  "align",
  "write_at",
  "write",
  "write_u32",
  "write_u16",
  "write_u8",
  "write_i32",
  "write_i16",
  "write_i8",
  "write_f32",
  "read_at",
  "read",
  "read_u32",
  "read_u16",
  "read_u8",
  "read_i32",
  "read_i16",
  "read_i8",
  "read_f32",
  "provide",
  "startSym",
  "endSym",
  "sym",
  "moveSymbol",
  "overwriteSymbol",
  "label",
  "performReloc",
  "here",
  "j",
  "jal",
  "beq",
  "bne",
  "blez",
  "bgtz",
  "addi",
  "addiu",
  "slti",
  "sltiu",
  "andi",
  "ori",
  "xori",
  "lui",
  "lui_hi",
  "beql",
  "bnel",
  "blezl",
  "bgtzl",
  "lb",
  "lh",
  "lwl",
  "lw",
  "lbu",
  "lhu",
  "lwr",
  "sb",
  "sh",
  "swl",
  "sw",
  "swr",
  "sll",
  "srl",
  "sra",
  "sllv",
  "srlv",
  "srav",
  "jr",
  "jalr",
  "movz",
  "movn",
  "syscall",
  "syscall_module",
  "_break",
  "mfhi",
  "mthi",
  "mflo",
  "mtlo",
  "clz",
  "clo",
  "mult",
  "multu",
  "div",
  "divu",
  "madd",
  "maddu",
  "add",
  "addu",
  "sub",
  "subu",
  "and",
  "or",
  "xor",
  "nor",
  "slt",
  "sltu",
  "max",
  "min",
  "msub",
  "msubu",
  "ext",
  "ins",
  "lwc1",
  "swc1",
  "mfc1",
  "cfc1",
  "mtc1",
  "ctc1",
  "bltz",
  "bgez",
  "bltzl",
  "bgezl",
  "bltzal",
  "bgezal",
  "bltzall",
  "bgezall",
  "bc1f",
  "bc1t",
  "bc1fl",
  "bc1tl",
  "add_s",
  "sub_s",
  "mul_s",
  "div_s",
  "sqrt_s",
  "abs_s",
  "mov_s",
  "neg_s",
  "round_s",
  "trunc_s",
  "ceil_s",
  "floor_s",
  "cvt_w_s",
  "c_f",
  "c_un",
  "c_eq",
  "c_ueq",
  "c_olt",
  "c_ult",
  "c_ole",
  "c_ule",
  "c_sf",
  "c_ngle",
  "c_seq",
  "c_ngl",
  "c_lt",
  "c_nge",
  "c_le",
  "c_ngt",
  // "c_s_w",
  "wsbh",
  "wsbw",
  "seb",
  "bitrev",
  "seh",
  "li",
  "liu",
  "la",
  "move",
  "nop",
  "blt",
  "ble",
  "bgt",
  "bge",
  "lwa",
  "lha",
  "lba",
  "lhua",
  "lbua",
  "swa",
  "sha",
  "sba",
];

// interface MIPS {
//   elf: Elf;
//   addr: Uint32Array;
//   addr_stack: number[];
//   symbols: Record<string, number>;
//   delayed: Record<string, (()=>void)[]>;
//   sections: Record<string, any>;
//   current_section: string;
//   last_label: string;
// }

interface Section {
  data: Uint8Array;
  view: DataView;
  currentAddress: number;
  startAddress: number;
  endAddress: number;
  allowOrg: boolean;
}
export type RelocList = Record<number, number[]>;
export interface RelocInfo {
  table: RelocTable;
  info: RelocList;
  relocBuff: Uint8Array;
}

interface DelayedWrite {
  section: string;
  location: number;
  type: RelocType | "branch";
  useOffset: boolean;
}

interface Symbol {
  name: string;
  address: number;
  size: number;
}
export type Value = string | number;
export class MIPS {
  relocInfo: RelocInfo;
  sections: Record<string, Section>;
  sectionList: Section[];
  currentSection: string;
  currentLocation: Uint32Array; //we use a uint32 array to avoid js number annoyances
  symbols: Record<string, Symbol>;
  delayedWrites: Record<string, DelayedWrite[]>;
  helperBuff: Uint8Array;
  helperView: DataView;
  lastLabel: string;

  spaceManager: SpaceManager;

  constructor(relocInfo: RelocInfo, enableSpaceManager?: boolean) {
    this.relocInfo = relocInfo;
    this.sections = {};
    this.sectionList = [];
    this.symbols = {};
    this.currentSection = "";
    this.currentLocation = new Uint32Array(1);
    this.delayedWrites = {};
    this.helperBuff = new Uint8Array(16);
    this.helperView = toDataView(this.helperBuff);
    this.lastLabel = "";
    this.spaceManager = new SpaceManager(this, enableSpaceManager ?? false);
  }

  /**
   * Map a section.
   * @param name
   * @param data
   * @param allowOrg Allow use of org command
   * @param startAddress
   * @param endAddress if not specified, uses size of data
   */
  addSection(
    name: string,
    data: Uint8Array,
    allowOrg: boolean,
    startAddress: number,
    endAddress?: number
  ) {
    this.sections[name] = {
      data,
      view: toDataView(data),
      startAddress,
      currentAddress: startAddress,
      allowOrg,
      endAddress: endAddress ?? data.byteLength + startAddress,
    };
    this.sectionList.push(this.sections[name]);
    if (this.currentSection == "") {
      this.currentLocation[0] = startAddress;
      this.currentSection = name;
    }
  }
  /**
   * Create a small subsection of another section
   * Mostly used for setting aside blocks inside the eboot
   * and enforcing bounds constraints on that
   */
  addSubsection(
    base: string,
    name: string,
    startAddress: number,
    endAddress: number
  ) {
    let baseInfo = this.sections[base];
    if (baseInfo === undefined) throw `Unknown section ${base}`;
    let data = baseInfo.data.subarray(
      startAddress - baseInfo.startAddress,
      endAddress - baseInfo.endAddress
    );
    this.sections[name] = {
      data: data,
      view: toDataView(data),
      startAddress,
      currentAddress: startAddress,
      allowOrg: false,
      endAddress: endAddress,
    };
    this.sectionList.push(this.sections[name]);
    if (this.currentSection == "") {
      this.currentLocation[0] = startAddress;
      this.currentSection = name;
    }
  }
  /**
   * must switch to appropriate section first
   * @param name
   * @param fn
   */
  overwriteSymbol(name: string, fn: () => void) {
    let symbol = this.symbols[name];
    if (symbol === undefined) throw `Unknown symbol ${name}`;
    this.lastLabel = name;
    let current = this.currentSection;
    this.addSubsection(
      current,
      name,
      symbol.address,
      symbol.address + symbol.size
    );
    this.section(name);
    fn();
    this.section(current);
  }
  exportSymbols(): Symbol[] {
    return Object.values(this.symbols);
  }
  section(name: string) {
    if (this.sections[name] === undefined) throw `Unknown section ${name}`;
    this.sections[this.currentSection].currentAddress = this.currentLocation[0];
    this.currentLocation[0] = this.sections[name].currentAddress;
    this.currentSection = name;
  }
  resolveLoc(loc: Value): number | false {
    if (typeof loc === "number") return loc;
    if (this.symbols[loc] != undefined) return this.symbols[loc].address;
    return false;
  }
  resolveLocOrThrow(loc: Value): number {
    if (typeof loc === "number") return loc;
    if (this.symbols[loc] != undefined) return this.symbols[loc].address;
    throw `Unknown location ${loc}`;
  }
  org(loc_in: Value, offset: number = 0) {
    let loc = this.resolveLocOrThrow(loc_in) + offset;
    if (!this.sections[this.currentSection].allowOrg)
      throw `Org is not allowed within section ${this.currentSection}`;
    this.currentLocation[0] = loc;
  }
  here() {
    return this.currentLocation[0];
  }
  /**
   * move location pointer forward amount bytes
   * @param amount
   */
  incrementLocation(amount: number) {
    this.currentLocation[0] += amount;
  }
  reserve(amount: number) {
    this.incrementLocation(amount);
  }
  align(width: number) {
    if (this.currentLocation[0] % width) {
      this.currentLocation[0] += width - (this.currentLocation[0] % width);
    }
  }
  /**
   * Write at location, does not increment pointer
   * @param value
   * @param loc
   */
  write_at(value: Uint8Array, loc: Value) {
    let addr = this.resolveLocOrThrow(loc);
    let sect = this.sections[this.currentSection];
    let offset = addr - sect.startAddress;
    if (offset < 0 || addr >= sect.endAddress)
      throw new Error(
        `${loc.toString(16)} is out of range of section ${this.currentSection}`
      );
    sect.data.set(value, offset);
    for (let i = 0; i < value.byteLength; i++) {
      let info = this.relocInfo.table[addr++];
      if (info) {
        //zero out reloc
        this.relocInfo.relocBuff.fill(0, info.fileOffset, info.fileOffset + 8);
      }
    }
  }
  /**
   * Writes value to current location.  automatically increases current location pointer
   * @param value
   */
  write(value: Uint8Array) {
    let length = value.byteLength;
    this.write_at(value, this.currentLocation[0]);
    this.currentLocation[0] += length;
  }
  write_u32(value: Value, log:boolean=false) {
    this.align(4);
    let v = this.resolveLoc(value);
    if (v === false) {
      this.addDelayedWrite(value, this.currentLocation[0], RelocType.Mips32);
      v = 0;
    }
    if(log)
    console.log(value, v);
    this.helperView.setUint32(0, v, true);
    this.write(this.helperBuff.subarray(0, 4));
  }
  write_u16(value: number, swapEndian?: boolean) {
    this.align(2);
    this.helperView.setUint16(0, value, swapEndian ? false : true);
    this.write(this.helperBuff.subarray(0, 2));
  }
  write_u8(value: number) {
    this.helperView.setUint8(0, value);
    this.write(this.helperBuff.subarray(0, 1));
  }
  write_i32(value: number) {
    this.align(4);
    this.helperView.setInt32(0, value, true);
    this.write(this.helperBuff.subarray(0, 4));
  }
  write_i16(value: number) {
    this.align(2);
    this.helperView.setInt16(0, value, true);
    this.write(this.helperBuff.subarray(0, 2));
  }
  write_i8(value: number) {
    this.helperView.setInt8(0, value);
    this.write(this.helperBuff.subarray(0, 1));
  }
  write_f32(value: number) {
    this.helperView.setFloat32(0, value, true);
    this.write(this.helperBuff.subarray(0, 4));
  }

  read_at(size: number, loc: number) {
    let addr = this.resolveLocOrThrow(loc);
    let sect = this.sections[this.currentSection];
    let offset = addr - sect.startAddress;
    if (offset < 0 || addr >= sect.endAddress)
      throw new Error(
        `${loc.toString(16)} is out of range of section ${this.currentSection}`
      );
    return sect.data.subarray(offset, offset + size);
  }
  read(size: number, skip_increment?: boolean): Uint8Array {
    let data = this.read_at(size, this.currentLocation[0]);
    if (skip_increment !== true) {
      this.currentLocation[0] += size;
    }
    return data;
  }

  read_u32(skip_increment?: boolean) {
    this.helperBuff.set(this.read(4, skip_increment));
    return this.helperView.getUint32(0, true);
  }
  read_u16(skip_increment?: boolean) {
    this.helperBuff.set(this.read(2, skip_increment));
    return this.helperView.getUint16(0, true);
  }
  read_u8(skip_increment?: boolean) {
    this.helperBuff.set(this.read(1, skip_increment));
    return this.helperView.getUint8(0);
  }
  read_i32(skip_increment?: boolean) {
    this.helperBuff.set(this.read(4, skip_increment));
    return this.helperView.getInt32(0, true);
  }
  read_i16(skip_increment?: boolean) {
    this.helperBuff.set(this.read(2, skip_increment));
    return this.helperView.getInt16(0, true);
  }
  read_i8(skip_increment?: boolean) {
    this.helperBuff.set(this.read(1, skip_increment));
    return this.helperView.getInt8(0);
  }
  read_f32(skip_increment?: boolean) {
    this.helperBuff.set(this.read(4, skip_increment));
    return this.helperView.getFloat32(0);
  }

  provide(name: string, value: Value, size?: number) {
    if (this.symbols[name])
      console.warn(`Warning, symbol ${name} already exists, overwriting`);
    let addr = this.resolveLocOrThrow(value);
    this.symbols[name] = {
      name,
      address: addr,
      size: size ?? 1,
    };
    if (this.delayedWrites[name]) {
      this.delayedWrites[name].forEach((write) => {
        this.executeDelayedWrite(write, addr);
      });
      delete this.delayedWrites[name];
    }
  }
  startSym(name: string) {
    this.provide(name, this.currentLocation[0], 0);
    this.lastLabel = name;
  }
  endSym(name: string) {
    if (this.symbols[name] === undefined) throw `Unknown symbol ${name}`;
    this.symbols[name].size =
      this.currentLocation[0] - this.symbols[name].address;
  }
  /**
   *
   * @param name
   * @param fn
   */
  sym(name: string, fn: () => void) {
    this.startSym(name);
    fn();
    this.endSym(name);
  }
  label(name: string, size?: number) {
    if (name.startsWith("@")) {
      name = this.lastLabel + name;
    } else {
      this.lastLabel = name;
    }
    this.provide(name, this.currentLocation[0], size);
  }

  executeDelayedWrite(write: DelayedWrite, value: number) {
    let section = this.sections[write.section];
    let offset = write.location - section.startAddress;
    if (offset < 0 || write.location >= section.endAddress)
      throw new Error(
        `${write.location.toString(16)} is out of range of section ${
          write.section
        }`
      );
    let current = section.view.getUint32(offset, true);
    let voff = write.useOffset ? current : 0;
    switch (write.type) {
      case RelocType.None:
        throw `Bad reloc`;
      case RelocType.Mips16:
        if (Math.abs(value) > 0x7fff)
          throw new Error(`Bad immediate ${value} at ${write.location.toString(16)}`);
        current = (current & 0xffff0000) | ((value + (voff & 0xffff)) & 0xffff);
        break;
      case RelocType.Mips32:
        current = value + voff;
        break;
      case RelocType.MipsHi16:
        {
          let v = value >> 16;
          if (value & 0x8000) v++;
          current = (current & 0xffff0000) | ((v + (voff & 0xffff)) & 0xffff);
        }
        break;
      case RelocType.MipsLo16:
        current = (current & 0xffff0000) | ((value + (voff & 0xffff)) & 0xffff);
        break;
      case RelocType.Mips26:
        current =
          (current & 0xfc000000) |
          (((value >> 2) + (voff & 0x3ffffff)) & 0x3ffffff);
        break;
      case "branch":
        {
          let offset = value - (write.location + 4);
          offset >>= 2;
          if (Math.abs(offset) > 0xffff)
            throw `Bad branch target at ${write.location.toString(16)}`;

          current =
            (current & 0xffff0000) | ((offset + (voff & 0xffff)) & 0xffff);
        }
        break;
    }
    //we don't need to check for reloc entries to clear, they are cleared in write or moveSymbol
    section.view.setUint32(offset, current, true);
  }

  /**
   * Check if a reloc exists and return value of data after reloc is performed
   * does not write anything.  returns data if no reloc info is available
   * @param addr
   * @param data
   */
  performReloc(addr: number, data: number) {
    let info = this.relocInfo.table[addr];
    if (info === undefined) return data;
    switch (info.type) {
      case RelocType.Mips32:
        return data + info.to;
        break;
      default:
        throw `Reloc type ${RelocType[info.type]} not currently supported.`;
    }
  }

  addDelayedWrite(
    dst: Value,
    location: number,
    type: RelocType | "branch",
    useOffset: boolean = true
  ) {
    let write = { section: this.currentSection, location, type, useOffset };
    if (typeof dst === "number") {
      this.executeDelayedWrite(write, dst);
    } else if (this.symbols[dst]) {
      this.executeDelayedWrite(write, this.symbols[dst].address);
    } else {
      if (this.delayedWrites[dst] == undefined) this.delayedWrites[dst] = [];
      this.delayedWrites[dst].push(write);
    }
  }
  /**
   * Use reference information to relocate all references to "from", to "to"
   * using the reference information provided
   * @param from
   * @param to
   */
  moveSymbol(from: Value, to: Value, useOffset = false) {
    let fromAddr = this.resolveLocOrThrow(from);
    // if (fromAddr === false) throw `Unknown symbol ${from}`;
    let toAddr = this.resolveLoc(to);
    let locations = this.relocInfo.info[fromAddr];
    if (locations === undefined)
      throw `${valueToString(from)} has no references`;
    for (const ent of locations) {
      let info = this.relocInfo.table[ent];
      if (info === undefined)
        throw `No relocation information for ${ent.toString(16)}`;
      switch (info.type) {
      }
      if (toAddr == false) {
        this.addDelayedWrite(to as string, ent, info.type);
      } else {
        this.executeDelayedWrite(
          {
            section: this.currentSection,
            location: ent,
            type: info.type,
            useOffset,
          },
          toAddr
        );
      }

      //zero out reloc
      this.relocInfo.relocBuff.fill(0, info.fileOffset, info.fileOffset + 8);
    }
  }

  parseJ(dst: Value): number {
    if (typeof dst === "string" && dst.startsWith("@")) {
      dst = this.lastLabel + dst;
    }
    let v = this.resolveLoc(dst);
    if (v === false) {
      this.addDelayedWrite(dst, this.currentLocation[0], RelocType.Mips26);
      return 0;
    }
    return (v >> 2) & 0x3ffffff;
  }
  parseBranchTarget(dst: Value): number {
    if (typeof dst === "string" && dst.startsWith("@")) {
      dst = this.lastLabel + dst;
    }
    let v = this.resolveLoc(dst);
    if (v === false) {
      this.addDelayedWrite(dst, this.currentLocation[0], "branch");
      return 0;
    }
    let offset = (v - this.currentLocation[0] - 4) >> 2;
    if (offset < -0xffff || offset > 0xffff) throw `Bad branch offset ${dst}`;
    return offset & 0xffff;
  }
  parseImmediate(imm: Value): number {
    let v = this.resolveLoc(imm);
    if (v === false) {
      this.addDelayedWrite(imm, this.currentLocation[0], RelocType.MipsLo16);
      return 0;
    }
    // if (Math.abs(v) > 0x7fff)
    //   throw `Bad immediate ${v} at ${this.currentLocation[0].toString(16)}`;
    return v & 0xffff;
  }
  parseImmediateHi(imm: Value): number {
    let v = this.resolveLoc(imm);
    if (v === false) {
      this.addDelayedWrite(imm, this.currentLocation[0], RelocType.MipsHi16);
      return 0;
    }
    // if (Math.abs(v) > 0x7fff)
    //   throw `Bad immediate ${v} at ${this.currentLocation[0].toString(16)}`;
    let upper = v >> 16;
    if (v & 0x8000) upper++;
    return upper & 0xffff;
  }
  encodeJump(opcode: number, dst: Value) {
    this.write_u32(fld.op(opcode) | this.parseJ(dst));
  }
  encodeBranch(opcode: number, s: IReg, t: IReg, target: Value) {
    this.write_u32(
      fld.op(opcode) | fld.s(s) | fld.t(t) | this.parseBranchTarget(target)
    );
  }
  encodeBranchSpecial(opcode: number, s: IReg, target: Value) {
    this.write_u32(
      fld.op(1) | fld.brop(opcode) | fld.s(s) | this.parseBranchTarget(target)
    );
  }
  encodeImmediate(opcode: number, t: IReg, s: IReg, imm: Value) {
    this.write_u32(
      fld.op(opcode) | fld.s(s) | fld.t(t) | this.parseImmediate(imm)
    );
  }
  encodeShift(func: number, d: IReg, t: IReg, sh: number) {
    this.write_u32(fld.func(func) | fld.d(d) | fld.t(t) | fld.sh(sh));
  }
  //   encodeShiftV(func: number, d: IReg, t: IReg, s: number) {
  //     this.write_u32(fld.op(func) | fld.d(d) | fld.t(t) | fld.s(s));
  //   }
  encodeR(func: number, d: IReg, s: IReg, t: IReg) {
    this.write_u32(fld.func(func) | fld.d(d) | fld.t(t) | fld.s(s));
  }
  encodeRExt(op: number, func: number, d: IReg, s: IReg, t: IReg) {
    this.write_u32(
      fld.op(op) | fld.func(func) | fld.d(d) | fld.t(t) | fld.s(s)
    );
  }

  encodeF(func: number, d: FReg, s: FReg, t: FReg) {
    this.write_u32(
      fld.op(0x11) |
        fld.func(func) |
        fld.fd(d) |
        fld.ft(t) |
        fld.fs(s) |
        fld.fmt(0x10)
    );
  }
  encodeFBranch(func: number, target: Value) {
    this.write_u32(
      fld.op(0x11) |
        fld.fmt(8) |
        (validate_width(func, 5) << 16) |
        this.parseBranchTarget(target)
    );
  }
  encodeImmediateHi(opcode: number, t: IReg, s: IReg, imm: Value) {
    this.write_u32(
      fld.op(opcode) | fld.s(s) | fld.t(t) | this.parseImmediateHi(imm)
    );
  }
  encodeLoadStore(opcode: number, t: IReg, off: Value, s: IReg) {
    this.write_u32(
      fld.op(opcode) | fld.t(t) | fld.s(s) | this.parseImmediate(off)
    );
  }
  j(dst: Value) {
    this.encodeJump(0x2, dst);
  }
  jal(dst: Value) {
    this.encodeJump(0x3, dst);
  }
  beq(s: IReg, t: IReg, target: Value) {
    this.encodeBranch(0x4, s, t, target);
  }
  bne(s: IReg, t: IReg, target: Value) {
    this.encodeBranch(0x5, s, t, target);
  }
  blez(s: IReg, target: Value) {
    this.encodeBranch(0x6, s, "zero", target);
  }
  bgtz(s: IReg, target: Value) {
    this.encodeBranch(0x7, s, "zero", target);
  }
  addi(t: IReg, s: IReg, imm: Value) {
    this.encodeImmediate(0x8, t, s, imm);
  }
  addiu(t: IReg, s: IReg, imm: Value) {
    this.encodeImmediate(0x9, t, s, imm);
  }
  slti(t: IReg, s: IReg, imm: Value) {
    this.encodeImmediate(0xa, t, s, imm);
  }
  sltiu(t: IReg, s: IReg, imm: Value) {
    this.encodeImmediate(0xb, t, s, imm);
  }
  andi(t: IReg, s: IReg, imm: Value) {
    this.encodeImmediate(0xc, t, s, imm);
  }
  ori(t: IReg, s: IReg, imm: Value) {
    this.encodeImmediate(0xd, t, s, imm);
  }
  xori(t: IReg, s: IReg, imm: Value) {
    this.encodeImmediate(0xe, t, s, imm);
  }
  /**
   * encodes immediate as the upper 16 bits
   * @param t
   * @param s
   * @param imm
   */
  lui(t: IReg, imm: Value) {
    this.encodeImmediate(0xf, t, "zero", imm);
  }
  /**
   * encodes upper 16 of immediate as upper 16 bits
   * automatically adjusts for followup addi or load/store
   * @param t
   * @param s
   * @param imm
   */
  lui_hi(t: IReg, imm: Value) {
    this.encodeImmediateHi(0xf, t, "zero", imm);
  }
  beql(s: IReg, t: IReg, target: Value) {
    this.encodeBranch(0x14, s, t, target);
  }
  bnel(s: IReg, t: IReg, target: Value) {
    this.encodeBranch(0x15, s, t, target);
  }
  blezl(s: IReg, target: Value) {
    this.encodeBranch(0x16, s, "zero", target);
  }
  bgtzl(s: IReg, target: Value) {
    this.encodeBranch(0x17, s, "zero", target);
  }
  lb(t: IReg, offset: Value, s: IReg) {
    this.encodeLoadStore(0x20, t, offset, s);
  }
  lh(t: IReg, offset: Value, s: IReg) {
    this.encodeLoadStore(0x21, t, offset, s);
  }
  lwl(t: IReg, offset: Value, s: IReg) {
    this.encodeLoadStore(0x22, t, offset, s);
  }
  lw(t: IReg, offset: Value, s: IReg) {
    this.encodeLoadStore(0x23, t, offset, s);
  }
  lbu(t: IReg, offset: Value, s: IReg) {
    this.encodeLoadStore(0x24, t, offset, s);
  }
  lhu(t: IReg, offset: Value, s: IReg) {
    this.encodeLoadStore(0x25, t, offset, s);
  }
  lwr(t: IReg, offset: Value, s: IReg) {
    this.encodeLoadStore(0x26, t, offset, s);
  }
  sb(t: IReg, offset: Value, s: IReg) {
    this.encodeLoadStore(0x28, t, offset, s);
  }
  sh(t: IReg, offset: Value, s: IReg) {
    this.encodeLoadStore(0x29, t, offset, s);
  }
  swl(t: IReg, offset: Value, s: IReg) {
    this.encodeLoadStore(0x2a, t, offset, s);
  }
  sw(t: IReg, offset: Value, s: IReg) {
    this.encodeLoadStore(0x2b, t, offset, s);
  }
  swr(t: IReg, offset: Value, s: IReg) {
    this.encodeLoadStore(0x2e, t, offset, s);
  }

  /// op=0, functions
  sll(d: IReg, t: IReg, sh: number) {
    this.encodeShift(0x0, d, t, sh);
  }
  srl(d: IReg, t: IReg, sh: number) {
    this.encodeShift(0x2, d, t, sh);
  }
  sra(d: IReg, t: IReg, sh: number) {
    this.encodeShift(0x3, d, t, sh);
  }
  sllv(d: IReg, t: IReg, s: IReg) {
    this.encodeR(0x4, d, s, t);
  }
  srlv(d: IReg, t: IReg, s: IReg) {
    this.encodeR(0x6, d, s, t);
  }
  srav(d: IReg, t: IReg, s: IReg) {
    this.encodeR(0x7, d, s, t);
  }
  jr(s: IReg) {
    this.encodeR(0x8, "zero", s, "zero");
  }
  jalr(s: IReg, d?: IReg) {
    this.encodeR(0x9, d ?? "ra", s, "zero");
  }
  movz(d: IReg, s: IReg, t: IReg) {
    this.encodeR(0xa, d, s, t);
  }
  movn(d: IReg, s: IReg, t: IReg) {
    this.encodeR(0xb, d, s, t);
  }
  syscall(num: number) {
    this.write_u32(fld.func(0xc) | (validate_width(num, 20) << 6));
  }
  /**
   * from ppsspp MIPSDis.cpp, this is apparently how syscalls are handled
   * @param module
   * @param func
   */
  syscall_module(module: number, func: number) {
    this.write_u32(
      fld.func(0xc) |
        (((validate_width(module, 8) << 12) | validate_width(func, 12)) << 6)
    );
  }
  _break() {
    this.write_u32(fld.func(0xd));
  }
  mfhi(d: IReg) {
    this.encodeR(0x10, d, "zero", "zero");
  }
  mthi(s: IReg) {
    this.encodeR(0x11, "zero", s, "zero");
  }
  mflo(d: IReg) {
    this.encodeR(0x12, d, "zero", "zero");
  }
  mtlo(s: IReg) {
    this.encodeR(0x13, "zero", s, "zero");
  }
  clz(d: IReg, s: IReg) {
    this.encodeR(0x16, d, s, "zero");
  }
  clo(d: IReg, s: IReg) {
    this.encodeR(0x17, d, s, "zero");
  }
  mult(s: IReg, t: IReg) {
    this.encodeR(0x18, "zero", s, t);
  }
  multu(s: IReg, t: IReg) {
    this.encodeR(0x19, "zero", s, t);
  }
  div(s: IReg, t: IReg) {
    this.encodeR(0x1a, "zero", s, t);
  }
  divu(s: IReg, t: IReg) {
    this.encodeR(0x1b, "zero", s, t);
  }
  madd(s: IReg, t: IReg) {
    this.encodeR(0x1c, "zero", s, t);
  }
  maddu(s: IReg, t: IReg) {
    this.encodeR(0x1d, "zero", s, t);
  }
  add(d: IReg, s: IReg, t: IReg) {
    this.encodeR(0x20, d, s, t);
  }
  addu(d: IReg, s: IReg, t: IReg) {
    this.encodeR(0x21, d, s, t);
  }
  sub(d: IReg, s: IReg, t: IReg) {
    this.encodeR(0x22, d, s, t);
  }
  subu(d: IReg, s: IReg, t: IReg) {
    this.encodeR(0x23, d, s, t);
  }
  and(d: IReg, s: IReg, t: IReg) {
    this.encodeR(0x24, d, s, t);
  }
  or(d: IReg, s: IReg, t: IReg) {
    this.encodeR(0x25, d, s, t);
  }
  xor(d: IReg, s: IReg, t: IReg) {
    this.encodeR(0x26, d, s, t);
  }
  nor(d: IReg, s: IReg, t: IReg) {
    this.encodeR(0x27, d, s, t);
  }
  slt(d: IReg, s: IReg, t: IReg) {
    this.encodeR(0x2a, d, s, t);
  }
  sltu(d: IReg, s: IReg, t: IReg) {
    this.encodeR(0x2b, d, s, t);
  }
  max(d: IReg, s: IReg, t: IReg) {
    this.encodeR(0x2c, d, s, t);
  }
  min(d: IReg, s: IReg, t: IReg) {
    this.encodeR(0x2d, d, s, t);
  }
  msub(s: IReg, t: IReg) {
    this.encodeR(0x2e, "zero", s, t);
  }
  msubu(s: IReg, t: IReg) {
    this.encodeR(0x2f, "zero", s, t);
  }

  ext(t: IReg, s: IReg, pos: number, size: number) {
    this.write_u32(
      fld.op(0x1f) |
        fld.func(0) |
        fld.t(t) |
        fld.s(s) |
        fld.pos(pos) |
        fld.size(size)
    );
  }
  ins(t: IReg, s: IReg, pos: number, size: number) {
    this.write_u32(
      fld.op(0x1f) |
        fld.func(4) |
        fld.t(t) |
        fld.s(s) |
        fld.pos(pos) |
        fld.size(size)
    );
  }

  lwc1(t: FReg, offset: Value, s: IReg) {
    this.write_u32(
      fld.op(0x31) | fld.ft(t) | fld.s(s) | this.parseImmediate(offset)
    );
  }
  swc1(t: FReg, offset: Value, s: IReg) {
    this.write_u32(
      fld.op(0x39) | fld.ft(t) | fld.s(s) | this.parseImmediate(offset)
    );
  }
  mfc1(t: IReg, s: FReg) {
    this.write_u32(fld.op(0x11) | fld.t(t) | fld.fs(s) | fld.fmt(0));
  }
  cfc1(t: IReg, s: FReg) {
    this.write_u32(fld.op(0x11) | fld.t(t) | fld.fs(s) | fld.fmt(2));
  }
  mtc1(t: IReg, s: FReg) {
    this.write_u32(fld.op(0x11) | fld.t(t) | fld.fs(s) | fld.fmt(4));
  }
  ctc1(t: IReg, s: FReg) {
    this.write_u32(fld.op(0x11) | fld.t(t) | fld.fs(s) | fld.fmt(6));
  }

  bltz(s: IReg, target: Value) {
    this.encodeBranchSpecial(0, s, target);
  }
  bgez(s: IReg, target: Value) {
    this.encodeBranchSpecial(1, s, target);
  }
  bltzl(s: IReg, target: Value) {
    this.encodeBranchSpecial(2, s, target);
  }
  bgezl(s: IReg, target: Value) {
    this.encodeBranchSpecial(3, s, target);
  }
  bltzal(s: IReg, target: Value) {
    this.encodeBranchSpecial(0x10, s, target);
  }
  bgezal(s: IReg, target: Value) {
    this.encodeBranchSpecial(0x11, s, target);
  }
  bltzall(s: IReg, target: Value) {
    this.encodeBranchSpecial(0x12, s, target);
  }
  bgezall(s: IReg, target: Value) {
    this.encodeBranchSpecial(0x13, s, target);
  }
  bc1f(target: Value) {
    this.encodeFBranch(0, target);
  }
  bc1t(target: Value) {
    this.encodeFBranch(1, target);
  }
  bc1fl(target: Value) {
    this.encodeFBranch(2, target);
  }
  bc1tl(target: Value) {
    this.encodeFBranch(3, target);
  }

  add_s(d: FReg, s: FReg, t: FReg) {
    this.encodeF(0, d, s, t);
  }
  sub_s(d: FReg, s: FReg, t: FReg) {
    this.encodeF(1, d, s, t);
  }
  mul_s(d: FReg, s: FReg, t: FReg) {
    this.encodeF(2, d, s, t);
  }
  div_s(d: FReg, s: FReg, t: FReg) {
    this.encodeF(3, d, s, t);
  }
  sqrt_s(d: FReg, s: FReg) {
    this.encodeF(4, d, s, "f0");
  }
  abs_s(d: FReg, s: FReg) {
    this.encodeF(5, d, s, "f0");
  }
  mov_s(d: FReg, s: FReg) {
    this.encodeF(6, d, s, "f0");
  }
  neg_s(d: FReg, s: FReg) {
    this.encodeF(7, d, s, "f0");
  }
  round_s(d: FReg, s: FReg) {
    this.encodeF(12, d, s, "f0");
  }
  trunc_s(d: FReg, s: FReg) {
    this.encodeF(13, d, s, "f0");
  }
  ceil_s(d: FReg, s: FReg) {
    this.encodeF(14, d, s, "f0");
  }
  floor_s(d: FReg, s: FReg) {
    this.encodeF(15, d, s, "f0");
  }
  cvt_w_s(d: FReg, s: FReg) {
    this.encodeF(36, d, s, "f0");
  }
  cvt_s_w(d: FReg, s: FReg) {
    this.write_u32(
      fld.op(0x11) | fld.func(32) | fld.fd(d) | fld.fs(s) | fld.fmt(0x14)
    );
  }
  c_f(d: FReg, s: FReg) {
    this.encodeF(48, d, s, "f0");
  }
  c_un(d: FReg, s: FReg) {
    this.encodeF(49, d, s, "f0");
  }
  c_eq(d: FReg, s: FReg) {
    this.encodeF(50, d, s, "f0");
  }
  c_ueq(d: FReg, s: FReg) {
    this.encodeF(51, d, s, "f0");
  }
  c_olt(d: FReg, s: FReg) {
    this.encodeF(52, d, s, "f0");
  }
  c_ult(d: FReg, s: FReg) {
    this.encodeF(53, d, s, "f0");
  }
  c_ole(d: FReg, s: FReg) {
    this.encodeF(54, d, s, "f0");
  }
  c_ule(d: FReg, s: FReg) {
    this.encodeF(55, d, s, "f0");
  }
  c_sf(d: FReg, s: FReg) {
    this.encodeF(56, d, s, "f0");
  }
  c_ngle(d: FReg, s: FReg) {
    this.encodeF(57, d, s, "f0");
  }
  c_seq(d: FReg, s: FReg) {
    this.encodeF(58, d, s, "f0");
  }
  c_ngl(d: FReg, s: FReg) {
    this.encodeF(59, d, s, "f0");
  }
  c_lt(d: FReg, s: FReg) {
    this.encodeF(60, d, s, "f0");
  }
  c_nge(d: FReg, s: FReg) {
    this.encodeF(61, d, s, "f0");
  }
  c_le(d: FReg, s: FReg) {
    this.encodeF(62, d, s, "f0");
  }
  c_ngt(d: FReg, s: FReg) {
    this.encodeF(63, d, s, "f0");
  }
  // c_s_w(d: FReg, s: FReg) {
  //   this.write_u32(
  //     fld.op(0x11) | fld.func(32) | fld.fd(d) | fld.fs(s) | fld.fmt(0x14)
  //   );
  // }
  wsbh(d: IReg, t: IReg) {
    this.write_u32(
      fld.op(0x1f) | fld.d(d) | fld.t(t) | fld.sh(2) | fld.func(0x20)
    );
  }
  wsbw(d: IReg, t: IReg) {
    this.write_u32(
      fld.op(0x1f) | fld.d(d) | fld.t(t) | fld.sh(3) | fld.func(0x20)
    );
  }
  seb(d: IReg, t: IReg) {
    this.write_u32(
      fld.op(0x1f) | fld.d(d) | fld.t(t) | fld.sh(16) | fld.func(0x20)
    );
  }
  bitrev(d: IReg, t: IReg) {
    this.write_u32(
      fld.op(0x1f) | fld.d(d) | fld.t(t) | fld.sh(20) | fld.func(0x20)
    );
  }
  seh(d: IReg, t: IReg) {
    this.write_u32(
      fld.op(0x1f) | fld.d(d) | fld.t(t) | fld.sh(24) | fld.func(0x20)
    );
  }

  /*****************************************************************
   *                        extra opcodes
   *****************************************************************/

  /**
   * checks if constant fits in one instruction, otherwise use 2
   * if imm is symbol and not available, uses 2 instructions
   * @param d
   * @param imm
   */
  li(d: IReg, imm: Value) {
    let v = this.resolveLoc(imm);
    if (v == false || Math.abs(v) > 0x7fff) {
      this.la(d, imm);
    } else {
      this.addiu(d, "zero", imm);
    }
  }
  liu(d: IReg, imm: Value) {
    let v = this.resolveLoc(imm);
    if (v != false && v & 0x10000) {
      throw `Outside of range of constant ${imm.toString(
        16
      )}, must be >=0, <=FFFF`;
    }
    this.ori(d, "zero", imm);
  }
  /**
   * always performs lui addi
   * @param d
   * @param addr
   */
  la(d: IReg, addr: Value) {
    this.lui_hi(d, addr);
    this.addiu(d, d, addr);
  }
  move(d: IReg, s: IReg) {
    this.addu(d, "zero", s);
  }
  nop() {
    this.write_u32(0);
  }
  /**
   * warning: does not fill delay slot, uses at
   */
  blt(a: IReg, b: IReg, target: Value) {
    this.slt("at", a, b);
    this.bne("at", "zero", target);
  }
  /**
   * warning: does not fill delay slot, uses at
   */
  ble(a: IReg, b: IReg, target: Value) {
    this.slt("at", b, a);
    this.beq("at", "zero", target);
  }
  /**
   * warning: does not fill delay slot, uses at
   */
  bgt(a: IReg, b: IReg, target: Value) {
    this.slt("at", a, b);
    this.bne("at", "zero", target);
  }
  /**
   * warning: does not fill delay slot, uses at
   */
  bge(a: IReg, b: IReg, target: Value) {
    this.slt("at", b, a);
    this.beq("at", "zero", target);
  }

  /**
   * like lw but with an address
   */
  lwa(d: IReg, addr: Value) {
    this.lui_hi(d, addr);
    this.lw(d, addr, d);
  }
  /**
   * like lh but with an address
   */
  lha(d: IReg, addr: Value) {
    this.lui_hi(d, addr);
    this.lh(d, addr, d);
  }
  /**
   * like lb but with an address
   */
  lba(d: IReg, addr: Value) {
    this.lui_hi(d, addr);
    this.lb(d, addr, d);
  }
  /**
   * like lhu but with an address
   */
  lhua(d: IReg, addr: Value) {
    this.lui_hi(d, addr);
    this.lhu(d, addr, d);
  }
  /**
   * like lbu but with an address
   */
  lbua(d: IReg, addr: Value) {
    this.lui_hi(d, addr);
    this.lbu(d, addr, d);
  }

  /**
   * like sw but with an address, uses at
   */
  swa(d: IReg, addr: Value) {
    this.lui_hi("at", addr);
    this.lw(d, addr, "at");
  }
  /**
   * like sh but with an address, uses at
   */
  sha(d: IReg, addr: Value) {
    this.lui_hi("at", addr);
    this.lh(d, addr, "at");
  }
  /**
   * like sb but with an address, uses at
   */
  sba(d: IReg, addr: Value) {
    this.lui_hi("at", addr);
    this.lb(d, addr, "at");
  }
}

const valueToString = (v: Value): string => {
  if (typeof v === "string") return v;
  return v.toString(16);
};

const validate_width = (v: number, w: number) => {
  if (v < 0 || v >= 1 << w) throw `Value out of range ${v}, expected ${w} bits`;
  return v;
};

const parseReg = (v: IReg): number => {
  if (ireg[v] === undefined) {
    if (freg[v as keyof typeof freg] !== undefined)
      throw `Expected integer register, received $${v}`;
    throw `Unknown register ${v}`;
  }
  return ireg[v];
};
const parseFReg = (v: FReg): number => {
  if (freg[v] === undefined) {
    if (ireg[v as keyof typeof ireg] !== undefined)
      throw `Expected fp register, received $${v}`;
    throw `Unknown register ${v}`;
  }
  return freg[v];
};
const fld = {
  op: (v: number) => validate_width(v, 6) << 26,
  s: (v: IReg) => validate_width(parseReg(v), 5) << 21,
  t: (v: IReg) => validate_width(parseReg(v), 5) << 16,
  d: (v: IReg) => validate_width(parseReg(v), 5) << 11,
  ft: (v: FReg) => validate_width(parseFReg(v), 5) << 16,
  fs: (v: FReg) => validate_width(parseFReg(v), 5) << 11,
  fd: (v: FReg) => validate_width(parseFReg(v), 5) << 6,
  sh: (v: number) => validate_width(v, 5) << 6,
  fmt: (v: number) => validate_width(v, 5) << 21,
  brop: (v: number) => validate_width(v, 5) << 16,
  pos: (v: number) => validate_width(v, 5) << 6,
  size: (v: number) => validate_width(v, 5) << 11,
  i: (v: number) => validate_width(v, 16),
  func: (v: number) => validate_width(v, 6),
  j: (v: number) => validate_width(v, 26),
};
