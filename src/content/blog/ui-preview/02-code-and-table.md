---
title: "상세 글 UI 검증: Java·SQL 코드 블록과 폭이 넓은 표"
description: "다양한 코드 언어, 긴 코드, 복사 버튼, 코드 접기, 가로 스크롤 표와 목록형 비교를 점검하는 임시 테스트 글입니다."
date: 2026-10-26
slug: "ui-preview/code-and-table"
category: "Java"
tags:
    - Java
    - SQL
    - Testing
draft: false
---

> [!WARNING]
> 화면 확인용 샘플입니다. 코드는 복사 및 구문 강조 UI를 점검하기 위해 작성했으며 실제 프로젝트에 그대로 적용하지 않습니다.

## 1. 짧은 Java 코드 블록

아래 코드는 `List`와 스트림을 조합한 간단한 예제입니다. 코드 헤더의 Java 라벨, 상단 패딩, 복사 버튼 위치, 마지막 줄 아래 간격을 확인합니다. 일반 문단의 `List.of(...)` 인라인 코드와 시각적으로 충분히 구분되는지 비교해 보세요.

```java
List<String> names = List.of("Java", "Spring", "JPA");
List<String> result = names.stream()
    .filter(name -> name.length() > 3)
    .toList();

System.out.println(result);
```

> [!TIP]
> 짧은 코드에서는 헤더와 본문 영역이 과하게 커 보이지 않아야 합니다. 코드를 복사한 뒤 성공 피드백을 키보드와 스크린 리더에서도 인식할 수 있는지 확인합니다.

## 2. 다양한 언어의 구문 강조와 긴 한 줄

### 2.1 SQL과 긴 쿼리

SQL 문법의 키워드와 식별자 색상이 서로 분리되는지 확인합니다. 가로로 긴 줄이 들어오더라도 전체 문서가 화면 밖으로 늘어나지 않아야 합니다.

```sql
SELECT a.id, a.title, a.created_at, m.username
FROM article a
JOIN member m ON m.id = a.author_id
WHERE a.deleted_at IS NULL
  AND a.status IN ('PUBLISHED', 'UPDATED')
ORDER BY a.created_at DESC, a.id DESC
LIMIT 20;
```

```json
{
  "page": 1,
  "size": 20,
  "sort": "createdAt,desc",
  "filter": { "status": ["PUBLISHED", "UPDATED"] },
  "sampleLongValue": "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
}
```

### 2.2 YAML, Bash, HTTP 메시지

언어가 바뀌어도 헤더 높이와 복사 아이콘의 정렬이 일정한지 살펴봅니다.

```yaml
spring:
  application:
    name: preview-service
  datasource:
    url: jdbc:mysql://localhost:3306/sample
    username: sample
    password: sample
```

```bash
./gradlew clean test
./gradlew bootRun
```

```http
GET /api/articles?page=1&size=20 HTTP/1.1
Host: localhost:8080
Accept: application/json
```

## 3. 20줄이 넘는 코드와 접기 기능

아래 예제는 줄 수가 많아 코드 블록의 '전체 보기' 동작을 확인할 수 있습니다. **코드 복사 시 접혀 있는 나머지 내용까지 포함하는지**, 펼친 뒤에도 스크롤 위치가 갑자기 바뀌지 않는지 확인합니다.

```java
public final class DisplayFixture {
    private DisplayFixture() {}

    public static String normalize(String value) {
        if (value == null) {
            return "";
        }
        String result = value.trim();
        if (result.isEmpty()) {
            return "";
        }
        if (result.length() > 64) {
            result = result.substring(0, 64);
        }
        return result.toLowerCase();
    }

    public static void main(String[] args) {
        String[] samples = {" Java ", " Spring ", " JPA "};
        for (String sample : samples) {
            String normalized = normalize(sample);
            System.out.println(normalized);
        }
    }
}
```

## 4. 표: 작은 표와 가로로 긴 표

### 4.1 작은 비교 표

<!-- table-caption: API 응답 상태 표현의 기본 비교 -->
| 상태 | 의미 | UI 점검 포인트 |
| :--- | :--- | :--- |
| 성공 | 요청 처리 완료 | 기본 텍스트 대비 |
| 경고 | 재확인 필요 | 배경과 강조 색 |
| 오류 | 처리 실패 | 한글 줄바꿈 |

### 4.2 열이 많은 표

아래 표는 모바일에서 **가로 스크롤 영역이 표에만 적용되는지** 검증하기 위한 예제입니다. 본문 전체가 좌우로 흔들린다면 UI 개선이 필요합니다.

<!-- table-caption: 성능 조사에서 흔히 함께 보는 지표를 배치한 가로형 표 예시 -->
| 지표 | 1분 | 5분 | 15분 | 최대 | 평균 | 기준 | 상태 |
| :--- | ---: | ---: | ---: | ---: | ---: | :--- | :--- |
| 처리량 | 120 | 136 | 142 | 185 | 133 | req/s | 정상 |
| 응답 시간 | 42 | 48 | 53 | 91 | 49 | ms | 점검 |
| 오류율 | 0.1 | 0.3 | 0.2 | 1.1 | 0.2 | % | 정상 |
| 큐 길이 | 3 | 5 | 7 | 14 | 6 | 개 | 관찰 |

이 수치는 실제 서비스 측정 결과가 아닌 **표 레이아웃 점검용 가상 데이터**입니다. 태블릿과 모바일에서 표 캡션이 잘 보이는지도 확인합니다.

## 5. 콜아웃과 긴 URL 대신 의미 있는 링크

> [!NOTE]
> 일반 강조를 오렌지색으로 과하게 바꾸면 코딩 문법 색상과 경쟁할 수 있습니다. 이 블록의 제목·아이콘·본문 대비만으로 의미를 전달할 수 있는지 확인합니다.

> [!CAUTION]
> 다크 모드에서는 경고 영역이 지나치게 붉거나 형광빛으로 보이지 않게 합니다. 밝은 색을 사용하더라도 텍스트 대비는 유지해야 합니다.

코드와 관련한 더 긴 실제 설명은 [영속성 컨텍스트 기존 글](/blog/jpa/persistence-context/)에서 볼 수 있습니다. 외부 링크의 표현은 [Java 공식 문서](https://docs.oracle.com/en/java/)처럼 의미 있는 링크 문구를 사용해 확인합니다.

## 6. 정리

- 짧은 코드에서는 언어 라벨과 복사 버튼이 간결하게 보이는 것이 좋습니다.
- 긴 코드에는 접기·펼치기 및 복사 기능이 별다른 레이아웃 이동 없이 동작해야 합니다.
- 언어별 색상은 구분되더라도 본문 전체의 색상 체계를 지나치게 복잡하게 만들지 않아야 합니다.
- 폭이 넓은 표는 모바일에서 표 자체만 가로로 스크롤할 수 있어야 합니다.

## 7. 참고 자료

- [Java 공식 문서](https://docs.oracle.com/en/java/)
- [기존 영속성 컨텍스트 글](/blog/jpa/persistence-context/)
