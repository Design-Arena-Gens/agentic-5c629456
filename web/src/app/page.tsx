"use client";

import { useEffect, useMemo, useState } from "react";

type ButtonVariant = "primary" | "ghost" | "operator" | "accent";

type InputButton = {
  label: string;
  type: "input";
  value: string;
  variant: ButtonVariant;
  span?: 1 | 2;
};

type CommandButton = {
  label: string;
  type: "command";
  command: "clear" | "delete" | "equals" | "negate" | "percent";
  variant: ButtonVariant;
  span?: 1 | 2;
};

type ButtonConfig = InputButton | CommandButton;

type HistoryItem = {
  id: number;
  expression: string;
  raw: string;
  result: string;
  createdAt: number;
};

const BUTTONS: ButtonConfig[] = [
  { label: "AC", type: "command", command: "clear", variant: "ghost" },
  { label: "DEL", type: "command", command: "delete", variant: "ghost" },
  { label: "%", type: "command", command: "percent", variant: "ghost" },
  { label: "÷", type: "input", value: "/", variant: "operator" },
  { label: "7", type: "input", value: "7", variant: "primary" },
  { label: "8", type: "input", value: "8", variant: "primary" },
  { label: "9", type: "input", value: "9", variant: "primary" },
  { label: "×", type: "input", value: "*", variant: "operator" },
  { label: "4", type: "input", value: "4", variant: "primary" },
  { label: "5", type: "input", value: "5", variant: "primary" },
  { label: "6", type: "input", value: "6", variant: "primary" },
  { label: "−", type: "input", value: "-", variant: "operator" },
  { label: "1", type: "input", value: "1", variant: "primary" },
  { label: "2", type: "input", value: "2", variant: "primary" },
  { label: "3", type: "input", value: "3", variant: "primary" },
  { label: "+", type: "input", value: "+", variant: "operator" },
  { label: "±", type: "command", command: "negate", variant: "ghost" },
  { label: "0", type: "input", value: "0", variant: "primary", span: 2 },
  { label: ".", type: "input", value: ".", variant: "primary" },
  { label: "=", type: "command", command: "equals", variant: "accent" },
];

const OPERATORS = new Set(["+", "-", "*", "/"]);

const formatDisplayExpression = (expression: string) =>
  expression.replace(/\*/g, "×").replace(/\//g, "÷");

const isOperator = (value: string) => OPERATORS.has(value);

let historyCounter = 0;

const buildHistoryItem = (rawExpression: string, result: string): HistoryItem => {
  historyCounter += 1;
  const timestamp = Date.now();
  return {
    id: Number(`${timestamp}${historyCounter}`),
    expression: formatDisplayExpression(rawExpression),
    raw: rawExpression,
    result,
    createdAt: timestamp,
  };
};

const evaluateExpression = (expression: string): number | null => {
  if (!expression) return null;
  const sanitized = expression.replace(/[^0-9+\-*/().]/g, "");
  if (!sanitized) return null;
  try {
    const result = Function("\"use strict\"; return (" + sanitized + ")")();
    if (typeof result === "number" && Number.isFinite(result)) {
      return result;
    }
  } catch (error) {
    console.error("Failed to evaluate expression", error);
  }
  return null;
};

const formatNumeric = (value: number): string => {
  if (!Number.isFinite(value)) return "";
  const trimmed = Number.parseFloat(value.toPrecision(12));
  if (!Number.isFinite(trimmed)) return "";
  return trimmed.toString();
};

const formatReadableNumber = (value: string): string => {
  if (!value) return "0";
  if (value === "Error") return value;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  const formatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 10,
  });
  return formatter.format(numeric);
};

const getCurrentNumber = (expression: string): string => {
  const match = expression.match(/-?\d*\.?\d*$/);
  return match ? match[0] : "";
};

export default function Home() {
  const [expression, setExpression] = useState<string>("");
  const [computedResult, setComputedResult] = useState<string>("0");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isDark, setIsDark] = useState<boolean>(true);
  const [justEvaluated, setJustEvaluated] = useState<boolean>(false);

  useEffect(() => {
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }, [isDark]);

  const previewResult = useMemo(() => {
    if (!expression) return "";
    const lastChar = expression.slice(-1);
    if (isOperator(lastChar) || lastChar === "." || lastChar === "(") {
      return "";
    }
    const value = evaluateExpression(expression);
    if (value === null) return "";
    return formatNumeric(value);
  }, [expression]);

  const highlightedValue = useMemo(() => {
    if (justEvaluated) {
      return computedResult;
    }
    if (previewResult) {
      return previewResult;
    }
    const current = getCurrentNumber(expression);
    if (!current || current === "-") {
      return expression ? formatDisplayExpression(expression) : "0";
    }
    return current;
  }, [computedResult, expression, justEvaluated, previewResult]);

  const handleInput = (value: string) => {
    setExpression((previous) => {
      let base = previous;

      const isDigit = /\d/.test(value);

      if (justEvaluated) {
        if (isDigit || value === ".") {
          base = "";
        }
        setJustEvaluated(false);
      }

      if (value === ".") {
        const current = getCurrentNumber(base);
        if (current.includes(".")) {
          return base;
        }
        if (!current || current === "-") {
          return `${base}${current === "-" ? "-0." : "0."}`;
        }
        return `${base}.`;
      }

      if (isOperator(value)) {
        if (!base) {
          return value === "-" ? "-" : base;
        }
        const lastChar = base.slice(-1);
        if (isOperator(lastChar)) {
          return `${base.slice(0, -1)}${value}`;
        }
        return `${base}${value}`;
      }

      if (value === "0") {
        const current = getCurrentNumber(base);
        if (current === "0" || current === "-0") {
          return base;
        }
      }

      return `${base}${value}`;
    });
  };

  const handleClear = () => {
    setExpression("");
    setComputedResult("0");
    setJustEvaluated(false);
  };

  const handleDelete = () => {
    setExpression((previous) => {
      if (!previous) return previous;
      const next = previous.slice(0, -1);
      if (!next) {
        setComputedResult("0");
      }
      return next;
    });
    setJustEvaluated(false);
  };

  const handleNegate = () => {
    setExpression((previous) => {
      const current = getCurrentNumber(previous);
      if (!current || current === "-") {
        return previous;
      }
      const numeric = Number(current);
      if (Number.isNaN(numeric)) {
        return previous;
      }
      const toggled = formatNumeric(numeric * -1);
      const startIndex = previous.length - current.length;
      return `${previous.slice(0, startIndex)}${toggled}`;
    });
    setJustEvaluated(false);
  };

  const handlePercent = () => {
    setExpression((previous) => {
      const current = getCurrentNumber(previous);
      if (!current || current === "-") {
        return previous;
      }
      const numeric = Number(current);
      if (Number.isNaN(numeric)) {
        return previous;
      }
      const percentage = formatNumeric(numeric / 100);
      const startIndex = previous.length - current.length;
      return `${previous.slice(0, startIndex)}${percentage}`;
    });
    setJustEvaluated(false);
  };

  const handleEquals = () => {
    if (!expression) {
      return;
    }
    const value = evaluateExpression(expression);
    if (value === null) {
      setComputedResult("Error");
      setJustEvaluated(true);
      return;
    }

    const formatted = formatNumeric(value);
    if (!formatted) {
      setComputedResult("Error");
      setJustEvaluated(true);
      return;
    }

    const entry = buildHistoryItem(expression, formatted);

    setHistory((previous) => [entry, ...previous].slice(0, 10));
    setExpression(formatted);
    setComputedResult(formatted);
    setJustEvaluated(true);
  };

  const handleCommand = (command: CommandButton["command"]) => {
    switch (command) {
      case "clear":
        handleClear();
        break;
      case "delete":
        handleDelete();
        break;
      case "negate":
        handleNegate();
        break;
      case "percent":
        handlePercent();
        break;
      case "equals":
        handleEquals();
        break;
      default:
        break;
    }
  };

  const handleHistoryRecall = (item: HistoryItem) => {
    setExpression(item.raw);
    setComputedResult(item.result);
    setJustEvaluated(true);
  };

  const panelShellClass = isDark
    ? "border-white/10 bg-white/5 shadow-[0_30px_120px_-45px_rgba(15,23,42,0.9)]"
    : "border-white/60 bg-white/80 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.35)]";

  const calculatorPanelClass = isDark
    ? "border-white/10 bg-slate-950/60"
    : "border-slate-200 bg-white/90";

  const historyPanelClass = isDark
    ? "border-white/10 bg-slate-950/40"
    : "border-slate-200 bg-white";

  const buttonPalette: Record<ButtonVariant, string> = isDark
    ? {
        primary:
          "bg-slate-900/60 text-slate-100 border border-white/10 hover:bg-slate-800/80",
        ghost:
          "bg-slate-900/20 text-slate-300 border border-white/10 hover:bg-slate-800/40",
        operator:
          "bg-indigo-500/80 text-white border border-indigo-400/40 hover:bg-indigo-400/90",
        accent:
          "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white border border-white/20 hover:shadow-[0_15px_35px_-15px_rgba(129,140,248,0.9)]",
      }
    : {
        primary:
          "bg-white text-slate-900 border border-slate-200 hover:bg-slate-100",
        ghost:
          "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200",
        operator:
          "bg-indigo-500 text-white border border-indigo-400/50 hover:bg-indigo-400",
        accent:
          "bg-gradient-to-r from-indigo-500 via-sky-500 to-cyan-400 text-white border border-indigo-200 hover:shadow-[0_18px_40px_-20px_rgba(59,130,246,0.8)]",
      };

  const displayPanelClass = isDark
    ? "border-white/10 bg-white/5 shadow-inner shadow-white/5"
    : "border-slate-200 bg-white shadow-inner shadow-slate-200/40";

  const historyClearButtonClass = isDark
    ? "border-white/10 text-slate-400 hover:border-indigo-300/60 hover:text-indigo-200"
    : "border-slate-200 text-slate-500 hover:border-indigo-300/60 hover:text-indigo-500";

  const historyEmptyClass = isDark
    ? "border border-dashed border-white/10 bg-white/5 text-slate-400"
    : "border border-dashed border-slate-200 bg-slate-50 text-slate-500";

  const historyEntryClass = isDark
    ? "group w-full rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition hover:border-indigo-300/70 hover:bg-indigo-500/10"
    : "group w-full rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-indigo-300/70 hover:bg-indigo-50";

  const historyResultClass = isDark
    ? "mt-1 text-2xl font-semibold text-indigo-300 transition group-hover:text-indigo-200"
    : "mt-1 text-2xl font-semibold text-indigo-500 transition group-hover:text-indigo-600";

  const historyExpressionClass = isDark
    ? "mt-2 text-sm text-slate-300"
    : "mt-2 text-sm text-slate-600";

  const historyMetaClass = isDark
    ? "flex items-center justify-between text-xs uppercase tracking-wide text-slate-400"
    : "flex items-center justify-between text-xs uppercase tracking-wide text-slate-500";

  const historyRecallClass = isDark
    ? "text-indigo-300 transition group-hover:text-indigo-200"
    : "text-indigo-500 transition group-hover:text-indigo-600";

  return (
    <div
      className={`flex min-h-screen w-full items-center justify-center px-4 py-10 transition-colors duration-500 ${
        isDark ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-900"
      }`}
    >
      <main
        className={`mx-auto flex w-full max-w-6xl flex-col gap-6 rounded-[2.5rem] border p-8 backdrop-blur-2xl transition-all duration-500 lg:flex-row ${panelShellClass}`}
      >
        <section
          className={`flex flex-1 flex-col justify-between gap-8 rounded-3xl border p-8 transition-all duration-500 ${calculatorPanelClass}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p
                className={`text-sm uppercase tracking-[0.35em] ${
                  isDark ? "text-indigo-300" : "text-indigo-500"
                }`}
              >
                Flux Calculator
              </p>
              <h1 className="mt-2 text-3xl font-semibold">
                Modern design, precise answers.
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setIsDark((previous) => !previous)}
              className={`relative flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-all duration-300 ${
                isDark
                  ? "border-white/10 bg-white/10 hover:bg-white/20 text-slate-100"
                  : "border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
              }`}
            >
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  isDark ? "bg-emerald-400" : "bg-indigo-500"
                }`}
              />
              {isDark ? "Night" : "Day"} mode
            </button>
          </div>

          <div
            className={`flex flex-col gap-2 rounded-3xl border p-6 text-right transition-all duration-300 ${displayPanelClass}`}
          >
            <div
              className={`text-sm font-medium tracking-[0.2em] ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {formatDisplayExpression(expression) || "Ready"}
            </div>
            <div className="text-6xl font-semibold tracking-tight">
              {formatReadableNumber(highlightedValue)}
            </div>
            {!justEvaluated && previewResult ? (
              <div className="text-right text-base text-indigo-300">
                ≈ {formatReadableNumber(previewResult)}
              </div>
            ) : (
              <div className="text-right text-base text-slate-500">
                {justEvaluated ? "Result" : "Live preview"}
              </div>
            )}
          </div>

          <div className="grid grid-cols-4 gap-3">
            {BUTTONS.map((button) => {
              const spanClass = button.span === 2 ? "col-span-2" : "";
              const classes = `${
                buttonPalette[button.variant]
              } relative flex h-16 items-center justify-center overflow-hidden rounded-2xl text-lg font-semibold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 ${spanClass}`;

              const handleClick = () => {
                if (button.type === "input") {
                  handleInput(button.value);
                } else {
                  handleCommand(button.command);
                }
              };

              return (
                <button key={button.label} type="button" className={classes} onClick={handleClick}>
                  <span>{button.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <aside
          className={`flex w-full max-w-md flex-col gap-6 rounded-3xl border p-7 transition-all duration-500 ${historyPanelClass}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">History</h2>
              <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Tap an entry to reuse a previous calculation.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setHistory([])}
              className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide transition ${historyClearButtonClass}`}
            >
              Clear
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {history.length === 0 ? (
              <p className={`rounded-2xl p-6 text-sm ${historyEmptyClass}`}>
                No calculations yet. Start exploring complex expressions and
                we&apos;ll keep them here for you.
              </p>
            ) : (
              history.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => handleHistoryRecall(item)}
                  className={historyEntryClass}
                >
                  <div className={historyMetaClass}>
                    <span>
                      {new Date(item.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span className={historyRecallClass}>
                      Recall
                    </span>
                  </div>
                  <div className={historyExpressionClass}>{item.expression}</div>
                  <div className={historyResultClass}>
                    {formatReadableNumber(item.result)}
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
