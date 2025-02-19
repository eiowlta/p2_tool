export type FileExt = string;
export type _FileList = Record<string, FileExt | FileInfo | undefined>;
export interface FileInfo {
  type: string;
  files?: _FileList;
  group?: number;
  extractName?: string;
  resetOnTagChange?: boolean;
  resetOnTagZero?: boolean;
  lowerTag?: boolean;
  groups?: FileExt[];
  bpp?: number;
  file_template?: string | FileInfo;
  bnp_pattern?: string;
  compressed?: boolean;
  filenames?: string[];
  templates?: Templates;
  bnp_patterns?: BNPPatterns;
}
export type Templates = Record<string, FileInfo | undefined>;
export interface BNPPattern {
  tags: Record<string, FileExt>;
}
export type BNPPatterns = Record<string, BNPPattern | undefined>;
