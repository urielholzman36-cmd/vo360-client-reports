import fs from "fs";
import path from "path";

export const BRAND = {
  colors: {
    navy: "#1B2B6B",
    orange: "#F47B20",
    magenta: "#C2185B",
    green: "#27AE60",
    backgroundLight: "#F5F5F5",
    bodyText: "#555555",
    white: "#FFFFFF",
    black: "#000000",
    lightGray: "#D0D0D0",
    red: "#E74C3C",
  },
  fonts: {
    heading: "Helvetica-Bold",
    body: "Helvetica",
  },
  page: {
    size: "LETTER" as const,
    margins: { top: 54, bottom: 54, left: 54, right: 54 },
  },
};

let logoBuffer: Buffer | null = null;

export function getLogoBuffer(): Buffer {
  if (logoBuffer) return logoBuffer;
  const logoPath = path.join(process.cwd(), "public", "logo.png");
  logoBuffer = fs.readFileSync(logoPath);
  return logoBuffer;
}
