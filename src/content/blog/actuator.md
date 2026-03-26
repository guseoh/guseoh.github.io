---
title: "[프로젝트] 게시글 상세 조회 성능 측정 - 개선 전 분석"
description: ""
pubDate: 2026-03-26
updatedDate: 2026-03-26
category: "Project"
tags:
  - Spring Boot
  - Actuator
---

## 문제 인식

게시판 프로젝트를 개발하면서 기능 구현이 어느 정도 완료된 후,
게시글 상세 조회(`/post/{id}`) 요청이 실제로 어떻게 동작하는지 확인해보고 싶었다.

"느리다"는 감각적인 접근보다는 Actuator와 P6Spy를 이용해 **응답 시간**과 **실행 SQL**을 먼저 측정한 뒤 개선 포인트를 찾는 방식으로 진행하였다.

## 측정 환경
- Java 17
- Spring Boot 4.0.1
- Spring Data JPA
- Thymeleaf
- MySQL
- P6Spy
- Spring boot Actuator

(추후 Grafana 추가 예정)

로컬 환경에서 측정했다.

## 측정 대상

요청 URL: `/post/{id}`

 - 상세 조회 요청의 응답 시간은 어느 정도인가
 - 상세 조회 1회당 SQL이 몇 번 실행되나
 - 불필요한 중복 조회가 존재하나

## 측정 방법

1. 서버를 재시작한다.
2. `http://localhost:8080/post/13` 페이지에 1회 접속한다.
3. 상세 조회 SQL이 몇 번 실행되는지 확인한다.
4. `http://localhost:8080/post/13` 페이지에 10회 접속한다.
5. PostMan으로 `http://localhost:8080/actuator/metrics/http.server.requests?tag=uri:/post/%7Bid%7D` 상세 조회 요청의 응답 시간을 확인한다.
6. 같은 시점에 P6Spy SQL 로그를 함께 확인한다.

## Actuator 측정 결과
```json
{
    "availableTags": [
        {
            "tag": "exception",
            "values": [
                "none"
            ]
        },
        {
            "tag": "method",
            "values": [
                "GET"
            ]
        },
        {
            "tag": "error",
            "values": [
                "none"
            ]
        },
        {
            "tag": "outcome",
            "values": [
                "SUCCESS"
            ]
        },
        {
            "tag": "status",
            "values": [
                "200"
            ]
        }
    ],
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

- COUNT: 요청 횟수 (`http://localhost:8080/post/13` 페이지에 10회 접속)
- TOTAL_TIME: 전체 요청 처리 시간의 합
- MAX: 가장 오래 걸린 단일 요청 시간
- 평균 응답 시간: TOTAL_TIME / COUNT

위의 Actuator 메트릭을 보면
- COUNT = 10
- TOTAL_TIME = 1.306s
- MAX = 0.974s

평균 응답 시간은 약 0.131s(130ms)이며, 가장 느린 요청은 약 974ms가 걸렸다.

즉, 전체 평균으로 보면 나쁘지 않지만, 일부 요청에서 지연이 발생했을 가능성이 있다.


## P6Spy SQL 로그

상세 조회 SQL이 몇 번 실행되는지 확인

### 1. 게시글 조회
```sql
[SQL] 6ms
[PARAMS] [13]
select
    p1_0.id,
    p1_0.content,
    p1_0.created_at,
    p1_0.created_by,
    p1_0.member_id,
    p1_0.title,
    p1_0.updated_at,
    p1_0.updated_by,
    p1_0.view_count 
from post p1_0 
where p1_0.id=13
```

### 2. 댓글 조회

```sql
[SQL] 6ms
[PARAMS] [13]
select
    c1_0.post_id,
    c1_0.id,
    c1_0.content,
    c1_0.created_at,
    c1_0.created_by,
    c1_0.member_id,
    c1_0.updated_at,
    c1_0.updated_by 
from comment c1_0 
where c1_0.post_id=13
```

### 3. 회원 조회

```sql
[SQL] 2ms
[PARAMS] [15]
select
    m1_0.id,
    m1_0.created_at,
    m1_0.created_by,
    m1_0.email,
    m1_0.nickname,
    m1_0.password,
    m1_0.provider,
    m1_0.provider_id,
    m1_0.role,
    m1_0.updated_at,
    m1_0.updated_by 
from member m1_0 
where m1_0.id=15
```

### 4. 게시글 count 조회
```sql
[SQL] 6ms
[PARAMS] [13]
select
    count(*) 
from post p1_0 
where p1_0.id=13
```

### 5. 댓글 재조회
```sql
2026-03-26 16:08:05.074 [http-nio-8080-exec-1] INFO  p6spy - 
[SQL] 0ms
[PARAMS] [0]
select
    c1_0.id,
    c1_0.content,
    c1_0.created_at,
    c1_0.created_by,
    c1_0.member_id,
    c1_0.post_id,
    c1_0.updated_at,
    c1_0.updated_by 
from comment c1_0 
where c1_0.post_id=13 
order by c1_0.id
```

## 확인된 문제점

- 댓글 조회가 두 번 발생한다.
- 게시글 count 조회가 추가로 발생한다.
- 평균 응답 시간은 괜찮지만, 최대 응답 시간이 튄다.

## 개선 방향

1. 두 번의 댓글 조회 확인
2. 게시글 count 조회가 왜 발생하는지 확인
3. 개선 후 Actuator / P6Spy 결과 비교

## 마무리

이번 측정으로 성능 문제에 대해 막연히 추측하기 보다는 먼저 측정하고 기록하는 과정이 중요하는 것을 알게 되었다.

다음 글에서는 상세 조회 로직을 실제로 수정하고, 개선 전/후 차이를 비교해볼 예정이다. 

Actuator으로 요청 시간을 확인 하였으니 Grafana를 적용하여 시각화도 하고 싶다.
