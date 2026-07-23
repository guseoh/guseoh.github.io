---
title: "게시글 상세 조회 성능 측정 - 개선 전 분석"
description: "Actuator의 http.server.requests와 P6Spy 로그로 게시글 상세 조회의 응답 시간과 SQL 흐름을 확인하고, 측정 결과로 말할 수 있는 범위를 정리한다."
date: 2026-04-27
updated: 2026-07-23
lastVerified: 2026-07-23
slug: "actuator"
aliases: []
commentKey: "/blog/actuator/"
category: "Board"
tags:
    - Board
    - Spring Boot
    - JPA
    - Performance
    - Actuator
    - P6Spy
testedWith:
    java: "17"
    springBoot: "4.0.1"
series: "board-프로젝트-성능-개선"
chapter: 4
heroImage: "/og-image.svg"
draft: true
---

## 1. 무엇을 측정했을까?

Board 프로젝트의 게시글 상세 화면은 게시글, 작성자와 댓글을 함께 조회한다. 화면은 정상적으로 열렸지만 요청 하나가 어떤 SQL을 실행하고 전체 응답에 어느 정도 시간이 걸리는지는 코드만 보고 확정하기 어려웠다.

측정 대상은 다음 요청이다.

```text
GET /post/13
```

확인하려던 항목은 두 가지였다.

* Spring MVC 요청 처리 시간은 어느 정도인가?
* 상세 화면을 만드는 동안 어떤 SQL이 몇 번 실행되는가?

요청 시간은 Spring Boot Actuator의 `http.server.requests` 미터로 확인했고, SQL은 P6Spy 로그로 확인했다. Actuator는 요청 전체를 관찰하고 P6Spy는 JDBC를 통해 실행된 SQL을 기록하므로 두 도구가 보여 주는 범위는 다르다.

이 글의 수치와 SQL은 2026년 3월 26일 로컬 환경에서 남긴 개선 전 기록이다. 2026년 7월 23일에는 해석과 공식 문서를 다시 확인했으며 같은 조건으로 성능을 재측정하지는 않았다.

## 2. 측정 환경과 방법

측정 환경은 다음과 같다.

* Java 17
* Spring Boot 4.0.1
* Spring Data JPA
* Thymeleaf
* MySQL
* Spring Boot Actuator
* P6Spy

로컬 서버를 재시작한 뒤 게시글 상세 화면을 한 번 요청하고, 이어서 같은 경로를 총 10회 요청했다. 같은 시점의 Actuator 미터와 P6Spy 로그를 함께 저장했다.

Actuator의 `metrics` 엔드포인트는 기본적으로 HTTP에 노출되지 않으므로 개발 환경에서 필요한 엔드포인트만 명시적으로 열어야 한다.

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health, metrics
```

운영 환경에서는 관리 엔드포인트를 외부에 그대로 공개하지 않는다. 별도 관리 포트나 내부 주소, 인증과 네트워크 접근 제어를 함께 적용한다.

특정 URI 템플릿의 요청만 확인할 때 사용한 주소는 다음과 같다.

```text
/actuator/metrics/http.server.requests?tag=uri:/post/%7Bid%7D
```

`uri` 태그는 실제 숫자 `13`이 아니라 요청 매핑의 URI 템플릿 `/post/{id}`를 사용한다. 태그를 지정하지 않으면 같은 미터 이름을 가진 여러 요청의 통계가 합쳐질 수 있다.

## 3. Actuator 측정값을 어떻게 읽을까?

기록한 응답의 핵심 측정값은 다음과 같다.

```json
{
  "baseUnit": "seconds",
  "measurements": [
    {
      "statistic": "COUNT",
      "value": 10.0
    },
    {
      "statistic": "TOTAL_TIME",
      "value": 1.3060162
    },
    {
      "statistic": "MAX",
      "value": 0.9738692
    }
  ],
  "name": "http.server.requests"
}
```

Micrometer의 타이머는 적어도 실행 횟수와 전체 시간을 기록한다. 평균은 `TOTAL_TIME / COUNT`로 계산할 수 있다.

<!-- table-caption: 게시글 상세 조회 10회의 Actuator 측정값 -->

| 지표 | 값 | 해석 |
| --- | ---: | --- |
| `COUNT` | 10 | 미터에 기록된 요청 수 |
| `TOTAL_TIME` | 1.306초 | 기록된 요청 시간의 합 |
| 평균 | 약 0.131초 | `TOTAL_TIME / COUNT` |
| `MAX` | 약 0.974초 | 기록 구간에서 가장 큰 요청 시간 |

10회의 산술 평균은 약 131ms다. 가장 큰 값은 약 974ms로 평균보다 크게 나타났다.

이 수치만으로 상세 조회가 느리다고 결론 내릴 수는 없다. 표본이 10회로 작고, 서버 재시작 직후의 클래스 로딩·JIT 컴파일·커넥션 풀 초기화·캐시 상태가 첫 요청에 영향을 줄 수 있다. 브라우저 요청에는 Thymeleaf 렌더링과 보안 필터 등 SQL 밖의 처리 시간도 포함된다.

`MAX` 하나만으로 일반적인 지연 시간을 대표할 수도 없다. 안정적인 비교에는 워밍업, 충분한 반복 횟수, 동시 사용자 수와 데이터 크기를 고정하고 중앙값이나 상위 백분위수까지 확인하는 과정이 필요하다.

## 4. P6Spy 로그에서 확인한 SQL 흐름

상세 요청 한 번에서 다음 SQL 흐름을 확인했다.

### 4.1 게시글 단건 조회

```sql
select
    p.id,
    p.content,
    p.member_id,
    p.title,
    p.view_count
from post p
where p.id = 13;
```

### 4.2 게시글 댓글 조회

```sql
select
    c.post_id,
    c.id,
    c.content,
    c.member_id
from comment c
where c.post_id = 13;
```

### 4.3 작성자 회원 조회

```sql
select
    m.id,
    m.email,
    m.nickname,
    m.role
from member m
where m.id = 15;
```

### 4.4 게시글 존재 여부 또는 개수 확인으로 보이는 조회

```sql
select count(*)
from post p
where p.id = 13;
```

### 4.5 댓글 목록 재조회

```sql
select
    c.id,
    c.content,
    c.member_id,
    c.post_id
from comment c
where c.post_id = 13
order by c.id;
```

로그에서 게시글 조회, 회원 조회와 댓글 조회가 실행된 사실은 확인할 수 있다. 댓글 조건을 사용한 조회가 두 번 나타났고 게시글의 `count(*)` 조회도 별도로 실행됐다.

다만 SQL 로그만으로 호출 원인을 확정할 수는 없다. 같은 조건의 댓글 조회라도 컨트롤러의 명시적인 Repository 호출, 지연 로딩, DTO 변환 또는 Thymeleaf 렌더링 중 연관관계 접근 등 여러 경로에서 실행될 수 있다. 호출 스택이나 코드 경로를 함께 확인해야 중복 여부와 제거 가능성을 판단할 수 있다.

## 5. 요청 시간과 SQL 시간을 바로 더하면 안 된다

P6Spy에 기록된 SQL 실행 시간은 데이터베이스 호출의 일부를 보여 준다. Actuator의 요청 시간에는 그보다 넓은 범위가 들어간다.

```text
HTTP 요청 시간
  ├── 필터와 보안 처리
  ├── 컨트롤러와 서비스 로직
  ├── 데이터베이스 호출
  ├── DTO 변환
  ├── Thymeleaf 렌더링
  └── 응답 작성
```

따라서 SQL 실행 시간이 각각 짧다고 전체 응답도 반드시 짧은 것은 아니다. 반대로 SQL 횟수가 많다고 바로 성능 문제라고 단정할 수도 없다. 쿼리 횟수, 각 쿼리의 실행 계획과 데이터 크기, 네트워크 왕복, 애플리케이션 처리 시간을 함께 봐야 한다.

P6Spy는 JDBC 호출을 가로채 로그를 남기므로 개발 중 SQL 흐름을 찾는 데 유용하다. 로깅 자체의 비용이 있고 운영 환경의 실제 지연을 그대로 재현하는 부하 테스트 도구는 아니다.

## 6. 이번 기록에서 확인한 사실과 남은 가설

측정 결과로 직접 확인한 사실은 다음과 같다.

* `/post/{id}` 템플릿으로 기록된 요청 10회의 전체 시간은 약 1.306초였다.
* 산술 평균은 약 131ms였고 기록된 최대값은 약 974ms였다.
* 한 요청의 로그에서 댓글 조건 조회가 두 번 나타났다.
* 게시글 단건 조회 외에 `count(*)` 조회가 실행됐다.

반면 다음 내용은 로그만으로 확정되지 않은 가설이다.

* 최대값이 서버 재시작 직후의 초기화 비용 때문인지 여부
* 두 댓글 조회가 같은 데이터를 불필요하게 반복해서 가져오는지 여부
* `count(*)` 조회를 다른 조회 결과로 대체할 수 있는지 여부
* SQL 감소가 사용자 응답 시간 개선으로 직접 이어지는지 여부

성능 개선은 가설을 코드 경로와 테스트로 확인한 뒤 같은 조건에서 다시 측정해야 한다. 쿼리 개수를 줄였다는 사실보다 응답 지연과 자원 사용량이 실제로 어떻게 변했는지가 최종 판단 기준이다.

## 7. 재측정할 때 고정할 조건

개선 전후를 비교하려면 측정 조건을 가능한 한 같게 유지한다.

* 같은 Java와 Spring Boot 버전
* 같은 데이터베이스와 데이터 건수
* 같은 게시글과 댓글 수
* 서버 시작 후 동일한 워밍업 횟수
* 동일한 요청 횟수와 동시성
* P6Spy 사용 여부
* 같은 로컬 또는 배포 환경

단건 요청을 몇 번 반복한 결과는 문제 탐색용 자료다. 회귀 여부를 확인하려면 자동화된 테스트나 부하 도구로 조건을 고정하고 여러 번 실행한 결과를 비교하는 편이 적절하다.

## 8. 정리

* Actuator의 `http.server.requests`는 Spring MVC 요청의 횟수와 전체 처리 시간을 확인할 수 있으며 URI 태그로 특정 요청 템플릿을 좁힐 수 있다.
* 10회의 평균 약 131ms와 최대 약 974ms는 개선 전 탐색 자료이며 일반적인 성능이나 운영 환경의 지연을 대표하지 않는다.
* P6Spy 로그에서는 댓글 조건 조회 두 번과 별도의 `count(*)` 조회를 확인했지만 실행 원인은 코드 경로를 함께 추적해야 한다.
* SQL 실행 시간은 전체 HTTP 요청 시간의 일부이므로 쿼리 횟수만으로 응답 성능을 판단하지 않는다.
* 성능 개선 전후에는 데이터 크기, 워밍업, 요청 횟수, 동시성과 도구 사용 조건을 고정해 다시 측정해야 한다.

## 9. 참고 자료

### 공식 자료

* [Spring Boot Reference - Metrics](https://docs.spring.io/spring-boot/reference/actuator/metrics.html)
* [Spring Boot Actuator REST API - Metrics](https://docs.spring.io/spring-boot/api/rest/actuator/metrics.html)
* [Spring Boot Reference - Monitoring and Management Over HTTP](https://docs.spring.io/spring-boot/4.0/reference/actuator/monitoring.html)
* [Micrometer Reference - Timers](https://docs.micrometer.io/micrometer/reference/concepts/timers.html)
* [P6Spy Documentation - Integrating P6Spy](https://p6spy.readthedocs.io/en/latest/integration.html)

### 한글 참고 링크

* [우아한형제들 기술블로그 - 서버 성능을 측정하는 방법](https://techblog.woowahan.com/2627/)
