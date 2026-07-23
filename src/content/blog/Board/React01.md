---
title: "[Board] Thymeleaf 게시판을 React로 전환하려는 이유"
description: "SSR 게시판에 React와 JSON API를 점진적으로 도입하려는 목적, 기대 효과와 인증·보안 조건을 정리한다."
date: 2026-06-04
updated: 2026-07-23
lastVerified: 2026-07-23
category: "Board"
slug: "board/react01"
commentKey: "/blog/board/react01/"
tags:
    - Spring
    - Spring MVC
    - Thymeleaf
    - React
    - REST API
series: "thymeleaf-게시판을-react로-전환"
chapter: 2
heroImage: "/og-image.svg"
draft: false
---

## 1. Thymeleaf를 사용한 이유

Board 프로젝트는 Spring Boot와 Thymeleaf를 사용한 서버 사이드 렌더링 방식으로 시작했다. 목록, 상세, 작성과 수정 화면을 서버에서 렌더링하면 별도의 프론트엔드 프로젝트 없이 Spring MVC의 요청 처리 흐름을 끝까지 확인할 수 있다.

```text
브라우저 요청
→ Controller
→ Service와 Repository
→ Model에 화면 데이터 추가
→ Thymeleaf가 HTML 렌더링
→ 완성된 HTML 응답
```

이 구조는 잘못된 선택이 아니다. 서버가 HTML을 만드는 방식은 화면과 백엔드를 빠르게 연결하기에 적합하고, `@ModelAttribute`, 검증 오류, 리다이렉트와 세션 인증의 흐름을 학습하는 데도 유용했다.

전환을 검토한 이유는 Thymeleaf가 부족해서가 아니라 프로젝트에서 확인하려는 문제가 달라졌기 때문이다. 이제는 화면 렌더링보다 **HTTP API의 계약, 클라이언트 상태와 서버 책임의 경계**를 더 구체적으로 학습하려 한다.

## 2. Spring MVC는 HTML과 JSON을 모두 반환할 수 있다

Thymeleaf에서 React로 화면 기술을 바꾼다고 Spring MVC 자체를 버리는 것은 아니다. Spring MVC의 컨트롤러는 반환값에 따라 뷰를 선택할 수도 있고 응답 본문에 데이터를 직렬화할 수도 있다. 다음 코드는 두 구조를 비교하기 위해 import와 DTO 선언을 생략했다.

```java
@Controller
@RequiredArgsConstructor
public class PostViewController {

    private final PostQueryService postQueryService;

    @GetMapping("/posts/{postId}")
    public String detail(
            @PathVariable Long postId,
            Model model
    ) {
        model.addAttribute(
                "post",
                postQueryService.findDetail(postId)
        );
        return "post/detail";
    }
}
```

위 컨트롤러는 조회 결과를 `Model`에 담고 뷰 이름을 반환한다. 같은 서비스 결과를 JSON 응답으로 제공할 수도 있다.

```java
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/posts")
public class PostApiController {

    private final PostQueryService postQueryService;

    @GetMapping("/{postId}")
    public PostDetailResponse detail(
            @PathVariable Long postId
    ) {
        return postQueryService.findDetail(postId);
    }
}
```

`@RestController`는 반환값을 뷰 이름으로 해석하지 않고 `HttpMessageConverter`를 통해 응답 본문으로 직렬화한다. 두 컨트롤러는 표현 방식이 다르지만 같은 애플리케이션 서비스와 도메인 로직을 사용할 수 있다.

## 3. 전환에서 얻고 싶은 것

### 3.1 화면과 API 계약을 분리한다

SSR 컨트롤러는 화면 이름, `Model` 속성, 리다이렉트 경로를 함께 다룬다. JSON API는 상태 코드, 헤더, 응답 본문과 오류 형식으로 클라이언트와 계약을 맺는다.

API를 별도 경계로 두면 화면 템플릿의 변수명이 아니라 클라이언트가 관찰할 수 있는 HTTP 동작을 기준으로 테스트할 수 있다. 다만 공통 응답 래퍼를 사용한다고 자동으로 좋은 API가 되는 것은 아니다. 각 엔드포인트의 상태 코드, 본문 구조와 오류 의미가 먼저 명확해야 한다.

### 3.2 사용자 상호작용을 클라이언트에서 관리한다

React를 사용하면 화면 상태, 입력 상태, 로딩과 오류 표시, 일부 데이터 갱신을 클라이언트에서 관리할 수 있다. 사용자가 댓글을 등록할 때 전체 HTML 페이지를 다시 받는 대신 필요한 API를 호출하고 변경된 부분만 갱신하는 방식도 선택할 수 있다.

이 변화는 무조건 더 빠르다는 뜻이 아니다. 초기 JavaScript 로딩, API 호출 횟수, 상태 관리 복잡도와 캐시 정책에 따라 결과가 달라진다. 전환의 목적은 성능을 단정하는 것이 아니라 클라이언트 상태와 서버 API의 책임을 직접 설계해 보는 데 있다.

### 3.3 다른 클라이언트에서도 사용할 수 있는 경계를 만든다

HTML 응답은 특정 화면 구조와 강하게 연결된다. JSON API는 웹 화면 외의 클라이언트도 같은 기능을 호출할 수 있는 경계가 될 수 있다.

그러나 컨트롤러에 `@RestController`를 붙였다고 REST 제약을 자동으로 충족하거나 프론트엔드와 백엔드가 완전히 분리되는 것은 아니다. URL, HTTP 메서드, 상태 코드, 캐시와 오류 계약을 함께 설계해야 하며, 배포와 저장소를 실제로 분리할지도 별도의 선택이다.

## 4. 세션 인증을 유지할 때 확인할 조건

React를 도입하기 위해 인증 방식을 반드시 JWT로 바꿀 필요는 없다. 브라우저 기반 애플리케이션은 기존 세션 인증을 유지하면서 JSON API를 사용할 수 있다.

같은 출처에서 화면과 API를 제공하면 브라우저가 세션 쿠키를 자연스럽게 전송한다. React 개발 서버와 Spring 서버처럼 출처가 달라지면 다음 조건을 함께 검토해야 한다.

* 허용할 출처, HTTP 메서드와 헤더를 CORS 정책에 명시한다.
* 쿠키를 포함한 요청이 필요하면 클라이언트와 서버 양쪽에서 자격 증명 전송 조건을 맞춘다.
* CORS 사전 요청에는 세션 쿠키가 없으므로 Spring Security보다 CORS 처리가 먼저 이루어져야 한다.
* 세션 쿠키로 인증하는 브라우저 요청은 상태 변경 요청에 대한 CSRF 보호를 계속 고려해야 한다.
* 쿠키의 `SameSite`, `Secure`, `HttpOnly`와 도메인·경로 설정을 실제 배포 구조에 맞춘다.

CORS는 인증 방식이 아니고 CSRF를 대신하지도 않는다. 세션, CORS와 CSRF는 해결하는 문제가 서로 다르므로 각각의 조건을 확인해야 한다.

## 5. 한 번에 교체하지 않는 이유

기존 SSR 화면과 새 API는 Spring MVC 안에서 함께 운영할 수 있다. 따라서 모든 화면을 한 번에 제거하기보다 기능 단위로 다음 순서를 적용한다.

1. 기존 화면의 입력, 출력과 권한 조건을 확인한다.
2. 같은 유스케이스를 제공하는 API 계약을 정의한다.
3. API 컨트롤러 테스트와 서비스 테스트로 동작을 검증한다.
4. React 화면에서 API를 연결하고 기존 화면과 기능 차이를 확인한다.
5. 인증, 오류 처리와 사용자 흐름이 같아진 뒤 기존 화면의 제거 여부를 결정한다.

점진적 전환은 코드를 일시적으로 중복시킬 수 있다. 이를 줄이려면 View Controller와 API Controller에 비즈니스 규칙을 복사하지 않고 같은 서비스와 도메인 객체를 사용해야 한다. 두 컨트롤러는 입력 변환과 표현 형식의 차이를 담당한다.

## 6. 현재 선택한 방향

현재 목표는 SSR 구조를 잘못된 구조로 규정하거나 처음부터 완전히 분리된 시스템을 만드는 것이 아니다.

* 동작 중인 Thymeleaf 화면은 API가 검증될 때까지 유지한다.
* 조회와 변경 유스케이스를 JSON API로 점진적으로 노출한다.
* 인증은 세션 방식을 유지하고 브라우저 보안 조건을 함께 검증한다.
* View Controller와 API Controller는 분리하되 서비스와 도메인 규칙은 공유한다.
* 최종 구조는 구현과 테스트 결과를 기준으로 조정한다.

이 선택을 통해 기존 Spring MVC 학습 결과를 버리지 않으면서 API 계약과 클라이언트 상태 관리라는 새로운 문제를 단계적으로 확인할 수 있다.

## 7. 정리

* Thymeleaf SSR은 Spring MVC의 요청, 검증과 화면 렌더링 흐름을 학습하기에 적합한 구조다.
* React 전환의 핵심은 단순한 화면 기술 교체가 아니라 HTML 뷰와 JSON API 계약의 경계를 설계하는 데 있다.
* `@RestController`를 사용한다고 자동으로 RESTful하거나 완전히 분리된 아키텍처가 되지는 않는다.
* 세션 인증을 유지한 채 React를 사용할 수 있지만 CORS, 쿠키와 CSRF 조건을 배포 구조에 맞게 검토해야 한다.
* 기존 SSR 화면과 API를 함께 운영하면서 기능 단위로 검증하는 점진적 전환이 위험을 줄인다.

## 8. 참고 자료

### 공식 자료

* [Spring Framework — @ResponseBody](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/responsebody.html)
* [Spring Framework — CORS](https://docs.spring.io/spring-framework/reference/web/webmvc-cors.html)
* [Spring Security — CORS](https://docs.spring.io/spring-security/reference/servlet/integrations/cors.html)
* [Spring Security — Cross Site Request Forgery](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html)
* [Spring Security — Authentication Persistence and Session Management](https://docs.spring.io/spring-security/reference/servlet/authentication/session-management.html)
