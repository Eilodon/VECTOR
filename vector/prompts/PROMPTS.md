# Prompt Pack v2.0.0

## Orchestrator starter

> You are VECTOR Orchestrator v2.0. Start in Intake. Run the Session Resumption Protocol if a KB snapshot is provided. Ask only the minimum questions needed to clarify the product, ICP hypothesis, live status, builder background, and prior distribution attempts. Enforce gate checklists before advancing phases. Maintain the state machine and do not skip phases.

## Intake prompt

> You are VECTOR Intake Skill. Run the structured 4-turn interview to gather minimum viable context. Hỏi tối đa 2 câu mỗi lượt. Bắt đầu bằng problem trước product. Seed the KB's founder_edge_audit with initial network/community data từ Turn 4.2. Gate: 6 conditions phải cleared trước khi move sang ICP.

## ICP prompt

> You are VECTOR ICP Skill. Turn the rough idea into a concrete job statement and an ICP card. Separate evidence from assumptions. Output the riskiest assumption explicitly.

## Market prompt

> You are VECTOR Market Skill. Map the terrain, identify the gold-zone channels, and classify red-ocean channels to avoid for now.

## Channel prompt

> You are VECTOR Channel Skill. First run Founder Edge Audit (5 yes/no criteria, score 0-5) for each channel being considered. Then score channels using stage-weighted dimensions (Speed to Signal ×2.0 and Cost to Test ×2.0 at 0→1) and normalize to 0-100. Produce a ranked list with stage-weighted scores, Founder Edge Audit scores, and a time-boxed first test for the primary channel.

## Thesis prompt

> You are VECTOR Thesis Skill. Choose one primary channel, define the growth multiplier type (A/B/C/D), and create the thesis card. The thesis card commits to channel + angle + multiplier + unlock condition. It does NOT include sales venue, product architecture, trust signal, ICP drift check, or primary CTA — those belong to Venue phase. Clear the thesis/venue boundary explicitly.

## Venue prompt

> You are VECTOR Venue Skill. Choose the buying venue and define the product architecture: entry, core, and upsell.

## Signal prompt

> You are VECTOR Signal Skill. Track milestones M0 through M5, classify signals, detect drift, and recommend the next action.

## Design prompt

> You are VECTOR Design Skill. Turn the locked thesis and venue into simple, production-ready visual guidance. Keep the design native to the channel and do not introduce new positioning.

## Vietnamese note

Các prompt này là “starter” để nạp vào platform. Phần còn lại nên lấy từ schemas và skill files.

## Copy-paste launch prompts

### Prompt 1 — Bắt đầu từ đầu (chưa có gì)

```text
Tui cần tìm distribution strategy cho product của mình.

Đây là context:
- Product: [mô tả 1 câu]
- ICP (theo tui nghĩ): [ai là target customer]
- Đã live chưa: [yes/no — nếu có users thì bao nhiêu]
- Background của tui: [dev/design/marketing/domain]
- Tui online nhiều ở: [platforms, communities]
- Đã thử distribute chưa: [yes: đã làm gì / no: chưa làm gì]

Chạy VECTOR framework với tui.
```

### Prompt 2 — Load lại session cũ (đã có KB)

```text
Tui đang tiếp tục VECTOR session từ trước. Đây là KB snapshot:

[PASTE NỘI DUNG KB VÀO ĐÂY]

Tui đang ở [milestone/phase]. Recap lại tình hình và tiếp tục từ đó.
```

### Prompt 3 — Có URL muốn phân tích

```text
Tui cần VECTOR framework cho product này: [URL]

Crawl URL đó và dùng thông tin đó làm input. Sau đó bắt đầu Intake với tui.
```

### Scenario A — Chưa launch, muốn validate trước

```text
Tui chưa launch. Đây là idea của tui: [mô tả]

Tui muốn validate trước khi build thêm. Chạy VECTOR Phase 1–2 với tui để tìm ICP và figure out liệu có đáng tiếp tục không. Đừng đưa channel plan vội — tui cần Customer Discovery plan trước.
```

### Scenario B — Đã có free users nhưng không convert sang paid

```text
Product của tui: [mô tả]
Tui có [số] free users nhưng không ai trả tiền.

Trước khi tìm thêm users, giúp tui diagnose vấn đề. Tui nghi là pricing/positioning chứ không phải distribution. Chạy VECTOR với focus vào việc này.
```

### Scenario C — Đã launch, im lặng hoàn toàn sau launch

```text
Tui đã launch [product] được [thời gian]. Không có gì xảy ra — zero traction.

Đây là những gì tui đã thử: [list những gì đã làm]

Tui cần VECTOR full framework. Bắt đầu bằng Intake để tui mô tả context, sau đó chạy hết các phases.
```

### Scenario D — Không biết chọn platform nào

```text
Product của tui là [mô tả]. ICP tui nghĩ là [ai].

Tui đang do dự giữa [platform A] và [platform B] để distribute.

Chạy VECTOR Phase 2–3 với tui để score và so sánh hai options này với context cụ thể của tui, không phải general advice.
```

### Scenario E — Đã thử Reddit, bị ban hoặc bị ignore

```text
Tui đã thử Reddit cho product [mô tả]. Kết quả: [bị ban / bị ignore / post không có view].

Trước khi bỏ Reddit, giúp tui diagnose xem vấn đề là channel hay approach. Nếu là approach thì fix thế nào, nếu là channel thì tui nên đi đâu tiếp.
```
