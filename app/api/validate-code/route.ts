import { NextResponse } from "next/server";

const DEFAULT_CODES = ["888888", "202520", "131452"];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { code?: unknown };
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const configuredCodes = process.env.VALID_ACCESS_CODES?.split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const validCodes = configuredCodes?.length ? configuredCodes : DEFAULT_CODES;

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { valid: false, message: "显影码应为 6 位数字" },
        { status: 400 },
      );
    }

    if (!validCodes.includes(code)) {
      return NextResponse.json(
        { valid: false, message: "这组显影码没有被识别，请重新确认" },
        { status: 401 },
      );
    }

    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json(
      { valid: false, message: "显影码暂时无法验证，请稍后重试" },
      { status: 400 },
    );
  }
}
