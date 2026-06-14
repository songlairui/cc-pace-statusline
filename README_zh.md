# cc-pace-statusline

> English: [README.md](./README.md)

一个克制的 [Claude Code](https://claude.ai/code) statusLine 配置——只占一行，给速率限制进度条加了一根**配速标记**（pace marker），把"用了多少"变成"和时间比谁更快"。

```
Opus·high   ctx ▓░░░░ 28%   5h ▓░░│░ 23%
                                  ↑
                              现在的时间位置；
                              用量还在标记左侧 → 慢于配速（好事）
```

7 天窗口的用量**偏离时间进度 ≥ 20 个百分点**时，才会出现第三段；其余时候完全隐身，不打扰。

```
Opus·high   ctx ▓░░░░ 28%   5h ▓░░│░ 23%   7d! ▓▓▓▓│▓░ 90% +33pp
Opus·high   ctx ▓░░░░ 28%   5h ▓░░│░ 23%   7d· ▓░░░│░░ 10% −47pp
```

`7d!` 读作"这周烧太快了"，`7d·` 读作"这周还很闲"。

## 核心想法

大部分 statusLine 告诉你"用了多少"，但不告诉你"用得多快"。一个 60% 的 5 小时窗口，在第 1 小时和第 4 小时是完全不同的两件事。这里在进度条里画一根细绿竖线 `│`，标出"现在"在窗口里的相对位置：

- `5h` 进度条 **5 格 = 每格 1 小时**
- `7d` 进度条 **7 格 = 每格 1 天**

标记落在哪一格，就是当前的小时数 / 天数。标记和填充区边缘的距离，就是肉眼可读的配速偏差：

| 你看到的 | 意思 |
| --- | --- |
| 标记在填充段里面 | 用量**领先**时间——该慢一点 |
| 标记刚好在填充边缘 | 配速一致 |
| 标记远在填充边缘之后 | 还有富余 |

## 设计取舍

- **就一行。** 两行 statusLine 占地方，resize 时还会闪。
- **不用 emoji。** 在老终端里宽度不可控；语义全交给颜色 + 位置。
- **不显示 git、cwd、cost、duration。** shell prompt 已经给了路径和分支；花费和时长是事后账，不是当下信号。
- **只保留三个能行动的信号：** 上下文窗口、5 小时速率、7 天速率（条件触发）。
- **`!200k`** 在 [`exceeds_200k_tokens`](https://docs.claude.com/en/docs/claude-code/statusline) 为真时出现——那是计费和延迟性质突变的拐点。

## 安装

需要 Claude Code v2.1.x 和 Node.js。

```bash
# 1. 把脚本放到 settings 同级
curl -fsSLo ~/.claude/statusline.mjs \
  https://raw.githubusercontent.com/songlairui/cc-pace-statusline/main/statusline.mjs
chmod +x ~/.claude/statusline.mjs

# 2. 把这一段加进 ~/.claude/settings.json
```

```jsonc
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.mjs",
    "padding": 2,
    "refreshInterval": 300
  }
}
```

`refreshInterval: 300` 让脚本每 5 分钟跑一次，确保 idle 会话里配速标记也会往前走。只想要事件驱动的话把这行删掉。

设置会自动 reload，下次和 Claude Code 交互时即可看到。

## 配色规则

| 段 | 绿 | 黄 | 红 |
| --- | --- | --- | --- |
| `ctx` | < 60% | 60–84% | ≥ 85% |
| `5h` | < 50% | 50–79% | ≥ 80% |
| `7d!`（超量） | — | — | 全段红 |
| `7d·`（拖后） | 暗青 | — | — |
| `!200k` | — | — | 红 |

标记 `│` 固定使用亮绿粗体（`\033[1;92m`），不随进度条颜色变化，保证在任何阈值色背景上都可见。

## 调参

所有可调旋钮都在 `statusline.mjs` 顶部：

```js
const SEVEN_D_THRESHOLD_PP = 20;   // 改大更安静（25），改小更敏感（15）
const FIVE_H_SECONDS = 5 * 3600;
const SEVEN_D_SECONDS = 7 * 86400;
```

颜色阈值写在 `render()` 里——ctx 是 `[60, 85]`，5h 是 `[50, 80]`，随便改。

## 故意没做的事

下面这些都考虑过又砍掉了。需要的话 fork 一份自己加：

- 花费（`cost.total_cost_usd`）
- 时长（`cost.total_duration_ms`）
- Git 分支 / 改动状态
- 工作目录
- PR 徽章
- Subagent 名
- 输出风格
- Thinking 指示
- 5h / 7d 重置倒计时（进度条 + 标记已经表达了）

原则：statusLine 的位置很贵，只配显示"你本来要主动去查才能知道的信息"。

## License

MIT.

---

— by songlairui 的 Claude Opus 4.7
