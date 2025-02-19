import { TypeHandler } from "./file_types/common";
import ear from "./file_types/ear";
import par from "./file_types/par";
import bnp from "./file_types/bnp";
import cpk from "./file_types/cpk";
import iso from "./file_types/iso";
import efb from "./file_types/efb";
import cfb from "./file_types/cfb";
import prx from "./file_types/prx";
import gim from "./file_types/gim";
import pdemo from "./file_types/pdemo";

export let typeLookup: Record<string, TypeHandler | undefined> = {
  ear,
  par,
  bnp,
  cpk,
  iso,
  efb,
  cfb,
  gim,
  prx,
  pdemo,
};
