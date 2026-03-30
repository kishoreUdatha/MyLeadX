/**
 * Domain Validator Utility
 * Validates if a request origin matches allowed domain patterns
 */

/**
 * Converts a domain pattern to a regex
 * Supports wildcards like *.example.com
 */
function patternToRegex(pattern: string): RegExp {
  // Trim and lowercase
  pattern = pattern.trim().toLowerCase();

  // Escape special regex characters except *
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

  // Convert * wildcard to regex pattern
  // *.example.com -> matches any subdomain
  // example.* -> matches any TLD (not recommended but supported)
  const regexPattern = escaped
    .replace(/\\\.\\\*/g, '\\.[^.]+') // .* at end
    .replace(/\\\*\\\./g, '([^.]+\\.)*') // *. at start (matches zero or more subdomains)
    .replace(/\\\*/g, '[^.]*'); // * in middle

  return new RegExp(`^${regexPattern}$`, 'i');
}

/**
 * Extracts the hostname from a URL or origin string
 */
function extractHostname(urlOrOrigin: string): string | null {
  try {
    // Handle cases where it's just a hostname
    if (!urlOrOrigin.includes('://')) {
      return urlOrOrigin.toLowerCase();
    }

    const url = new URL(urlOrOrigin);
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Validates if an origin/domain matches any of the allowed patterns
 *
 * @param origin - The request origin (e.g., "https://app.example.com")
 * @param allowedPatterns - Array of allowed domain patterns (e.g., ["*.example.com", "mysite.com"])
 * @returns true if origin is allowed, false otherwise
 */
export function isOriginAllowed(
  origin: string | undefined | null,
  allowedPatterns: string[]
): boolean {
  // If no patterns configured, allow all (open access)
  if (!allowedPatterns || allowedPatterns.length === 0) {
    return true;
  }

  // If no origin provided, deny access
  if (!origin) {
    return false;
  }

  const hostname = extractHostname(origin);
  if (!hostname) {
    return false;
  }

  // Check against each allowed pattern
  for (const pattern of allowedPatterns) {
    if (!pattern || typeof pattern !== 'string') {
      continue;
    }

    const trimmedPattern = pattern.trim().toLowerCase();
    if (!trimmedPattern) {
      continue;
    }

    // Direct match (case insensitive)
    if (hostname === trimmedPattern) {
      return true;
    }

    // Wildcard pattern match
    try {
      const regex = patternToRegex(trimmedPattern);
      if (regex.test(hostname)) {
        return true;
      }
    } catch {
      // Invalid pattern, skip
      continue;
    }
  }

  return false;
}

/**
 * Parses a comma-separated or newline-separated domain list into an array
 */
export function parseDomainList(domainString: string): string[] {
  if (!domainString || typeof domainString !== 'string') {
    return [];
  }

  return domainString
    .split(/[,\n]/)
    .map(d => d.trim().toLowerCase())
    .filter(d => d.length > 0);
}

/**
 * Validates a domain pattern syntax
 * Returns true if the pattern is valid
 */
export function isValidDomainPattern(pattern: string): boolean {
  if (!pattern || typeof pattern !== 'string') {
    return false;
  }

  const trimmed = pattern.trim();
  if (trimmed.length === 0 || trimmed.length > 253) {
    return false;
  }

  // Basic domain pattern validation
  // Allows: example.com, *.example.com, sub.example.com, example.*
  const domainPatternRegex = /^(\*\.)?([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)*([a-z0-9]([a-z0-9-]*[a-z0-9])?|\*)$/i;

  return domainPatternRegex.test(trimmed);
}

export default {
  isOriginAllowed,
  parseDomainList,
  isValidDomainPattern,
};
