import { normalizeSearchText, scoreSearchItem, sortSearchResults, type SearchIndexItem } from "../utils/search";

type NavigationItem = {
  planned?: boolean;
  query?: string;
  slug: string;
  title: string;
  type: "category" | "tag" | "series" | "search" | "url";
};

type NavigationGroup = {
  items: NavigationItem[];
  slug: string;
  title: string;
};

const recentSearchKey = "guseo:recent-searches";
const recentSearchLimit = 5;
const collator = new Intl.Collator("ko-KR");
const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

const form = document.querySelector("[data-search-form]");
const input = document.getElementById("search-page-input");
const categorySelect = document.querySelector("[data-search-category]");
const tagSelect = document.querySelector("[data-search-tag]");
const list = document.querySelector("[data-search-list]");
const meta = document.querySelector("[data-search-meta]");
const empty = document.querySelector("[data-search-empty]");
const status = document.getElementById("search-status");
const recent = document.querySelector("[data-search-recent]");
const recentList = document.querySelector("[data-search-recent-list]");
const recentClear = document.querySelector("[data-search-recent-clear]");
const navigationGroupsElement = document.getElementById("search-navigation-groups");

if (
  form instanceof HTMLFormElement &&
  input instanceof HTMLInputElement &&
  categorySelect instanceof HTMLSelectElement &&
  tagSelect instanceof HTMLSelectElement &&
  list instanceof HTMLElement &&
  meta instanceof HTMLElement &&
  empty instanceof HTMLElement
) {
  const params = new URLSearchParams(window.location.search);
  const activeGroup = params.get("group") ?? "";
  const navigationGroups = parseNavigationGroups(navigationGroupsElement);

  input.value = params.get("q") ?? "";
  categorySelect.value = params.get("category") ?? "";
  tagSelect.value = params.get("tag") ?? "";

  if (params.get("focus") === "1") {
    window.requestAnimationFrame(() => input.focus());
  }

  fetch("/search-index.json")
    .then((response) => {
      if (!response.ok) throw new Error(`Search index request failed: ${response.status}`);
      return response.json() as Promise<SearchIndexItem[]>;
    })
    .then((posts) => {
      fillSelect(categorySelect, uniqueSorted(posts.map((post) => post.category)), categorySelect.value, "전체 카테고리");
      fillSelect(tagSelect, uniqueSorted(posts.flatMap((post) => post.tags)), tagSelect.value, "전체 태그");

      const render = () => {
        renderSearch(posts, navigationGroups, activeGroup);
      };

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        saveRecentSearch(input.value);
        renderRecentSearches();
        render();
      });
      input.addEventListener("input", render);
      categorySelect.addEventListener("change", render);
      tagSelect.addEventListener("change", render);

      renderRecentSearches();
      if (input.value.trim()) {
        saveRecentSearch(input.value);
        renderRecentSearches();
      }
      render();
    })
    .catch(() => {
      meta.hidden = false;
      meta.textContent = "검색 인덱스를 불러오지 못했습니다.";
      empty.hidden = false;
    });

  recentClear?.addEventListener("click", () => {
    writeRecentSearches([]);
    renderRecentSearches();
  });
}

function parseNavigationGroups(element: HTMLElement | null): NavigationGroup[] {
  if (!element?.textContent) return [];

  try {
    return JSON.parse(element.textContent) as NavigationGroup[];
  } catch {
    return [];
  }
}

function uniqueSorted(items: string[]) {
  return Array.from(new Set(items.filter(Boolean))).sort(collator.compare);
}

function fillSelect(select: HTMLSelectElement, values: string[], selectedValue: string, allLabel: string) {
  select.replaceChildren(new Option(allLabel, ""));
  for (const value of values) {
    select.append(new Option(value, value));
  }
  select.value = values.includes(selectedValue) ? selectedValue : "";
}

function normalizeSlug(value: string) {
  return normalizeSearchText(value)
    .replace(/[^a-z0-9가-힣]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function renderSearch(posts: SearchIndexItem[], navigationGroups: NavigationGroup[], activeGroup: string) {
  if (
    !(input instanceof HTMLInputElement) ||
    !(categorySelect instanceof HTMLSelectElement) ||
    !(tagSelect instanceof HTMLSelectElement) ||
    !(list instanceof HTMLElement) ||
    !(meta instanceof HTMLElement) ||
    !(empty instanceof HTMLElement)
  ) {
    return;
  }

  const query = input.value.trim();
  const normalizedQuery = normalizeSearchText(query);
  const category = categorySelect.value;
  const tag = tagSelect.value;
  const group = navigationGroups.find((entry) => entry.slug === activeGroup);
  const groupFiltered = posts.filter((post) => {
    const matchesCategory = !category || post.category === category;
    const matchesTag = !tag || post.tags.includes(tag);
    const matchesGroup = !group || group.items.some((item) => {
      if (item.planned) return false;
      if (item.type === "category") return normalizeSlug(post.category) === item.slug;
      if (item.type === "tag") return post.tags.some((postTag) => normalizeSlug(postTag) === item.slug);
      if (item.type === "series") return normalizeSlug(post.series || "") === item.slug;
      if (item.type === "search") return post.searchText.includes(normalizeSearchText(item.query || item.title));

      return false;
    });

    return matchesCategory && matchesTag && matchesGroup;
  });
  const filtered = normalizedQuery
    ? sortSearchResults(groupFiltered, normalizedQuery)
    : groupFiltered.map((post) => ({ post, match: scoreSearchItem(post, "") }));

  list.replaceChildren(...filtered.map(({ post, match }) => renderPost(post, match.reasons, query)));
  empty.hidden = filtered.length > 0;
  meta.hidden = false;
  meta.textContent = group ? `${group.title} 그룹 · 총 ${filtered.length}개 결과` : `총 ${filtered.length}개 결과`;

  if (status) {
    status.textContent = query || category || tag || group
      ? `검색 조건에 맞는 글 ${filtered.length}개를 찾았습니다.`
      : `전체 ${posts.length}개의 글을 검색할 수 있습니다.`;
  }

  updateUrl(activeGroup);
}

function renderPost(post: SearchIndexItem, reasons: string[], query: string) {
  const item = document.createElement("li");
  const article = document.createElement("article");
  article.className = "card post-card";
  article.dataset.postSlug = post.slug;

  const header = document.createElement("header");
  header.className = "post-card__header";
  const heading = document.createElement("h2");
  const link = document.createElement("a");
  link.href = post.url;
  appendHighlightedText(link, post.title, query);
  heading.append(link);
  header.append(heading);

  const description = document.createElement("p");
  description.className = "post-card__description";
  appendHighlightedText(description, post.description || post.excerpt, query);

  const footer = document.createElement("div");
  footer.className = "post-card__footer";
  const metaGroup = document.createElement("div");
  metaGroup.className = "post-card__meta";
  metaGroup.append(textSpan("작성"));
  const time = document.createElement("time");
  time.dateTime = post.date;
  time.textContent = dateFormatter.format(new Date(post.date));
  metaGroup.append(time, separator(), textSpan(post.readingTime));

  const badges = document.createElement("div");
  badges.className = "badge-group";
  badges.append(createBadge(`/categories/${encodeURIComponent(normalizeSlug(post.category))}/`, post.category, "badge badge--category"));
  for (const tag of post.tags.slice(0, 4)) {
    badges.append(createBadge(`/search/?tag=${encodeURIComponent(tag)}`, `#${tag}`, "badge"));
  }
  footer.append(metaGroup, badges);

  article.append(header, description, footer);

  if (reasons.length > 0) {
    const reasonList = document.createElement("ul");
    reasonList.className = "search-match-reasons";
    reasonList.setAttribute("aria-label", "검색 일치 이유");
    for (const reason of reasons.slice(0, 3)) {
      const reasonItem = document.createElement("li");
      reasonItem.textContent = reason;
      reasonList.append(reasonItem);
    }
    article.append(reasonList);
  }

  item.append(article);
  return item;
}

function appendHighlightedText(parent: HTMLElement, text: string, query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    parent.append(document.createTextNode(text));
    return;
  }

  const lowerText = text.toLowerCase();
  let position = 0;

  while (position < text.length) {
    const index = lowerText.indexOf(normalizedQuery, position);
    if (index === -1) {
      parent.append(document.createTextNode(text.slice(position)));
      break;
    }

    if (index > position) {
      parent.append(document.createTextNode(text.slice(position, index)));
    }

    const mark = document.createElement("mark");
    mark.textContent = text.slice(index, index + normalizedQuery.length);
    parent.append(mark);
    position = index + normalizedQuery.length;
  }
}

function createBadge(href: string, label: string, className: string) {
  const badge = document.createElement("a");
  badge.className = className;
  badge.href = href;
  badge.textContent = label;
  return badge;
}

function textSpan(value: string) {
  const span = document.createElement("span");
  span.textContent = value;
  return span;
}

function separator() {
  const span = textSpan("·");
  span.setAttribute("aria-hidden", "true");
  return span;
}

function updateUrl(activeGroup: string) {
  if (!(input instanceof HTMLInputElement) || !(categorySelect instanceof HTMLSelectElement) || !(tagSelect instanceof HTMLSelectElement)) {
    return;
  }

  const nextParams = new URLSearchParams();
  const query = input.value.trim();

  if (activeGroup) nextParams.set("group", activeGroup);
  if (query) nextParams.set("q", query);
  if (categorySelect.value) nextParams.set("category", categorySelect.value);
  if (tagSelect.value) nextParams.set("tag", tagSelect.value);

  const nextUrl = `${window.location.pathname}${nextParams.toString() ? `?${nextParams}` : ""}`;
  window.history.replaceState(null, "", nextUrl);
}

function readRecentSearches() {
  try {
    const parsed = JSON.parse(localStorage.getItem(recentSearchKey) || "[]");
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function writeRecentSearches(values: string[]) {
  try {
    localStorage.setItem(recentSearchKey, JSON.stringify(values.slice(0, recentSearchLimit)));
  } catch {
  }
}

function saveRecentSearch(value: string) {
  const query = value.trim();
  if (!query) return;

  const next = [query, ...readRecentSearches().filter((item) => normalizeSearchText(item) !== normalizeSearchText(query))];
  writeRecentSearches(next);
}

function renderRecentSearches() {
  if (!(recent instanceof HTMLElement) || !(recentList instanceof HTMLElement) || !(input instanceof HTMLInputElement)) return;

  const searches = readRecentSearches();
  recent.hidden = searches.length === 0;
  recentList.replaceChildren(...searches.map((query) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = query;
    button.addEventListener("click", () => {
      input.value = query;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
    });
    return button;
  }));
}
