# Upgrade Notes

This package was rebuilt from the earlier compressed version into a fuller system.

## What was restored

- richer phase guidance
- more examples
- stronger decision logic
- more platform-specific setup material
- a broader benchmark framework
- a clearer persistent KB format

## What changed structurally

- The original accidental packaging artifacts were removed.
- Platform setup was split by surface.
- Repeated prose was consolidated into schemas where possible.
- The “engine” layer and the “rich content” layer now coexist.

## Migration advice

If you are upgrading from v1.1 or v1.2:

1. Copy your old KB into the new KB template.
2. Keep your current phase and milestone state.
3. Re-evaluate the channel and venue using the new benchmark schema.
4. Re-run the ICP and market phases if your previous signals were weak or unclear.

## Vietnamese note

Bản này thiên về “max utility” hơn là tối giản. Mục tiêu là dùng thật, không phải chỉ đọc cho gọn.

## v1.6 upgrade path

### What to keep exactly as-is
- Your existing product summary
- Existing KB history
- Existing signal logs
- Existing validated benchmarks
- Existing platform choice, unless the new install guide suggests a better surface

### What to add
- Persona routing metadata
- Session contract fields
- Artifact registry entries
- Research memo outputs
- Copy pack outputs
- Decision memo outputs

### Migration sequence
1. Load the old KB.
2. Map its data into the new session contract.
3. Re-run routing to confirm the correct mode.
4. Validate which phase is currently active.
5. Add the next best artifact rather than rewriting the entire stack at once.

### Upgrade principle
Preserve the old truth, then layer the new truth on top with versioned fields.

## v1.6 upgrade notes

This version is still additive only.

### What was reinforced
- routing
- artifact discipline
- evidence quality
- copy lock discipline
- skill registry thinking

### What to watch
When adapting the package, preserve the canonical schema order and the thesis-before-copy rule.
