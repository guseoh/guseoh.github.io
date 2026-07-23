const headingPattern = /^(#{2,3})\s+(.+?)\s*#*\s*$/;
const headingNumberPattern = /^\d+(?:\.\d+)*[.)]?\s+/;
const referenceSubheadings = new Set(["공식 자료", "한글 참고 링크"]);
const forwardLookingPattern = /(다음 글에서|다음 글로|다음번에|뒤의 글에서|이후 글에서|후속 글에서)/;
const titlePrefixPattern = /^\[[^\]]+\]\s*/;
const markdownLinkPattern = /!?\[[^\]]*\]\(\s*(https?:\/\/[^)\s]+)[^)]*\)/g;
const forbiddenReferenceHosts = [
  "wikipedia.org",
  "namu.wiki",
  "wikidocs.net"
];

export function findContentStyleIssues(source) {
  const lines = source.split(/\r?\n/);
  const frontmatterEnd = findFrontmatterEnd(lines);
  const contentStart = frontmatterEnd >= 0 ? frontmatterEnd + 1 : 0;
  const issues = [];
  const headings = [];
  const isDraft = readFrontmatterScalar(lines, frontmatterEnd, "draft") === "true";
  let fence = null;

  checkTagIndentation(lines, frontmatterEnd, issues);
  checkTitlePrefix(lines, frontmatterEnd, issues);

  for (let index = contentStart; index < lines.length; index += 1) {
    const line = lines[index];
    const lineNumber = index + 1;
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})(.*)$/);

    if (fence) {
      if (isClosingFence(line, fence)) {
        fence = null;
      }
      continue;
    }

    if (fenceMatch) {
      const marker = fenceMatch[1];
      const info = fenceMatch[2].trim();

      if (info.length === 0) {
        issues.push(issue(lineNumber, "code-fence-language", "코드 펜스에는 언어 이름이 필요합니다."));
      } else if (!/^[A-Za-z0-9_+-]+$/.test(info)) {
        issues.push(issue(lineNumber, "code-fence-meta", "코드 펜스에는 언어 이름 외의 속성을 사용할 수 없습니다."));
      }

      fence = { character: marker[0], length: marker.length };
      continue;
    }

    const headingMatch = line.match(headingPattern);
    if (headingMatch) {
      const depth = headingMatch[1].length;
      const rawTitle = headingMatch[2].trim();
      const titleWithoutNumber = stripHeadingNumber(rawTitle);
      const isAllowedReferenceSubheading = depth === 3 && referenceSubheadings.has(titleWithoutNumber);

      headings.push({ depth, index, line: lineNumber, rawTitle, title: titleWithoutNumber });

      if (!headingNumberPattern.test(rawTitle) && !isAllowedReferenceSubheading) {
        issues.push(issue(lineNumber, "heading-number", "`##`와 `###` 제목에는 계층 번호가 필요합니다."));
      }
    }

    if (forwardLookingPattern.test(line)) {
      issues.push(issue(lineNumber, "forward-looking", "후속 글을 예고하는 문장은 본문에 사용하지 않습니다."));
    }

    checkLinks(line, lineNumber, issues);
  }

  if (fence) {
    issues.push(issue(lines.length, "code-fence-close", "닫히지 않은 코드 펜스가 있습니다."));
  }

  if (!isDraft) {
    checkFinalSections(lines, headings, contentStart + 1, issues);
  }

  return issues;
}

function findFrontmatterEnd(lines) {
  if (lines[0]?.trim() !== "---") return -1;
  return lines.findIndex((line, index) => index > 0 && line.trim() === "---");
}

function readFrontmatterScalar(lines, frontmatterEnd, key) {
  if (frontmatterEnd < 0) return "";
  const pattern = new RegExp(`^${key}:\\s*(.*)$`);
  for (let index = 1; index < frontmatterEnd; index += 1) {
    const match = lines[index].match(pattern);
    if (match) return match[1].trim().replace(/^(['"])(.*)\1$/, "$2");
  }
  return "";
}

function checkTitlePrefix(lines, frontmatterEnd, issues) {
  const title = readFrontmatterScalar(lines, frontmatterEnd, "title");
  if (titlePrefixPattern.test(title)) {
    issues.push(issue(2, "title-prefix", "제목에는 카테고리 접두사를 사용하지 않습니다."));
  }
}

function checkTagIndentation(lines, frontmatterEnd, issues) {
  if (frontmatterEnd < 0) return;
  const tagsIndex = lines.findIndex((line, index) => index > 0 && index < frontmatterEnd && /^tags:\s*$/.test(line));
  if (tagsIndex < 0) return;

  for (let index = tagsIndex + 1; index < frontmatterEnd; index += 1) {
    const line = lines[index];
    if (/^[A-Za-z][\w-]*:\s*/.test(line)) break;
    if (line.trim().length === 0) continue;

    const itemMatch = line.match(/^(\s*)-\s+/);
    if (!itemMatch) break;
    if (itemMatch[1].length !== 4) {
      issues.push(issue(index + 1, "tag-indent", "`tags` 목록은 공백 4칸으로 들여씁니다."));
    }
  }
}

function isClosingFence(line, fence) {
  const pattern = new RegExp(`^\\s*${escapeRegExp(fence.character)}{${fence.length},}\\s*$`);
  return pattern.test(line);
}

function checkLinks(line, lineNumber, issues) {
  markdownLinkPattern.lastIndex = 0;
  for (const match of line.matchAll(markdownLinkPattern)) {
    const host = safeHost(match[1]);
    if (host && forbiddenReferenceHosts.some((domain) => host === domain || host.endsWith(`.${domain}`))) {
      issues.push(issue(lineNumber, "forbidden-source", `참고 자료로 사용하지 않는 출처입니다: ${host}`));
    }
  }

  const withoutMarkdownLinks = line.replace(/!?\[[^\]]*\]\(\s*https?:\/\/[^)]*\)/g, "");
  const rawUrlMatch = withoutMarkdownLinks.match(/https?:\/\/[^\s)>]+/);
  if (rawUrlMatch) {
    issues.push(issue(lineNumber, "raw-url", "원시 URL 대신 `[제목](URL)` 형식의 Markdown 링크를 사용합니다."));
  }
}

function checkFinalSections(lines, headings, fallbackLine, issues) {
  const h2 = headings.filter((heading) => heading.depth === 2);
  const last = h2.at(-1);
  const previous = h2.at(-2);

  if (!last || last.title !== "참고 자료") {
    issues.push(issue(last?.line ?? fallbackLine, "final-reference", "공개 글의 마지막 `##` 장은 `참고 자료`여야 합니다."));
    return;
  }

  if (!previous || previous.title !== "정리") {
    issues.push(issue(last.line, "final-summary", "`참고 자료` 바로 앞의 `##` 장은 `정리`여야 합니다."));
    return;
  }

  checkSummaryBullets(lines, previous, last, issues);
}

function checkSummaryBullets(lines, summaryHeading, referenceHeading, issues) {
  let fence = null;
  let bulletCount = 0;

  for (let index = summaryHeading.index + 1; index < referenceHeading.index; index += 1) {
    const line = lines[index];
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);

    if (fenceMatch) {
      fence = fence ? null : fenceMatch[1][0];
      continue;
    }

    if (fence) continue;
    if (/^[*-]\s+\S/.test(line)) bulletCount += 1;
  }

  if (bulletCount < 3 || bulletCount > 6) {
    issues.push(issue(
      summaryHeading.line,
      "summary-bullets",
      "`정리` 장은 핵심 결론을 3~6개의 최상위 글머리 기호로 요약합니다."
    ));
  }
}

function stripHeadingNumber(value) {
  return value.replace(headingNumberPattern, "").trim();
}

function safeHost(value) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function issue(line, rule, message) {
  return { line, rule, message };
}
