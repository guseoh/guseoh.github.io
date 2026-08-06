---
title: "ResponseEntity란 무엇일까?"
description: "Spring MVC에서 ResponseEntity가 HTTP 상태 코드, 헤더와 본문을 함께 표현하는 방식과 사용 기준을 정리한다."
date: 2026-06-09
updated: 2026-08-06
lastVerified: 2026-07-23
slug: "spring/responseentity"
aliases: []
commentKey: "/blog/spring/responseentity/"
category: "Spring"
tags:
    - Spring
    - Spring MVC
    - REST API
    - HTTP
heroImage: "/og-image.svg"
draft: false
---

## 1. 들어가기 전

Spring MVC로 HTTP API를 만들다 보면 컨트롤러에서 다음과 같은 반환 코드를 자주 보게 된다.

```java
return ResponseEntity.ok(response);
```

`ResponseEntity`는 데이터를 한 번 더 감싸는 용도의 객체가 아니다. HTTP 응답을 구성하는 **상태 코드**, **헤더**, **본문**을 하나의 반환값으로 표현한다.

응답 본문에 회원 정보가 담겼더라도 상태 코드에 따라 클라이언트가 해석해야 할 결과는 달라진다. 요청이 정상적으로 처리되었는지, 새 리소스가 생성되었는지, 본문 없이 처리가 끝났는지를 HTTP 응답에 함께 나타내야 한다.

## 2. ResponseEntity가 표현하는 HTTP 응답

Spring Framework의 `ResponseEntity<T>`는 `HttpEntity<T>`를 상속하고 상태 코드를 추가한 클래스다.

```java
public class ResponseEntity<T> extends HttpEntity<T>
```

`HttpEntity<T>`는 헤더와 본문을 보관한다. `ResponseEntity<T>`는 여기에 `HttpStatusCode` 타입의 상태 코드를 더한다.

```text
ResponseEntity<T>
├─ status code
├─ headers
└─ body: T
```

제네릭 타입 `T`는 응답 본문의 타입을 나타낸다. `ResponseEntity<MemberResponse>`라면 본문에 `MemberResponse`가 들어갈 수 있다는 뜻이다.

컨트롤러가 `ResponseEntity`를 반환하면 Spring MVC는 다음 정보를 HTTP 응답에 반영한다.

1. 상태 코드를 응답 상태 줄에 설정한다.
2. `HttpHeaders`에 담긴 값을 응답 헤더에 작성한다.
3. 본문은 등록된 `HttpMessageConverter`를 사용해 JSON 같은 표현으로 변환한다.

예를 들어 다음 코드는 `201 Created`, `Location` 헤더와 문자열 본문을 함께 반환한다.

```java
@RequestMapping("/handle")
public ResponseEntity<String> handle() {
    URI location = URI.create("/members/1");

    return ResponseEntity.created(location)
            .header("MyResponseHeader", "MyValue")
            .body("Hello World");
}
```

생성자를 직접 호출할 수도 있지만, `ok()`, `created()`, `status()` 같은 정적 메서드를 사용하면 상태 코드와 응답 구성이 코드에 바로 드러난다.

## 3. @ResponseBody와 무엇이 다를까?

`@ResponseBody`는 컨트롤러 메서드의 반환값을 HTTP 응답 본문에 작성하도록 지시한다. Java 객체를 반환하면 `HttpMessageConverter`가 요청의 미디어 타입과 설정에 맞는 표현으로 변환한다.

```java
@GetMapping("/members/{id}")
@ResponseBody
public MemberResponse findMember(@PathVariable Long id) {
    return memberService.find(id);
}
```

`@RestController`는 `@Controller`와 `@ResponseBody`의 성격을 함께 가진다. 따라서 `@RestController`의 메서드는 객체를 바로 반환해도 해당 객체가 응답 본문으로 처리된다.

```java
@RestController
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    @GetMapping("/members/{id}")
    public MemberResponse findMember(@PathVariable Long id) {
        return memberService.find(id);
    }
}
```

상태 코드나 헤더까지 메서드의 반환값으로 정하려면 `ResponseEntity`를 사용한다.

```java
@PostMapping("/members")
public ResponseEntity<MemberResponse> createMember(
        @RequestBody CreateMemberRequest request
) {
    MemberResponse response = memberService.create(request);
    URI location = URI.create("/members/" + response.id());

    return ResponseEntity.created(location)
            .body(response);
}
```

<!-- table-caption: @ResponseBody와 ResponseEntity의 역할 비교 -->

| 구분 | 주로 표현하는 범위 |
| --- | --- |
| 객체 반환 또는 `@ResponseBody` | 응답 본문 |
| `ResponseEntity<T>` | 상태 코드, 헤더, 응답 본문 |

둘 중 하나가 항상 더 좋은 것은 아니다. 별도의 상태 코드나 헤더가 필요하지 않다면 객체를 바로 반환할 수 있고, 응답의 세 요소를 함께 제어해야 한다면 `ResponseEntity`가 적합하다.

## 4. 상태 코드와 응답 의미를 맞춘다

`ResponseEntity`는 자주 사용하는 응답을 만들기 위한 정적 메서드를 제공한다.

| 메서드 | 상태 코드 | 주로 나타내는 결과 |
| --- | --- | --- |
| `ok()` | `200 OK` | 요청을 정상적으로 처리하고 본문을 반환함 |
| `created(location)` | `201 Created` | 새 리소스를 생성함 |
| `accepted()` | `202 Accepted` | 처리를 접수했지만 아직 완료되지 않음 |
| `noContent()` | `204 No Content` | 요청을 처리했으며 보낼 본문이 없음 |
| `badRequest()` | `400 Bad Request` | 요청 형식이나 값이 유효하지 않음 |
| `notFound()` | `404 Not Found` | 대상 리소스를 찾지 못함 |
| `status(status)` | 지정한 상태 코드 | 다른 상태 코드를 직접 지정함 |

메서드 이름만 보고 상태 코드를 고르기보다 실제 처리 결과와 HTTP 의미가 일치하는지 확인해야 한다.

### 4.1 201 Created와 Location 헤더

`201 Created`는 요청 처리 결과 하나 이상의 리소스가 생성되었음을 나타낸다. RFC 9110은 주로 생성된 리소스를 `Location` 헤더나 요청 대상 URI로 식별하도록 정의한다.

Spring의 `created(location)`은 `201 Created` 응답 빌더를 만들고 전달한 URI를 `Location` 헤더에 설정한다.

```java
URI location = URI.create("/members/1");

return ResponseEntity.created(location)
        .body(memberResponse);
```

### 4.2 204 No Content에는 본문이 없다

`204 No Content`는 서버가 요청을 성공적으로 처리했으며 응답에 추가 콘텐츠가 없다는 뜻이다. 본문을 함께 반환해야 한다면 `204`가 아닌 다른 성공 상태가 요청 결과에 더 적합한지 검토해야 한다.

```java
@DeleteMapping("/members/{id}")
public ResponseEntity<Void> deleteMember(@PathVariable Long id) {
    memberService.delete(id);
    return ResponseEntity.noContent().build();
}
```

본문이 없으므로 제네릭 타입으로 `Void`를 사용하고 `build()`로 응답을 완성했다.

### 4.3 응답 본문 타입을 명시한다

제네릭 타입을 생략한 원시 타입은 응답 본문의 타입 정보를 잃는다.

```java
// 피해야 할 원시 타입
public ResponseEntity getMember() {
    // ...
}
```

본문이 있다면 `ResponseEntity<MemberResponse>`, 없다면 `ResponseEntity<Void>`처럼 타입을 명시한다. 컴파일러와 호출 코드를 읽는 개발자가 응답 본문의 형태를 확인할 수 있다.

## 5. 정리

- `ResponseEntity<T>`는 Spring MVC 컨트롤러에서 HTTP 상태 코드, 헤더와 본문을 하나의 반환값으로 표현한다.
- 응답 본문은 `HttpMessageConverter`가 변환하며 제네릭 타입 `T`는 변환할 Java 타입을 나타낸다.
- 객체만 반환해도 응답 본문을 만들 수 있지만 상태 코드나 헤더를 함께 지정해야 할 때 `ResponseEntity`가 적합하다.
- `201 Created`와 `Location`, `204 No Content`처럼 실제 처리 결과에 맞는 HTTP 의미를 먼저 선택해야 한다.

## 6. 참고 자료

### 공식 자료

* [Spring Framework Reference - ResponseEntity](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/responseentity.html)
* [Spring Framework API - ResponseEntity](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/http/ResponseEntity.html)
* [Spring Framework Reference - @ResponseBody](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/responsebody.html)
* [RFC 9110 - HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)

### 한글 참고 링크

* [Tecoble - ResponseEntity: Spring Boot에서 Response를 만들자](https://tecoble.techcourse.co.kr/post/2021-05-10-response-entity/)
