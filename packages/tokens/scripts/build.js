import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, "..", "src");
const DIST = join(__dirname, "..", "dist");

mkdirSync(DIST, { recursive: true });

function read(file) {
  return readFileSync(join(SRC, file), "utf-8");
}

const primitives = read("primitives.css");
const typography = read("typography.css");
const spacing = read("spacing.css");
const motion = read("motion.css");
const radius = read("radius.css");
const semanticLight = read("semantic-light.css");
const semanticDark = read("semantic-dark.css");
const semanticStudio = read("semantic-studio.css");

const shared = [primitives, typography, spacing, motion, radius].join("\n\n");

// tokens.css — everything combined
writeFileSync(
  join(DIST, "tokens.css"),
  [shared, semanticLight, semanticDark, semanticStudio].join("\n\n")
);

// Theme-specific bundles
writeFileSync(join(DIST, "tokens-light.css"), [shared, semanticLight].join("\n\n"));
writeFileSync(join(DIST, "tokens-dark.css"), [shared, semanticDark].join("\n\n"));
writeFileSync(join(DIST, "tokens-studio.css"), [shared, semanticStudio].join("\n\n"));

// Tailwind v4 preset — maps semantic tokens to @theme inline
const tailwindPreset = `/* Auto-generated Tailwind v4 preset — do not edit manually */
/* Run: pnpm build in @nam/tokens to regenerate */

@theme inline {
  /* Backgrounds */
  --color-bg-base: var(--color-bg-base);
  --color-bg-surface: var(--color-bg-surface);
  --color-bg-card: var(--color-bg-card);
  --color-bg-elevated: var(--color-bg-elevated);

  /* Text */
  --color-text-primary: var(--color-text-primary);
  --color-text-secondary: var(--color-text-secondary);
  --color-text-muted: var(--color-text-muted);
  --color-text-heading: var(--color-text-heading);

  /* Accent */
  --color-accent: var(--color-accent);
  --color-accent-hover: var(--color-accent-hover);
  --color-accent-soft: var(--color-accent-soft);

  /* Borders */
  --color-border: var(--color-border);
  --color-border-subtle: var(--color-border-subtle);

  /* Interactive */
  --color-focus: var(--color-focus);

  /* Entity colors */
  --color-entity-kinhaus: var(--color-entity-kinhaus);
  --color-entity-ai-meetup: var(--color-entity-ai-meetup);
  --color-entity-island-connection: var(--color-entity-island-connection);
  --color-entity-nam-space: var(--color-entity-nam-space);
  --color-entity-external: var(--color-entity-external);

  /* Typography */
  --font-display: var(--font-display);
  --font-mono: var(--font-mono);
  --font-editorial: var(--font-editorial);
}
`;
writeFileSync(join(DIST, "tailwind-preset.css"), tailwindPreset);

// tokens.json — machine-readable export
function extractVars(css) {
  const vars = {};
  const regex = /--([a-z0-9-]+):\s*([^;]+);/g;
  let match;
  while ((match = regex.exec(css)) !== null) {
    const name = match[1];
    const value = match[2].trim();
    // Skip var() references — only include resolved values
    if (!value.startsWith("var(")) {
      vars[`--${name}`] = value;
    }
  }
  return vars;
}

const json = {
  $schema: "https://nam.space/design-tokens/v1",
  generated: new Date().toISOString(),
  primitives: extractVars(primitives),
  typography: extractVars(typography),
  spacing: extractVars(spacing),
  motion: extractVars(motion),
  radius: extractVars(radius),
  themes: {
    light: extractVars(semanticLight),
    dark: extractVars(semanticDark),
    studio: extractVars(semanticStudio),
  },
};
writeFileSync(join(DIST, "tokens.json"), JSON.stringify(json, null, 2));

console.log("@nam/tokens built successfully:");
console.log("  dist/tokens.css");
console.log("  dist/tokens-light.css");
console.log("  dist/tokens-dark.css");
console.log("  dist/tokens-studio.css");
console.log("  dist/tailwind-preset.css");
console.log("  dist/tokens.json");
