export interface File {
  data: Uint8Array;
  offset: number;
}
export interface TOCEntry {
  offset: number;
  size: number;
  tag?: number; //used by bnp
}

export const fileToTOC = (files: File[]): TOCEntry[] => {
  return files.map((f) => ({ offset: f.offset, size: f.data.byteLength }));
};
// export type split = (buff: Uint8Array) => File[];
// export type build = (files: Uint8Array)
