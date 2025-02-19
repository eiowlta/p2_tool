import { toDataView } from "../util/structlib";
import {
  addrToOffset,
  addrToProgramOffset,
  offsetToAddr,
  parseElf,
} from "./types";

export const PSP_BASE = 0x8804000;

export const patchFileLoading = (eboot: Uint8Array) => {
  const elf = parseElf(eboot, PSP_BASE);
  //   console.log(elf);
  const str = `disc0:/sce_lbn`.split("").map((c) => c.charCodeAt(0));
  let j = 0;
  let offset;
  for (let i = 0; i < eboot.byteLength; i++) {
    if (eboot[i] == str[j]) {
      j++;
      if (j == str.length) {
        offset = i - str.length + 1;
        break;
      }
    } else {
      j = eboot[i] == str[0] ? 1 : 0;
    }
  }
  if (!offset) {
    throw `Unable to find table`;
  }
  const search = addrToProgramOffset(
    elf,
    offsetToAddr(elf, offset, PSP_BASE),
    PSP_BASE
  );

  const diff = search - offsetToAddr(elf, offset, PSP_BASE);
  const dv = toDataView(eboot);
  let count = 0;
  for (let i = 0; i < eboot.byteLength; i += 4) {
    if (dv.getUint32(i, true) == search) {
      i -= 4;
      console.log(
        `Found table at ${offsetToAddr(elf, i, PSP_BASE).toString(16)}`
      );
      do {
        const v = dv.getUint32(i, true);
        try {
          const src = addrToOffset(
            elf,
            dv.getUint32(i + 4, true) - diff,
            PSP_BASE
          );
          if (str.every((c, j) => eboot[src + j] == c)) {
            dv.setUint32(i + 4, v, true);
            count++;
            i += 8;
          } else {
            break;
          }
        } catch (e) {
          break;
        }
      } while (true);
      console.log(`Found ${count} entries`);
      return;
    }
  }
  throw `Unable to find table`;
};
