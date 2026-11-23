"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Stage = "gate" | "question" | "loading" | "result";

type TarotCard = {
  numeral: string;
  name: string;
  english: string;
};

type DrawnCard = TarotCard & {
  orientation: "正位" | "逆位";
};

type Reading = {
  relation_tag: string;
  moments_quote: string;
  inner_voice: string;
  blind_spot: string;
  prescription: string;
};

type DecodeResponse = {
  result: Reading;
  mode: "mock" | "model" | "fallback";
};

const STATUS_OPTIONS = ["断联中", "冷战拉扯", "暧昧不清", "分手想复合"];

const TAROT_CARDS: TarotCard[] = [
  { numeral: "0", name: "愚人", english: "THE FOOL" },
  { numeral: "I", name: "魔术师", english: "THE MAGICIAN" },
  { numeral: "II", name: "女祭司", english: "THE HIGH PRIESTESS" },
  { numeral: "III", name: "皇后", english: "THE EMPRESS" },
  { numeral: "IV", name: "皇帝", english: "THE EMPEROR" },
  { numeral: "V", name: "教皇", english: "THE HIEROPHANT" },
  { numeral: "VI", name: "恋人", english: "THE LOVERS" },
  { numeral: "VII", name: "战车", english: "THE CHARIOT" },
  { numeral: "VIII", name: "力量", english: "STRENGTH" },
  { numeral: "IX", name: "隐者", english: "THE HERMIT" },
  { numeral: "X", name: "命运之轮", english: "WHEEL OF FORTUNE" },
  { numeral: "XI", name: "正义", english: "JUSTICE" },
  { numeral: "XII", name: "倒吊人", english: "THE HANGED MAN" },
  { numeral: "XIII", name: "死神", english: "DEATH" },
  { numeral: "XIV", name: "节制", english: "TEMPERANCE" },
  { numeral: "XV", name: "恶魔", english: "THE DEVIL" },
  { numeral: "XVI", name: "高塔", english: "THE TOWER" },
  { numeral: "XVII", name: "星星", english: "THE STAR" },
  { numeral: "XVIII", name: "月亮", english: "THE MOON" },
  { numeral: "XIX", name: "太阳", english: "THE SUN" },
  { numeral: "XX", name: "审判", english: "JUDGEMENT" },
  { numeral: "XXI", name: "世界", english: "THE WORLD" },
];

const LOCAL_FALLBACK: Reading = {
  relation_tag: "高浓度拉扯·回避试探",
  moments_quote: "越想证明没有失去，越容易先弄丢自己",
  inner_voice:
    "我确实在意，却更怕暴露在意之后失去主动。靠近会让我心软，退开又舍不得，所以只敢用忽冷忽热确认你还在不在。",
  blind_spot:
    "你把对方每一次靠近都当作关系将被确认的证据，却忽略了稳定从来不靠猜。真正困住你的，不是没有答案，而是不愿承认含糊本身就是一种回答。",
  prescription:
    "48小时内不追问、不试探，也不发布给TA看的动态。只写下一条不可妥协的关系底线；若对方主动，只回应事实，不替情绪找借口。",
};

const STAR_POSITIONS = [
  [8, 12, 0.45], [18, 29, 0.72], [28, 8, 0.38], [42, 18, 0.65],
  [56, 7, 0.42], [69, 23, 0.76], [83, 11, 0.5], [92, 34, 0.4],
  [6, 54, 0.35], [22, 67, 0.48], [34, 45, 0.7], [48, 74, 0.34],
  [62, 52, 0.56], [77, 64, 0.36], [89, 79, 0.62], [13, 89, 0.42],
  [39, 92, 0.58], [57, 86, 0.32], [72, 94, 0.48], [95, 55, 0.38],
] as const;

const deckRotations = [-9, -4.5, 0, 4.5, 9];

function LogoMark({ dark = false }: { dark?: boolean }) {
  const color = dark ? "#15171C" : "#D9BD8B";
  return (
    <svg aria-hidden="true" width="30" height="30" viewBox="0 0 30 30" fill="none">
      <circle cx="15" cy="15" r="13.25" stroke={color} strokeOpacity="0.42" />
      <circle cx="15" cy="15" r="8.25" stroke={color} strokeOpacity="0.72" />
      <path d="M15 7.2v15.6M7.2 15h15.6" stroke={color} strokeOpacity="0.34" />
      <circle cx="15" cy="15" r="2.1" fill={color} />
    </svg>
  );
}

function StarField() {
  return (
    <div aria-hidden="true">
      {STAR_POSITIONS.map(([left, top, opacity], index) => (
        <motion.span
          className="star"
          key={`${left}-${top}`}
          style={{ left: `${left}%`, top: `${top}%` }}
          animate={{ opacity: [opacity * 0.35, opacity, opacity * 0.35] }}
          transition={{ duration: 4 + (index % 4), repeat: Infinity, delay: index * 0.21 }}
        />
      ))}
    </div>
  );
}

function Header({ step }: { step: number }) {
  return (
    <header className="mx-auto flex w-full max-w-[430px] items-center justify-between px-5 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-2.5">
        <LogoMark />
        <span className="font-display text-[14px] font-medium tracking-[-0.04em] text-[#F5F2EC]">
          情绪显影室
        </span>
      </div>
      <div className="flex items-center gap-1.5" aria-label={`第 ${step} 步，共 4 步`}>
        {[1, 2, 3, 4].map((item) => (
          <span
            key={item}
            className={`h-[3px] rounded-full transition-all duration-500 ${
              item <= step ? "w-5 bg-champagne" : "w-2.5 bg-white/15"
            }`}
          />
        ))}
      </div>
    </header>
  );
}

function GateScreen({ onVerified }: { onVerified: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    if (code.length !== 6) {
      setError("请输入完整的 6 位显影码");
      return;
    }

    setChecking(true);
    setError("");
    try {
      const response = await fetch("/api/validate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await response.json()) as { valid?: boolean; message?: string };
      if (!response.ok || !data.valid) {
        setError(data.message || "显影码未被识别");
        return;
      }
      onVerified();
    } catch {
      setError("暂时无法验证，请检查网络后再试");
    } finally {
      setChecking(false);
    }
  }

  return (
    <motion.main
      className="mx-auto flex min-h-[calc(100dvh-72px)] w-full max-w-[430px] flex-col justify-between px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(8px)" }}
      transition={{ duration: 0.42 }}
    >
      <div>
        <motion.div
          className="mb-10 flex justify-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="relative flex h-40 w-40 items-center justify-center">
            <motion.div
              className="absolute inset-0 rounded-full border border-champagne/15"
              animate={{ scale: [0.9, 1.05, 0.9], opacity: [0.35, 0.8, 0.35] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="absolute inset-7 rounded-full border border-champagne/30" />
            <div className="absolute inset-[3.9rem] rounded-full bg-champagne shadow-[0_0_35px_rgba(217,189,139,.45)]" />
            <span className="font-quote text-[11px] tracking-[0.22em] text-champagne/80">显影</span>
          </div>
        </motion.div>

        <div className="mb-8 text-center">
          <p className="mb-3 text-[12px] tracking-[0.22em] text-champagne/65">让未说出口的，慢慢浮现</p>
          <h1 className="font-display text-[38px] font-semibold leading-[1.08] tracking-[-0.06em] text-[#F7F4EE]">
            看见关系里
            <br />
            被藏起来的情绪
          </h1>
          <p className="mx-auto mt-4 max-w-[18rem] text-[14px] leading-6 text-white/45">
            一张牌，一次诚实的情绪切片。
            <br />
            不预测命运，只照见此刻。
          </p>
        </div>

        <form onSubmit={verifyCode} className="glass-panel rounded-[20px] p-3">
          <label htmlFor="access-code" className="sr-only">输入小红书获取的 6 位显影码</label>
          <input
            id="access-code"
            className="code-input h-14 w-full rounded-[14px] border-0 bg-white/[0.045] px-4 text-center text-[20px] tracking-[0.28em] text-white outline-none placeholder:text-[14px] placeholder:tracking-[-0.02em]"
            value={code}
            onChange={(event) => {
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
              if (error) setError("");
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="输入小红书获取的 6 位显影码"
            aria-describedby={error ? "code-error" : "code-hint"}
          />
          <button className="primary-button mt-3 w-full" type="submit" disabled={checking}>
            {checking ? "正在核对显影码…" : "开启显影"}
          </button>
        </form>
        <div className="mt-3 min-h-5 text-center text-[12px]">
          {error ? (
            <p id="code-error" role="alert" className="text-[#E7A8A0]">{error}</p>
          ) : (
            <p id="code-hint" className="text-white/28">本地体验码：888888</p>
          )}
        </div>
      </div>

      <p className="mt-10 text-center text-[10px] leading-4 text-white/20">
        本体验仅用于情绪觉察，不替代专业心理咨询
      </p>
    </motion.main>
  );
}

function QuestionScreen({
  status,
  setStatus,
  question,
  setQuestion,
  selectedIndex,
  drawnCard,
  onDraw,
}: {
  status: string;
  setStatus: (value: string) => void;
  question: string;
  setQuestion: (value: string) => void;
  selectedIndex: number | null;
  drawnCard: DrawnCard | null;
  onDraw: (index: number, setError: (message: string) => void) => void;
}) {
  const [error, setError] = useState("");

  return (
    <motion.main
      className="mx-auto w-full max-w-[430px] px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-5"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="mb-7">
        <p className="mb-2 text-[12px] tracking-[0.18em] text-champagne/60">只需要一次诚实</p>
        <h1 className="font-display text-[31px] font-semibold leading-[1.1] tracking-[-0.055em]">
          此刻，你最想看清什么？
        </h1>
      </div>

      <section aria-labelledby="status-heading" className="mb-7">
        <div className="mb-3 flex items-end justify-between">
          <h2 id="status-heading" className="text-[14px] font-medium text-white/82">当前关系状态</h2>
          <span className="text-[11px] text-white/28">单选</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {STATUS_OPTIONS.map((item) => (
            <button
              key={item}
              type="button"
              className="status-chip px-3 text-[13px]"
              data-active={status === item}
              aria-pressed={status === item}
              onClick={() => {
                setStatus(item);
                setError("");
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="question-heading" className="mb-8">
        <div className="mb-3 flex items-end justify-between">
          <h2 id="question-heading" className="text-[14px] font-medium text-white/82">最困扰你的一件事</h2>
          <span className="text-[11px] tabular-nums text-white/28">{question.length}/50</span>
        </div>
        <label htmlFor="question" className="sr-only">用一句话描述最困扰你的事</label>
        <textarea
          id="question"
          value={question}
          onChange={(event) => {
            setQuestion(event.target.value.slice(0, 50));
            setError("");
          }}
          maxLength={50}
          rows={3}
          className="question-input glass-panel w-full rounded-[18px] px-4 py-3.5 text-[15px] leading-6 text-white outline-none"
          placeholder="例如：他突然冷淡，是不爱了还是在试探？"
        />
      </section>

      <section aria-labelledby="draw-heading">
        <div className="mb-1 text-center">
          <h2 id="draw-heading" className="font-quote text-[19px] text-[#F4E7CE]">凭直觉，选一张牌</h2>
          <p className="mt-1.5 text-[11px] text-white/30">不要分析。第一眼停留的那张，就是答案的入口。</p>
        </div>

        <div className="tarot-scene mx-auto mt-6 flex h-[126px] w-full max-w-[350px] items-center justify-center gap-1.5">
          {[0, 1, 2, 3, 4].map((index) => {
            const isSelected = selectedIndex === index;
            return (
              <motion.button
                key={index}
                type="button"
                className="relative h-[106px] w-[62px] shrink-0 border-0 bg-transparent p-0"
                aria-label={`选择第 ${index + 1} 张牌`}
                disabled={selectedIndex !== null}
                onClick={() => onDraw(index, setError)}
                initial={{ opacity: 0, y: 22, rotate: deckRotations[index] }}
                animate={{
                  opacity: selectedIndex === null || isSelected ? 1 : 0.28,
                  y: isSelected ? -12 : 0,
                  rotate: deckRotations[index],
                  scale: isSelected ? 1.08 : 1,
                }}
                whileHover={selectedIndex === null ? { y: -7 } : undefined}
                whileTap={selectedIndex === null ? { scale: 0.97 } : undefined}
                transition={{ duration: 0.45, delay: selectedIndex === null ? index * 0.05 : 0 }}
              >
                <motion.span
                  className="tarot-card-inner block"
                  animate={{ rotateY: isSelected ? 180 : 0 }}
                  transition={{ duration: 0.72, ease: [0.2, 0.72, 0.22, 1] }}
                >
                  <span className="tarot-face tarot-back">
                    <span className="absolute left-1/2 top-2 -translate-x-1/2 text-[7px] text-champagne/60">✦</span>
                    <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[7px] text-champagne/60">✦</span>
                  </span>
                  <span className="tarot-face tarot-front px-1.5">
                    <span className="text-[8px] tracking-[0.12em] text-black/45">{drawnCard?.numeral}</span>
                    <span className="my-2 block h-6 w-6 rounded-full border border-black/25 before:mx-auto before:mt-[11px] before:block before:h-px before:w-8 before:-translate-x-1 before:bg-black/25" />
                    <span className="text-[10px] font-semibold tracking-[-0.04em]">{drawnCard?.name}</span>
                    <span className="mt-1 text-[7px] text-black/45">{drawnCard?.orientation}</span>
                  </span>
                </motion.span>
              </motion.button>
            );
          })}
        </div>

        <div className="min-h-6 text-center">
          {error ? <p role="alert" className="text-[12px] text-[#E7A8A0]">{error}</p> : null}
        </div>
      </section>
    </motion.main>
  );
}

function LoadingScreen({ drawnCard }: { drawnCard: DrawnCard }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const messages = ["正在捕捉潜意识信号…", "正在解码TA未说出口的情绪…"];

  useEffect(() => {
    const timer = window.setTimeout(() => setMessageIndex(1), 1450);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <motion.main
      className="mx-auto flex min-h-[calc(100dvh-72px)] w-full max-w-[430px] flex-col items-center justify-center px-6 pb-20 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="relative mb-9 flex h-52 w-52 items-center justify-center">
        <motion.div
          className="absolute inset-0 rounded-full border border-champagne/12"
          animate={{ scale: [0.86, 1.1], opacity: [0.7, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
        />
        <motion.div
          className="developing-light"
          animate={{ scale: [0.88, 1.04, 0.88], opacity: [0.68, 1, 0.68] }}
          transition={{ duration: 2.7, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute flex h-[72px] w-[45px] items-center justify-center rounded-[5px] border border-[#F0D9AE]/50 bg-[#0A101C]/75 shadow-[0_0_30px_rgba(217,189,139,.2)] backdrop-blur-sm">
          <span className="font-quote text-[12px] text-[#F0D9AE]">{drawnCard.name}</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={messageIndex}
          className="font-quote text-[19px] text-[#F3E7D0]"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
        >
          {messages[messageIndex]}
        </motion.p>
      </AnimatePresence>
      <p className="mt-3 text-[11px] tracking-[0.16em] text-white/25">
        {drawnCard.english} · {drawnCard.orientation}
      </p>
      <div className="mt-9 h-px w-44 overflow-hidden bg-white/10">
        <motion.div
          className="h-full bg-champagne"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 3, ease: "easeInOut" }}
        />
      </div>
    </motion.main>
  );
}

function Poster({
  posterRef,
  reading,
  drawnCard,
}: {
  posterRef: React.RefObject<HTMLDivElement | null>;
  reading: Reading;
  drawnCard: DrawnCard;
}) {
  const date = useMemo(
    () =>
      new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
    [],
  );

  const modules = [
    ["TA没说出口的话", reading.inner_voice],
    ["你的情绪盲区", reading.blind_spot],
    ["48小时行动处方", reading.prescription],
  ];

  return (
    <div ref={posterRef} className="poster-card p-[5.3%]">
      <div className="relative z-10 flex h-full flex-col">
        <header className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <LogoMark dark />
            <div>
              <p className="text-[12px] font-semibold tracking-[-0.05em]">情绪显影室</p>
              <p className="mt-0.5 text-[6px] tracking-[0.12em] text-black/42">EMOTION DARKROOM</p>
            </div>
          </div>
          <div className="text-right text-[7px] leading-[1.55] text-black/48">
            <p>{date}</p>
            <p>{drawnCard.name} · {drawnCard.orientation}</p>
          </div>
        </header>

        <div className="mt-[5.5%] flex items-center justify-between gap-3">
          <span className="rounded-full border border-black/65 px-2.5 py-1 text-[7px] font-medium tracking-[-0.03em]">
            {reading.relation_tag}
          </span>
          <span className="h-px flex-1 bg-black/25" />
          <span className="text-[7px] text-black/45">NO. {drawnCard.numeral}</span>
        </div>

        <blockquote className="my-auto px-[3%] py-[4.5%] text-center font-quote text-[22px] font-semibold leading-[1.38] tracking-[-0.055em] text-[#17181C] min-[390px]:text-[24px]">
          “{reading.moments_quote}”
        </blockquote>

        <div className="space-y-[2.7%]">
          {modules.map(([title, content]) => (
            <section key={title} className="poster-module">
              <h2 className="text-[7px] font-semibold leading-[1.45] tracking-[-0.04em]">{title}</h2>
              <p className="text-[8px] leading-[1.55] tracking-[-0.035em] text-black/72 min-[390px]:text-[8.5px]">
                {content}
              </p>
            </section>
          ))}
        </div>

        <footer className="mt-[4%] flex items-end justify-between border-t border-black/20 pt-[2.5%]">
          <p className="max-w-[75%] text-[6px] leading-[1.5] text-black/42">
            若情绪仍难以平复，可凭本卡片预约 1v1 深度疗愈
          </p>
          <p className="text-right text-[5.5px] tracking-[0.08em] text-black/32">仅作情绪觉察参考</p>
        </footer>
      </div>
    </div>
  );
}

function ResultScreen({
  reading,
  drawnCard,
  resultMode,
  onRestart,
}: {
  reading: Reading;
  drawnCard: DrawnCard;
  resultMode: DecodeResponse["mode"];
  onRestart: () => void;
}) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState("");

  async function savePoster() {
    if (!posterRef.current || saving) return;
    setSaving(true);
    setSaveNote("");

    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(posterRef.current, {
        scale: 3,
        backgroundColor: "#ECE8DF",
        useCORS: true,
        logging: false,
      });
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("无法生成图片"))), "image/png", 1);
      });
      const file = new File([blob], `情绪显影-${drawnCard.name}.png`, { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "我的情绪显影" });
        setSaveNote("海报已生成，可保存到相册");
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setSaveNote("显影海报已保存");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setSaveNote("保存失败，请长按卡片截图保存");
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.main
      className="mx-auto w-full max-w-[470px] px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="mb-5 px-1 text-center">
        <p className="text-[11px] tracking-[0.18em] text-champagne/65">显影完成</p>
        <h1 className="mt-1.5 font-display text-[26px] font-semibold tracking-[-0.055em]">这一刻，终于有了轮廓</h1>
      </div>

      <Poster posterRef={posterRef} reading={reading} drawnCard={drawnCard} />

      <div className="mt-5 space-y-2.5 px-1">
        <button type="button" className="primary-button w-full" onClick={savePoster} disabled={saving}>
          <span className="relative z-10">{saving ? "正在冲洗高清海报…" : "一键保存显影海报"}</span>
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="h-12 w-full rounded-full border border-white/10 bg-white/[0.025] text-[13px] text-white/55 transition-colors hover:bg-white/[0.055] hover:text-white/80"
        >
          再问一次
        </button>
      </div>

      <div className="mt-3 min-h-5 text-center text-[10px] text-white/28">
        {saveNote || (resultMode !== "model" ? "当前为本地 Mock 显影内容" : "内容由实时模型生成")}
      </div>
    </motion.main>
  );
}

export default function Home() {
  const [stage, setStage] = useState<Stage>("gate");
  const [status, setStatus] = useState("");
  const [question, setQuestion] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [drawnCard, setDrawnCard] = useState<DrawnCard | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const [resultMode, setResultMode] = useState<DecodeResponse["mode"]>("mock");

  const step = stage === "gate" ? 1 : stage === "question" ? 2 : stage === "loading" ? 3 : 4;

  function drawCard(index: number, setError: (message: string) => void) {
    if (!status) {
      setError("先选择当前的关系状态");
      return;
    }
    if (!question.trim()) {
      setError("留下一句此刻最真实的困扰");
      return;
    }

    const card = TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)];
    const orientation: DrawnCard["orientation"] = Math.random() > 0.5 ? "正位" : "逆位";
    setSelectedIndex(index);
    setDrawnCard({ ...card, orientation });
    setError("");
    window.setTimeout(() => setStage("loading"), 850);
  }

  useEffect(() => {
    if (stage !== "loading" || !drawnCard) return;
    let cancelled = false;

    const request = fetch("/api/decode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        question: question.trim(),
        card_name: drawnCard.name,
        orientation: drawnCard.orientation,
      }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Decode failed");
        return (await response.json()) as DecodeResponse;
      })
      .catch((): DecodeResponse => ({ result: LOCAL_FALLBACK, mode: "fallback" }));

    const minimumDisplay = new Promise<void>((resolve) => window.setTimeout(resolve, 3000));

    Promise.all([request, minimumDisplay]).then(([data]) => {
      if (cancelled) return;
      setReading(data.result);
      setResultMode(data.mode);
      setStage("result");
    });

    return () => {
      cancelled = true;
    };
  }, [stage, drawnCard, question, status]);

  function restart() {
    setStage("question");
    setStatus("");
    setQuestion("");
    setSelectedIndex(null);
    setDrawnCard(null);
    setReading(null);
    setResultMode("mock");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="darkroom-shell">
        <StarField />
        <Header step={step} />
        <AnimatePresence mode="wait">
          {stage === "gate" ? (
            <GateScreen key="gate" onVerified={() => setStage("question")} />
          ) : null}
          {stage === "question" ? (
            <QuestionScreen
              key="question"
              status={status}
              setStatus={setStatus}
              question={question}
              setQuestion={setQuestion}
              selectedIndex={selectedIndex}
              drawnCard={drawnCard}
              onDraw={drawCard}
            />
          ) : null}
          {stage === "loading" && drawnCard ? (
            <LoadingScreen key="loading" drawnCard={drawnCard} />
          ) : null}
          {stage === "result" && drawnCard && reading ? (
            <ResultScreen
              key="result"
              reading={reading}
              drawnCard={drawnCard}
              resultMode={resultMode}
              onRestart={restart}
            />
          ) : null}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
