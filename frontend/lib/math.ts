/**
 * Detects plain-notation math spans in prose ("(3x^2 + 1)^5", "f'(x)", "sin(5x^2)",
 * "y = 2x - 5") and wraps them as inline TeX so KaTeX can typeset them. Text that
 * already carries $...$ or \(...\) math is passed through untouched.
 *
 * ponytail: token-level heuristic for compact formula-like notation only;
 * swap for prompt-enforced LaTeX delimiters if subjects beyond the demo appear.
 */

const MATH_CHARS = /^[0-9a-zA-Z+\-*/^=().'·]+$/;
const CONNECTORS = new Set(["+", "-", "=", "·", "*", "/", "times"]);
const LONE_VARS = new Set(["x", "y", "z", "u", "v", "t", "n"]);
const FUNCTION_NAMES = "sin|cos|tan|sec|csc|cot|ln|log|exp|sqrt";

type TokenKind = "strong" | "weak" | "connector" | "plain";

function classify(core: string): TokenKind {
  if (!core) return "plain";
  if (CONNECTORS.has(core)) return "connector";
  if (!MATH_CHARS.test(core)) return "plain";
  if (
    core.includes("^") ||
    core.includes("=") ||
    /^d\/d[a-zA-Z]$/.test(core) ||
    new RegExp(`^(${FUNCTION_NAMES})\\(`).test(core) ||
    /^[a-zA-Z]'{1,2}(\(|$)/.test(core) ||
    /^\(?\d*[a-zA-Z]\(/.test(core) ||
    /^\(?\d+[a-zA-Z]/.test(core) ||
    /^\d+\(/.test(core) ||
    /^[0-9a-zA-Z]+\/\(?[0-9a-zA-Z]/.test(core)
  ) {
    return "strong";
  }
  if (/^\(?\d+(\.\d+)?\)?$/.test(core)) return "weak";
  if (LONE_VARS.has(core)) return "weak";
  return "plain";
}

function toTex(span: string): string {
  let tex = span;
  tex = tex.replace(/\bd\/d([a-zA-Z])\b/g, "\\frac{d}{d$1}");
  tex = tex.replace(/\bsqrt\(([^()]+)\)/g, "\\sqrt{$1}");
  tex = tex.replace(new RegExp(`\\b(${FUNCTION_NAMES})\\b`, "g"), "\\$1");
  tex = tex.replace(/\s*(?:\btimes\b|·|\*)\s*/g, " \\cdot ");
  tex = tex.replace(/\^\(([^()]+)\)/g, "^{$1}");
  tex = tex.replace(/\^([0-9a-zA-Z]{2,})/g, "^{$1}");
  tex = tex.replace(/([0-9a-zA-Z]+)\/\(([^()]+)\)/g, "\\frac{$1}{$2}");
  tex = tex.replace(/([0-9a-zA-Z]+)\/([0-9a-zA-Z]+)/g, "\\frac{$1}{$2}");
  return tex;
}

function autoMathSegment(text: string): string {
  const parts = text.split(/(\s+)/);
  const out: string[] = [];
  let runRaw: string[] = []; // raw pieces incl. inner whitespace, for lossless bail-out
  let runCores: string[] = []; // trimmed math tokens, for conversion
  let runHasStrong = false;

  function flushRun() {
    if (!runRaw.length) return;
    // return trailing connectors ("x =" mid-thought) to prose after the span
    const suffix: string[] = [];
    while (/^\s+$/.test(runRaw[runRaw.length - 1] ?? "")) {
      suffix.unshift(runRaw.pop() as string);
    }
    while (runCores.length && CONNECTORS.has(runCores[runCores.length - 1])) {
      runCores.pop();
      let piece = runRaw.pop() as string;
      if (/^\s+$/.test(runRaw[runRaw.length - 1] ?? "")) {
        piece = (runRaw.pop() as string) + piece;
      }
      suffix.unshift(piece);
    }
    if (runHasStrong && runCores.length) {
      out.push(`$${toTex(runCores.join(" "))}$`);
    } else {
      out.push(runRaw.join(""));
    }
    out.push(...suffix);
    runRaw = [];
    runCores = [];
    runHasStrong = false;
  }

  for (const part of parts) {
    if (part === "") continue;
    if (/^\s+$/.test(part)) {
      if (!runRaw.length || part.includes("\n")) {
        flushRun();
        out.push(part);
      } else {
        runRaw.push(part);
      }
      continue;
    }
    const trailing = /[.,;:!?]+$/.exec(part)?.[0] ?? "";
    const core = trailing ? part.slice(0, -trailing.length) : part;
    const kind = classify(core);
    if (kind === "plain") {
      flushRun();
      out.push(part);
      continue;
    }
    if (kind === "connector" && !runRaw.length) {
      out.push(part);
      continue;
    }
    if (kind === "strong") runHasStrong = true;
    runRaw.push(core);
    runCores.push(core);
    if (trailing) {
      flushRun();
      out.push(trailing);
    }
  }
  flushRun();
  return out.join("");
}

export function autoMath(text: string): string {
  if (!text) return text;
  const segments = text.split(/(\$[^$\n]+\$|\\\([\s\S]+?\\\))/);
  return segments
    .map((segment, index) => {
      if (index % 2 === 1) {
        // pre-existing math: normalize \( \) to $ $ and pass through
        if (segment.startsWith("\\(")) {
          return `$${segment.slice(2, -2).trim()}$`;
        }
        return segment;
      }
      return autoMathSegment(segment);
    })
    .join("");
}
