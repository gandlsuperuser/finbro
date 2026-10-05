export interface ExplainMetricRequest {
  label: string;
  value?: string | number;
  unit?: string;
  period?: string;
  company?: string;
  ticker?: string;
  docType?: string;
  deltaYoY?: number | null;
  margin?: string | null;
  context?: string;
  userQuestion?: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  endpoint?: string;
  model?: string;
}

export const DEFAULT_QWEN_ENDPOINT =
  process.env.QWEN_API_BASE || "https://wax-collar-lat-alot.trycloudflare.com/v1";
export const DEFAULT_QWEN_MODEL = process.env.QWEN_MODEL || "qwen3.5-9b-mlx";

export function buildPrompt(req: ExplainMetricRequest) {
  const {
    label,
    value,
    unit = "M",
    period = "最新季度",
    company = "目标公司",
    ticker = "N/A",
    docType = "财务报表",
    deltaYoY,
    margin,
    context,
    userQuestion,
  } = req;

  const yoyStr =
    deltaYoY !== undefined && deltaYoY !== null
      ? `同比变动: ${deltaYoY >= 0 ? "+" : ""}${deltaYoY.toFixed(1)}%`
      : "";
  const marginStr = margin ? `毛利率/利润率水平: ${margin}` : "";

  let prompt = `【财报上下文】
公司: ${company} (${ticker})
报表类型: ${docType}
报告期间: ${period}
用户当前圈选/关注科目: 【${label}】
对应数值: ${value !== undefined ? `${value} ${unit}` : "未指定单一数值"}
${yoyStr ? `${yoyStr}\n` : ""}${marginStr ? `${marginStr}\n` : ""}${context ? `相关行列数据背景: ${context}\n` : ""}`;

  if (userQuestion) {
    prompt += `\n用户特别提问: "${userQuestion}"\n请结合上述财报数字与背景深入解答。`;
  } else {
    prompt += `\n请针对用户所选的【${label}】及对应数值进行专业、精炼且深入浅出的解读。`;
  }

  return prompt;
}

export const SYSTEM_PROMPT = `你是 FinBro 智能 AR 财报助手的核心金融大模型（基于 Qwen 3.5）。
用户正在通过摄像头或屏幕阅读企业财报，圈选了其中的某个文字/会计科目或数字。

你的任务是提供专业、通俗、富有金融洞察的屏幕解读，请遵循以下结构：
1. 📌 **一句话速读**：用通俗生动的比喻或一句话讲透该指标/数字的本质。
2. 📊 **数值深度透视**：结合当前数值、同比/环比增速、占比情况，解读企业当前的业务运行状况与赚钱能力。
3. 💡 **华尔街分析师视角**：机构投资者最关心背后的什么驱动逻辑？代表了什么行业竞争壁垒？
4. ⚠️ **关键风险与信号**：提示投资者需要注意的潜在隐患或财报附注里的关键点。

排版规范：
- 使用清晰的 Markdown 标题与要点符号。
- 语言精练专业，避免空话套话，聚焦当下数字。`;
