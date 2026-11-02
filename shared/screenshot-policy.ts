export const screenshotMaxBytes = 10 * 1024 * 1024;
export const screenshotMaxPixels = 24_000_000;
export const screenshotMaxDimension = 16_384;
export const screenshotMimeTypes = ["image/png", "image/jpeg", "image/webp"];

type ImageInfo = { mime: string; width: number; height: number };

// Header and container checks bound raster dimensions before browser decoding.
// This is not a full image decoder or malware scanner.
export function inspectScreenshot(bytes: Uint8Array): ImageInfo | null {
  if (bytes.length < 30) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (start: number, end: number) => new TextDecoder().decode(bytes.subarray(start, end));
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)
    && view.getUint32(8) === 13 && text(12, 16) === "IHDR" && text(bytes.length - 8, bytes.length - 4) === "IEND") {
    return { mime: "image/png", width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (text(0, 4) === "RIFF" && text(8, 12) === "WEBP" && view.getUint32(4, true) + 8 === bytes.length) {
    const chunk = text(12, 16);
    if (chunk === "VP8X" && bytes.length >= 38) {
      // Animated evidence is outside the one-screenshot contract.
      if (bytes[20] & 2) return null;
      return { mime: "image/webp", width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16) };
    }
    if (chunk === "VP8 " && bytes[23] === 157 && bytes[24] === 1 && bytes[25] === 42) {
      return { mime: "image/webp", width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
    }
    if (chunk === "VP8L" && bytes[20] === 47) {
      const bits = view.getUint32(21, true);
      return { mime: "image/webp", width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
  }
  if (bytes[0] === 255 && bytes[1] === 216 && bytes.at(-2) === 255 && bytes.at(-1) === 217) {
    let offset = 2;
    while (offset + 4 < bytes.length) {
      if (bytes[offset++] !== 255) return null;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 218 || marker === 217) return null;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (offset + 2 > bytes.length) return null;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) return null;
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker) && length >= 8) {
        return { mime: "image/jpeg", width: view.getUint16(offset + 5), height: view.getUint16(offset + 3) };
      }
      offset += length;
    }
  }
  return null;
}

export function screenshotDimensionsAllowed(image: ImageInfo) {
  return image.width > 0 && image.height > 0 && image.width <= screenshotMaxDimension
    && image.height <= screenshotMaxDimension && image.width * image.height <= screenshotMaxPixels;
}
