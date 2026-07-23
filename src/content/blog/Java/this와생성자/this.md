---
title: "자바의 this와 생성자는 무엇일까?"
description: "자바 생성자가 객체의 초기 상태를 만드는 방식과 기본 생성자, this와 this()의 역할을 알아본다."
date: 2026-06-18
updated: 2026-07-23
lastVerified: 2026-07-23
slug: "java/this와생성자/this"
aliases: []
commentKey: "/blog/java/this와생성자/this/"
category: "Java"
tags:
    - Java
    - Constructor
    - this
testedWith:
    java: "17"
book: ""
chapter: 1
heroImage: "/og-image.svg"
draft: false
---

## 1. 들어가기 전

필드만 선언한 클래스는 객체를 만든 뒤 필요한 값을 따로 대입해야 한다.

```java
Member member = new Member();
member.email = "member@example.com";
member.nickname = "guseoh";
```

값을 빠뜨리거나 잘못된 순서로 설정하면 불완전한 객체가 만들어질 수 있다. 생성자(Constructor)는 객체가 생성되는 시점에 필요한 값을 받아 초기 상태를 완성한다.

```java
Member member = new Member(
        "member@example.com",
        "guseoh"
);
```

`this`는 현재 생성자나 인스턴스 메서드가 실행되고 있는 객체 자신을 가리킨다. `this()`는 같은 클래스의 다른 생성자를 호출한다. 이름은 비슷하지만 역할은 다르다.

## 2. 생성자는 객체의 초기 상태를 만든다

생성자는 클래스와 같은 이름을 사용하고 반환 타입을 작성하지 않는다.

```java
class Member {

    private String email;
    private String nickname;

    Member(String email, String nickname) {
        this.email = email;
        this.nickname = nickname;
    }
}
```

`new Member("member@example.com", "guseoh")`가 실행되면 인자의 개수와 타입에 맞는 생성자가 호출된다. 생성자는 전달받은 값을 필드에 저장하여 객체의 초기 상태를 만든다.

반환 타입을 작성하면 생성자가 아니라 일반 메서드가 된다.

```java
void Member(String email) {
    // Member라는 이름의 일반 메서드다.
}
```

### 2.1 필수 값을 생성자에 드러낸다

이메일과 닉네임을 받는 생성자만 제공하면 두 값을 전달하지 않고는 객체를 만들 수 없다.

```java
Member member = new Member(
        "member@example.com",
        "guseoh"
);
```

생성자 선언을 보면 객체를 만드는 데 어떤 값이 필요한지 알 수 있다. 객체를 생성한 뒤 여러 필드를 순서대로 설정하는 방식보다 빠진 값을 발견하기 쉽다.

### 2.2 생성자에서 초기값을 검증한다

객체가 처음부터 지켜야 할 조건은 생성자에서 확인할 수 있다.

```java
class Member {

    private final String email;
    private final String nickname;

    Member(String email, String nickname) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException(
                    "이메일은 비어 있을 수 없습니다."
            );
        }

        if (nickname == null || nickname.isBlank()) {
            throw new IllegalArgumentException(
                    "닉네임은 비어 있을 수 없습니다."
            );
        }

        this.email = email;
        this.nickname = nickname;
    }
}
```

조건을 만족하지 않는 값이 전달되면 객체 생성이 완료되지 않는다. 생성자에서 검증한 규칙은 이후 상태 변경 메서드에서도 같은 기준으로 유지해야 한다.

생성자에는 필드 초기화와 객체 자체의 간단한 검증을 둔다. 외부 API 호출이나 파일 읽기처럼 오래 걸리고 실패 원인이 많은 작업까지 넣으면 객체 생성 비용과 실패 시점을 예상하기 어려워진다.

## 3. 기본 생성자는 생성자를 선언하지 않았을 때만 제공된다

클래스에 생성자를 하나도 선언하지 않으면 컴파일러는 매개변수가 없는 생성자를 자동으로 제공한다. 이를 기본 생성자(Default Constructor)라고 한다.

```java
class Member {
}
```

컴파일러가 개념적으로 다음 생성자를 제공한다.

```java
Member() {
}
```

개발자가 생성자를 하나라도 선언하면 기본 생성자는 자동으로 제공되지 않는다.

```java
class Member {

    Member(String email) {
    }
}
```

```java
// 컴파일 오류: Member() 생성자가 없다.
Member member = new Member();
```

매개변수가 없는 생성자가 필요하다면 직접 선언해야 한다.

```java
class Member {

    Member() {
    }

    Member(String email) {
    }
}
```

직접 작성한 `Member()`는 매개변수가 없는 생성자지만, 컴파일러가 자동 생성한 기본 생성자와는 구분된다.

## 4. this는 현재 객체를 가리킨다

필드와 매개변수의 이름이 같으면 가까운 범위의 매개변수가 우선한다.

```java
Member(String email) {
    email = email;
}
```

이 코드는 매개변수 `email`에 같은 값을 다시 대입할 뿐 객체의 필드를 변경하지 않는다.

현재 객체의 필드임을 명시하려면 `this`를 사용한다.

```java
Member(String email) {
    this.email = email;
}
```

왼쪽의 `this.email`은 현재 객체의 필드이고 오른쪽의 `email`은 생성자로 전달된 매개변수다.

인스턴스 메서드에서도 `this`는 현재 호출 대상 객체를 가리킨다.

```java
void changeNickname(String nickname) {
    this.nickname = nickname;
}
```

필드와 매개변수 이름이 다르면 `this`를 생략할 수 있다.

```java
void changeNickname(String newNickname) {
    nickname = newNickname;
}
```

현재 객체 자체를 다른 메서드의 인자로 전달할 수도 있다.

```java
registry.add(this);
```

`static` 메서드는 특정 객체를 대상으로 실행되지 않으므로 `this`를 사용할 수 없다.

## 5. this()는 같은 클래스의 다른 생성자를 호출한다

여러 생성자가 같은 검증과 필드 초기화를 반복하면 초기화 규칙이 여러 곳에 흩어진다. `this()`를 사용하면 한 생성자에서 같은 클래스의 다른 생성자를 호출할 수 있다.

```java
class Member {

    private final String email;
    private final String nickname;
    private final int loginCount;

    Member() {
        this("guest@example.com", "guest", 0);
    }

    Member(String email, String nickname) {
        this(email, nickname, 0);
    }

    Member(String email, String nickname, int loginCount) {
        validateEmail(email);
        validateNickname(nickname);

        this.email = email;
        this.nickname = nickname;
        this.loginCount = loginCount;
    }

    private static void validateEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException(
                    "이메일은 비어 있을 수 없습니다."
            );
        }
    }

    private static void validateNickname(String nickname) {
        if (nickname == null || nickname.isBlank()) {
            throw new IllegalArgumentException(
                    "닉네임은 비어 있을 수 없습니다."
            );
        }
    }
}
```

매개변수가 적은 생성자는 기본값을 보충한 뒤 세 값을 받는 생성자에 초기화를 맡긴다. 검증과 필드 대입이 한 생성자에 모이므로 규칙을 변경할 위치도 줄어든다.

<!-- table-caption: this와 this()의 차이 -->

| 표현 | 의미 |
| --- | --- |
| `this` | 현재 객체 자신 |
| `this.field` | 현재 객체의 필드 |
| `this.method()` | 현재 객체의 인스턴스 메서드 호출 |
| `this(...)` | 같은 클래스의 다른 생성자 호출 |

생성자 호출은 순환할 수 없다.

```java
class Member {

    Member() {
        this("guest");
    }

    Member(String nickname) {
        this();
    }
}
```

두 생성자가 서로를 반복해서 호출하므로 컴파일 오류가 발생한다. 생성자 연결은 실제 필드 초기화를 수행하는 생성자에서 끝나야 한다.

## 6. 정리

* 생성자는 객체가 생성될 때 필요한 값을 전달받아 필드를 초기화하고 처음부터 유효한 상태를 만들 수 있다.
* 클래스에 생성자를 하나도 선언하지 않았을 때만 컴파일러가 매개변수 없는 기본 생성자를 제공한다.
* `this`는 현재 객체 자신을 가리키며 필드와 매개변수의 이름이 같을 때 대상을 구분한다.
* `this()`는 같은 클래스의 다른 생성자를 호출하여 검증과 필드 초기화의 중복을 줄인다.
* 생성자 연결은 순환할 수 없으며 결국 실제 초기화를 수행하는 생성자에서 끝나야 한다.

## 7. 참고 자료

### 공식 자료

* [Java Language Specification 26 - Constructor Declarations](https://docs.oracle.com/javase/specs/jls/se26/html/jls-8.html#jls-8.8)
* [Java Language Specification 26 - Class Instance Creation Expressions](https://docs.oracle.com/javase/specs/jls/se26/html/jls-15.html#jls-15.9)
* [Dev.java - Providing Constructors for Your Classes](https://dev.java/learn/classes-objects/constructors/)
* [Dev.java - More on Classes](https://dev.java/learn/classes-objects/more-on-classes/)

### 한글 참고 링크

* [Tecoble - 생성자는 몇 개까지 만들어도 될까?](https://tecoble.techcourse.co.kr/post/2021-05-17-constructor/)
* [MangKyu's Diary - 생성자 대신 정적 팩토리 메서드를 고려하라](https://mangkyu.tistory.com/125)
