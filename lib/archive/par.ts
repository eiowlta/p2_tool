import { PSP_BASE } from "../elf/atlus_eboot";
import { Elf, SectionHeaderType } from "../elf/types";
import { align, indexOfUint8Array, range, sum } from "../util/misc";
import { toDataView } from "../util/structlib";
import { File, TOCEntry } from "./common";

const pspcheck = "PSPCHECK\r\n";
const pspcheck_buff = new Uint8Array(
  pspcheck.split("").map((c) => c.charCodeAt(0))
);
const check_pspscheck = (buff: Uint8Array) => {
  if (buff.byteLength != pspcheck_buff.byteLength) return false;
  return buff.every((c, i) => c == pspcheck_buff[i]);
};
export const split = (buff: Uint8Array) => {
  const dv = toDataView(buff);
  const numFiles = dv.getUint32(0, true);
  let ptr = align(16, 4 * (numFiles + 1));
  const files: File[] = [];
  for (const i of range(numFiles)) {
    const size = dv.getUint32(4 + 4 * i, true);
    if (size == 0) throw `Zero sized file in parchive`;
    if (ptr + size > buff.byteLength) throw `Invalid parchive`;
    files.push({
      data: buff.subarray(ptr, ptr + size),
      offset: ptr,
    });
    ptr += align(16, size);
  }
  if (!check_pspscheck(files.pop()!.data)) throw `parchive missing pspcheck`;
  return files;
};

export const build = (files: Uint8Array[]) => {
  files = [...files, pspcheck_buff];
  const toc: TOCEntry[] = [];
  let ptr = align(16, (files.length + 1) * 4);
  for (const file of files) {
    toc.push({ offset: ptr, size: file.byteLength });
    ptr += align(16, file.byteLength);
  }
  const buff = new Uint8Array(ptr);
  const dv = toDataView(buff);
  dv.setUint32(0, files.length, true);
  for (let i = 0; i < toc.length; i++) {
    dv.setUint32((i + 1) * 4, toc[i].size, true);
    buff.set(files[i], toc[i].offset);
  }
  return { data: buff, toc };
};

export const findTOC = (toc: TOCEntry[], eboot: Elf) => {
  const toclen = toc.length * 4 + 4;
  const tocData = new Uint8Array(toclen);
  const tocview = toDataView(tocData);
  tocview.setUint32(0, toc.length, true);
  for (let i = 0; i < toc.length; i++) {
    tocview.setUint32(4 + i * 4, toc[i].size, true);
  }
  let locations = [];
  for (const section of eboot.sectionHeaders) {
    if (section.type != SectionHeaderType.ProgBits || section.size == 0)
      continue;
    let sectionData = eboot.buff.subarray(
      section.offset,
      section.offset + section.size
    );
    let idx = indexOfUint8Array(sectionData, tocData);
    while (idx >= 0) {
      locations.push(section.addr + eboot.baseAddress + idx);
      let newIdx = indexOfUint8Array(sectionData.subarray(idx + 1), tocData);
      if (newIdx >= 0) idx += newIdx;
    }
  }
  return locations;
};
