import { PSP_BASE } from "../elf/atlus_eboot";
import { Elf, SectionHeaderType } from "../elf/types";
import { align, indexOfUint8Array, range, sectorAlign, sum } from "../util/misc";
import { toDataView } from "../util/structlib";
import { File, TOCEntry } from "./common";
export const split = (buff: Uint8Array) => {
  const dv = toDataView(buff);
  const files: File[] = [];
  let ptr = 0;
  const first = dv.getUint32(ptr, true);
  let curr = dv.getUint32(ptr, true);
  while (curr != 0 && ptr < first) {
    // const start = dv.getUint32(ptr, true);
    const end = dv.getUint32(ptr + 4, true);
    if (end < curr) break;
    if (end == curr) throw `Zero sized file in earchive`;
    if (end < curr) throw `Invalid earchive`;
    if (end > buff.byteLength) throw `Invalid earchive`;
    files.push({
      data: buff.subarray(curr, end),
      offset: curr,
    });
    ptr += 8;
    curr = dv.getUint32(ptr, true);
  }
  return files;
};

export const build = (files: Uint8Array[]) => {
  const toc: TOCEntry[] = [];
  let ptr = files.length * 8;
  for (const file of files) {
    ptr = sectorAlign(ptr);
    toc.push({ offset: ptr, size: file.byteLength });
    ptr += file.byteLength;
  }
  const buff = new Uint8Array(ptr);
  const dv = toDataView(buff);
  for (let i = 0; i < toc.length; i++) {
    dv.setUint32(i * 4, toc[i].offset, true);
    dv.setUint32((i + 1) * 4, toc[i].offset + toc[i].size, true);
    buff.set(files[i], toc[i].offset);
  }
  return { data: buff, toc };
};

export const findTOC = (toc: TOCEntry[], eboot: Elf) => {
  const toclen = toc.length * 8;
  const tocData = new Uint8Array(toclen);
  const tocview = toDataView(tocData);
  let locations = [];
  // console.log(toc);
  for (let i = 0; i < toc.length; i++) {
    tocview.setUint32(i * 8, toc[i].offset, true);
    tocview.setUint32(i * 8 + 4, toc[i].offset + toc[i].size, true);
  }
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
