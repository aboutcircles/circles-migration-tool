import { Profile } from "@circles-sdk/profiles";

export type ProfileError = string;

export const config = {
  maxImageSizeKB: 150,
  descriptionLength: 500,
  imageUrlLength: 2000,
  maxNameLength: 36,
};

export async function validateImageDataUrl(dataUrl: string): Promise<boolean> {
  const pat = /^data:image\/(png|jpeg|jpg|gif|svg\+xml);base64,/;
  if (!pat.test(dataUrl)) return false;
  try {
    const base64 = dataUrl.replace(pat, "");
    const approxBytes = Math.floor((base64.length * 3) / 4);
    return approxBytes <= config.maxImageSizeKB * 1024;
  } catch {
    return false;
  }
}

export async function validateProfile(p: Profile): Promise<ProfileError[]> {
  const errs: ProfileError[] = [];
  if (!p.name || typeof p.name !== "string" || p.name.length > config.maxNameLength) {
    errs.push(`Name is required (≤ ${config.maxNameLength} chars).`);
  }
  if (p.description && (typeof p.description !== "string" || p.description.length > config.descriptionLength)) {
    errs.push(`Description must be ≤ ${config.descriptionLength} chars.`);
  }
  if (p.previewImageUrl) {
    const ok = await validateImageDataUrl(p.previewImageUrl);
    if (!ok) errs.push(`Invalid image or size > ${config.maxImageSizeKB}KB.`);
  }
  if (p.imageUrl && (typeof p.imageUrl !== "string" || p.imageUrl.length > config.imageUrlLength)) {
    errs.push(`Image URL must be ≤ ${config.imageUrlLength} chars.`);
  }
  return errs;
}
