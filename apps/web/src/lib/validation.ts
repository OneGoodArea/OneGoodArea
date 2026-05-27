import { Intent } from "@/lib/types";

const VALID_INTENTS: Intent[] = ["moving", "investing", "business", "research"];

const MAX_LOCATION_LENGTH = 100;

// Matches HTML/script tags like <script>, </div>, etc.
const HTML_TAG_PATTERN = /<[^>]*>/i;

// SQL injection keywords (case-insensitive, word-boundary)
const SQL_KEYWORDS_PATTERN =
  /\b(SELECT|DROP|INSERT|DELETE|UPDATE|UNION|ALTER|EXEC|EXECUTE|TRUNCATE)\b/i;

// SQL comment or statement terminator
const SQL_SPECIAL_PATTERN = /(--|;)/;

// Only allow: letters (including accented), numbers, spaces, commas, hyphens, apostrophes, periods
const ALLOWED_CHARS_PATTERN = /^[\p{L}\p{N}\s,\-'.]+$/u;

export interface LocationValidation {
  valid: boolean;
  sanitized: string;
  error?: string;
}

export interface IntentValidation {
  valid: boolean;
  error?: string;
}

export function validateLocationInput(location: unknown): LocationValidation {
  if (typeof location !== "string" || !location.trim()) {
    return { valid: false, sanitized: "", error: "Please enter a location" };
  }

  const trimmed = location.trim();

  if (trimmed.length > MAX_LOCATION_LENGTH) {
    return { valid: false, sanitized: "", error: "Location is too long (max 100 characters)" };
  }

  if (
    HTML_TAG_PATTERN.test(trimmed) ||
    SQL_KEYWORDS_PATTERN.test(trimmed) ||
    SQL_SPECIAL_PATTERN.test(trimmed)
  ) {
    return { valid: false, sanitized: "", error: "Location contains invalid characters" };
  }

  if (!ALLOWED_CHARS_PATTERN.test(trimmed)) {
    return { valid: false, sanitized: "", error: "Location contains invalid characters" };
  }

  return { valid: true, sanitized: trimmed };
}

export function validateIntent(intent: unknown): IntentValidation {
  if (
    typeof intent !== "string" ||
    !VALID_INTENTS.includes(intent as Intent)
  ) {
    return {
      valid: false,
      error: `Invalid intent. Must be one of: ${VALID_INTENTS.join(", ")}`,
    };
  }

  return { valid: true };
}
