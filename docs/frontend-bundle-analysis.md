# Frontend Bundle Analysis

This note records the result of `npm --prefix frontend run build:analyze`.

## Latest Result

Generated report:

- `frontend/dist/bundle-analysis.html`

Observed chunks:

| Chunk | Role | Size | Gzip | Main dependency groups |
| --- | --- | ---: | ---: | --- |
| `assets/index-*.js` | app shell | `288.58 kB` | `97.99 kB` | React, router, Zustand, Axios, i18next |
| `assets/NoteEditor-*.js` | note editor route | `476.70 kB` | `144.26 kB` | TipTap, ProseMirror, react-markdown, remark/micromark |
| `assets/Home-*.js` | home route | small route chunk | n/a | page code and icons |
| `assets/Login-*.js` / `assets/Register-*.js` | auth routes | small route chunks | n/a | page code |

## What The Split Proves

The route-level dynamic imports are working:

- TipTap and ProseMirror are not in the initial app shell.
- Markdown rendering dependencies such as `react-markdown`, `remark-*`, `micromark-*`, and `mdast-*` are isolated in the `NoteEditor` route chunk.
- The initial bundle is now below Vite's `500 kB` warning threshold.

The main bundle still includes i18n runtime code and locale JSON files because i18n is initialized before route rendering. This is acceptable for the current scope, but it is the next clear optimization target.

## Next Split Candidates

1. Lazy-load locale namespaces by route, especially `chat`, `notes`, and `settings`.
2. Move markdown preview into a lazy child inside `NoteEditor` if the editor opens in rich-text mode by default.
3. Keep TipTap in the editor route chunk unless repeated editing workflows show that preloading improves UX.
4. Add a CI budget check if the app shell grows above `350 kB` raw or `120 kB` gzip.
