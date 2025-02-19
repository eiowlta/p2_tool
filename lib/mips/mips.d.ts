type IReg =
  | "zero"
  | "at"
  | "v0"
  | "v1"
  | "a0"
  | "a1"
  | "a2"
  | "a3"
  | "t0"
  | "t1"
  | "t2"
  | "t3"
  | "t4"
  | "t5"
  | "t6"
  | "t7"
  | "s0"
  | "s1"
  | "s2"
  | "s3"
  | "s4"
  | "s5"
  | "s6"
  | "s7"
  | "t8"
  | "t9"
  | "k0"
  | "k1"
  | "gp"
  | "sp"
  | "fp"
  | "ra";
type FReg =
  | "f0"
  | "f1"
  | "f2"
  | "f3"
  | "f4"
  | "f5"
  | "f6"
  | "f7"
  | "f8"
  | "f9"
  | "f10"
  | "f11"
  | "f12"
  | "f13"
  | "f14"
  | "f15"
  | "f16"
  | "f17"
  | "f18"
  | "f19"
  | "f20"
  | "f21"
  | "f22"
  | "f23"
  | "f24"
  | "f25"
  | "f26"
  | "f27"
  | "f28"
  | "f29"
  | "f30"
  | "f31";
declare const $zero: IReg;
declare const $at: IReg;
declare const $v0: IReg;
declare const $v1: IReg;
declare const $a0: IReg;
declare const $a1: IReg;
declare const $a2: IReg;
declare const $a3: IReg;
declare const $t0: IReg;
declare const $t1: IReg;
declare const $t2: IReg;
declare const $t3: IReg;
declare const $t4: IReg;
declare const $t5: IReg;
declare const $t6: IReg;
declare const $t7: IReg;
declare const $s0: IReg;
declare const $s1: IReg;
declare const $s2: IReg;
declare const $s3: IReg;
declare const $s4: IReg;
declare const $s5: IReg;
declare const $s6: IReg;
declare const $s7: IReg;
declare const $t8: IReg;
declare const $t9: IReg;
declare const $k0: IReg;
declare const $k1: IReg;
declare const $gp: IReg;
declare const $sp: IReg;
declare const $fp: IReg;
declare const $ra: IReg;
declare const $f0: FReg;
declare const $f1: FReg;
declare const $f2: FReg;
declare const $f3: FReg;
declare const $f4: FReg;
declare const $f5: FReg;
declare const $f6: FReg;
declare const $f7: FReg;
declare const $f8: FReg;
declare const $f9: FReg;
declare const $f10: FReg;
declare const $f11: FReg;
declare const $f12: FReg;
declare const $f13: FReg;
declare const $f14: FReg;
declare const $f15: FReg;
declare const $f16: FReg;
declare const $f17: FReg;
declare const $f18: FReg;
declare const $f19: FReg;
declare const $f20: FReg;
declare const $f21: FReg;
declare const $f22: FReg;
declare const $f23: FReg;
declare const $f24: FReg;
declare const $f25: FReg;
declare const $f26: FReg;
declare const $f27: FReg;
declare const $f28: FReg;
declare const $f29: FReg;
declare const $f30: FReg;
declare const $f31: FReg;
type Value = string | number;

declare function section(name: string);
declare function org(loc_in: Value);
/**
 * move location pointer forward amount bytes
 * @param amount
 */
declare function incrementLocation(amount: number);
declare function reserve(amount: number);
declare function align(width: number);

/**
 * Write at location, does not increment pointer
 * @param value
 * @param loc
 */
declare function write_at(value: Uint8Array, loc: Value);
/**
 * Writes value to current location.  automatically increases current location pointer
 * @param value
 */
declare function write(value: Uint8Array);
declare function write_u32(value: number);
declare function write_u16(value: number);
declare function write_u8(value: number);
declare function write_i32(value: number);
declare function write_i16(value: number);
declare function write_i8(value: number);
declare function write_f32(value: number);

declare function provide(name: string, value: Value, size?: number);
declare function startSym(name: string);
declare function endSym(name: string);
declare function label(name: string, size?: number);
declare function overwriteSymbol(name: string, fn: () => void);

/**
 * Use reference information to relocate all references to "from", to "to"
 * using the reference information provided
 * @param from
 * @param to
 */
declare function moveSymbol(from: Value, to: Value);

declare function j(dst: Value);
declare function jal(dst: Value);
declare function beq(s: IReg, t: IReg, target: Value);
declare function bne(s: IReg, t: IReg, target: Value);
declare function blez(s: IReg, target: Value);
declare function bgtz(s: IReg, target: Value);
declare function addi(t: IReg, s: IReg, imm: Value);
declare function addiu(t: IReg, s: IReg, imm: Value);
declare function slti(t: IReg, s: IReg, imm: Value);
declare function sltiu(t: IReg, s: IReg, imm: Value);
declare function andi(t: IReg, s: IReg, imm: Value);
declare function ori(t: IReg, s: IReg, imm: Value);
declare function xori(t: IReg, s: IReg, imm: Value);
/**
 * encodes immediate as the upper 16 bits
 * @param t
 * @param s
 * @param imm
 */
declare function lui(t: IReg, imm: Value);
/**
 * encodes upper 16 of immediate as upper 16 bits
 * automatically adjusts for followup addi or load/store
 * @param t
 * @param s
 * @param imm
 */
declare function lui_hi(t: IReg, imm: Value);
declare function beql(s: IReg, t: IReg, target: Value);
declare function bnel(s: IReg, t: IReg, target: Value);
declare function blezl(s: IReg, target: Value);
declare function bgtzl(s: IReg, target: Value);
declare function lb(t: IReg, offset: Value, s: IReg);
declare function lh(t: IReg, offset: Value, s: IReg);
declare function lwl(t: IReg, offset: Value, s: IReg);
declare function lw(t: IReg, offset: Value, s: IReg);
declare function lbu(t: IReg, offset: Value, s: IReg);
declare function lhu(t: IReg, offset: Value, s: IReg);
declare function lwr(t: IReg, offset: Value, s: IReg);
declare function sb(t: IReg, offset: Value, s: IReg);
declare function sh(t: IReg, offset: Value, s: IReg);
declare function swl(t: IReg, offset: Value, s: IReg);
declare function sw(t: IReg, offset: Value, s: IReg);
declare function swr(t: IReg, offset: Value, s: IReg);

/// op=0, declare functions
declare function sll(d: IReg, t: IReg, sh: number);
declare function srl(d: IReg, t: IReg, sh: number);
declare function sra(d: IReg, t: IReg, sh: number);
declare function sllv(d: IReg, t: IReg, s: IReg);
declare function srlv(d: IReg, t: IReg, s: IReg);
declare function srav(d: IReg, t: IReg, s: IReg);
declare function jr(s: IReg);
declare function jalr(s: IReg, d?: IReg);
declare function movz(d: IReg, s: IReg, t: IReg);
declare function movn(d: IReg, s: IReg, t: IReg);
declare function syscall(num: number);
/**
 * from ppsspp MIPSDis.cpp, this is apparently how syscalls are handled
 * @param module
 * @param func
 */
declare function syscall_module(module: number, func: number);
/**
 * break is reserved keyword
 */
declare function _break();
declare function mfhi(d: IReg);
declare function mthi(s: IReg);
declare function mflo(d: IReg);
declare function mtlo(s: IReg);
declare function clz(d: IReg, s: IReg);
declare function clo(d: IReg, s: IReg);
declare function mult(s: IReg, t: IReg);
declare function multu(s: IReg, t: IReg);
declare function div(s: IReg, t: IReg);
declare function divu(s: IReg, t: IReg);
declare function madd(s: IReg, t: IReg);
declare function maddu(s: IReg, t: IReg);
declare function add(d: IReg, s: IReg, t: IReg);
declare function addu(d: IReg, s: IReg, t: IReg);
declare function sub(d: IReg, s: IReg, t: IReg);
declare function subu(d: IReg, s: IReg, t: IReg);
declare function and(d: IReg, s: IReg, t: IReg);
declare function or(d: IReg, s: IReg, t: IReg);
declare function xor(d: IReg, s: IReg, t: IReg);
declare function nor(d: IReg, s: IReg, t: IReg);
declare function slt(d: IReg, s: IReg, t: IReg);
declare function sltu(d: IReg, s: IReg, t: IReg);
declare function max(d: IReg, s: IReg, t: IReg);
declare function min(d: IReg, s: IReg, t: IReg);
declare function msub(s: IReg, t: IReg);
declare function msubu(s: IReg, t: IReg);

declare function ext(t: IReg, s: IReg, pos: number, size: number);
declare function ins(t: IReg, s: IReg, pos: number, size: number);

declare function lwc1(t: FReg, offset: Value, s: IReg);
declare function swc1(t: FReg, offset: Value, s: IReg);
declare function mfc1(t: IReg, s: FReg);
declare function cfc1(t: IReg, s: FReg);
declare function mtc1(t: IReg, s: FReg);
declare function ctc1(t: IReg, s: FReg);

declare function bltz(s: IReg, target: Value);
declare function bgez(s: IReg, target: Value);
declare function bltzl(s: IReg, target: Value);
declare function bgezl(s: IReg, target: Value);
declare function bltzal(s: IReg, target: Value);
declare function bgezal(s: IReg, target: Value);
declare function bltzall(s: IReg, target: Value);
declare function bgezall(s: IReg, target: Value);
declare function bc1f(target: Value);
declare function bc1t(target: Value);
declare function bc1fl(target: Value);
declare function bc1tl(target: Value);

declare function add_s(d: FReg, s: FReg, t: FReg);
declare function sub_s(d: FReg, s: FReg, t: FReg);
declare function mul_s(d: FReg, s: FReg, t: FReg);
declare function div_s(d: FReg, s: FReg, t: FReg);
declare function sqrt_s(d: FReg, s: FReg);
declare function abs_s(d: FReg, s: FReg);
declare function mov_s(d: FReg, s: FReg);
declare function neg_s(d: FReg, s: FReg);
declare function round_s(d: FReg, s: FReg);
declare function trunc_s(d: FReg, s: FReg);
declare function ceil_s(d: FReg, s: FReg);
declare function floor_s(d: FReg, s: FReg);
declare function cvt_w_s(d: FReg, s: FReg);
declare function c_f(d: FReg, s: FReg);
declare function c_un(d: FReg, s: FReg);
declare function c_eq(d: FReg, s: FReg);
declare function c_ueq(d: FReg, s: FReg);
declare function c_olt(d: FReg, s: FReg);
declare function c_ult(d: FReg, s: FReg);
declare function c_ole(d: FReg, s: FReg);
declare function c_ule(d: FReg, s: FReg);
declare function c_sf(d: FReg, s: FReg);
declare function c_ngle(d: FReg, s: FReg);
declare function c_seq(d: FReg, s: FReg);
declare function c_ngl(d: FReg, s: FReg);
declare function c_lt(d: FReg, s: FReg);
declare function c_nge(d: FReg, s: FReg);
declare function c_le(d: FReg, s: FReg);
declare function c_ngt(d: FReg, s: FReg);
declare function c_s_w(d: FReg, s: FReg);
declare function wsbh(d: IReg, t: IReg);
declare function wsbw(d: IReg, t: IReg);
declare function seb(d: IReg, t: IReg);
declare function bitrev(d: IReg, t: IReg);
declare function seh(d: IReg, t: IReg);

/*****************************************************************
 *                        extra opcodes
 *****************************************************************/

/**
 * checks if declare constant fits in one instruction, otherwise use 2
 * if imm is symbol and not available, uses 2 instructions
 * @param d
 * @param imm
 */
declare function li(d: IReg, imm: Value);
/**
 * always performs lui addi
 * @param d
 * @param addr
 */
declare function la(d: IReg, addr: Value);
declare function move(d: IReg, s: IReg);
/**
 * warning: does not fill delay slot, uses at
 */
declare function blt(a: IReg, b: IReg, target: Value);
/**
 * warning: does not fill delay slot, uses at
 */
declare function ble(a: IReg, b: IReg, target: Value);
/**
 * warning: does not fill delay slot, uses at
 */
declare function bgt(a: IReg, b: IReg, target: Value);
/**
 * warning: does not fill delay slot, uses at
 */
declare function bge(a: IReg, b: IReg, target: Value);

/**
 * like lw but with an address
 */
declare function lwa(d: IReg, addr: Value);
/**
 * like lh but with an address
 */
declare function lha(d: IReg, addr: Value);
/**
 * like lb but with an address
 */
declare function lba(d: IReg, addr: Value);
/**
 * like lhu but with an address
 */
declare function lhua(d: IReg, addr: Value);
/**
 * like lbu but with an address
 */
declare function lbua(d: IReg, addr: Value);

/**
 * like sw but with an address, uses at
 */
declare function swa(d: IReg, addr: Value);
/**
 * like sh but with an address, uses at
 */
declare function sha(d: IReg, addr: Value);
/**
 * like sb but with an address, uses at
 */
declare function sba(d: IReg, addr: Value);

declare const mips: MIPS;
declare class MIPS {
  section(name: string);
  org(loc_in: Value);
  /**
   * move location pointer forward amount bytes
   * @param amount
   */
  incrementLocation(amount: number);
  reserve(amount: number);

  /**
   * Write at location, does not increment pointer
   * @param value
   * @param loc
   */
  write_at(value: Uint8Array, loc: Value);
  /**
   * Writes value to current location.  automatically increases current location pointer
   * @param value
   */
  write(value: Uint8Array);
  write_u32(value: number);
  write_u16(value: number);
  write_u8(value: number);
  write_i32(value: number);
  write_i16(value: number);
  write_i8(value: number);
  write_f32(value: number);

  provide(name: string, value: Value, size?: number);
  startSym(name: string);
  endSym(name: string);
  label(name: string, size?: number);

  /**
   * Use reference information to relocate all references to "from", to "to"
   * using the reference information provided
   * @param from
   * @param to
   */
  moveSymbol(from: Value, to: Value);

  j(dst: Value);
  jal(dst: Value);
  beq(s: IReg, t: IReg, target: Value);
  bne(s: IReg, t: IReg, target: Value);
  blez(s: IReg, target: Value);
  bgtz(s: IReg, target: Value);
  addi(t: IReg, s: IReg, imm: Value);
  addiu(t: IReg, s: IReg, imm: Value);
  slti(t: IReg, s: IReg, imm: Value);
  sltiu(t: IReg, s: IReg, imm: Value);
  andi(t: IReg, s: IReg, imm: Value);
  ori(t: IReg, s: IReg, imm: Value);
  xori(t: IReg, s: IReg, imm: Value);
  /**
   * encodes immediate as the upper 16 bits
   * @param t
   * @param s
   * @param imm
   */
  lui(t: IReg, imm: Value);
  /**
   * encodes upper 16 of immediate as upper 16 bits
   * automatically adjusts for followup addi or load/store
   * @param t
   * @param s
   * @param imm
   */
  lui_hi(t: IReg, imm: Value);
  beql(s: IReg, t: IReg, target: Value);
  bnel(s: IReg, t: IReg, target: Value);
  blezl(s: IReg, target: Value);
  bgtzl(s: IReg, target: Value);
  lb(t: IReg, offset: Value, s: IReg);
  lh(t: IReg, offset: Value, s: IReg);
  lwl(t: IReg, offset: Value, s: IReg);
  lw(t: IReg, offset: Value, s: IReg);
  lbu(t: IReg, offset: Value, s: IReg);
  lhu(t: IReg, offset: Value, s: IReg);
  lwr(t: IReg, offset: Value, s: IReg);
  sb(t: IReg, offset: Value, s: IReg);
  sh(t: IReg, offset: Value, s: IReg);
  swl(t: IReg, offset: Value, s: IReg);
  sw(t: IReg, offset: Value, s: IReg);
  swr(t: IReg, offset: Value, s: IReg);

  /// op=0, declare functions
  sll(d: IReg, t: IReg, sh: number);
  srl(d: IReg, t: IReg, sh: number);
  sra(d: IReg, t: IReg, sh: number);
  sllv(d: IReg, t: IReg, s: IReg);
  srlv(d: IReg, t: IReg, s: IReg);
  srav(d: IReg, t: IReg, s: IReg);
  jr(s: IReg);
  jalr(s: IReg, d?: IReg);
  movz(d: IReg, s: IReg, t: IReg);
  movn(d: IReg, s: IReg, t: IReg);
  syscall(num: number);
  /**
   * from ppsspp MIPSDis.cpp, this is apparently how syscalls are handled
   * @param module
   * @param func
   */
  syscall_module(module: number, func: number);
  _break();
  mfhi(d: IReg);
  mthi(s: IReg);
  mflo(d: IReg);
  mtlo(s: IReg);
  clz(d: IReg, s: IReg);
  clo(d: IReg, s: IReg);
  mult(s: IReg, t: IReg);
  multu(s: IReg, t: IReg);
  div(s: IReg, t: IReg);
  divu(s: IReg, t: IReg);
  madd(s: IReg, t: IReg);
  maddu(s: IReg, t: IReg);
  add(d: IReg, s: IReg, t: IReg);
  addu(d: IReg, s: IReg, t: IReg);
  sub(d: IReg, s: IReg, t: IReg);
  subu(d: IReg, s: IReg, t: IReg);
  and(d: IReg, s: IReg, t: IReg);
  or(d: IReg, s: IReg, t: IReg);
  xor(d: IReg, s: IReg, t: IReg);
  nor(d: IReg, s: IReg, t: IReg);
  slt(d: IReg, s: IReg, t: IReg);
  sltu(d: IReg, s: IReg, t: IReg);
  max(d: IReg, s: IReg, t: IReg);
  min(d: IReg, s: IReg, t: IReg);
  msub(s: IReg, t: IReg);
  msubu(s: IReg, t: IReg);

  ext(t: IReg, s: IReg, pos: number, size: number);
  ins(t: IReg, s: IReg, pos: number, size: number);

  lwc1(t: FReg, offset: Value, s: IReg);
  swc1(t: FReg, offset: Value, s: IReg);
  mfc1(t: IReg, s: FReg);
  cfc1(t: IReg, s: FReg);
  mtc1(t: IReg, s: FReg);
  ctc1(t: IReg, s: FReg);

  bltz(s: IReg, target: Value);
  bgez(s: IReg, target: Value);
  bltzl(s: IReg, target: Value);
  bgezl(s: IReg, target: Value);
  bltzal(s: IReg, target: Value);
  bgezal(s: IReg, target: Value);
  bltzall(s: IReg, target: Value);
  bgezall(s: IReg, target: Value);
  bc1f(target: Value);
  bc1t(target: Value);
  bc1fl(target: Value);
  bc1tl(target: Value);

  add_s(d: FReg, s: FReg, t: FReg);
  sub_s(d: FReg, s: FReg, t: FReg);
  mul_s(d: FReg, s: FReg, t: FReg);
  div_s(d: FReg, s: FReg, t: FReg);
  sqrt_s(d: FReg, s: FReg);
  abs_s(d: FReg, s: FReg);
  mov_s(d: FReg, s: FReg);
  neg_s(d: FReg, s: FReg);
  round_s(d: FReg, s: FReg);
  trunc_s(d: FReg, s: FReg);
  ceil_s(d: FReg, s: FReg);
  floor_s(d: FReg, s: FReg);
  cvt_w_s(d: FReg, s: FReg);
  c_f(d: FReg, s: FReg);
  c_un(d: FReg, s: FReg);
  c_eq(d: FReg, s: FReg);
  c_ueq(d: FReg, s: FReg);
  c_olt(d: FReg, s: FReg);
  c_ult(d: FReg, s: FReg);
  c_ole(d: FReg, s: FReg);
  c_ule(d: FReg, s: FReg);
  c_sf(d: FReg, s: FReg);
  c_ngle(d: FReg, s: FReg);
  c_seq(d: FReg, s: FReg);
  c_ngl(d: FReg, s: FReg);
  c_lt(d: FReg, s: FReg);
  c_nge(d: FReg, s: FReg);
  c_le(d: FReg, s: FReg);
  c_ngt(d: FReg, s: FReg);
  c_s_w(d: FReg, s: FReg);
  wsbh(d: IReg, t: IReg);
  wsbw(d: IReg, t: IReg);
  seb(d: IReg, t: IReg);
  bitrev(d: IReg, t: IReg);
  seh(d: IReg, t: IReg);

  /*****************************************************************
   *                        extra opcodes
   *****************************************************************/

  /**
   * checks if declare constant fits in one instruction, otherwise use 2
   * if imm is symbol and not available, uses 2 instructions
   * @param d
   * @param imm
   */
  li(d: IReg, imm: Value);
  /**
   * always performs lui addi
   * @param d
   * @param addr
   */
  la(d: IReg, addr: Value);
  move(d: IReg, s: IReg);
  /**
   * warning: does not fill delay slot, uses at
   */
  blt(a: IReg, b: IReg, target: Value);
  /**
   * warning: does not fill delay slot, uses at
   */
  ble(a: IReg, b: IReg, target: Value);
  /**
   * warning: does not fill delay slot, uses at
   */
  bgt(a: IReg, b: IReg, target: Value);
  /**
   * warning: does not fill delay slot, uses at
   */
  bge(a: IReg, b: IReg, target: Value);

  /**
   * like lw but with an address
   */
  lwa(d: IReg, addr: Value);
  /**
   * like lh but with an address
   */
  lha(d: IReg, addr: Value);
  /**
   * like lb but with an address
   */
  lba(d: IReg, addr: Value);
  /**
   * like lhu but with an address
   */
  lhua(d: IReg, addr: Value);
  /**
   * like lbu but with an address
   */
  lbua(d: IReg, addr: Value);

  /**
   * like sw but with an address, uses at
   */
  swa(d: IReg, addr: Value);
  /**
   * like sh but with an address, uses at
   */
  sha(d: IReg, addr: Value);
  /**
   * like sb but with an address, uses at
   */
  sba(d: IReg, addr: Value);
}
