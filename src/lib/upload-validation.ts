const signatures: Record<string, (bytes: Uint8Array) => boolean> = {
  "image/jpeg": (bytes) =>
    bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  "image/png": (bytes) =>
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a,
  "image/webp": (bytes) =>
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP",
  "image/avif": hasAvifFileTypeBrand,
  "application/pdf": (bytes) =>
    bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-",
};

function readUint32(bytes: Uint8Array, offset: number) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset);
}

function readBrand(bytes: Uint8Array, offset: number) {
  return String.fromCharCode(...bytes.slice(offset, offset + 4));
}

function hasAvifFileTypeBrand(bytes: Uint8Array) {
  if (bytes.length < 16 || readBrand(bytes, 4) !== "ftyp") return false;

  const boxLength = readUint32(bytes, 0);
  if (
    boxLength < 16 ||
    boxLength > bytes.length ||
    (boxLength - 16) % 4 !== 0
  ) {
    return false;
  }

  const supportedBrands = new Set(["avif", "avis"]);
  if (supportedBrands.has(readBrand(bytes, 8))) return true;

  for (let offset = 16; offset < boxLength; offset += 4) {
    if (supportedBrands.has(readBrand(bytes, offset))) return true;
  }
  return false;
}

export function matchesUploadSignature(contentType: string, bytes: Uint8Array) {
  return signatures[contentType]?.(bytes) ?? false;
}

export async function hasValidUploadSignature(file: File) {
  if (file.type === "image/avif") {
    const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    if (header.length < 8 || readBrand(header, 4) !== "ftyp") return false;

    const boxLength = readUint32(header, 0);
    if (boxLength < 16 || boxLength > file.size) return false;

    const fileTypeBox = new Uint8Array(await file.slice(0, boxLength).arrayBuffer());
    return matchesUploadSignature(file.type, fileTypeBox);
  }

  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  return matchesUploadSignature(file.type, header);
}
