const specialLanguages = new Set(["learn-tabs", "learn-tree", "learn-steps", "learn-run", "mermaid", "math"]);
const blockTypes = new Set(["flowchart", "graph", "sequenceDiagram", "classDiagram"]);

export function validateLearningFence(language, source, position = "learning block") {
  const value = String(source ?? "").trim();
  if (!specialLanguages.has(language)) return;
  if (!value || value.length > 12000) throw new Error(`Empty or oversized ${language} at ${position}.`);
  if (language === "learn-tabs" || language === "learn-steps") {
    let parsed;
    try { parsed = JSON.parse(value); } catch { throw new Error(`Invalid JSON in ${language} at ${position}.`); }
    if (!Array.isArray(parsed) || parsed.length < 2 || parsed.length > 10) {
      throw new Error(`${language} requires 2–10 entries at ${position}.`);
    }
    for (const entry of parsed) {
      if (language === "learn-tabs") {
        if (!entry || typeof entry !== "object"
          || typeof entry.title !== "string" || entry.title.trim().length < 1 || entry.title.length > 60
          || typeof entry.text !== "string" || entry.text.length > 5000) {
          throw new Error(`Invalid tab title/text at ${position}.`);
        }
      } else if (typeof entry !== "string" || !entry.trim() || entry.length > 500) {
        throw new Error(`Invalid step text at ${position}.`);
      }
    }
  }
  if (language === "learn-tree") {
    const lines = value.split(/\r?\n/);
    if (lines.length > 100) throw new Error(`Too many tree entries at ${position}.`);
    for (const line of lines) {
      const matched = line.match(/^( *)(\S.*)$/);
      if (!matched || matched[1].length % 2 || matched[1].length > 16) {
        throw new Error(`Tree indentation must use pairs of spaces at ${position}.`);
      }
      if (line.length > 180) throw new Error(`Tree entry too long at ${position}.`);
    }
  }
  if (language === "mermaid") {
    if (!blockTypes.has(value.match(/^([A-Za-z]+)/)?.[1])
      || /%%\s*\{|\b(click|href|callback)\b/i.test(value)) {
      throw new Error(`Unsupported or interactive Mermaid definition at ${position}.`);
    }
  }
  if (language === "math" && value.length > 2400) throw new Error(`Math too long at ${position}.`);
  // Intentionally not JavaScript eval: a tiny numerical calculator is the only runnable language.
  if (language === "learn-run" && (value.length > 160 || !/^[\d\s+*/%().-]+$/.test(value))) {
    throw new Error(`Only numeric arithmetic is supported in learn-run at ${position}.`);
  }
}

export function remarkLearningBlocks() {
  return (tree) => {
    const visit = (node) => {
      if (!node || typeof node !== "object") return;
      if (node.type === "code") {
        validateLearningFence(node.lang, node.value, node.position?.start?.line ? `line ${node.position.start.line}` : "unknown line");
      }
      // For inline LaTeX write `math:E = mc^2`, without changing ordinary inline code.
      if (node.type === "inlineCode" && node.value?.startsWith("math:")) {
        const expression = node.value.slice(5);
        if (expression.trim() && expression.length <= 300) {
          node.type = "text";
          node.value = expression;
          node.data = { hName: "span", hProperties: {
            className: ["learning-math"],
            dataLearningMath: expression,
            dataMathDisplay: "false"
          } };
        }
      }
      if (Array.isArray(node.children)) node.children.forEach(visit);
    };
    visit(tree);
  };
}
