---
title: "[Spring] 서블릿이란 무엇일까?"
description: "Jakarta Servlet이 HTTP 요청과 응답을 처리하는 방식, 서블릿 컨테이너의 생명주기와 동시 요청 처리, Spring MVC와의 관계를 알아본다."
date: 2026-06-11
updated: 2026-07-23
lastVerified: 2026-07-23
category: "Spring"
slug: "spring/servlet"
commentKey: "/blog/spring/servlet/"
tags:
    - Java
    - Servlet
    - Spring MVC
book: ""
chapter: 1
heroImage: "/og-image.svg"
draft: false
---

## 1. 서블릿은 무엇을 처리할까?

웹 애플리케이션은 클라이언트의 HTTP 요청을 읽고 서버의 처리 결과를 HTTP 응답으로 반환한다. Jakarta Servlet은 이 요청과 응답을 Java 코드로 다루기 위한 표준 API다.

다음 코드는 `GET /hello?username=world` 요청을 처리한다.

```java
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;

@WebServlet("/hello")
public class HelloServlet extends HttpServlet {

    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response
    ) throws IOException {
        String username = request.getParameter("username");

        response.setContentType("text/plain");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("hello " + username);
    }
}
```

`HttpServletRequest`는 HTTP 메서드, URI, 헤더, 파라미터와 본문 같은 요청 정보를 제공한다. `HttpServletResponse`는 상태 코드, 헤더, 콘텐츠 형식과 응답 본문을 작성할 수 있게 한다.

`HttpServlet`의 `service()`는 HTTP 메서드에 따라 `doGet()`, `doPost()` 같은 메서드로 요청을 전달한다. 일반적인 HTTP 서블릿은 `service()` 전체를 재정의하기보다 처리할 HTTP 메서드에 해당하는 `doXxx()`를 재정의한다.

Spring Boot에서 `@WebServlet`을 직접 탐색해 등록하려면 애플리케이션에 `@ServletComponentScan`을 선언할 수 있다.

```java
@ServletComponentScan
@SpringBootApplication
public class ServletApplication {

    public static void main(String[] args) {
        SpringApplication.run(
                ServletApplication.class,
                args
        );
    }
}
```

일반적인 Spring MVC 애플리케이션에서는 직접 작성한 서블릿보다 `DispatcherServlet`을 통해 요청을 처리한다. `DispatcherServlet`도 `HttpServlet`을 상속하므로 서블릿은 Spring MVC 요청 처리의 기반이다.

## 2. 서블릿 컨테이너가 생명주기를 관리한다

서블릿 클래스는 개발자가 `new`로 생성해 요청마다 호출하는 객체가 아니다. Tomcat과 같은 서블릿 컨테이너가 서블릿을 생성하고 초기화하며 URL 매핑에 맞는 요청을 전달한다.

```text
Client
    → HTTP 요청
    → Servlet Container
    → Servlet
    → HTTP 응답
```

서블릿의 기본 생명주기는 다음 메서드로 표현된다.

<!-- table-caption: 서블릿 생명주기 메서드 -->

| 메서드 | 호출 시점 | 역할 |
| --- | --- | --- |
| `init()` | 서블릿 인스턴스를 초기화할 때 | 초기화 작업 |
| `service()` | 요청을 처리할 때 | 요청과 응답 처리 |
| `destroy()` | 서블릿을 서비스에서 제거할 때 | 자원 정리 |

컨테이너는 서블릿을 초기화한 뒤 요청마다 `service()`를 호출한다. HTTP 서블릿에서는 `service()`가 요청 메서드에 맞는 `doGet()`이나 `doPost()`로 전달한다.

## 3. 같은 서블릿 인스턴스에 여러 요청이 들어올 수 있다

서블릿 컨테이너는 하나의 서블릿 인스턴스에 여러 요청을 동시에 전달할 수 있다. 요청은 서로 다른 스레드에서 처리될 수 있으므로 요청별 데이터를 인스턴스 필드에 저장하면 값이 섞일 수 있다.

```java
@WebServlet("/unsafe")
public class UnsafeServlet extends HttpServlet {

    private String name;

    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response
    ) throws IOException {
        name = request.getParameter("name");
        response.getWriter().write("hello " + name);
    }
}
```

사용자 A의 요청을 처리하는 동안 사용자 B가 `name`을 바꾸면 A의 응답에 B의 값이 사용될 수 있다.

요청마다 달라지는 값은 지역 변수에 둔다.

```java
@WebServlet("/safe")
public class SafeServlet extends HttpServlet {

    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response
    ) throws IOException {
        String name = request.getParameter("name");
        response.getWriter().write("hello " + name);
    }
}
```

지역 변수는 각 메서드 호출의 스택 프레임에 존재한다. 반면 인스턴스 필드는 같은 서블릿 객체를 사용하는 요청 스레드가 공유할 수 있다. 서블릿에 필드가 필요하다면 변경되지 않는 의존 객체나 동시 접근을 고려한 상태인지 확인해야 한다.

## 4. 요청과 응답은 Java 객체로 전달된다

### 4.1 요청 정보 조회

다음 요청을 예로 들 수 있다.

```http
GET /request?username=hello HTTP/1.1
Host: localhost:8080
User-Agent: Mozilla/5.0
```

`HttpServletRequest`에서 메서드, URI, 헤더와 파라미터를 조회한다.

```java
String method = request.getMethod();
String requestUri = request.getRequestURI();
String userAgent = request.getHeader("User-Agent");
String username = request.getParameter("username");
```

`getParameter()`는 URL 쿼리 파라미터와 `application/x-www-form-urlencoded` 형식의 폼 데이터를 조회할 때 사용한다.

JSON처럼 요청 본문에 직접 담긴 데이터는 문자 스트림이나 바이트 스트림으로 읽어야 한다.

```java
String requestBody = request.getReader()
        .lines()
        .collect(Collectors.joining("\n"));
```

이 코드는 `java.util.stream.Collectors` import를 생략한 일부 코드다. 순수 서블릿 코드에서는 본문을 읽은 뒤 JSON 라이브러리로 객체 변환과 오류 처리를 직접 구성해야 한다.

### 4.2 응답 작성

`HttpServletResponse`로 상태 코드와 헤더를 설정하고 본문을 작성할 수 있다.

```java
response.setStatus(HttpServletResponse.SC_OK);
response.setHeader("Cache-Control", "no-cache");
response.setContentType("application/json");
response.setCharacterEncoding("UTF-8");

response.getWriter().write("""
        {
            "message": "hello servlet"
        }
        """);
```

이 코드는 다음과 같은 응답을 만든다.

```http
HTTP/1.1 200 OK
Cache-Control: no-cache
Content-Type: application/json;charset=UTF-8

{
    "message": "hello servlet"
}
```

응답 본문을 작성한 뒤 버퍼가 커밋되면 상태 코드와 헤더를 변경할 수 없다. 응답을 여러 컴포넌트가 나누어 작성할 때는 어느 시점에 응답이 커밋되는지도 확인해야 한다.

## 5. 요청 처리 책임이 늘어나면 중복이 생긴다

서블릿만으로도 요청 파라미터 조회, 타입 변환, 비즈니스 로직 호출과 화면 이동을 구현할 수 있다.

```java
@WebServlet("/members/save")
public class MemberSaveServlet extends HttpServlet {

    private final MemberRepository memberRepository =
            MemberRepository.getInstance();

    @Override
    protected void doPost(
            HttpServletRequest request,
            HttpServletResponse response
    ) throws ServletException, IOException {
        String username = request.getParameter("username");
        int age = Integer.parseInt(
                request.getParameter("age")
        );

        Member member = new Member(username, age);
        memberRepository.save(member);

        request.setAttribute("member", member);
        request.getRequestDispatcher(
                "/WEB-INF/views/save-result.jsp"
        ).forward(request, response);
    }
}
```

이 예제의 `Member`와 `MemberRepository` 선언은 생략했다. 서블릿은 요청 해석, 타입 변환, 저장 호출, View 데이터 설정과 화면 이동을 모두 담당한다.

비슷한 기능이 늘어나면 파라미터 변환, 예외 처리와 View 선택 코드가 반복된다. MVC 구조는 요청 흐름을 Controller, Model과 View 역할로 나누고, 프론트 컨트롤러는 공통 요청 처리를 한 곳에 모은다.

## 6. DispatcherServlet도 서블릿이다

Spring MVC의 `DispatcherServlet`은 프론트 컨트롤러 역할을 하는 서블릿이다.

```text
Client
    → DispatcherServlet
    → Handler Mapping
    → Controller
    → View 또는 HTTP 응답
```

`DispatcherServlet`은 요청에 맞는 핸들러를 찾고, 핸들러 어댑터를 통해 컨트롤러를 호출한 뒤 결과를 View 렌더링이나 응답 본문 처리로 연결한다.

Spring MVC가 서블릿 API를 없애는 것은 아니다. 컨트롤러 메서드의 매개변수 바인딩, 검증, 메시지 변환과 예외 처리를 프레임워크가 담당해 애플리케이션 코드가 서블릿의 저수준 요청 처리 코드를 반복하지 않게 한다.

## 7. 정리

* Jakarta Servlet은 HTTP 요청과 응답을 Java 객체로 다루기 위한 표준 API다.
* 서블릿 컨테이너는 서블릿의 생성, 초기화, URL 매핑, 요청 호출과 제거 과정을 관리한다.
* 하나의 서블릿 인스턴스에 여러 요청이 동시에 들어올 수 있으므로 요청별 상태를 인스턴스 필드에 저장하지 않는다.
* `HttpServlet.service()`는 HTTP 메서드에 따라 `doGet()`, `doPost()` 같은 메서드로 요청을 전달한다.
* Spring MVC의 `DispatcherServlet`은 서블릿 기반 프론트 컨트롤러로 공통 요청 처리와 컨트롤러 호출 흐름을 구성한다.

## 8. 참고 자료

### 공식 자료

* [Jakarta Servlet 6.1 Specification](https://jakarta.ee/specifications/servlet/6.1/)
* [Jakarta Servlet 6.1 API - HttpServlet](https://jakarta.ee/specifications/servlet/6.1/apidocs/jakarta.servlet/jakarta/servlet/http/httpservlet)
* [Jakarta Servlet 6.1 API - HttpServletRequest](https://jakarta.ee/specifications/servlet/6.1/apidocs/jakarta.servlet/jakarta/servlet/http/httpservletrequest)
* [Jakarta Servlet 6.1 API - HttpServletResponse](https://jakarta.ee/specifications/servlet/6.1/apidocs/jakarta.servlet/jakarta/servlet/http/httpservletresponse)
* [Jakarta EE Tutorial - Jakarta Servlet](https://jakarta.ee/learn/docs/jakartaee-tutorial/current/web/servlets/servlets.html)
* [Spring Framework - DispatcherServlet](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-servlet.html)
* [Spring Boot API - ServletComponentScan](https://docs.spring.io/spring-boot/api/java/org/springframework/boot/web/servlet/ServletComponentScan.html)

### 한글 참고 링크

* [OpenMaru - WAS와 Java Servlet 동작 방식](https://www.openmaru.io/was-java-servlet%EC%84%9C%EB%B8%94%EB%A6%BF-%EB%8F%99%EC%9E%91-%EB%B0%A9%EC%8B%9D-%ED%95%9C%EB%88%88%EC%97%90-%EC%95%8C%EC%95%84%EB%B3%B4%EA%B8%B0/)
* [MangKyu's Diary - 서블릿과 서블릿 컨테이너](https://mangkyu.tistory.com/14)
