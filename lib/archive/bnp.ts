import { Elf, SectionHeaderType } from "../elf/types";
import { indexOfUint8Array, sectorAlign, wordAlign } from "../util/misc";
import { toDataView } from "../util/structlib";
import { TOCEntry, File } from "./common";
const SECTOR = 2048;

export const split = (buff: Uint8Array) => {
  const dv = toDataView(buff);

  const files: File[] = [];
  let ptr = 0;
  while (ptr < buff.byteLength) {
    if (buff[ptr] === 0) {
      if ((ptr & 0x7ff) == 0) throw `Invalid BNP`;
      ptr = sectorAlign(ptr);
      continue;
    }
    const size = dv.getUint32(ptr + 4, true);
    if (size < 8 || size > 1024 * 1024 * 1024) throw `Invalid BNP header`;
    if (ptr + size > buff.byteLength) throw `Invalid BNP`;
    files.push({ data: buff.subarray(ptr, ptr + size), offset: ptr });
    ptr += wordAlign(size);
  }
  return files;
};

export const build = (files: Uint8Array[], group: number) => {
  const toc: TOCEntry[] = [];
  let ptr = 0;
  for (const file of files) {
    const rem = SECTOR - (ptr & (SECTOR - 1));
    if (rem < 0x10) ptr = sectorAlign(ptr);
    toc.push({
      offset: ptr,
      size: file.byteLength,
      tag: file[2] | (file[3] << 8),
    });
    ptr += file.byteLength;
    if (group > 0 && toc.length % group == 0) ptr = sectorAlign(ptr);
    else ptr = wordAlign(ptr);
  }
  const buff = new Uint8Array(ptr);
  for (let i = 0; i < toc.length; i++) {
    buff.set(files[i], toc[i].offset);
  }
  return { data: buff, toc };
};

export const findTOC_sector = (toc: TOCEntry[], eboot: Elf) => {
  let locations = [];
  let len = toc.length * 8;
  let buff = new Uint8Array(len);
  let view = toDataView(buff);
  for (let i = 0; i < toc.length; i++) {
    let sector = Math.floor(toc[i].offset / 0x800);
    let off = toc[i].offset & 0x7ff;
    view.setUint16(i * 8, off, true);
    view.setUint16(i * 8 + 2, sector, true);
    view.setUint32(i * 8 + 4, toc[i].size, true);
  }
  for (const section of eboot.sectionHeaders) {
    if (section.type != SectionHeaderType.ProgBits || section.size == 0)
      continue;
    let sectionData = eboot.buff.subarray(
      section.offset,
      section.offset + section.size
    );
    let idx = indexOfUint8Array(sectionData, buff);
    while (idx >= 0) {
      locations.push(section.addr + eboot.baseAddress + idx);
      let newIdx = indexOfUint8Array(sectionData.subarray(idx + 1), buff);
      if (newIdx >= 0) idx += newIdx;
    }
  }
  return locations;
};

export const findTOC_sector_files = (toc: TOCEntry[], eboot: Elf) => {
  let locations = [];
  for (const section of eboot.sectionHeaders) {
    if (section.type != SectionHeaderType.ProgBits || section.size == 0)
      continue;
    let sectionData = eboot.buff.subarray(
      section.offset,
      section.offset + section.size
    );
    let view = toDataView(sectionData);
    for (let i = 0; i < sectionData.byteLength; i += 2) {
      let fileOff = 0;
      let ptr = i;
      while (ptr <= sectionData.byteLength - 8 && fileOff < toc.length) {
        let num_files = view.getUint16(ptr + 6, true);
        if (num_files == 0) break;
        if (num_files > toc.length - fileOff) break;
        if (view.getUint16(ptr, true) != 0) break;
        let currentOffset = toc[fileOff].offset;
        let numSectors = view.getUint16(ptr + 4, true);
        let sectorStart = view.getUint16(ptr + 2, true);
        if (sectorStart != currentOffset >> 11) break;
        let end =
          toc[fileOff + num_files - 1].offset +
          sectorAlign(toc[fileOff + num_files - 1].size);
        if ((end - currentOffset) >> 11 != numSectors) break;
        fileOff += num_files;
        ptr += 8;
      }
      if (fileOff == toc.length) {
        locations.push(section.addr + eboot.baseAddress + i);
      }
    }
  }
  return locations;
};

export const findTOC_files_off32 = (toc: TOCEntry[], eboot: Elf) => {
  let locations = [];
  for (const section of eboot.sectionHeaders) {
    if (section.type != SectionHeaderType.ProgBits || section.size == 0)
      continue;
    let sectionData = eboot.buff.subarray(
      section.offset,
      section.offset + section.size
    );
    let view = toDataView(sectionData);
    for (let i = 0; i < sectionData.byteLength; i += 2) {
      let fileOff = 0;
      let ptr = i;
      while (ptr <= sectionData.byteLength - 4 && fileOff < toc.length) {
        let ent = view.getUint32(ptr, true);
        // console.log(ent.toString(16), fileOff.toString(16));
        let num_files = (ent >> 0x19) & 0x3f;
        let off = ent & 0x1ffffff;
        if (num_files == 0) break;
        if (num_files > toc.length - fileOff) break;
        let currentOffset = toc[fileOff].offset;
        if (off != currentOffset) break;
        fileOff += num_files;
        ptr += 4;
      }
      if (fileOff == toc.length) {
        locations.push(section.addr + eboot.baseAddress + i);
      }
    }
  }
  return locations;
};
