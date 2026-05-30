const OKLCH_PATTERN = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)\s*)?\)/;

function channelToHex(value: number): string {
  return value.toString(16).padStart(2, '0');
}

export function oklchToHex(cssValue: string): string {
  const match = cssValue.match(OKLCH_PATTERN);
  if (!match) throw new Error(`Cannot convert to hex: ${cssValue}`);

  const lightness = Number(match[1]);
  const chroma = Number(match[2]);
  const hue = (Number(match[3]) * Math.PI) / 180;
  const alpha = match[4] === undefined ? 1 : Number(match[4]);

  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);

  const lp = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mp = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const sp = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const rLin = +4.0767416621 * lp - 3.3077115913 * mp + 0.2309699292 * sp;
  const gLin = -1.2684380046 * lp + 2.6097574011 * mp - 0.3413193965 * sp;
  const bLin = -0.0041960863 * lp - 0.7034186147 * mp + 1.707614701 * sp;

  const toSrgb = (channel: number) => {
    const clamped = Math.max(0, Math.min(1, channel));
    return clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
  };

  const red = Math.round(toSrgb(rLin) * 255);
  const green = Math.round(toSrgb(gLin) * 255);
  const blue = Math.round(toSrgb(bLin) * 255);
  const rgbHex = `#${channelToHex(red)}${channelToHex(green)}${channelToHex(blue)}`;

  if (alpha >= 1) {
    return rgbHex;
  }
  return `${rgbHex}${channelToHex(Math.round(alpha * 255))}`;
}
