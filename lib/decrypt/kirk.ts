import * as crypto from "crypto";
import {
  TypeType,
  align,
  ref,
  struct,
  u32,
  u8,
  u8array,
} from "../util/cstructreader";
import { keyvault, kirk1_key } from "./kirk_keys";
import { memcpy } from "../util/misc";
const getKey = (num: number): Uint8Array => {
  if (num < 0 || num >= 0x80) throw "Invalid key";
  return keyvault[num];
};

export const KIRK_CMD1_HEADER = struct({
  AES_key: u8array(16),
  CMAC_key: u8array(16),
  CMAC_header_hash: u8array(16),
  CMAC_data_hash: u8array(16),
  unused: u8array(32),
  mode: u32,
  ecdsa_hash: u8,
  unk3: u8array(11),
  data_size: u32,
  data_offset: u32,
  unk4: u8array(8),
  unk5: u8array(16),
});

export const kirk7 = (
  outbuff: Uint8Array,
  inbuff: Uint8Array,
  size: number,
  id: number
) => {
  let key = getKey(id);
  let aes = crypto.createDecipheriv(
    "AES-128-CBC",
    key,
    new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
  );
  aes.setAutoPadding(false);
  outbuff.set(aes.update(inbuff.subarray(0, size)));
  let final = new Uint8Array(aes.final());
  console.assert(final.byteLength == 0);
};

const header_keys = struct({
  AES: u8array(16),
  CMAC: u8array(16),
});

const AES_cbc_decrypt = (
  key: Uint8Array,
  dst: Uint8Array,
  src: Uint8Array,
  size: number
) => {
  let aes = crypto.createDecipheriv("AES-128-CBC", key, new Uint8Array(16));
  //   console.log(size & ~15, src.byteLength);
  aes.setAutoPadding(false);
  let tmp = aes.update(src.subarray(0, (size + 15) & ~0xf));
  dst.set(tmp);
  // console.log(tmp);
  // console.assert(aes.final().byteLength == 0);
};
const AES_CMAC = (key: Uint8Array, src: Uint8Array, size: number) => {
  // let aes = crypto.createDecipheriv('', key, new Uint8Array(16));
  // src.set(aes.update(src.subarray(0, size)));
};
export const kirk_CMD10 = (inbuff: Uint8Array) => {
  const header = ref(KIRK_CMD1_HEADER, inbuff, 0);
  const keybuff = new Uint8Array(header_keys.size);
  const keys = ref(header_keys, keybuff, 0);
  if (header.mode == 1) {
    AES_cbc_decrypt(kirk1_key, keybuff, inbuff, 32);
    AES_CMAC(keys.CMAC, inbuff.subarray(0x60), 0x30);
    let chk = header.data_size;
    if (chk % 16) chk += 16 - (chk % 16);
    AES_CMAC(keys.CMAC, inbuff.subarray(0x60), 30 + chk + header.data_offset);
  }
};
export const kirk_CMD1 = (outbuf: Uint8Array, inbuf: Uint8Array) => {
  const header = ref(KIRK_CMD1_HEADER, inbuf, 0);
  const keybuff = new Uint8Array(header_keys.size);
  const keys = ref(header_keys, keybuff, 0);
  AES_cbc_decrypt(kirk1_key, keybuff, inbuf, 32);
  if (header.ecdsa_hash) throw `unsupported`;
  kirk_CMD10(inbuf);
  AES_cbc_decrypt(
    keys.AES,
    outbuf,
    inbuf.subarray(KIRK_CMD1_HEADER.size + header.data_offset),
    header.data_size
  );
};
