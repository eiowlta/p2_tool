import { Alignment, align } from "../util/misc";
import { MIPS } from "./mips";

interface Range {
  section: string;
  start: number;
  end: number;
}
interface RangeTree {
  value: Range;
  left?: RangeTree;
  right?: RangeTree;
}
export class SpaceManager {
  ranges: Range[];
  mips: MIPS;
  enabled: boolean;
  constructor(mips: MIPS, enabled: boolean) {
    this.mips = mips;
    this.ranges = [];
    this.enabled = enabled;
  }
  addRange(section: string, start: number, size: number) {
    if (!this.enabled) return;
    this.ranges.push({
      section,
      start,
      end: start + size,
    });
  }
  updateRangeInfo() {
    if (this.ranges.length == 0) return;
    this.ranges.sort((a, b) => {
      if (a.start < b.start) return -1;
      if (a.start == b.start) return a.end - b.end;
      return 1;
    });
    let newRanges = [];
    let current = this.ranges[0];
    for (let i = 1; i < this.ranges.length; i++) {
      if (current.end <= this.ranges[i].start) {
        current.end = this.ranges[i].end;
      } else {
        newRanges.push(current);
        current = this.ranges[i];
      }
    }
    newRanges.push(current);
    this.ranges = newRanges;
  }
  allocSymbol(
    alignment: Alignment,
    size: number,
    fallbackSection: string,
    symbolName: string,
    fn: () => void
  ) {
    let startSection = this.mips.currentSection;
    let candidates = this.ranges.filter(
      (a) => a.end - align(alignment, a.start) <= size
    );
    this.mips.section(fallbackSection);
    let match = candidates.find((a) => a.end - a.start == size);
    if (match) {
      //we used everything, remove it
      let idx = this.ranges.findIndex((v) => v == match);
      this.ranges.splice(idx, 1);
    } else {
      candidates.sort((a, b) => a.end - a.start - (b.end - b.start));
      match = candidates[0];
    }
    if (match) {
      this.mips.addSubsection(
        match.section,
        symbolName,
        match.start,
        match.end
      );
      this.mips.section(match.section);
      this.mips.align(alignment);
      match.start = this.mips.here() + size;
    }
    this.mips.sym(symbolName, fn);
    this.mips.section(startSection);
  }
}
