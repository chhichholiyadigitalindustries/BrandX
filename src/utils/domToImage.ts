/**
 * BRANDX - Robust DOM to High-Resolution Image Export Utility
 * 
 * Solves the "Attempting to parse an unsupported color function 'oklch'" error
 * by recursively sanitizing modern CSS Color Level 4 values (oklch, oklab, lab, lch, color)
 * into standard browser-compatible rgb(...) / rgba(...) format prior to html2canvas rendering.
 */

// Shared offscreen canvas 2D context for native browser color resolution
let sharedColorCtx: CanvasRenderingContext2D | null = null;

function getColorContext(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (!sharedColorCtx) {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    sharedColorCtx = canvas.getContext('2d', { willReadFrequently: true });
  }
  return sharedColorCtx;
}

/**
 * Mathematical fallback for converting OKLCH to sRGB if canvas context is unavailable
 */
function oklchToRgbFallback(lStr: string, cStr: string, hStr: string, aStr?: string): string {
  let L = parseFloat(lStr);
  if (lStr.includes('%')) L = L / 100;
  let C = parseFloat(cStr);
  if (cStr.includes('%')) C = (C / 100) * 0.4;
  let H = parseFloat(hStr); // degrees
  if (isNaN(H)) H = 0;

  let A = 1;
  if (aStr) {
    let aVal = parseFloat(aStr);
    if (aStr.includes('%')) aVal = aVal / 100;
    if (!isNaN(aVal)) A = Math.max(0, Math.min(1, aVal));
  }

  // Convert OKLCH to OKLab
  const hRad = (H * Math.PI) / 180;
  const aLab = C * Math.cos(hRad);
  const bLab = C * Math.sin(hRad);

  // OKLab to LMS
  const l_ = L + 0.3963377774 * aLab + 0.2158037573 * bLab;
  const m_ = L - 0.1055613458 * aLab - 0.0638541728 * bLab;
  const s_ = L - 0.0894841775 * aLab - 1.291485548 * bLab;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  // LMS to linear sRGB
  const r_lin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g_lin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b_lin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  // Gamma correction to sRGB
  const gamma = (val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    return clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  };

  const r = Math.round(gamma(r_lin) * 255);
  const g = Math.round(gamma(g_lin) * 255);
  const b = Math.round(gamma(b_lin) * 255);

  return A < 1 ? `rgba(${r}, ${g}, ${b}, ${A})` : `rgb(${r}, ${g}, ${b})`;
}

/**
 * Converts a single CSS color value (e.g. "oklch(0.623 0.214 259.815)") to standard "rgb(...)" or "rgba(...)"
 */
export function convertSingleColorToRgb(colorStr: string): string {
  if (!colorStr || typeof colorStr !== 'string') return colorStr;
  const trimmed = colorStr.trim();
  if (
    trimmed === 'transparent' ||
    trimmed === 'inherit' ||
    trimmed === 'initial' ||
    trimmed === 'none' ||
    trimmed === 'currentColor'
  ) {
    return trimmed;
  }

  // If already standard hex or rgb/rgba, return as is
  if (/^#([0-9a-f]{3,8})$/i.test(trimmed) || /^rgba?\s*\(/i.test(trimmed)) {
    return trimmed;
  }

  // 1. Try native browser 2D canvas conversion
  const ctx = getColorContext();
  if (ctx) {
    try {
      ctx.fillStyle = '#000000';
      ctx.fillStyle = trimmed;
      const res = ctx.fillStyle;
      if (res && res !== '#000000' && !res.includes('oklch') && !res.includes('oklab')) {
        return res;
      }
      // If result is valid black or other hex/rgb
      if (res && (res.startsWith('#') || res.startsWith('rgb'))) {
        return res;
      }
    } catch {
      // ignore and use fallback
    }
  }

  // 2. OKLCH parsing fallback
  const oklchMatch = trimmed.match(/oklch\(\s*([^\s/]+)\s+([^\s/]+)\s+([^/)]+)(?:\s*\/\s*([^)]+))?\s*\)/i);
  if (oklchMatch) {
    return oklchToRgbFallback(oklchMatch[1], oklchMatch[2], oklchMatch[3], oklchMatch[4]);
  }

  // 3. OKLab parsing fallback
  const oklabMatch = trimmed.match(/oklab\(\s*([^\s/]+)\s+([^\s/]+)\s+([^/)]+)(?:\s*\/\s*([^)]+))?\s*\)/i);
  if (oklabMatch) {
    // Treat as L, A, B
    const L = parseFloat(oklabMatch[1]);
    const a = parseFloat(oklabMatch[2]);
    const b = parseFloat(oklabMatch[3]);
    const H = (Math.atan2(b, a) * 180) / Math.PI;
    const C = Math.sqrt(a * a + b * b);
    return oklchToRgbFallback(String(L), String(C), String(H), oklabMatch[4]);
  }

  return trimmed;
}

/**
 * Replaces all modern color functions (oklch, oklab, lab, lch, color) inside any CSS string
 * (e.g. gradients, box-shadows, inline styles) with standard RGB/RGBA colors.
 */
export function sanitizeColorString(cssValue: string): string {
  if (!cssValue || typeof cssValue !== 'string') return cssValue;
  if (!/(oklch|oklab|lab|lch|color\()/i.test(cssValue)) {
    return cssValue;
  }

  // Match all instances of modern color functions e.g. oklch(0.5 0.2 120 / 0.8) or oklab(...) or color(srgb ...)
  return cssValue.replace(/(?:oklch|oklab|lab|lch|color)\([^)]+\)/gi, (match) => {
    return convertSingleColorToRgb(match);
  });
}

/**
 * List of CSS style properties that may contain color values
 */
const COLOR_PROPERTIES = [
  'color',
  'backgroundColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'outlineColor',
  'boxShadow',
  'textShadow',
  'fill',
  'stroke',
  'stopColor',
  'floodColor',
  'lightingColor',
  'caretColor',
  'accentColor',
  'textDecorationColor',
  'columnRuleColor',
] as const;

/**
 * Recursively sanitizes modern colors in a cloned DOM element and all its children.
 * Also copies canvas pixels (such as QR codes) and ensures proper overflow and visibility.
 */
export function sanitizeClonedElement(
  originalElement: HTMLElement,
  clonedElement: HTMLElement,
  clonedDoc: Document
): void {
  // 1. Sanitize all <style> tags in the cloned document
  const styleTags = clonedDoc.querySelectorAll('style');
  styleTags.forEach((styleTag) => {
    try {
      if (styleTag.textContent && /(oklch|oklab|lab|lch|color\()/i.test(styleTag.textContent)) {
        styleTag.textContent = sanitizeColorString(styleTag.textContent);
      }
    } catch (e) {
      console.warn('Error sanitizing style tag in cloned document:', e);
    }
  });

  // 2. Map original elements to cloned elements for accurate computed style reading and canvas copying
  const origDescendants = [originalElement, ...Array.from(originalElement.querySelectorAll('*'))] as HTMLElement[];
  const cloneDescendants = [clonedElement, ...Array.from(clonedElement.querySelectorAll('*'))] as HTMLElement[];

  const count = Math.min(origDescendants.length, cloneDescendants.length);

  for (let i = 0; i < count; i++) {
    const orig = origDescendants[i];
    const clone = cloneDescendants[i];

    if (!orig || !clone || !clone.style) continue;

    // A. Handle <canvas> elements (e.g. QR codes or barcodes)
    if (orig instanceof HTMLCanvasElement && clone instanceof HTMLCanvasElement) {
      try {
        clone.width = orig.width;
        clone.height = orig.height;
        const cloneCtx = clone.getContext('2d');
        if (cloneCtx && orig.width > 0 && orig.height > 0) {
          cloneCtx.drawImage(orig, 0, 0);
        }
      } catch (err) {
        console.warn('Could not copy canvas content to clone:', err);
      }
    }

    // B. Read computed style from the active original element in the main window
    const computed = window.getComputedStyle(orig);

    for (const prop of COLOR_PROPERTIES) {
      const computedVal = computed.getPropertyValue(
        prop.replace(/([A-Z])/g, '-$1').toLowerCase()
      ) || (computed as any)[prop];

      if (computedVal && /(oklch|oklab|lab|lch|color\()/i.test(computedVal)) {
        const sanitized = sanitizeColorString(computedVal);
        clone.style.setProperty(
          prop.replace(/([A-Z])/g, '-$1').toLowerCase(),
          sanitized,
          'important'
        );
      }
    }

    // Check background image / gradients
    const bgImage = computed.backgroundImage;
    if (bgImage && bgImage !== 'none' && /(oklch|oklab|lab|lch|color\()/i.test(bgImage)) {
      clone.style.backgroundImage = sanitizeColorString(bgImage);
    }

    // Check inline style attribute if present
    const inlineStyle = clone.getAttribute('style');
    if (inlineStyle && /(oklch|oklab|lab|lch|color\()/i.test(inlineStyle)) {
      clone.setAttribute('style', sanitizeColorString(inlineStyle));
    }

    // SVG element attributes (fill, stroke, stop-color)
    if (clone instanceof SVGElement) {
      ['fill', 'stroke', 'stop-color'].forEach((attr) => {
        const val = clone.getAttribute(attr);
        if (val && /(oklch|oklab|lab|lch|color\()/i.test(val)) {
          clone.setAttribute(attr, sanitizeColorString(val));
        }
      });
    }
  }

  // 3. Ensure no container cropping
  clonedElement.style.overflow = 'visible';
  clonedElement.style.height = 'auto';
  clonedElement.style.maxHeight = 'none';
  clonedElement.style.maxWidth = 'none';
  clonedElement.style.position = 'relative';
}

/**
 * Waits for all fonts and images inside the element to be fully loaded
 */
export async function waitForAssets(element: HTMLElement): Promise<void> {
  // 1. Wait for document fonts
  try {
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    }
  } catch {
    // ignore font loading timeouts
  }

  // 2. Wait for all <img> elements
  const images = Array.from(element.querySelectorAll('img'));
  if (images.length === 0) return;

  const imagePromises = images.map((img) => {
    if (img.complete && img.naturalHeight !== 0) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      const onDone = () => resolve();
      img.addEventListener('load', onDone, { once: true });
      img.addEventListener('error', onDone, { once: true });
      // Fallback timeout after 2 seconds
      setTimeout(resolve, 2000);
    });
  });

  await Promise.all(imagePromises);
}

export interface ExportElementOptions {
  scale?: number;
  backgroundColor?: string;
  windowWidth?: number;
  quality?: number;
  allowTaint?: boolean;
}

/**
 * Exports a DOM element to high-resolution PNG dataURL and Blob with OKLCH color sanitization.
 */
export async function exportElementToPng(
  elementOrId: string | HTMLElement,
  options: ExportElementOptions = {}
): Promise<{ dataUrl: string; blob: Blob; width: number; height: number }> {
  const element =
    typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;

  if (!element) {
    throw new Error(
      `Export target element not found: ${typeof elementOrId === 'string' ? elementOrId : 'HTMLElement'}`
    );
  }

  // Ensure all fonts and images are loaded before rasterization
  await waitForAssets(element);

  // Dynamically load html2canvas
  const html2canvasModule = await import('html2canvas');
  const html2canvas = (html2canvasModule.default || html2canvasModule) as unknown as (
    el: HTMLElement,
    opts?: any
  ) => Promise<HTMLCanvasElement>;

  const scale = options.scale || 2.5; // High pixel density for sharp text and scannable QR
  const backgroundColor = options.backgroundColor || '#ffffff';

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: options.allowTaint ?? false,
    logging: false,
    backgroundColor,
    scrollX: 0,
    scrollY: 0,
    windowWidth: options.windowWidth,
    onclone: (clonedDoc, clonedEl) => {
      try {
        const targetCloned =
          typeof elementOrId === 'string'
            ? clonedDoc.getElementById(elementOrId) || clonedEl
            : clonedEl;

        if (targetCloned) {
          sanitizeClonedElement(element, targetCloned as HTMLElement, clonedDoc);
        }
      } catch (cloneErr) {
        console.error('Error during onclone DOM sanitization:', cloneErr);
      }
    },
  });

  const dataUrl = canvas.toDataURL('image/png', options.quality ?? 1.0);

  // Convert to Blob
  const byteString = atob(dataUrl.split(',')[1]);
  const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: mimeString });

  return {
    dataUrl,
    blob,
    width: canvas.width,
    height: canvas.height,
  };
}
