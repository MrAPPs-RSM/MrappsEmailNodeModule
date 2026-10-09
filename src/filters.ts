const DEFAULT_TRUNCATE_LENGTH = 10;

function text(value: unknown): string {
  return value == null ? "" : String(value);
}

export function truncate(value: unknown, length: number = DEFAULT_TRUNCATE_LENGTH): string {
  const input = text(value);
  return input.length > length ? input.substring(0, length) + "..." : input;
}

// RFC 5545 §3.3.11: escape backslash, semicolon, comma and line breaks in TEXT values.
export function icsEscape(value: unknown): string {
  return text(value)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

// RFC 5545 §3.2: parameter values are always emitted quoted, so only DQUOTE and control characters are illegal.
export function icsParam(value: unknown): string {
  return text(value).replace(/["\x00-\x1f\x7f]/g, "");
}
