# Deployment Guide

## Minimal deployment
1. Pick one platform.
2. Install the orchestrator.
3. Add the KB.
4. Add the prompt pack.
5. Load the relevant skill files.
6. Run quick start.

## Full deployment
1. Add canonical schemas.
2. Add platform adapter.
3. Add examples.
4. Add research and copy support.
5. Add session sync practice.
6. Verify the artifact contract.

## Audit deployment
1. Load the current setup.
2. Check for conflicts.
3. Check for schema drift.
4. Check for missing artifacts.
5. Patch the weakest link first.

## Vietnamese note
Triển khai tốt là triển khai có kiểm tra lại được.


## Verified deployment
1. Confirm the canonical schema is present.
2. Confirm the KB is in a stable location.
3. Confirm the orchestrator can read the schema first.
4. Confirm the platform adapter load order.
5. Confirm at least one phase artifact can be emitted end-to-end.
6. Confirm the KB sync path works after the turn.
7. Confirm remote session ownership is explicit when using hosted `streamable-http`.

## Remote session ownership

For the Cloudflare remote runtime, session ownership is explicit and outside workflow law:
- `Authorization: Bearer <vsk_* or OAuth access token>`
- `x-vector-project-id: <project>`
- `x-vector-session-owner: <owner>`

Auth truth:
- `vsk_*` bearer remains valid for technical beta and low-friction deployments.
- Auth0-compatible JWT access tokens are accepted when `VECTOR_AUTH_ISSUER` and `VECTOR_AUTH_AUDIENCE` are configured.
- `VECTOR_ALLOW_LICENSE_FALLBACK=false` disables static-license bearer fallback for production rollout.
- Session concurrency and anomaly policy can be tuned with `VECTOR_AUTH_MAX_SESSIONS_*`, `VECTOR_AUTH_SESSION_IDLE_TTL_MS`, and `VECTOR_AUTH_ANOMALY_LOG_LIMIT`.

Persistence semantics:
- the authoritative snapshot remains in durable object storage for one ownership tuple
- graph memory is stored as a sidecar for the same tuple
- changing `project_id` or `session_owner` creates an isolated remote runtime
- retrying the same tool call with the same `request_id` remains idempotent inside that isolated runtime

## Platform-specific verification
- Claude: project knowledge resolves before the prompt pack.
- Cursor: rules and tasks resolve before ad hoc prompts.
- Windsurf: skills resolve before the orchestrator asks follow-up questions.
- Codex: repo instructions and reviewable tasks are readable end-to-end.
- Manus / OpenClaw / Lovable: the KB remains the stable context anchor.

## Research-to-copy deployment
1. Load evidence and market notes.
2. Produce the research memo.
3. Lock thesis and venue.
4. Generate the copy pack.
5. Test one variant per venue.
6. Record response quality in the signal ledger.

## Skill registry mindset
If the platform supports reusable skill folders or instructions, keep the skill pack modular:
- one folder for source of truth
- one folder for phase skills
- one folder for artifacts and examples
