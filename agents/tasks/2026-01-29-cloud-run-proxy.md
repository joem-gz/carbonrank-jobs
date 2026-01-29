# Task: point extension to hosted proxy and document deployment
Owner agent/tool: Codex
Branch: agent/cloudrun-proxy

## Scope
Will change:
- Document how to run the Adzuna proxy in Cloud Run (including the policy/CORS notes) and how to point the extension to that hosted endpoint.
- Update the extension code so the proxy/employer APIs pull their base URL from a configurable source (storage/popup) with a sane default for local dev.
- Add a popup control or similar so a builder or tester can point the extension at the Cloud Run URL without editing source.
- Refresh tests/docs to reflect the new flow.

Won't change:
- The underlying proxy or employer scoring logic.
- The server's current CORS headers beyond documenting what Cloud Run needs to expose.

## Files likely touched
- README.md
- server/README.md (deployment notes)
- src/search/api.ts
- src/employer/api.ts
- src/storage/settings.ts (maybe new module separate)
- src/popup/popup.ts, popup.html, popup.css
- Tests that depend on the proxy base URL

## Success criteria
- README (and server README if necessary) outlines Cloud Run deployment steps, security considerations, and how to configure the extension for the hosted service.
- The extension reads a centrally stored proxy URL instead of hardcoding localhost, and the popup exposes that value for editing.
- Tests and builds continue to pass.

## Plan (short)
- Add a storage-backed proxy base URL helper plus a popup field; update search/employer API helpers to use it.
- Update relevant tests to stub the storage helper and verify the new path.
- Document Cloud Run hosting steps, mention the final URL field/Chrome permissions, and refresh README content accordingly.
- Run the fast test suite (e.g. `npm test`).

## Validation (commands)
- `npm test`

## Risks / edge cases
- Chrome storage might not be available in Node tests; need to guard/stub.
- For a fresh install the popup field must always fall back to a working default so the extension still works locally.

## Decisions / notes
- We will keep `http://localhost:8787` as the fallback default but let builders override it via the stored value; README will explain that the Cloud Run URL should be saved there for production builds.

