import { Alignment, align, wordAlign } from "../util/misc";
import { toStructBuffer } from "../util/structlib";
import {
  ELFHdr,
  Elf,
  ProgramHdr,
  SectionHdr,
  SectionHeaderFlags,
  parseElf,
} from "./types";

// export const insertSection = (
//   elf: Elf,
//   data: Uint8Array,
//   name: string,
//   address: number
// ) => {
//   let programSections = [];
//   for (const prgrm of elf.programHeaders) {
//     let includedSections = elf.sectionHeaders
//       .filter((f) => {
//         return (
//           prgrm.offset + prgrm.filesz > f.offset &&
//           prgrm.offset <= f.offset &&
//           prgrm.filesz >= f.size
//         );
//       })
//       .map((m) => m.name);

//     programSections.push(includedSections);
//   }
//   let strTab = elf.sectionHeaders[elf.header.shstrndx];
//   let newStrTabData = new Uint8Array(strTab.size + name.length + 1);
//   let newNameOff = strTab.size;
//   newStrTabData.set(strTab.data);
//   for (let i = 0; i < name.length; i++) {
//     newStrTabData[strTab.size + i] = name.charCodeAt(i);
//   }
//   strTab.size += name.length + 1;
//   strTab.data = newStrTabData;
//   elf.header.shnum++;
//   elf.header.phnum++;

//   //   elf.header.entry += elf.header.phentsize;
//   // for (let i = 0; i < elf.sectionHeaders.length; i++) {
//   //   if (elf.sectionHeaders[i].size) {
//   //     elf.sectionHeaders[i].offset += elf.header.phentsize;
//   //     // if (elf.sectionHeaders[i].offset > elf.header.shoff)
//   //     //   elf.sectionHeaders[i].offset += elf.header.shentsize;
//   //     //   if (elf.sectionHeaders[i].offset > strTab.offset)
//   //     //     elf.sectionHeaders[i].offset += name.length + 1;
//   //   }
//   // }

//   let currentEnd = elf.sectionHeaders.reduce((p, c) =>
//     c.size ? (p.offset > c.offset ? p : c) : p
//   );
//   let newSection = {
//     name,
//     name_off: newNameOff,
//     type: 1,
//     flags: 7,
//     addr: address,
//     offset: align(16, currentEnd.offset + currentEnd.size),
//     size: data.byteLength,
//     link: 0,
//     info: 0,
//     addralign: 16,
//     entsize: 0,
//     data,
//   };
//   elf.sectionHeaders.push(newSection);
//   elf.header.phoff = newSection.offset + newSection.size;
//   elf.header.shoff = elf.header.phoff + elf.header.phentsize * elf.header.phnum;
//   //   let offset = elf.header.phoff + elf.header.phentsize * elf.header.phnum;

//   let newPhdr = {
//     type: 1,
//     offset: newSection.offset,
//     vaddr: address,
//     paddr: 0,
//     filesz: data.byteLength,
//     memsz: data.byteLength,
//     flags: 6,
//     align: 64,
//   };
//   elf.programHeaders.splice(2, 0, newPhdr);
//   //   elf.programHeaders.push(newPhdr);

//   let newBuff = new Uint8Array(
//     elf.header.shoff + elf.header.shentsize * elf.header.shnum
//   );

//   ELFHdr.write(toStructBuffer(newBuff, 0, true), elf.header);
//   let phdrs = toStructBuffer(newBuff, elf.header.phoff, true);
//   for (let i = 0; i < elf.programHeaders.length; i++) {
//     ProgramHdr.write(phdrs, elf.programHeaders[i]);
//   }
//   let shdrs = toStructBuffer(newBuff, elf.header.shoff, true);
//   for (let i = 0; i < elf.sectionHeaders.length; i++) {
//     SectionHdr.write(shdrs, elf.sectionHeaders[i]);
//     newBuff.set(elf.sectionHeaders[i].data, elf.sectionHeaders[i].offset);
//   }
//   // return newBuff;
//   return parseElf(newBuff, 0x8804000);
// };

export const insertSection = (
  elf: Elf,
  data: Uint8Array,
  name: string,
  address: number
) => {
  let programSections = [];
  for (const prgrm of elf.programHeaders) {
    let includedSections = elf.sectionHeaders.filter((f) => {
      return (
        prgrm.offset + prgrm.filesz > f.offset &&
        prgrm.offset <= f.offset &&
        prgrm.filesz >= f.size
      );
    });
    // .map((m) => m.name);

    // let includedSections = elf.sectionHeaders
    //   .filter((f) => {
    //     return (
    //       prgrm.offset + prgrm.filesz > f.offset &&
    //       prgrm.offset <= f.offset &&
    //       prgrm.filesz >= f.size
    //     );
    //   })

    programSections.push(includedSections);
  }
  console.log(programSections.map((a) => a.map((b) => b.name)));
  let strTab = elf.sectionHeaders[elf.header.shstrndx];
  let newStrTabData = new Uint8Array(strTab.size + name.length + 1);
  let newNameOff = strTab.size;
  newStrTabData.set(strTab.data);
  for (let i = 0; i < name.length; i++) {
    newStrTabData[strTab.size + i] = name.charCodeAt(i);
  }
  strTab.size += name.length + 1;
  strTab.data = newStrTabData;
  elf.header.shnum++;

  // elf.header.phnum++;

  //   elf.header.entry += elf.header.phentsize;
  // for (let i = 0; i < elf.sectionHeaders.length; i++) {
  //   if (elf.sectionHeaders[i].size) {
  //     elf.sectionHeaders[i].offset += elf.header.phentsize;
  //     // if (elf.sectionHeaders[i].offset > elf.header.shoff)
  //     //   elf.sectionHeaders[i].offset += elf.header.shentsize;
  //     //   if (elf.sectionHeaders[i].offset > strTab.offset)
  //     //     elf.sectionHeaders[i].offset += name.length + 1;
  //   }
  // }

  let currentEnd = elf.sectionHeaders.reduce((p, c) =>
    c.size ? (p.offset > c.offset ? p : c) : p
  );
  let newSection = {
    name,
    name_off: newNameOff,
    type: 1,
    flags: 7,
    addr: address,
    offset: align(16, currentEnd.offset + currentEnd.size),
    size: data.byteLength,
    link: 0,
    info: 0,
    addralign: 16,
    entsize: 0,
    data,
  };

  let dataSections = elf.sectionHeaders.filter((a) => {
    return (
      a.name.startsWith(".data") ||
      a.name.startsWith(".bss") ||
      a.name.startsWith(".sbss")
    );
  });
  // let rester = elf.sectionHeaders.filter(a=>a)
  dataSections.push(newSection);
  let start = align(64, currentEnd.offset + currentEnd.size);
  let size = start;
  for (const section of dataSections) {

    if (section.type == 8) {
      section.data = new Uint8Array(section.size);
      section.type = 1;
      section.flags = 3;
    }

    start = align(section.addralign as Alignment, start);
    section.offset = start;
    console.log(section.name);
    start += section.size;
  }
  elf.sectionHeaders.push(newSection);
  // elf.header.phoff = newSection.offset + newSection.size;
  // elf.header.shoff = elf.header.phoff + elf.header.phentsize * elf.header.phnum;
  elf.header.shoff = align(16, start);
  //   let offset = elf.header.phoff + elf.header.phentsize * elf.header.phnum;

  let newPhdr = {
    type: 1,
    offset: newSection.offset,
    vaddr: address,
    paddr: 0,
    filesz: data.byteLength,
    memsz: data.byteLength,
    flags: 6,
    align: 64,
  };
  // elf.programHeaders.splice(2, 0, newPhdr);
  //   elf.programHeaders.push(newPhdr);
  elf.programHeaders[1].offset = size;
  elf.programHeaders[1].filesz = newSection.offset + newSection.size - size;
  elf.programHeaders[1].memsz = elf.programHeaders[1].filesz;
  // elf.programHeaders[1].memsz = dataSections.reduce((p, c) => p + c.size, 0);

  let newBuff = new Uint8Array(
    elf.header.shoff + elf.header.shentsize * elf.header.shnum
  );

  ELFHdr.write(toStructBuffer(newBuff, 0, true), elf.header);
  let phdrs = toStructBuffer(newBuff, elf.header.phoff, true);
  for (let i = 0; i < elf.programHeaders.length; i++) {
    ProgramHdr.write(phdrs, elf.programHeaders[i]);
  }
  let shdrs = toStructBuffer(newBuff, elf.header.shoff, true);
  for (let i = 0; i < elf.sectionHeaders.length; i++) {
    SectionHdr.write(shdrs, elf.sectionHeaders[i]);
    newBuff.set(elf.sectionHeaders[i].data, elf.sectionHeaders[i].offset);
  }
  // return newBuff;
  return parseElf(newBuff, 0x8804000);
};
