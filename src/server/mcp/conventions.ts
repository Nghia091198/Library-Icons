// Tài liệu cho agent đọc qua MCP resource. Viết tiếng Anh vì người đọc là AI của nhiều hệ khác nhau.
export const MCP_CONVENTIONS_URI = 'lib-icons://conventions';

export const MCP_CONVENTIONS_MARKDOWN = `# Lib Icons — conventions for agents

## What every icon looks like
- Clean SVG on a 24×24 grid (\`viewBox="0 0 24 24"\`), no scripts, no external references, no fixed width/height.
- Colors use \`currentColor\`, so an icon takes the CSS \`color\` of its parent. Size it with CSS (\`width\`/\`height\`, e.g. \`1.25em\`).
- Exception: icons where \`keepsOriginalColors\` is true (sets \`multicolor\`, and some \`brand\` logos) keep their own colors. Do not recolor them.

## Sets vs categories
- **Set** = drawing style. Pick one set per UI and stay consistent. Call \`list_icon_sets\` to see each set's intended use.
  The default for most theme UI is \`outline\`.
- **Category** = topic (arrows, commerce, users, …). Use it to narrow a search, not to choose a style.
- The same slug can exist in several sets (e.g. \`shopping-cart\` in \`outline\` and \`solid\`); a slug is unique within one set.

## Recommended workflow
1. \`search_icons\` with a short English keyword per UI need (e.g. "cart", "search", "user", "menu"), filtered by the chosen \`set\`.
   Results contain no SVG, so they are cheap; pick slugs from them instead of guessing.
2. \`get_icons\` once with all chosen slugs for that set (up to 30 per call) to receive the SVG markup.
3. If a slug is reported in \`missing\`, use one of its \`suggestions\` rather than inventing a name.

## Using icons in a Haravan (Liquid) theme
- One icon used in many places: save its SVG as \`snippets/icon-<slug>.liquid\` and render it with \`{% include 'icon-<slug>' %}\`.
- Add \`class="icon" aria-hidden="true" focusable="false"\` to decorative icons, and give the surrounding link or button an \`aria-label\`.
- Suggested CSS: \`.icon { width: 1.25em; height: 1.25em; vertical-align: middle; flex-shrink: 0; }\`.

## Stability
- Slugs are stable once published; renamed icons keep their old slug as an alias.
- Only published icons are exposed. The data is read-only.
`;
