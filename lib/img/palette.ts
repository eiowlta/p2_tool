import { Image, colorArrToRgb8888, rgb8888toColorArr } from "./img";
import { Color, find_closest, kmeans } from "./kmeans";

export const palettize = (img: Image, numColors: number) => {
  let colors: Color[] = [];
  for (let i = 0; i < img.width; i++) {
    for (let j = 0; j < img.height; j++) {
      let c = rgb8888toColorArr(img.getPixel(i, j));
      if (c[3] == 0) c = [0, 0, 0, 0];
      colors.push(c);
    }
  }
  let palette = kmeans(colors, numColors);

  for (let i = 0; i < img.width; i++) {
    for (let j = 0; j < img.height; j++) {
      let c: Color = rgb8888toColorArr(img.getPixel(i, j));
      let n = find_closest(c, palette);
      img.setPixel(i, j, colorArrToRgb8888(palette[n]));
    }
  }
};
