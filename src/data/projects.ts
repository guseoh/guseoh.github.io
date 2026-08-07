export type Project = {
  slug: string;
  name: string;
  eyebrow: string;
  status: string;
  summary: string;
  productDefinition: string;
  repositoryUrl: string;
  relatedQuery: string;
  currentScope: string[];
  highlights: string[];
  tech: string[];
  nextSteps: string[];
};

export const PROJECTS: Project[] = [
  {
    slug: "devpedia",
    name: "DevPedia",
    eyebrow: "Developer Community",
    status: "MVP1 설계·구현 진행 중",
    summary: "개발 커뮤니티 글과 프로젝트·스터디 모집글을 한 피드에서 탐색하고 대화하는 백엔드 서비스입니다.",
    productDefinition: "서로 다른 형식으로 흩어진 개발 경험과 모집 정보를 구조화하고, 공개 댓글로 맥락을 확인한 뒤 외부 연락으로 이어지는 흐름을 설계합니다.",
    repositoryUrl: "https://github.com/guseoh/DevPedia",
    relatedQuery: "DevPedia",
    currentScope: [
      "커뮤니티·프로젝트 모집·스터디 모집 통합 피드",
      "세션 인증과 CSRF 보호",
      "본인 게시글·댓글·답글의 수정과 삭제",
      "검색·필터·페이징과 안정적인 정렬 계약"
    ],
    highlights: [
      "제품 범위, 도메인 모델, ERD와 API 계약을 구현 전에 분리해 기록",
      "Security·오류 응답·requestId 계약을 독립 문서와 테스트 기준으로 관리",
      "Vertical Slice 단위로 구현 순서와 완료 조건을 연결"
    ],
    tech: ["Java 17", "Spring Boot 4", "Spring Data JPA", "Flyway", "MySQL", "Spring Security"],
    nextSteps: [
      "승인된 MVP1 설계를 기준으로 핵심 Vertical Slice 구현",
      "통합 테스트로 세션·CSRF·소유권과 오류 계약 검증",
      "프로젝트 개발 기록과 결정 근거를 블로그 글로 연결"
    ]
  },
  {
    slug: "pawcycle-commerce",
    name: "PawCycle Commerce",
    eyebrow: "Commerce & Operations",
    status: "1차 MVP·최소 운영 기준 검증",
    summary: "개와 고양이용 소모품의 일반 구매와 정기배송을 목표로 하는 이커머스 프로젝트입니다.",
    productDefinition: "공개 상품 탐색, 세션 인증과 구독 생성·조회 흐름을 하나의 수직 MVP로 연결하고, 단일 EC2 환경에서 배포·백업·복원·rollback의 최소 운영 기준을 검증합니다.",
    repositoryUrl: "https://github.com/guseoh/pawcycle-commerce",
    relatedQuery: "PawCycle",
    currentScope: [
      "공개 상품 목록·상세와 SKU 조회",
      "세션 로그인·로그아웃과 CSRF 보호",
      "정기배송 구독 생성·목록·상세",
      "Docker Compose 기반 Backend·Frontend·MySQL 통합"
    ],
    highlights: [
      "Backend와 Frontend release를 같은 commit SHA로 추적",
      "HTTPS, Secret 분리, backup·격리 restore와 application rollback 검증",
      "사용자가 승인 범위를 통제하고 자동 검증이 작업 결과를 확인하는 Lean Harness 적용"
    ],
    tech: ["Java 25", "Spring Boot 4", "Next.js", "React", "MySQL", "Docker Compose", "AWS EC2", "Nginx"],
    nextSteps: [
      "MVP2 제품·도메인 범위 승인",
      "일반 구매·주문과 구독 변경 흐름 확장",
      "운영 검증 결과를 성능·장애 대응 증거와 연결"
    ]
  },
  {
    slug: "futmatch",
    name: "FutMatch",
    eyebrow: "Futsal Matching",
    status: "1차 MVP 설계 기준선",
    summary: "풋살 경기 예약과 참가자·팀 매칭 흐름을 다루는 Spring Boot 백엔드 프로젝트입니다.",
    productDefinition: "경기 생성과 모집, 참가 신청, 정원과 상태 전이처럼 동시에 변경될 수 있는 규칙을 먼저 정의하고 구현·테스트 결과에 따라 설계 기준선을 갱신합니다.",
    repositoryUrl: "https://github.com/guseoh/futmatch-service",
    relatedQuery: "FutMatch",
    currentScope: [
      "1차 MVP 요구사항과 사용자 흐름",
      "모듈러 모놀리스 경계와 의존 방향",
      "ERD와 데이터 정합성 위험",
      "세션 인증·소유권 인가와 REST API 계약"
    ],
    highlights: [
      "확정·초기안·추천안·열린 결정을 구분해 설계 변경 가능성을 명시",
      "락과 인덱스 같은 구현 해법을 불변식 재현 전에는 성급하게 확정하지 않음",
      "요구사항·도메인·인증·API 문서를 구현 기준선으로 연결"
    ],
    tech: ["Java 17", "Spring Boot 4", "Spring Security", "Spring Data JPA", "MySQL", "Gradle"],
    nextSteps: [
      "핵심 엔티티와 상태 전이 구현",
      "동시 참가와 정원 제약을 테스트로 재현",
      "구현 결과에 따라 열린 결정과 API 계약 갱신"
    ]
  }
];

export function getProjectBySlug(slug: string) {
  return PROJECTS.find((project) => project.slug === slug);
}
