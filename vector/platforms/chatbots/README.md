# Skill-aware Chatbot Group

This section exists for chat-based surfaces that support reusable skills, instructions, or persistent knowledge.

## Included surfaces

- Claude.ai Projects
- Claude Code
- Manus
- OpenClaw
- Codex app
- Windsurf Cascade
- Cursor Agent / Custom modes
- Lovable workspace / project knowledge

## Shared operating pattern

1. Keep the core VECTOR engine in markdown.
2. Keep the KB in a single stable place.
3. Keep platform-specific adapters separate.
4. Keep English as the canonical language.
5. Use Vietnamese only for short helper notes.

## Why this matters

Chatbots differ in how they store memory and invoke reusable workflows.
A portable framework must not assume one storage model fits all.

## Vietnamese note

Nhóm này không phải “một kiểu cài đặt”. Nó là một họ nền tảng có hỗ trợ workflow lặp lại theo nhiều cách khác nhau.


## v1.6 integration notes

This group is now expected to support three recurring workflows:
- **research**: collect evidence and produce a memo
- **decision**: turn evidence into a routing decision
- **copy**: turn a locked thesis into launch-ready messaging

### Shared behavior standard
- load the KB once
- keep the canonical schema first
- produce one artifact per turn
- sync decisions back to the KB before moving on

### Vietnamese note
Nhóm chatbot này phải đủ ổn để chạy nghiên cứu, ra quyết định, và viết copy theo cùng một bộ luật.

## v1.6 adapter notes

### Best practice
- load canonical schemas before phase prompts
- keep the KB as the stable memory anchor
- preserve artifact history across turns
- route research before copy when evidence is missing
- route copy only after thesis and venue are locked

### Skill registry note
If the platform supports reusable skill folders or modules, keep related skills together and preserve a clear load order.
