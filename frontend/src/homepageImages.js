// ============================================================
// Homepage images — the one place that maps each photo spot to a file.
// ============================================================
// To change an image, just replace the matching file in
// src/assets/images/ (keep the file name; .jpg/.jpeg/.png/.webp all work).
// No component or CSS changes are needed.
//
//   hero-pharmaceutical.jpg  → Hero image (right side)
//   manufacturer.jpg         → How It Works: Manufacturer
//   transporter.jpg          → How It Works: Transporter
//   distributor.jpg          → How It Works: Distributor
//   pharmacy.jpg             → How It Works: Pharmacy
//   consumer.jpg             → How It Works: Consumer
//   partner.jpg              → Partner Login section (optional)
//
// Files are discovered with import.meta.glob, so a missing file never
// breaks the build — that spot just falls back to a placeholder
// illustration until you add the photo.

const found = import.meta.glob("./assets/images/*.{jpg,jpeg,png,webp}", {
  eager: true,
  import: "default",
});

function pick(baseName) {
  for (const ext of ["jpg", "jpeg", "png", "webp"]) {
    const url = found[`./assets/images/${baseName}.${ext}`];
    if (url) return url;
  }
  return undefined;
}

export const homepageImages = {
  hero: pick("hero-pharmaceutical"), // Replace this image file to change the Hero image.
  manufacturer: pick("manufacturer"), // Replace this image file to change the Manufacturer image.
  transporter: pick("transporter"), // Replace this image file to change the Transporter image.
  distributor: pick("distributor"), // Replace this image file to change the Distributor image.
  pharmacy: pick("pharmacy"), // Replace this image file to change the Pharmacy image.
  consumer: pick("consumer"), // Replace this image file to change the Consumer image.
  partner: pick("partner"), // Replace this image file to change the Partner Login image.
};
