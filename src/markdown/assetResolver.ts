// Asset Resolver
// Resolves `asset:dot.path` references in frontmatter values against
// a nested assets object. Runs after param merge, before Zod validation.

export const ASSET_PREFIX = 'asset:';

/**
 * Recursively walk a value tree and resolve any string starting with
 * `asset:` against the provided assets object.
 */
export function resolveAssetReferences(
  value: unknown,
  assets: Record<string, unknown> | undefined,
  slideIndex: number,
): unknown {
  if (typeof value === 'string') {
    if (value.startsWith(ASSET_PREFIX)) return resolveAssetPath(value, assets, slideIndex);
    if (value.includes(ASSET_PREFIX)) return resolveEmbeddedAssets(value, assets, slideIndex);
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(item => resolveAssetReferences(item, assets, slideIndex));
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = resolveAssetReferences(v, assets, slideIndex);
    }
    return out;
  }
  return value;
}

/**
 * Replace all `asset:dot.path` references embedded within a larger string.
 * Used for markdown body/slot content where asset references appear inside
 * :::directive YAML bodies or ![](asset:...) image syntax.
 */
function resolveEmbeddedAssets(
  text: string,
  assets: Record<string, unknown> | undefined,
  slideIndex: number,
): string {
  return text.replace(/\basset:([\w]+(?:\.[\w]+)*)/g, (match) => {
    return resolveAssetPath(match, assets, slideIndex);
  });
}

function resolveAssetPath(
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
    const suggestions = keys.slice(0, 5).map(k => `asset:${dotPath}.${k}`).join(', ');
    throw new Error(
      `Slide ${slideIndex + 1}: asset reference '${ref}' resolved to an object, not a string. Did you mean ${suggestions}?`,
    );
  }

  throw new Error(
    `Slide ${slideIndex + 1}: asset reference '${ref}' resolved to ${typeof current}, expected a string`,
  );
}
