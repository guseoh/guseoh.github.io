export const SITE = {
  title: "devjune.dev",
  description: "Java, Spring, JPA, HTTP와 인프라를 공부하고 검증한 내용을 축적하는 개인 기술 블로그",
  author: "오지훈",
  siteUrl: "https://guseoh.github.io",
  githubUrl: "https://github.com/guseoh",
  repositoryUrl: "https://github.com/guseoh/guseoh.github.io",
  repositoryName: "guseoh/guseoh.github.io",
  defaultOgImage: "/og-image.svg",
  commentRepository: "guseoh/guseoh.github.io",
  locale: "ko_KR",
  language: "ko",
  githubActivityUsername: "guseoh"
} as const;

export const BLOG_LIMITS = {
  homePostLimit: 8,
  postsPerPage: 12,
  sidebarTagLimit: 16,
  detailTagLimit: 8,
  postStaleMonths: 12
} as const;

export const CORE_TECH_TAGS = [
  "Spring Boot",
  "JPA",
  "QueryDSL",
  "MySQL",
  "Docker",
  "GitHub Actions",
  "AWS EC2",
  "Monitoring"
] as const;
