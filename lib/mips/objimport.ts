import {
  ElfSymbol,
  SectionHeaderFlags,
  SymbolBind,
  SymbolType,
  SymbolVisibility,
  parseElf,
  parseFlags,
  readString,
} from "../elf/types";
import { cstr, toStructBuffer } from "../util/structlib";
import { MIPS } from "./mips";
import { parseRelocs } from "./reloc";

export const importObj = (mips: MIPS, buff: Uint8Array) => {
  let elf = parseElf(buff, 0);
  //   console.log(elf);
  //   console.log(elf.sectionHeaders.map((h) => h.name));
  let strtab = elf.sectionHeaders.find((sect) => sect.name == ".strtab")!;
  let symtab = elf.sectionHeaders.find((sect) => sect.name == ".symtab")!;
  let sb = toStructBuffer(symtab.data);
  let symbols: any = [];
  while (sb.ptr < symtab.size) {
    let sym = ElfSymbol.read(sb);
    symbols.push({
      ...sym,
      name: cstr.read(toStructBuffer(strtab.data, sym.name_off)),
      bind: SymbolBind[(sym.info >> 4) as SymbolBind],
      type: SymbolType[sym.info & (0xf as SymbolType)],
      visibility: SymbolVisibility[sym.other as SymbolVisibility],
      sectName: elf.sectionHeaders[sym.shndx]?.name ?? "undefined",
      i: symbols.length,
    });
  }
  //   for (const section of elf.sectionHeaders) {
  //     if (section.flags & SectionHeaderFlags.Write) console.log(section.name);
  //     if (section.name.startsWith(".text") && section.size) {
  //       console.log(section);
  //     }
  //     if (section.name.startsWith(".rel.text")) {
  //       console.log(section.name, parseRelocs(section.data));
  //     }
  //   }
  for (const symbol of symbols) {
    if (symbol.type == "Func") {
      //   console.log(symbol);
      let section = elf.sectionHeaders[symbol.shndx];
      let rel = elf.sectionHeaders[symbol.shndx + 1];
      //   console.log(rel.name);
      let sectionStart = 0;
      let relocs = parseRelocs(rel.data);
      let write = () => {
        sectionStart = mips.currentLocation[0];
        // console.log(section.size);
        mips.provide(section.name, sectionStart, section.size);
        mips.write(section.data);
        // console.log(section.data);
        // console.log(
        //   mips.currentLocation[0] - sectionStart,
        //   sectionStart.toString(16)
        // );
        for (const reloc of relocs) {
          // mips.org(sectionStart+reloc.offset);
          //   console.log(symbols[reloc.from], reloc)
          let symbol = symbols[reloc.from];
          switch (symbol.type) {
            case "Section":
              mips.addDelayedWrite(
                elf.sectionHeaders[symbol.shndx].name,
                sectionStart + reloc.offset,
                reloc.type,
                true
              );
              break;
            case "NoType":
            case "Func":
              mips.addDelayedWrite(
                symbol.name,
                sectionStart + reloc.offset,
                reloc.type,
                true
              );
              break;
            default:
              throw new Error(`Unsupported Type ${symbol.type}`);
          }
        }
      };
      if (mips.symbols[symbol.name] === undefined) {
        mips.section("mod");
        mips.sym(symbol.name, write);
      } else {
        mips.section("eboot");
        mips.overwriteSymbol(symbol.name, write);
      }
    }
  }

  //   symbols = symbols.filter(a=>a.)
  //   console.log(symbols);
};
