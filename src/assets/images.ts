// Do not edit manually

export const IMAGES = {
  CAPTURE_D_CRAN4000_3: "/images/Capture d",
  CAPTURE_D_CRAN5481_4: "/images/Capture d'écran5481.png",
  HINNEH_LOGO_20260507_234919_1: "/images/hinneh_logo_20260507_234919.png",
  SCHOOL_HERO_20260507_234921_2: "/images/school_hero_20260507_234921.png",
  HINNEH_CAMPUS_BUILDING: "/images/hinneh_campus_building.png",
} as const;

export type ImageKey = keyof typeof IMAGES;
