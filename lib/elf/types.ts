import { printHex, range } from "../util/misc";
import {
  StructType,
  cstr,
  exact,
  fixedString,
  pad,
  structType,
  toDataView,
  toStructBuffer,
  u16le,
  u32le,
  u8,
} from "../util/structlib";

export const ELFHdr = structType({
  magic: exact(fixedString(4), "\x7fELF"),
  class: exact(u8, 1), //expect 32 bit,
  data: exact(u8, 1), //expect little endian
  ident_version: exact(u8, 1), //expect version 1
  os_abi: u8,
  abi_version: pad(u8, 7),
  type: u16le,
  machine: u16le,
  elf_version: exact(u32le, 1),
  entry: u32le,
  phoff: u32le,
  shoff: u32le,
  flags: u32le,
  ehsize: u16le,
  phentsize: u16le,
  phnum: u16le,
  shentsize: u16le,
  shnum: u16le,
  shstrndx: u16le,
});

export enum SymbolBind {
  Local,
  Global,
  Weak,
  Loos = 10,
  Hios = 12,
  Loproc = 13,
  Hiproc = 15,
}
export enum SymbolType {
  NoType,
  Object,
  Func,
  Section,
  File,
  Common,
  Tls,
  Loos = 10,
  Hios = 12,
  Loproc = 13,
  Hiproc = 15,
}
export enum SymbolVisibility {
  Default,
  Internal,
  Hidden,
  Protected,
}
export const ElfSymbol = structType({
  name_off: u32le,
  value: u32le,
  size: u32le,
  info: u8,
  other: u8,
  shndx: u16le,
});

export enum ProgramHeaderType {
  Null,
  Load,
  Dynamic,
  Interp,
  Note,
  ShLib,
  PHDR,
  TLS,
}
export const ProgramHdr = structType({
  type: u32le,
  offset: u32le,
  vaddr: u32le,
  paddr: u32le,
  filesz: u32le,
  memsz: u32le,
  flags: u32le,
  align: u32le,
});
export enum SectionHeaderType {
  Null,
  ProgBits,
  SymbolTable,
  StringTable,
  RelocationAddends,
  Hash,
  Dynamic,
  Note,
  NoBits,
  Relocation,
  ShLib,
  DynamicSymbols,
  InitArray,
  FiniArray,
  PreinitArray,
  Group,
  SymbleTableIndices,
  Num,
  MipsReloc = 0x700000a0,
}
export enum SectionHeaderFlags {
  Write = 1,
  Alloc = 2,
  Executable = 4,
  Merge = 0x10,
  Strings = 0x20,
  InfoLink = 0x40,
  LinkOrder = 0x80,
  OSNonConforming = 0x100,
  Group = 0x200,
  TLS = 0x400,
}

export const parseFlags = (n: number) => {
  let res: (string | number)[] = [];
  let v = 0x400;
  while (v > 0) {
    if (n & v) res.push(SectionHeaderFlags[v]);
    n &= ~v;
    v >>= 1;
  }
  if (n) res.push(n);
  return res;
};
export const SectionHdr = structType({
  name_off: u32le,
  type: u32le,
  flags: u32le,
  addr: u32le,
  offset: u32le,
  size: u32le,
  link: u32le,
  info: u32le,
  addralign: u32le,
  entsize: u32le,
});

interface SectionHeader {
  name: string;
  name_off: number;
  data: Uint8Array;
  type: number;
  flags: number;
  addr: number;
  offset: number;
  size: number;
  link: number;
  info: number;
  addralign: number;
  entsize: number;
}

export const calculateElfSize = (elf: Uint8Array): number => {
  let header = ELFHdr.read(toStructBuffer(elf, 0, true));
  let size = 0;
  size = [...range(0, header.shnum)]
    .map((i) => header.shoff + i * header.shentsize)
    .map((off) => toStructBuffer(elf, off, true))
    .map(SectionHdr.read)
    .reduce((size, shdr) => {
      return Math.max(shdr.size + shdr.offset, size);
    }, 0);
  return size;
};

export interface Elf {
  buff: Uint8Array;
  baseAddress: number;
  header: StructType<typeof ELFHdr>;
  sectionHeaders: SectionHeader[];
  programHeaders: StructType<typeof ProgramHdr>[];
}
export const parseElf = (data: Uint8Array, baseAddress: number): Elf => {
  let header = ELFHdr.read(toStructBuffer(data, 0, true));
  let sections = [...sectionHeaders(data, header)];
  let programs = [...programHeaders(data, header)];
  // console.log(header);
  return {
    buff: data,
    header,
    baseAddress,
    sectionHeaders: sections.map((section) => {
      return {
        ...section,
        name: cstr.read(
          toStructBuffer(
            data,
            section.name_off + sections[header.shstrndx].offset
          )
        ),
        data: data.subarray(section.offset, section.offset + section.size),
      };
    }),
    programHeaders: programs,
  };
};
export const readString = (elf: Elf, offset: number) => {
  return cstr.read(
    toStructBuffer(
      elf.buff,
      offset + elf.sectionHeaders[elf.header.shstrndx].offset
    )
  );
};

function* programHeaders(elf: Uint8Array, header: Elf["header"]) {
  for (let i = 0; i < header.phnum; i++)
    yield ProgramHdr.read(
      toStructBuffer(elf, i * header.phentsize + header.phoff)
    );
}

function* sectionHeaders(elf: Uint8Array, header: Elf["header"]) {
  for (let i = 0; i < header.shnum; i++)
    yield SectionHdr.read(
      toStructBuffer(elf, i * header.shentsize + header.shoff)
    );
}

export const addrToProgramOffset = (
  elf: Elf,
  addr: number,
  loadAddress: number
) => {
  addr -= loadAddress;
  for (let program of elf.programHeaders) {
    if (program.vaddr < addr && program.vaddr - addr < program.memsz) {
      return addr - program.vaddr;
    }
  }
  throw `Not loaded into memory`;
};

export const addrToOffset = (elf: Elf, addr: number, loadAddress: number) => {
  addr -= loadAddress;
  for (let program of elf.programHeaders) {
    if (program.vaddr < addr && program.vaddr - addr < program.memsz) {
      return addr - program.vaddr + program.offset;
    }
  }
  throw `Not loaded into memory`;
};

export const offsetToAddr = (elf: Elf, offset: number, loadAddress: number) => {
  for (let program of elf.programHeaders) {
    if (program.offset < offset && program.offset - offset < program.filesz) {
      return loadAddress + program.vaddr + offset - program.offset;
    }
  }
  //   for (let section of elf.sectionHeaders) {
  //     if (section.offset < offset && section.offset - offset < section.size)
  //       return loadAddress + section.addr;
  //   }
  throw `Not loaded into memory`;
};
