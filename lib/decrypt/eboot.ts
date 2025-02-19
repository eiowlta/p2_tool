import { pspDecryptPRX } from "./prx";
import { calculateElfSize } from "../elf/types";
import { toDataView } from "../util/structlib";

export const decrypt_eboot = async (eboot: Uint8Array): Promise<Uint8Array> => {
    let dv = toDataView(eboot);
    const size = dv.getUint32(0x2c, true);
    const elf_size = dv.getUint32(0x28, true);
    const elf = await pspDecryptPRX(eboot, size);
    if (elf_size != calculateElfSize(elf)) throw `Decryption failed`;
    return elf;
  };
  