# WS5 / WS6 Implementation Checklist

This checklist converts ADR 0001 workstreams 5 and 6 into concrete implementation tasks against the current repo state as of 2026-03-26.

References:
- [ADR 0001](adr/0001-vector-next-architecture.md)
- [Integration Status](INTEGRATION_STATUS.md)
- [Integration Smoke Tests](INTEGRATION_SMOKE_TESTS.md)
- [Runtime Contract](../schemas/runtime_contract.yaml)

## WS5: Productized Install

### Current state

- Host docs, generated templates, and fixtures exist for Cursor, Cline, Windsurf, and GitHub Copilot.
- Shared local smoke and one remote smoke path exist in-repo.
- One-command installer exists at `pnpm run host:install`.
- Post-install self-test exists at `pnpm run selftest`.
- Adapter status is still mostly `documented`, because real host-run evidence is still missing.

### Gap to ADR

ADR WS5 requires:
- one-command installer
- host-specific rules or agent instructions
- post-install self-test
- host verification checklist
- at least one host self-test passing end-to-end

### Implementation checklist

1. Add a top-level installer entrypoint.
   - Candidate path: `scripts/install_vector.mjs`
   - Inputs: host name, local vs remote runtime, optional project id
   - Outputs: generated host config, printed next steps, deterministic exit codes

2. Add a top-level self-test entrypoint.
   - Candidate script: `scripts/selftest.mjs`
   - Modes:
     - `local`
     - `remote`
     - `host=<cursor|cline|windsurf|github_copilot>`
   - Minimum proof:
     - initialize runtime
     - call `vector_state_snapshot`
     - call one mutating tool with `request_id`
     - verify persisted state or remote ownership headers

3. Normalize host fixture generation.
   - Source fixtures from maintained templates, not ad hoc checked-in JSON only.
   - Candidate directory:
     - `vector/integrations/templates/`
   - Generate:
     - Cursor `.cursor/mcp.json`
     - Cline MCP settings
     - Windsurf config
     - GitHub Copilot config + agent file

4. Add host-specific rules packaging.
   - Move host instructions into machine-renderable assets where possible.
   - Keep host variance in config/rules, not workflow law.
   - Explicitly map which toolsets each host should expose by default.

5. Promote one host to true `verified-local`.
   - Recommended first target: Cursor or Cline.
   - Required proof artifact:
     - generated config from installer
     - self-test output
     - checked-in verification record referencing exact command used

6. Promote one remote-capable host path to true `verified-remote`.
   - Recommended first target: OpenHands or Replit after hosted reproduction.
   - Required proof:
     - auth path
     - ownership headers
     - mutate path
     - read path
     - isolation proof

7. Extend CI/release gate for installability.
   - Add installer smoke to `release-check`.
   - Add self-test invocation to CI for at least one local host path.

### Exit criteria

- `pnpm run install -- --host <host>` or equivalent exists and succeeds
- `pnpm run selftest -- --host <host>` or equivalent exists and succeeds
- at least one host is promoted from `documented` to `verified-local`
- verification record references generated assets, not manual edits

## WS6: Registry Metadata

### Current state

- `manifest.json` exists and is release-checked.
- Product identity is now aligned to `2.0.0` across manifest, runtime, and package metadata.
- Runtime entrypoints identify themselves as `2.0.0`.
- Capability/toolset metadata is runtime-visible and now published as generated registry metadata.

### Gap to ADR

ADR WS6 requires machine-readable metadata covering:
- package identity
- install instructions
- transport information
- auth expectations
- capability summary
- host compatibility notes

### Implementation checklist

1. Define canonical registry metadata schema.
   - Candidate path: `vector/schemas/registry_metadata.yaml`
   - Required fields:
     - package_name
     - package_version
     - runtime_version
     - transports
     - auth
     - default_toolsets
     - optional_toolsets
     - install_surfaces
     - compatibility
     - self_test_commands

2. Add generated metadata artifact.
   - Candidate path: `vector/registry/server_metadata.json`
   - Generate from:
     - `manifest.json`
     - `runtime_contract.yaml`
     - `capability_contract.ts`
     - `INTEGRATION_STATUS.md`

3. Unify package identity/versioning.
   - Remove drift between:
     - `manifest.json`
     - `vector/mcp_server/package.json`
     - runtime entrypoint version constants
     - remote worker version constant
   - Decide whether product version and runtime version are separate fields or one canonical version.

4. Publish transport/auth metadata explicitly.
   - Include:
     - `stdio`
     - `streamable_http`
     - bearer license requirement
     - remote ownership header requirement

5. Publish capability metadata explicitly.
   - Include all toolsets.
   - Mark mutating vs read-only surfaces.
   - Mark `safe_mode` behavior.

6. Publish host compatibility notes as structured metadata.
   - Map hosts to one of:
     - documented
     - verified-local
     - verified-remote
     - deprecated

7. Add release verification for metadata truthfulness.
   - Tests should fail if registry metadata disagrees with:
     - runtime versions
     - toolset membership
     - transport support
     - integration status

### Exit criteria

- machine-readable registry metadata exists
- metadata is generated or strongly verified, not hand-maintained only
- release-check validates metadata against runtime and manifest
- version strings no longer drift across entrypoints and package metadata

## Recommended order after this document

1. Finish version unification first because WS6 depends on it.
2. Build installer/self-test second because WS5 promotion depends on reproducible commands.
3. Promote one local host path before attempting broad marketplace-style metadata claims.
