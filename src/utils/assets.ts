// Asset Resolver
// Resolves `asset:dot.path` references against a nested assets object.
// Used by the image component's expand function to resolve asset references
// at expansion time.

export const ASSET_PREFIX = 'asset:';

/**
 * Resolve an `asset:dot.path` reference to a string value from the assets object.
 * Throws descriptive errors if the path is invalid or the value is not a string.
 */
export function resolveAssetPath(
  ref: string,
  assets: Record<string, unknown> | undefined,
  slideIndex: number,
): string {
  if (!assets) {
    throw new Error(
      `Slide ${slideIndex + 1}: asset reference '${ref}' found but no assets provided in CompileOptions`,
    );
  }

  const dotPath = ref.slice(ASSET_PREFIX.length);
  const segments = dotPath.split('.');
  let current: unknown = assets;

  for (let i = 0; i < segments.length; i++) {
    if (current === null || typeof current !== 'object') {
      const traversed = segments.slice(0, i).join('.');
      throw new Error(
        `Slide ${slideIndex + 1}: asset reference '${ref}' failed — '${traversed}' is not an object`,
      );
    }

    const key = segments[i];
    const obj = current as Record<string, unknown>;

    if (!(key in obj)) {
      const available = Object.keys(obj).join(', ');
      const at = i === 0 ? 'root' : `'${segments.slice(0, i).join('.')}'`;
      throw new Error(
        `Slide ${slideIndex + 1}: asset reference '${ref}' could not be resolved. Available keys at ${at}: ${available}`,
      );
    }

    current = obj[key];
  }

  if (typeof current === 'string') {
    return current;
  }

  if (current !== null && typeof current === 'object') {
    const keys = Object.keys(current as Record<string, unknown>);
    const suggestions = keys.slice(0, 5).map(k => `${ASSET_PREFIX}${dotPath}.${k}`).join(', ');
    throw new Error(
      `Slide ${slideIndex + 1}: asset reference '${ref}' resolved to an object, not a string. Did you mean ${suggestions}?`,
    );
  }

  throw new Error(
    `Slide ${slideIndex + 1}: asset reference '${ref}' resolved to ${typeof current}, expected a string`,
  );
}
