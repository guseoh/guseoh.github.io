const element = (tagName, properties = {}, children = []) => ({ type: "element", tagName, properties, children });
const text = (value) => ({ type: "text", value: String(value) });
const plain = (node) => node?.type === "text" ? node.value : (node?.children ?? []).map(plain).join("");
const classes = (node) => {
  const raw = node?.properties?.className ?? [];
  return Array.isArray(raw) ? raw : String(raw).split(/\s+/);
};
const blockLanguage = (pre) => {
  if (pre?.tagName !== "pre") return null;
  const code = pre.children?.find((n) => n.tagName === "code");
  return classes(code).find((name) => name.startsWith("language-"))?.slice(9) ??
    String(pre.properties?.dataLanguage ?? "");
};
const group = (type, child, label) => element("section", {
  className: ["learning-block", `learning-block--${type}`],
  dataLearningBlock: type,
  ariaLabel: label
}, [child]);

function createTree(source) {
  const root = [];
  const stack = [{ depth: -1, children: root }];
  for (const line of source.trim().split(/\r?\n/)) {
    const depth = line.match(/^ */)[0].length / 2;
    const label = line.trim();
    while (stack.length > 1 && stack.at(-1).depth >= depth) stack.pop();
    if (depth > stack.at(-1).depth + 1) throw new Error("Tree depth cannot skip levels.");
    const parent = stack.at(-1).children;
    const dir = label.endsWith("/");
    const branch = dir ? element("li", {}, [element("details", { open: true }, [
      element("summary", {}, [text(label)]), element("ul", {}, [])
    ])]) : element("li", {}, [text(label)]);
    parent.push(branch);
    if (dir) stack.push({ depth, children: branch.children[0].children[1].children });
  }
  return element("ul", { className: ["learning-tree"] }, root);
}

export function rehypeLearningBlocks() {
  return (tree) => {
    const walk = (parent) => {
      if (!Array.isArray(parent?.children)) return;
      parent.children = parent.children.map((node) => {
        const lang = blockLanguage(node);
        if (!["learn-tabs", "learn-tree", "learn-steps", "learn-run", "mermaid", "math"].includes(lang)) {
          walk(node);
          return node;
        }
        const source = plain(node);
        if (lang === "learn-tree") return group("tree", createTree(source), "프로젝트 파일 구조");
        if (lang === "learn-steps") return group("steps", element("ol", { className: ["learning-steps"] },
          JSON.parse(source).map((step) => element("li", {}, [text(step)]))), "단계별 가이드");
        if (lang === "learn-tabs") {
          const panels = JSON.parse(source);
          return group("tabs", element("div", { className: ["learning-tabs"], dataLearningTabs: true }, panels.map((item) =>
            element("section", { dataLearningPanel: true, className: ["learning-tabs__panel"] }, [
              element("h4", {}, [text(item.title)]),
              element("p", {}, [text(item.text)])
            ]))), "본문 내용 탭");
        }
        if (lang === "learn-run") return group("run", element("div", { dataLearningRun: true }, [
          element("pre", { dataLearningExpression: true }, [text(source.trim())]),
          element("div", { className: ["learning-run__actions"] }, [
            element("button", { type: "button", dataLearningExecute: true }, [text("실행")]),
            element("button", { type: "button", dataLearningReset: true }, [text("초기화")])
          ]),
          element("output", { dataLearningOutput: true, role: "status", ariaLive: "polite" }, [text("실행 전")])
        ]), "제한된 산술 표현식 실행");
        if (lang === "math") return group("math", element("div", {
          className: ["learning-math"], dataLearningMath: source.trim(), dataMathDisplay: "true"
        }, [text(source.trim())]), "수학 수식");
        return group("mermaid", element("figure", { dataLearningMermaid: true }, [
          element("pre", { dataLearningMermaidSource: true }, [text(source.trim())]),
          element("figcaption", {}, [text("Mermaid 다이어그램 · 텍스트 원본")])
        ]), "Mermaid 다이어그램");
      });
    };
    walk(tree);
  };
}
