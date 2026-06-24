/**
 * Dependency-free user-agent parsing — enough for an admin device breakdown.
 * Not a full UA database; just the broad strokes (device class, browser, OS)
 * that matter for "what are my users on". Falls back to "Unknown".
 */

export interface ParsedUA {
  device: "mobile" | "tablet" | "desktop" | "bot" | "unknown";
  browser: string;
  os: string;
}

export function parseUA(ua: string | null | undefined): ParsedUA {
  const s = (ua ?? "").toLowerCase();
  if (!s) return { device: "unknown", browser: "Unknown", os: "Unknown" };

  const isBot = /bot|crawler|spider|crawling|preview|facebookexternalhit|slurp/.test(s);
  const isTablet = /ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(s);
  const isMobile = /mobi|iphone|ipod|android|blackberry|windows phone/.test(s);
  const device: ParsedUA["device"] = isBot ? "bot" : isTablet ? "tablet" : isMobile ? "mobile" : "desktop";

  // Order matters — Edge/Chrome both contain "chrome"; check the specific first.
  const browser =
    /edg\//.test(s) ? "Edge" :
    /opr\/|opera/.test(s) ? "Opera" :
    /samsungbrowser/.test(s) ? "Samsung Internet" :
    /firefox|fxios/.test(s) ? "Firefox" :
    /chrome|crios/.test(s) ? "Chrome" :
    /safari/.test(s) ? "Safari" :
    "Other";

  const os =
    /iphone|ipad|ipod|ios/.test(s) ? "iOS" :
    /android/.test(s) ? "Android" :
    /windows/.test(s) ? "Windows" :
    /mac os|macintosh/.test(s) ? "macOS" :
    /linux/.test(s) ? "Linux" :
    "Other";

  return { device, browser, os };
}
