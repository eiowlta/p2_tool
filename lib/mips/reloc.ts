import { PSP_BASE } from "../elf/atlus_eboot";
import {
  Elf,
  SectionHeaderType,
  addrToProgramOffset,
  parseFlags,
} from "../elf/types";
import { toDataView } from "../util/structlib";

export enum RelocType {
  None,
  Mips16,
  Mips32,
  Mips26 = 4,
  MipsHi16,
  MipsLo16,
}

export interface Reloc {
  offset: number;
  type: RelocType;
  from: number;
  to: number;
}

export const parseRelocs = (buff: Uint8Array) => {
  const dv = toDataView(buff);
  let relocs: Reloc[] = [];
  for (let i = 0; i < dv.byteLength; i += 8) {
    let offset = dv.getUint32(i, true);
    let type = buff[i + 4];
    let from = buff[i + 5];
    let to = buff[i + 6];
    if (RelocType[type] === undefined) throw `Unknown relocation type ${type}`;
    relocs.push({
      offset,
      type,
      from,
      to,
    });
  }
  return relocs;
};

interface RelocLookupInfo {
  fileOffset: number;
  type: RelocType;
  to: number;
}
export type RelocTable = Record<number, RelocLookupInfo | undefined>;
export type RelocReferenceTable = Record<string, string[] | undefined>;

export const buildRelocTable = (elf: Elf): RelocTable => {
  const table: RelocTable = {};
  for (const section of elf.sectionHeaders) {
    if (section.type == SectionHeaderType.MipsReloc) {
      let relocs = parseRelocs(section.data);
      for (let i = 0; i < relocs.length; i++) {
        const reloc = relocs[i];
        const fileOffset = i * 8 + section.offset;
        const memoryOffset =
          elf.baseAddress + elf.programHeaders[reloc.from].vaddr + reloc.offset;
        table[memoryOffset] = {
          fileOffset,
          type: reloc.type,
          to: elf.baseAddress + elf.programHeaders[reloc.to].vaddr,
        };
      }
    }
  }
  return table;
};
export const buildReferenceTable = (elf: Elf) => {
  const table: RelocReferenceTable = {};
  let dv = toDataView(elf.buff.slice(0xc0));
  let base = 0x8804000;
  for (const section of elf.sectionHeaders) {
    if (section.type != SectionHeaderType.MipsReloc) continue;
    let relocs = parseRelocs(section.data);
    let last_hi = 0;
    for (let i = 0; i < relocs.length; i++) {
      const reloc = relocs[i];
      const fileOffset = i * 8 + section.offset;
      const from =
        elf.baseAddress + elf.programHeaders[reloc.from].vaddr + reloc.offset;
      let to = elf.baseAddress + elf.programHeaders[reloc.to].vaddr;
      // switch (reloc.type) {
      //   case RelocType.Mips32:
      //     break;
      // }
    }
  }
  return table;
};
/**
 *
 * @param elf relocates elf in place
 * returns relocated data
 */
// export const relocateElf = (elf: Elf): RelocTable => {
//   let table = buildRelocTable(elf);
//   for(const addr of table) {

//   }
//   return table;
// };
// export const buildReferenceTable = (elf: Elf) => {
//   const table: Record<number, number[]> = {};
// };
