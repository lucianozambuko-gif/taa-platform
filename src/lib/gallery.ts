/** Photos from the Academy's own gallery (trainingafricaacademy.co.za/gallery), copied into the public
 *  "site-media" storage bucket in a lighter WebP version with a small copy for phones. */
const BASE = "https://uyswlagazjcwejgpxbeg.supabase.co/storage/v1/object/public/site-media/gallery";

export const gallery = (name: string) => `${BASE}/${name}.webp`;

export const HOME_PHOTOS = [
  { name: "training-and-practical-june-25-11", caption: "Practical day: floor scrubbing machine" },
  { name: "pmb-training-5", caption: "Classroom workshop" },
  { name: "training-and-practical-june-25-5", caption: "Carpet extraction practical" },
  { name: "false-bay-college-5", caption: "Training at False Bay College" },
];
