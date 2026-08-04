---
title: "인증과 인가는 무엇일까?"
description: "인증은 사용자의 신원을 확인하는 과정이고, 인가는 확인된 사용자가 어떤 리소스와 동작에 접근할 수 있는지 판단하는 과정이다."
date: 2026-08-04
updated: 2026-08-05
lastVerified: 2026-08-05
slug: "security/basic1"
aliases: []
commentKey: "/blog/security/basic1/"
category: "Spring Security"
tags:
    - Spring Security
    - Security
    - Authentication
    - Authorization

book: ""
series: ""
chapter: 1
heroImage: "/og-image.svg"
draft: false
---

## 1. 들어가기 전

회원만 게시글을 작성할 수 있고, 관리자만 공지를 삭제할 수 있는 서비스를 생각해보자. 서버는 요청을 처리하기 전에 서로 다른 두 가지 질문에 답할 수 있어야 한다.

- 요청을 보낸 사용자가 누구인가?
- 이 사용자가 요청한 작업을 수행해도 되는가?

첫 번째 질문에 답하는 과정이 **인증(Authentication)** 이고, 두 번째 질문에 답하는 과정이 **인가(Authorization)** 다.

Spring Security는 인증과 인가를 비롯해 웹 애플리케이션에서 필요한 여러 보안 기능을 제공한다. 그러나 내부 구조를 이해하려면 먼저 두 개념이 요청 처리 과정에서 어떤 역할을 맡는지 구분해야 한다.

Spring Security가 제공하는 전체 기능은 [Spring Security](https://docs.spring.io/spring-security/reference/index.html) 공식 문서에서 확인할 수 있다.

## 2. 인증은 사용자가 누구인지 확인한다

인증은 **요청을 보낸 사용자의 신원을 확인하는 과정**이다.

웹 애플리케이션은 다음과 같은 정보를 인증에 사용할 수 있다.

- 아이디와 비밀번호
- 세션을 식별하는 쿠키
- Access Token
- 인증서

로그인은 인증의 대표적인 예시다. 사용자가 아이디와 비밀번호를 전송하면 서버는 저장된 회원 정보와 비교해 해당 사용자가 누구인지 확인한다.

1. 아이디와 비밀번호 입력
2. 서버가 회원 정보 확인
3. 사용자 식별
4. 인증 결과 생성

인증에 성공하면 이후 요청 처리에서 사용할 수 있는 사용자 정보가 만들어진다. Spring Security에서는 인증된 사용자의 정보를 [**Authentication 객체**](https://docs.spring.io/spring-security/reference/servlet/authentication/architecture.html#servlet-authentication-authentication)로 표현한다.

> [!note] Authentication
> 
> `principal`: 사용자를 식별하는 정보이다. 아이디와 비밀번호로 인증하는 경우에는 일반적으로 [`UserDetails`](https://docs.spring.io/spring-security/reference/servlet/authentication/passwords/user-details.html#servlet-authentication-userdetails) 구현 객체가 저장된다.
>
> `credentials`: 사용자를 인증하는 데 사용된 정보로, 보통 비밀번호를 의미한다. 인증이 완료된 후에는 정보 유출을 방지하기 위해 이 값이 제거되는 경우가 많다.
>   
> `authorities`: 사용자에게 부여된 권한을 나타내는 [`GrantedAuthority`](https://docs.spring.io/spring-security/reference/servlet/authentication/architecture.html#servlet-authentication-granted-authority) 객체들의 목록이다. 대표적인 예로 역할(Role)과 범위(Scope)가 있다.

## 3. 인가는 접근 가능 여부를 판단한다

인가는 확인된 사용자가 특정 리소스나 동작에 접근할 수 있는지 판단하는 과정이다.

게시판을 예로 들면 다음과 같은 규칙을 적용할 수 있다.

- 게시글 조회: 모든 사용자에게 허용
- 게시글 작성: 로그인한 사용자에게 허용
- 게시글 수정: 작성자에게 허용
- 공지 삭제: 관리자에게 허용

> [!IMPORTANT]
> 인증 성공은 사용자의 신원을 확인했다는 뜻이다. 모든 리소스와 기능에 접근할 수 있다는 뜻은 아니다.

인가 판단에는 주로 다음 정보가 사용된다.

- 현재 사용자가 인증되었는가
- 사용자에게 어떤 역할이나 권한이 있는가
- 어떤 리소스에 접근하려는가
- 어떤 동작을 요청했는가
- 사용자와 리소스 사이에 어떤 관계가 있는가

Spring Security에서는 요청 단위와 메서드 단위로 인가 규칙을 적용할 수 있다. 이때 `AuthorizationManager`가 인증 정보와 보호 대상에 관한 정보를 받아 최종적인 접근 허용 여부를 판단한다.

구체적인 인가 구조는  [Authorization Architecture](https://docs.spring.io/spring-security/reference/servlet/authorization/architecture.html)에서 확인할 수 있다.

## 4. 요청에서는 인증 후 인가가 이어진다

```text
사용자 요청
→ 인증 정보 확인
→ 현재 사용자 식별
→ 접근 권한 판단
→ 요청 허용 또는 거부
```

인증과 인가는 서로 다른 과정이지만 연결되어 있다. 서버가 사용자의 역할이나 권한을 기준으로 인가하려면 먼저 현재 사용자를 식별해야 한다.

예를 들어 관리자 전용 페이지에 대한 요청은 다음과 같이 처리된다.

- 인증 정보가 없다면 현재 사용자를 식별할 수 없다.
- 일반 회원으로 인증되었다면 사용자는 식별되지만 관리자 권한이 없다.
- 관리자로 인증되었다면 필요한 권한을 확인하고 요청을 허용한다.

Spring Security에서는 이 관계를 다음과 같이 단순화할 수 있다.

```text
Authentication
→ SecurityContext에 보관
→ 인가 판단에서 조회
```

각 구성 요소의 역할은 다음과 같다.

- Authentication: 인증된 사용자와 권한 정보를 표현한다.
- SecurityContext: 현재 사용자의 인증 정보를 나타내는 Authentication을 담는다.
- SecurityContextHolder: 현재 실행 흐름의 SecurityContext에 접근할 수 있게 한다.
- AuthorizationManager: 인증 정보와 접근 규칙을 사용해 인가 여부를 판단한다.

![Spring Security 인증과 인가 흐름](adadada.png)


### 4.1 401 Unauthorized

401 Unauthorized는 대상 리소스에 필요한 **유효 인증 정보가 부족한 상태**를 나타낸다. 

예를 들어:

- 로그인하지 않는 사용자가 회원 전용 API를 요청한다.
- 만료되거나 잘못된 인증 정보를 전송한다.
- 서버가 요구하는 인증 방식을 사용하지 않았다.

HTTP 표준에서 401은 유효한 인증 자격 증명이 없다는 의미다. 이름에 Unauthorized가 들어가지만, 실제로는 인증이 필요하거나 제공된 인증 정보가 유효하지 않은 상황에 가깝다.

자세한 정의는 [RFC 9110의 401 Unauthorized](https://www.rfc-editor.org/rfc/rfc9110.html#name-401-unauthorized)에서 확인할 수 있다.

> [!note]
> Spring Security의 폼 로그인에서는 인증되지 않은 사용자를 로그인 페이지로 이동시킬 수 있다. REST API 에서는 일반적으로 401 응답을 사용한다. 실제 응답 방식은 애플리케이션의 로그인 방식과 보안 설정에 따라 달라진다.

### 4.2 403 Forbidden

403 Forbidden은 **서버가 요청을 이해했지만 처리를 거부한 상태**를 의미한다.

Spring Security에서 흔히 볼 수 있는 상황은 인증된 사용자가 필요한 권한을 가지고 있지 않은 경우다.

같은 인증 정보로 요청을 다시 보내더라도 권한이나 접근 조건이 달라지지 않으면 결과도 바뀌지 않는다.

자세한 정의는 [RFC 9110의 403 Forbidden](https://www.rfc-editor.org/rfc/rfc9110.html#name-403-forbidden)에서 확인할 수 있다.

| 구분       | 401 Unauthorized   | 403 Forbidden    |
| -------- | ------------------ | ---------------- |
| 요청 거부 이유 | 유효한 인증 정보가 부족함     | 서버가 요청 처리를 거부함   |
| 일반적인 사례  | 비로그인 사용자의 회원 전용 요청 | 일반 회원의 관리자 기능 요청 |
| 필요한 조치   | 인증 정보를 제공하거나 갱신    | 권한 또는 접근 조건 변경   |

> [!note]
> 403은 항상 인증된 사용자에게만 발생한다고 단정할 수는 없다. HTTP 표준상 서버가 요청을 거부하는 이유는 인증 정보 이외의 정책과도 관련될 수 있다. 다만 Spring Security의 일반적인 접근 제어 흐름에서는 인증된 사용자의 권한 부족을 설명할 때 주로 403을 사용한다.

## 5. 정리

인증은 요청을 보낸 사용자가 누구인지 확인하고, 인가는 확인된 사용자가 요청한 작업을 수행할 수 있는지 판단한다.

```text
인증: 누구인가?
인가: 무엇을 할 수 있는가?
```

- Authentication은 인증된 사용자 정보를 표현한다.
- SecurityContext는 현재 인증 결과를 담는다.
- 인가 과정은 인증 결과와 접근 규칙을 사용한다.
- 유효한 인증 정보가 부족한 상황은 401, 접근이 거부된 상황은 403으로 표현할 수 있다.

## 6. 참고 자료

- [Spring Security Reference](https://docs.spring.io/spring-security/reference/index.html)
- [Spring Security — Servlet Authentication Architecture](https://docs.spring.io/spring-security/reference/servlet/authentication/architecture.html)
- [Spring Security — Authorization Architecture](https://docs.spring.io/spring-security/reference/servlet/authorization/architecture.html)
- [Spring Security — Authorize HttpServletRequests](https://docs.spring.io/spring-security/reference/servlet/authorization/authorize-http-requests.html)
- [RFC 9110 — HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [MDN — 401 Unauthorized](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/401)
- [MDN — 403 Forbidden](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/403)
- [[Spring Security] 인증(Authentication), 인가(Authorization)](https://jaykaybaek.tistory.com/30)
- [Spring Security, 직접 구현하면서 이해해보자! — 인증과 인가](https://alstn113.tistory.com/50#%EC%9D%B8%EA%B0%80(Authorization)%20-%20Advanced-1-3)