import { basename, dirname } from "../util/filesystem";

interface VFSDirEnt<T> {
  type: "dir";
  name: string;
  children: Record<string, VFSEnt<T>>;
}
interface VFSFileEnt<T> {
  type: "file";
  name: string;
  data: T;
}
export type VFSEnt<T> = VFSDirEnt<T> | VFSFileEnt<T>;

export class VFS<T> {
  root: VFSDirEnt<T>;
  constructor() {
    this.root = { type: "dir", name: "", children: {} };
  }
  getDirEnt(path: string, mkdir: boolean): VFSDirEnt<T> | null {
    let parent = dirname(path);
    let base = basename(path);
    if (parent == path) {
      return this.root;
    } else {
      let ent = this.getDirEnt(parent, mkdir);
      if (ent == null) {
        return null;
      }
      switch (ent.type) {
        case "dir":
          if (ent.children[base] === undefined) {
            if (!mkdir) {
              return null;
            }
            ent.children[base] = {
              type: "dir",
              name: base,
              children: {},
            };
          }
          let child = ent.children[base];
          if (child.type == "dir") {
            return child;
          }
          return null;
      }
    }
  }
  addFile(path: string, data: T) {
    let ent = this.getDirEnt(dirname(path), true);
    if (ent == null)
      throw new Error(`Attempt to add file as child of file in vfs`);
    let base = basename(path);
    if (ent.children[base] !== undefined) {
      console.warn(`Warning, duplicate file for ${path}`);
    }
    ent.children[base] = {
      type: "file",
      name: base,
      data,
    };
    return data;
  }
  getFile(path: string) {
    let ent = this.getDirEnt(dirname(path), false);
    let base = basename(path);
    if (
      ent &&
      ent.children[base] !== undefined &&
      ent.children[base].type == "file"
    ) {
      // if(ent.children[base]==)
      return (ent.children[base] as VFSFileEnt<T>).data;
    }
    return null;
  }
}
