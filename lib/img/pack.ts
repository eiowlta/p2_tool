import { readBinaryFile } from "../util/filesystem";
import { Image } from "./img";

export const pack = async (images: Image[]) => {
  let data = images.map((a, i) => ({ idx: i, img: a }));
  data.sort((a, b) => {
    return b.img.width - a.img.width;
  });
  let rowHeight = images[0].height;
  let sum = images.reduce((p, c) => p + c.width, 0);
  let desiredSize = Math.sqrt(rowHeight * sum) + rowHeight - 1;
  desiredSize -= desiredSize % rowHeight;
  let rows: (typeof data)[] = [];
  let rowWidths: number[] = [];
  let avgLength = sum / images.length;
  let ratio = avgLength / rowHeight;
  //   let width = avgLength * ratio;
  let width = 0;
  let height = 0;
  let area = 0;
  for (const datum of data) {
    let best = rows.length;
    let bestArea = Math.abs(height - width) + rowHeight;
    for (let i = 0; i < rows.length; i++) {
      //   let newArea = Math.max(0, datum.img.width + rowWidths[i] - width);
      let newArea = Math.abs(
        Math.max(width, datum.img.width + rowWidths[i]) - height
      );
      if (newArea < bestArea) {
        bestArea = newArea;

        best = i;
      }
    }
    console.log(best, bestArea);
    if (best == rows.length) {
      rows.push([]);
      rowWidths.push(0);
      height += rowHeight;
    }
    rows[best].push(datum);
    rowWidths[best] += datum.img.width;
    if (rowWidths[best] > width) width = rowWidths[best];
    area = width * height;
  }
  let output = new Image(width, height);
  let y = 0;
  let mapping: Record<number, { x: number; y: number; w: number; h: number }> =
    {};
  for (const row of rows) {
    let x = 0;
    for (const img of row) {
      output.setSubImage(x, y, img.img);
      mapping[img.idx] = {
        x,
        y,
        w: img.img.width,
        h: img.img.height,
      };
      x += img.img.width;
    }
    y += rowHeight;
  }
  return { mapping, output };
};
