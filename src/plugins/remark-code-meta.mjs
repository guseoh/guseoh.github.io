const titlePattern = /\btitle=(["'])(.*?)\1/;
const looseTitlePattern = /\btitle=/;
const lineNumberPattern = /(?:^|\s)showLineNumbers(?:\s|$)/;
const highlightPattern = /(?:^|\s)\{([0-9,\-\s]+)\}(?:\s|$)/;
const anyBracePattern = /\{[^}]*\}/;
const tabGroupPattern = /(?:^|\s)tabGroup=(["'])([A-Za-z][A-Za-z0-9_-]{0,39})\1/;
const tabTitlePattern = /(?:^|\s)tabTitle=(["'])([^"']{1,60})\1/;
const diffStatePattern = /(?:^|\s)diffState=(["'])(before|after)\1/;

function parseLineSet(value, lineCount, positionLabel) {
  const tokens = value.split(",").map((token) => token.trim()).filter(Boolean);
  const ranges = [];
  const seen = new Set();

  for (const token of tokens) {
    const match = token.match(/^(\d+)(?:-(\d+))?$/);
    if (!match) {
      throw new Error(`Invalid code highlight range "${token}" at ${positionLabel}.`);
    }

    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;

    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
      throw new Error(`Invalid code highlight range "${token}" at ${positionLabel}.`);
    }

    if (end > lineCount) {
      throw new Error(`Code highlight range "${token}" exceeds ${lineCount} line(s) at ${positionLabel}.`);
    }

    const normalized = start === end ? `${start}` : `${start}-${end}`;
    if (!seen.has(normalized)) {
      seen.add(normalized);
      ranges.push(normalized);
    }
  }

  return ranges.join(",");
}

export function parseCodeMeta(meta, lineCount, positionLabel) {
  if (!meta) return {};

  const titleMatch = meta.match(titlePattern);
  if (looseTitlePattern.test(meta) && !titleMatch) {
    throw new Error(`Code block title must use title="..." at ${positionLabel}.`);
  }

  const highlightMatch = meta.match(highlightPattern);
  if (!highlightMatch && anyBracePattern.test(meta)) {
    throw new Error(`Code highlight ranges must use values like {2,4-6} at ${positionLabel}.`);
  }

  for (const key of ["tabGroup", "tabTitle", "diffState"]) {
    if (new RegExp(`(?:^|\\s)${key}=`).test(meta)) {
      const pattern = key === "tabGroup" ? tabGroupPattern : key === "tabTitle" ? tabTitlePattern : diffStatePattern;
      if (!pattern.test(meta)) throw new Error(`Invalid ${key} at ${positionLabel}.`);
    }
  }
  const tabGroup = meta.match(tabGroupPattern)?.[2];
  const tabTitle = meta.match(tabTitlePattern)?.[2]?.trim();
  const diffState = meta.match(diffStatePattern)?.[2];

  return {
    title: titleMatch?.[2]?.trim(),
    showLineNumbers: lineNumberPattern.test(meta),
    highlightLines: highlightMatch ? parseLineSet(highlightMatch[1], lineCount, positionLabel) : undefined,
    tabGroup,
    tabTitle,
    diffState
  };
}

function getTransformerMeta(context) {
  if (context.meta.postCodeMeta) return context.meta.postCodeMeta;

  const source = String(context.source ?? "");
  const lineCount = source.length > 0 ? source.split(/\r?\n/).length : 0;
  const rawMeta = context.options?.meta?.__raw ?? "";
  context.meta.postCodeMeta = parseCodeMeta(rawMeta, lineCount, "code block meta");

  return context.meta.postCodeMeta;
}

function addClass(node, className) {
  const current = node.properties?.className ?? node.properties?.class ?? [];
  const classes = Array.isArray(current) ? current : String(current).split(/\s+/).filter(Boolean);

  if (!classes.includes(className)) {
    classes.push(className);
  }

  node.properties.className = classes;
}

export function remarkCodeMeta() {
  return (tree) => {
    const visit = (node) => {
      if (!node || typeof node !== "object") return;

      if (node.type === "code") {
        const lineCount = String(node.value ?? "").split(/\r?\n/).length;
        const positionLabel = node.position?.start?.line ? `line ${node.position.start.line}` : "unknown line";
        parseCodeMeta(node.meta ?? "", lineCount, positionLabel);
      }

      if (Array.isArray(node.children)) {
        node.children.forEach(visit);
      }
    };

    visit(tree);
  };
}

export function codeMetaShikiTransformer() {
  return {
    name: "post-code-meta",
    pre(node) {
      const parsed = getTransformerMeta(this);

      if (parsed.title) {
        node.properties.dataCodeTitle = parsed.title;
      }

      if (parsed.showLineNumbers) {
        node.properties.dataShowLineNumbers = "true";
        addClass(node, "has-line-numbers");
      }

      if (parsed.highlightLines) {
        node.properties.dataHighlightLines = parsed.highlightLines;
      }
      if (parsed.tabGroup) node.properties.dataCodeTabGroup = parsed.tabGroup;
      if (parsed.tabTitle) node.properties.dataCodeTabTitle = parsed.tabTitle;
      if (parsed.diffState) node.properties.dataCodeDiffState = parsed.diffState;
    },
    line(node, lineNumber) {
      const parsed = getTransformerMeta(this);
      const highlightedLines = parseLineSet(parsed.highlightLines ?? "", Number.MAX_SAFE_INTEGER, "code block meta");

      if (parsed.showLineNumbers) {
        node.properties.dataLineNumber = String(lineNumber);
      }

      if (highlightedLines.split(",").some((range) => {
        const [startValue, endValue] = range.split("-");
        const start = Number(startValue);
        const end = endValue ? Number(endValue) : start;

        return lineNumber >= start && lineNumber <= end;
      })) {
        addClass(node, "is-highlighted");
      }
    }
  };
}
