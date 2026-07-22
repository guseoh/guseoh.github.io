---
title: "REST와 HTTP API는 무엇이 다를까?"
description: "HTTP API와 REST 아키텍처 스타일의 차이를 구분하고, 리소스 식별과 HTTP 메서드의 안전성·멱등성을 API 설계에 적용하는 방법을 살펴본다."
date: 2026-06-10
updated: 2026-07-23
lastVerified: 2026-07-23
category: "Network"
slug: "network/restapi"
commentKey: "/blog/network/restapi/"
tags:
    - REST
    - REST API
    - HTTP
book: ""
chapter: 1
heroImage: "/og-image.svg"
draft: false
---

## 1. HTTP를 사용한다고 모두 REST API는 아니다

웹 애플리케이션에서는 HTTP 요청과 응답으로 데이터를 주고받는 API를 흔히 만든다.

```http
GET /members/1
Accept: application/json
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": 1,
  "name": "Kim"
}
```

이 API는 HTTP를 사용하므로 **HTTP API**라고 부를 수 있다. URI가 명사로 구성되고 HTTP 메서드를 사용한다는 이유만으로 REST의 모든 제약을 만족한다고 단정할 수는 없다.

REST는 Roy Fielding이 설명한 분산 하이퍼미디어 시스템의 아키텍처 스타일이다. REST를 적용한 시스템은 다음 제약을 함께 고려한다.

- 클라이언트와 서버의 관심사를 분리한다.
- 요청 사이에 서버가 클라이언트의 애플리케이션 상태를 보관하지 않는다.
- 응답이 캐시 가능한지 표현한다.
- 구성 요소가 일관된 인터페이스로 통신한다.
- 계층 구조를 허용한다.
- 필요할 때 코드 전송을 선택적으로 사용할 수 있다.

실무에서 REST API라고 부르는 많은 API는 이 제약 전체보다 리소스 중심 URI, HTTP 메서드와 상태 코드 같은 일부 원칙을 중심으로 설계된다. 이 글에서는 엄격한 REST 판별보다 HTTP의 의미를 API 계약에 반영하는 방법에 초점을 둔다.

## 2. 리소스를 URI로 식별한다

리소스는 API가 식별하고 조작하려는 대상이다. 회원 목록과 특정 회원은 서로 다른 URI로 나타낼 수 있다.

```text
/members
/members/1
```

같은 URI라도 요청 메서드에 따라 의도가 달라진다.

<!-- table-caption: 회원 리소스에 적용한 HTTP 메서드 -->
| 요청 | 의미 |
| --- | --- |
| `GET /members` | 회원 목록 조회 |
| `POST /members` | 회원 컬렉션에 새 회원 생성 요청 |
| `GET /members/1` | 1번 회원 조회 |
| `PUT /members/1` | 1번 회원의 현재 표현을 요청 본문으로 대체 |
| `PATCH /members/1` | 1번 회원을 요청에 정의된 방식으로 부분 수정 |
| `DELETE /members/1` | 1번 회원 삭제 요청 |

URI에 동사를 넣는 것이 문법 오류는 아니다. 다만 리소스 조작을 HTTP 메서드로 충분히 표현할 수 있다면 다음 형태가 더 일관적이다.

```http
DELETE /members/1
```

```http
POST /members/1/delete
```

두 번째 요청도 구현할 수 있지만 삭제라는 의도가 URI와 `POST`에 나뉘어 있다. 첫 번째 요청은 대상 리소스와 삭제 메서드가 HTTP 요청선에 직접 드러난다.

리소스로 표현하기 어려운 행위도 있다. 비밀번호 재설정 메일 발송이나 주문 결제처럼 업무 명령 자체가 중요한 경우에는 무리하게 CRUD 형태에 끼워 맞추기보다 의미가 드러나는 하위 리소스나 명령 엔드포인트를 선택할 수 있다.

```http
POST /members/1/password-reset-requests
POST /orders/10/payments
```

## 3. 표현을 주고받는다

클라이언트는 데이터베이스의 행이나 Java 객체를 그대로 받지 않는다. 서버가 리소스의 현재 상태를 JSON, HTML 같은 형식으로 표현한 메시지를 받는다.

```http
GET /members/1
Accept: application/json
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": 1,
  "name": "Kim"
}
```

`Accept`는 클라이언트가 원하는 응답 표현을 알리고, `Content-Type`은 실제 메시지 본문의 미디어 타입을 나타낸다. 같은 리소스라도 서버와 클라이언트의 협상에 따라 다른 표현을 사용할 수 있다.

API 응답 DTO는 엔티티의 모든 필드를 그대로 공개할 필요가 없다. 현재 클라이언트 계약에 필요한 정보만 표현하고, 비밀번호나 내부 상태처럼 외부에 노출하지 않을 값은 제외한다.

## 4. PUT과 PATCH의 의미를 구분한다

`PUT`은 요청 대상 URI의 상태를 요청 본문에 담긴 표현으로 생성하거나 대체한다.

```http
PUT /members/1
Content-Type: application/json

{
  "name": "Kim",
  "email": "kim@example.com"
}
```

여기서 전체 대체란 데이터베이스의 모든 열을 반드시 전송한다는 뜻이 아니다. API가 정의한 회원 표현 전체를 전송한다는 뜻이다. 서버 내부 전용 필드나 자동 생성 값은 그 표현에 포함되지 않을 수 있다.

`PATCH`는 요청 본문에 정의된 변경을 대상 리소스에 적용한다.

```http
PATCH /members/1
Content-Type: application/merge-patch+json

{
  "name": "Lee"
}
```

PATCH 본문의 의미는 미디어 타입과 API 계약에 따라 달라진다. 단순 JSON 객체를 받는 자체 형식을 사용할 수도 있고 JSON Merge Patch나 JSON Patch 같은 표준 형식을 사용할 수도 있다.

<!-- table-caption: PUT과 PATCH의 의미 비교 -->
| 구분 | PUT | PATCH |
| --- | --- | --- |
| 요청 의미 | 대상 리소스의 표현을 생성하거나 대체 | 정의된 변경을 대상 리소스에 적용 |
| 요청 본문 | API가 정의한 대체 표현 | 변경 명령 또는 부분 표현 |
| 멱등성 | 명세상 멱등 | 형식과 구현에 따라 달라짐 |

## 5. 멱등성은 응답 값이 항상 같다는 뜻이 아니다

RFC 9110은 같은 요청을 여러 번 보냈을 때 **서버에 의도된 효과**가 한 번 보낸 것과 같다면 그 메서드를 멱등하다고 정의한다. 응답 본문과 상태 코드가 매번 같아야 한다는 뜻은 아니다.

예를 들어 같은 회원 삭제 요청을 반복해 보자.

```http
DELETE /members/1
```

첫 번째 요청은 회원을 삭제하고 `204 No Content`를 반환할 수 있다. 두 번째 요청에서는 이미 리소스가 없으므로 `404 Not Found`를 반환할 수 있다. 응답 상태는 다르지만 삭제 대상이 없는 최종 서버 상태는 첫 번째 요청을 한 번 처리했을 때와 같다.

<!-- table-caption: HTTP 요청 메서드의 일반적인 속성 -->
| 메서드 | 안전 | 멱등 |
| --- | --- | --- |
| GET | O | O |
| HEAD | O | O |
| OPTIONS | O | O |
| PUT | X | O |
| DELETE | X | O |
| POST | X | X |
| PATCH | X | 구현에 따라 다름 |

안전한 메서드는 클라이언트가 서버 상태 변경을 요청하지 않는 메서드다. 서버가 접근 로그를 남기거나 통계를 증가시키는 내부 부수 효과까지 금지한다는 뜻은 아니다.

### 5.1 GET 응답은 달라질 수 있다

`GET`은 멱등하지만 같은 URI의 응답이 항상 같다고 보장하지 않는다. 두 요청 사이에 다른 사용자가 데이터를 수정했다면 다음 조회 결과는 달라질 수 있다.

멱등성은 응답 데이터의 동일성이 아니라 요청이 의도한 서버 효과를 기준으로 판단한다. GET은 리소스 변경을 요청하지 않으므로 같은 요청을 반복해도 클라이언트가 요구한 변경 효과가 누적되지 않는다.

### 5.2 PATCH는 변경 방식에 따라 달라진다

값을 특정 상태로 설정하는 PATCH는 멱등하게 구현할 수 있다.

```http
PATCH /members/1
Content-Type: application/json

{
  "age": 31
}
```

반대로 현재 값에 1을 더하라는 변경은 요청할 때마다 결과가 누적된다.

```http
PATCH /members/1
Content-Type: application/json

{
  "operation": "increment",
  "field": "loginCount",
  "value": 1
}
```

따라서 PATCH 자체를 항상 멱등하거나 항상 비멱등하다고 분류하지 않고, 요청 문서의 의미와 서버 구현을 함께 확인해야 한다.

## 6. 정리

HTTP API는 HTTP 요청과 응답으로 기능을 제공하는 API다. REST는 그보다 넓은 아키텍처 제약을 다루므로 명사형 URI와 HTTP 메서드만 사용했다고 REST 전체를 만족하는 것은 아니다.

API를 설계할 때는 URI로 대상을 식별하고, 메서드와 상태 코드가 가진 의미를 계약에 반영한다. 멱등성은 반복 요청의 응답이 항상 같다는 뜻이 아니라 서버에 의도된 효과가 한 번 처리했을 때와 같은지를 나타낸다.

## 7. 참고 자료

### 공식 자료

* [Architectural Styles and the Design of Network-based Software Architectures - Roy Fielding](https://ics.uci.edu/~fielding/pubs/dissertation/top.htm)
* [RFC 9110 - HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
* [RFC 5789 - PATCH Method for HTTP](https://www.rfc-editor.org/rfc/rfc5789.html)

### 한글 참고 링크

* [백엔드 개발자를 꿈꾸는 학생개발자에게 - NAVER D2](https://d2.naver.com/news/3435170)
* [HTTP 요청 메서드 - MDN Web Docs](https://developer.mozilla.org/ko/docs/Web/HTTP/Reference/Methods)
