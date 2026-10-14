import type { APIContext } from "astro";
import sharp from "sharp";

export async function GET(_context: APIContext) {
  // The original public SVG remains available for backward compatibility.
  // Sharp reads the checked-in SVG directly during the static build.
  const png = await sharp("public/og-image.svg")
    .png({ compressionLevel: 9 })
    .toBuffer();
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });
}
