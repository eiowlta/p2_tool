export type char = string;
export const str2chars = (str: string): char[] => {
  return [...str]; //handles unicode, mostly
};
