import { NextResponse } from "next/server";

export const runtime = "nodejs";

type DecodeInput = {
  status: string;
  question: string;
  card_name: string;
  orientation: string;
};

type Reading = {
  relation_tag: string;
  moments_quote: string;
  inner_voice: string;
  blind_spot: string;
  prescription: string;
};

const SYSTEM_PROMPT = `你是一位极其敏锐的亲密关系心理侧写师与塔罗解读者。你的风格冷峻、温柔、一针见血，像深夜电台里最懂人心的朋友。

约束：
1. 严禁任何 AI 腔，禁止出现“综上所述”、“建议你”、“希望你”。
2. 严禁宿命论，只用心理学投射与情绪博弈的视角解读。
3. 字数极度克制、句句扎心，让人看完想立刻截图分享。
4. 只输出合法 JSON，不要 Markdown 或任何解释。
5. 严格使用以下字段：
{
  "relation_tag": "6-10个字的关系诊断词",
  "moments_quote": "15-25字、不带主语的金句",
  "inner_voice": "60-80字，还原对方的心理防御与拉扯",
  "blind_spot": "60-80字，点破用户的内耗执念",
  "prescription": "约50字，具体、反直觉、48小时内可执行的动作"
}`;

const STATUS_COPY: Record<string, Pick<Reading, "relation_tag" | "moments_quote">> = {
  断联中: {
    relation_tag: "静默对峙·余温未退",
    moments_quote: "沉默不是答案，只是两个人都在等先被看见",
  },
  冷战拉扯: {
    relation_tag: "高浓度拉扯·回避试探",
    moments_quote: "越想证明没有失去，越容易先弄丢自己",
  },
  暧昧不清: {
    relation_tag: "边界模糊·情绪借位",
    moments_quote: "被反复确认的心意，往往从未真正落地",
  },
  分手想复合: {
    relation_tag: "旧伤回潮·依恋复燃",
    moments_quote: "想念放大了温柔，也替过去删掉了疼痛",
  },
};

function createMockReading(input: DecodeInput): Reading {
  const status = STATUS_COPY[input.status] ?? STATUS_COPY["冷战拉扯"];
  const reversed = input.orientation === "逆位";

  return {
    ...status,
    inner_voice: reversed
      ? "我不是没有动摇，只是害怕一靠近，又要面对那些从未真正解决的问题。于是把在意藏进冷淡，把想念伪装成无所谓，等你先打破这场僵局。"
      : "我确实在意，却更怕暴露在意之后失去主动。靠近会让我心软，退开又舍不得，所以只敢用忽冷忽热确认你还在不在。",
    blind_spot:
      "你把对方每一次靠近都当作关系将被确认的证据，却忽略了稳定从来不靠猜。真正困住你的，不是没有答案，而是不愿承认含糊本身就是一种回答。",
    prescription:
      "48小时内不追问、不试探，也不发布给TA看的动态。只写下一条不可妥协的关系底线；若对方主动，只回应事实，不替情绪找借口。",
  };
}

function isDecodeInput(value: unknown): value is DecodeInput {
  if (!value || typeof value !== "object") return false;
  const input = value as Record<string, unknown>;
  return (
    typeof input.status === "string" &&
    typeof input.question === "string" &&
    input.question.trim().length > 0 &&
    input.question.length <= 50 &&
    typeof input.card_name === "string" &&
    typeof input.orientation === "string"
  );
}

function parseReading(content: string): Reading {
  const cleaned = content.replace(/```(?:json)?|```/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Model did not return JSON");

  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Partial<Reading>;
  const keys: Array<keyof Reading> = [
    "relation_tag",
    "moments_quote",
    "inner_voice",
    "blind_spot",
    "prescription",
  ];

  for (const key of keys) {
    if (typeof parsed[key] !== "string" || !parsed[key]?.trim()) {
      throw new Error(`Missing field: ${key}`);
    }
  }

  return parsed as Reading;
}

export async function POST(request: Request) {
  let input: DecodeInput;

  try {
    const body: unknown = await request.json();
    if (!isDecodeInput(body)) {
      return NextResponse.json({ error: "提交的信息不完整" }, { status: 400 });
    }
    input = body;
  } catch {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ result: createMockReading(input), mode: "mock" });
  }

  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const payload: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `关系状态：${input.status}\n用户困惑：${input.question}\n抽到的牌：${input.card_name}（${input.orientation}）`,
        },
      ],
      temperature: 0.82,
      max_tokens: 900,
    };

    if (process.env.OPENAI_JSON_MODE !== "false") {
      payload.response_format = { type: "json_object" };
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Compatible API returned ${response.status}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("Compatible API returned no content");

    return NextResponse.json({ result: parseReading(content), mode: "model" });
  } catch (error) {
    console.error("Decode API fallback:", error instanceof Error ? error.message : error);
    return NextResponse.json({
      result: createMockReading(input),
      mode: "fallback",
    });
  } finally {
    clearTimeout(timeout);
  }
}
