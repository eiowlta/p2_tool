import { sectorAlign, wordAlign } from "../util/misc";
import { toDataView } from "../util/structlib";
import { TOCEntry, File } from "./common";

export const split = (buff: Uint8Array) => {
  const dv = toDataView(buff);
  const files: File[] = [];
  let count = dv.getUint32(0, true);
  let offs = [];
  for (let i = 0; i < count; i++) {
    offs.push(dv.getUint32(i * 4 + 4, true));
  }
  offs.push(buff.length);
  for (let i = 1; i < offs.length; i++) {
    files.push({
      offset: offs[i - 1],
      data: buff.subarray(offs[i - 1], offs[i]),
    });
  }
  return files;
};

export const build = (files: Uint8Array[]) => {
  let count = files.length;
  let ptr = count * 4 + 4;
  const toc: TOCEntry[] = [];
  const buff = new Uint8Array(
    4 + 4 * count + files.reduce((p, c) => p + wordAlign(c.byteLength), 0)
  );
  let dv = toDataView(buff);
  dv.setUint32(0, count, true);
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    let start = ptr;
    let end = wordAlign(ptr + file.byteLength);
    ptr = end;
    buff.set(file, start);
    dv.setUint32(4 + 4 * i, start, true);
    toc.push({ offset: start, size: file.byteLength });
  }
  return { data: buff, toc };
};
