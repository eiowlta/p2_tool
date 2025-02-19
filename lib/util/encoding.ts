import { char } from "../msg/util";
import { joinPath, readTextFile } from "./filesystem";

export enum EncodingScheme {
  event = "event",
  font = "font",
  // estr_half, //used by dungeon
}
export interface Locale {
  event: Encoding;
  font: Encoding;
}

export interface Encoding {
  utf2bin: Record<char, number>;
  bin2utf: Record<number, char>;
}

type FontMap = Record<number, char[][]>;
type EventMap = Record<string, char>;

let showFontWarnings = false;

export const loadFontEncoding = (font: FontMap): Encoding => {
  let utf2bin: Record<char, number> = {};
  let bin2utf: Record<number, char> = {};
  for (const i_str in font) {
    const i = parseInt(i_str);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        let c = font[i_str][y][x];
        let v = x + 16 * (y + 16 * i);
        if (c != "") {
          if (utf2bin[c] !== undefined) {
            if (showFontWarnings)
              console.warn(`Duplicate character in font ${c}`);
          } else {
            utf2bin[c] = v;
          }
          bin2utf[v] = c;
        } else {
          //no need to warn here
          // console.warn(`Character ${i_str} not assigned`);
        }
      }
    }
  }
  return { utf2bin, bin2utf };
};
export const loadEventEncoding = (event: EventMap): Encoding => {
  let utf2bin: Record<char, number> = {};
  let bin2utf: Record<number, char> = {};
  for (const i_str in event) {
    const v = parseInt(i_str, 16);
    const c = event[i_str];
    if (c != "") {
      if (utf2bin[c] !== undefined) {
        if (showFontWarnings) console.warn(`Duplicate character in event ${c}`);
      } else {
        utf2bin[c] = v;
      }
      bin2utf[v] = c;
    } else {
      if (showFontWarnings) console.warn(`Character ${i_str} not assigned`);
    }
  }

  return { utf2bin, bin2utf };
};
let locales: Record<string, Locale> = {};
export const loadLocale = async (path: string): Promise<Locale> => {
  if (locales[path] === undefined) {
    const font_data = JSON.parse(
      await readTextFile(joinPath(path, "font.json"))
    ) as FontMap;
    const event_data = JSON.parse(
      await readTextFile(joinPath(path, "event.json"))
    ) as EventMap;
    locales[path] = {
      event: loadEventEncoding(event_data),
      font: loadFontEncoding(font_data),
    };
  }
  return locales[path];
};


// export const string2encoding = 