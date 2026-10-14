import type { APIContext } from "astro";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

export async function GET(_context: APIContext) {
  // The default SVG remains for inline use; social previews receive a PNG.
  const source = await readFile(resolve("public/og-image.svg"));
  const png = await sharp(source).png({ compressionLevel: 9 }).toBuffer();
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });
}
