import { PNG } from "pngjs";
import { Image } from "./img";

export const imgFromPng = async (data: Uint8Array): Promise<Image> => {
  let png = PNG.sync.read(Buffer.from(data));
  let image = new Image(png.width, png.height);
  image.data.set(png.data);
  return image;
};

export const pngFromImage = async (img: Image): Promise<Uint8Array> => {
  let png = new PNG({ width: img.width, height: img.height });
  png.data.set(img.data);
  return PNG.sync.write(png);
};
