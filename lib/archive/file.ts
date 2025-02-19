import { cstr, toDataView, toStructBuffer } from "../util/structlib";
import * as bnp from "../archive/bnp";
import * as ear from "../archive/ear";
import * as par from "../archive/par";

interface FileTypeChecker {
  check: (buff: Uint8Array) => boolean;
  ext: string;
}
type CheckFn = (buff: Uint8Array, dv: DataView) => boolean;

const read_cstr = (dv: DataView, off: number) => {
  return cstr.read(toStructBuffer(dv, off));
};

const types: Record<string, CheckFn> = {
  gz: (buff) => buff.byteLength > 8 && buff[0] == 0x1f && buff[1] == 0x8b,
  gim: (buff) =>
    buff.byteLength >= 4 &&
    String.fromCharCode(...buff.subarray(0, 4)) == "MIG.",
  smd: (buff, dv) => {
    return cstr.read(toStructBuffer(dv)).endsWith(".smd");
  },
  escript: (buff, dv) => {
    return (
      read_cstr(dv, dv.getUint32(0, true)) == "START" ||
      read_cstr(dv, dv.getUint32(4, true)) == "START"
    );
  },
  bnp: (buff, dv) => bnp.split(buff).length > 0,
  ear: (buff, dv) => ear.split(buff).length > 0,
  par: (buff, dv) => par.split(buff).length > 0,
  cscript: (buff, dv) => {
    if (buff.byteLength < 8) return false;
    if (dv.getUint16(0, true) != 8) return false;
    if (dv.getUint16(2, true) != 8)
      if (dv.getUint16(8, true) != 0) return false;
    if (dv.getUint16(4, true) != dv.getUint16(6, true)) {
      if (dv.getUint16(4, true) > buff.byteLength - 2) return false;
      if (dv.getUint16(dv.getUint16(4, true), true) != 0) return false;
    }
    return true;
  },
  tim: (buff, dv) => {
    if (buff.byteLength < 20) return false;
    if (dv.getUint32(0, true) != 0x10) return false;
    if (dv.getUint32(4, true) != 0) return false;
    return true;
  },
  clt: (buff, dv) => {
    if (buff.byteLength < 20) return false;
    if (dv.getUint32(0, true) != 0x12) return false;
    if (dv.getUint32(4, true) != 2) return false;
    return true;
  },
  pxl: (buff, dv) => {
    if (buff.byteLength < 20) return false;
    if (dv.getUint32(0, true) != 0x11) return false;
    if (dv.getUint32(4, true) != 0) return false;
    return true;
  },
};

const typeKeys = Object.keys(types);

export const checkType = (buff: Uint8Array) => {
  const dv = toDataView(buff);
  for (const key of typeKeys) {
    console.log(`Trying ${key}`);
    try {
      if (types[key](buff, dv)) return key;
    } catch {}
  }
  return "unk";
};
