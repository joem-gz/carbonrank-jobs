# Task: Epic 4 CP4.4 widget API mode
Owner agent/tool: Codex CLI
Branch: agent/epic4-widget-api

## Scope
Will change:
- Add `/api/widget/score` endpoint with partner key auth, CORS allowlist, caching, and rate limiting
- Implement widget score computation and request hashing
- Update widget client to send job URL for caching
- Add unit + e2e coverage for API behavior
Won’t change:
- Employer signals implementation
- Production telemetry or analytics

## Files likely touched
- server/index.ts
- server/widget_service.ts
- widget/src/index.ts
- tests/unit/widget_api.test.ts
- tests/e2e/widget_api.spec.ts

## Success criteria
- Authenticated widget requests return scores or WFH/No data states
- CORS allowlist enforced per partner origin
- Cache hits avoid recomputation and rate limit checks per partner

## Plan (short)
- Build widget API service
- Wire server route + CORS
- Update widget payload + tests
- Validate + handoff

## Validation (commands)
- `npm test`
- `npm run build`
- `npm run test:e2e`

## Risks / edge cases
- Default scoring uses configurable baseline home coordinates
- Cache keys rely on job URL when available

## Decisions / notes
- Partner configs read from `WIDGET_PARTNERS_JSON` env (JSON array).
