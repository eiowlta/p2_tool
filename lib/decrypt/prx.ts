import { ref, struct, u8array } from "../util/cstructreader";
import { memcpy } from "../util/misc";
import { toDataView } from "../util/structlib";
import { KIRK_CMD1_HEADER, kirk7, kirk_CMD1 } from "./kirk";
import * as crypto from "crypto";
const key_D91613F0 = new Uint8Array([
  0xeb, 0xff, 0x40, 0xd8, 0xb4, 0x1a, 0xe1, 0x66, 0x91, 0x3b, 0x8f, 0x64, 0xb6,
  0xfc, 0xb7, 0x12,
]);

const tagInfo = {
  tag: 0xd91613f0,
  key: key_D91613F0,
  code: 0x5d,
  type: 2,
};

const PRXType2 = struct({
  tag: u8array(4),
  empty: u8array(0x58),
  id: u8array(0x10),
  sha1: u8array(0x14),
  kirkHeader: u8array(0x40),
  kirkMetadata: u8array(0x10),
  prxHeader: u8array(0x80),
});
const constructPRXType2 = (prx: Uint8Array) => {
  let type2Buff = new Uint8Array(PRXType2.size);
  let type2 = ref(PRXType2, type2Buff, 0);
  memcpy(type2.tag, prx.subarray(0xd0), type2.tag.byteLength);
  memcpy(type2.id, prx.subarray(0x140), type2.id.byteLength);
  memcpy(type2.sha1, prx.subarray(0x12c), type2.sha1.byteLength);
  memcpy(type2.kirkHeader, prx.subarray(0x80), 0x30);
  memcpy(type2.kirkHeader.subarray(0x30), prx.subarray(0xc0), 0x10);
  memcpy(type2.kirkMetadata, prx.subarray(0xb0), type2.kirkMetadata.byteLength);
  memcpy(type2.prxHeader, prx, type2.prxHeader.byteLength);

  // return { buff: type2Buff, obj: type2 };
  return {
    ...type2,
    decrypt: (key: number) => {
      kirk7(
        type2Buff.subarray(PRXType2.offsetOf!("id")),
        type2Buff.subarray(PRXType2.offsetOf!("id")),
        0x60,
        key
      );
    },
  };
};

const expandSeed = (
  seed: Uint8Array,
  key: number,
  bonusSeed?: Uint8Array
): Uint8Array => {
  let expandedSeed = new Uint8Array(0x90);
  for (let i = 0; i < 0x90; i += 0x10) {
    memcpy(expandedSeed.subarray(i), seed, 0x10);
    expandedSeed[i] = i / 0x10;
  }
  kirk7(expandedSeed, expandedSeed, expandedSeed.byteLength, key);
  if (bonusSeed) {
    for (let i = 0; i < 0x90; i++) {
      expandedSeed[i] ^= bonusSeed[i % 10];
    }
  }
  return expandedSeed;
};

const decryptKirkHeader = (
  outbuf: Uint8Array,
  inbuf: Uint8Array,
  xorbuf: Uint8Array,
  key: number
) => {
  for (let i = 0; i < 0x40; i++) {
    outbuf[i] = inbuf[i] ^ xorbuf[i];
  }
  kirk7(outbuf, outbuf, 0x40, key);
  for (let i = 0; i < 0x40; i++) {
    outbuf[i] = outbuf[i] ^ xorbuf[i + 0x40];
  }
};

const copyBufferRange = (
  outbuf: Uint8Array,
  inbuf: Uint8Array,
  cmd: number
) => {
  if (cmd != 1) throw "";
  kirk_CMD1(outbuf, inbuf);
};
const pspDecryptType2 = async (prx: Uint8Array, outsize: number) => {
  let dv = toDataView(prx);
  //   const decryptSize = dv.getUint32(0xb0, true); //returned in original, otherwise unused
  if (dv.getUint32(0xd0, true) != tagInfo.tag) throw `Unknown decryption tag`;

  const xorbuf = await expandSeed(tagInfo.key, tagInfo.code);

  let type2 = constructPRXType2(prx);
  type2.decrypt(tagInfo.code);

  const sha1 = crypto.createHash("sha1");
  sha1.update(type2.tag);
  sha1.update(xorbuf.subarray(0, 0x10));
  sha1.update(type2.empty);
  sha1.update(type2.id);
  sha1.update(type2.kirkHeader);
  sha1.update(type2.kirkMetadata);
  sha1.update(type2.prxHeader);
  const sha = sha1.digest();
  if (sha.compare(type2.sha1) != 0) throw `Bad SHA1`;

  const headerOffset = 64;

  const outbuf = new Uint8Array(outsize);
  const headerSize = KIRK_CMD1_HEADER.size;

  outbuf.set(prx.subarray(0, outsize));
  const header = ref(KIRK_CMD1_HEADER, outbuf, 64);
  outbuf.fill(0, headerOffset, headerOffset + KIRK_CMD1_HEADER.size);
  outbuf.set(
    type2.kirkMetadata,
    headerOffset + KIRK_CMD1_HEADER.offsetOf!("data_size")
  );
  outbuf.set(type2.prxHeader, headerOffset + headerSize);
  decryptKirkHeader(
    outbuf.subarray(headerOffset),
    type2.kirkHeader,
    xorbuf.subarray(0x10),
    tagInfo.code
  );
  header.mode = 1;
  copyBufferRange(outbuf, outbuf.subarray(headerOffset), 1);
  return outbuf;
};
export const pspDecryptPRX = async (inbuf: Uint8Array, outsize: number) => {
  return await pspDecryptType2(inbuf, outsize);
};
