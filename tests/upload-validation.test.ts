import assert from "node:assert/strict";
import test from "node:test";
import { matchesUploadSignature } from "@/lib/upload-validation";

function makeAvifFileTypeBox(
  majorBrand: string,
  compatibleBrands: string[],
  declaredLength = 16 + compatibleBrands.length * 4
) {
  const bytes = new Uint8Array(16 + compatibleBrands.length * 4);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, declaredLength);
  bytes.set(Buffer.from("ftyp"), 4);
  bytes.set(Buffer.from(majorBrand), 8);
  view.setUint32(12, 0);
  compatibleBrands.forEach((brand, index) => {
    bytes.set(Buffer.from(brand), 16 + index * 4);
  });
  return bytes;
}

test("upload validation accepts supported file signatures", () => {
  assert.equal(
    matchesUploadSignature("image/jpeg", Uint8Array.from([0xff, 0xd8, 0xff, 0x00])),
    true
  );
  assert.equal(
    matchesUploadSignature(
      "image/png",
      Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    ),
    true
  );
  assert.equal(
    matchesUploadSignature(
      "image/webp",
      Uint8Array.from([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")])
    ),
    true
  );
  assert.equal(
    matchesUploadSignature("image/avif", makeAvifFileTypeBox("avif", [])),
    true
  );
  assert.equal(
    matchesUploadSignature("image/avif", makeAvifFileTypeBox("mif1", ["avif"])),
    true
  );
  assert.equal(
    matchesUploadSignature("image/avif", makeAvifFileTypeBox("avis", [])),
    true
  );
  assert.equal(
    matchesUploadSignature("application/pdf", Uint8Array.from(Buffer.from("%PDF-1.7"))),
    true
  );
});

test("upload validation rejects mismatched and unsupported signatures", () => {
  assert.equal(
    matchesUploadSignature("image/png", Uint8Array.from([0xff, 0xd8, 0xff])),
    false
  );
  assert.equal(
    matchesUploadSignature("image/jpeg", Uint8Array.from([0xff, 0xd8])),
    false
  );
  assert.equal(
    matchesUploadSignature("image/avif", makeAvifFileTypeBox("mif1", ["mif1"])),
    false
  );
  assert.equal(
    matchesUploadSignature("image/avif", makeAvifFileTypeBox("mif1", ["avif"], 16)),
    false
  );
  assert.equal(
    matchesUploadSignature("image/avif", makeAvifFileTypeBox("avif", [], 20)),
    false
  );
  assert.equal(matchesUploadSignature("text/plain", Uint8Array.from([0x61])), false);
});
