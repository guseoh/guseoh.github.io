---
title: "자바의 클래스와 객체는 무엇일까?"
description: "자바에서 클래스가 새로운 타입과 객체의 공통 구조를 정의하고, new 표현식으로 객체가 생성되는 과정을 알아본다."
date: 2026-06-16
updated: 2026-07-23
lastVerified: 2026-07-23
slug: "java/클래스와-객체/classandobject"
aliases: []
commentKey: "/blog/java/클래스와-객체/classandobject/"
category: "Java"
tags:
    - Java
    - Class
    - Object
testedWith:
    java: "17"
book: ""
chapter: 1
heroImage: "/og-image.svg"
draft: false
---

## 1. 들어가기 전

자바 프로그램에서는 클래스를 선언하고, 그 클래스를 기반으로 객체를 만들어 사용한다.

```java
Member member = new Member();
```

이 코드에는 클래스, 타입, 객체와 참조 변수라는 개념이 함께 들어 있다.

* `Member`는 개발자가 선언한 클래스이자 변수의 타입이다.
* `new Member()`는 실행 중에 새로운 `Member` 객체를 만든다.
* `member`에는 생성된 객체에 접근할 참조값이 저장된다.

참조형 변수와 참조값의 차이는 [자바의 기본형과 참조형은 무엇일까?](/blog/java/기본형과참조형/java_type/)에서 설명했다. 이 글에서는 클래스가 무엇을 정의하고 객체가 어떻게 생성되는지, 객체와 인스턴스라는 표현이 어떤 관계인지에 집중한다.

## 2. 클래스는 새로운 타입을 정의한다

자바에서는 `class` 키워드로 클래스를 선언한다.

```java
class Member {
}
```

이 선언으로 프로그램에서 사용할 `Member`라는 클래스 타입이 만들어진다.

```java
Member member;
```

`Member`는 타입이고 `member`는 변수 이름이다. `int`, `long`, `boolean`은 자바가 미리 제공하는 기본형 타입이며, `Member`는 개발자가 클래스 선언으로 만든 참조형 타입이다.

회원, 게시글과 댓글을 서로 다른 개념으로 다루려면 각각 별도의 클래스로 표현할 수 있다.

```java
class Member {
}

class Post {
}

class Comment {
}
```

```java
Member member;
Post post;
Comment comment;
```

타입이 다르면 컴파일러가 허용하는 값과 메서드 호출도 달라진다. 클래스는 프로그램에서 다루는 개념을 이름과 타입으로 구분하는 역할을 한다.

### 2.1 클래스는 객체의 상태와 행동을 함께 정의한다

클래스 안에는 같은 종류의 객체가 가질 상태와 행동을 선언할 수 있다.

```java
class Member {

    String name;

    void changeName(String newName) {
        name = newName;
    }
}
```

`Member` 클래스를 기반으로 생성되는 객체는 `name`이라는 상태를 가지며 `changeName()`으로 이름을 변경할 수 있다.

클래스는 단순히 필드 목록을 모아 놓은 구조가 아니다. 객체가 어떤 값을 기억하고 그 값을 이용해 어떤 작업을 수행할 수 있는지를 하나의 타입으로 정의한다.

### 2.2 설계도 비유가 설명하지 못하는 부분

클래스는 객체를 만들기 위한 설계도에 자주 비유된다. 하나의 설계도로 여러 제품을 만들듯이 하나의 클래스로 여러 객체를 만들 수 있다는 관계를 설명하기에는 유용하다.

다만 클래스의 역할은 객체 생성에만 머물지 않는다. 클래스 선언은 자바 프로그램에서 사용할 타입을 만들고, 필드와 메서드의 접근 규칙을 정하며, 상속과 인터페이스 구현 같은 타입 관계의 기준이 된다.

따라서 클래스는 **객체의 공통 구조와 행동을 정의하는 동시에 프로그램에서 사용할 새로운 타입을 선언하는 문법**으로 이해할 수 있다.

## 3. 객체는 클래스의 정의를 바탕으로 생성된다

클래스를 선언했다고 객체가 바로 만들어지는 것은 아니다.

```java
class Member {
}
```

이 코드는 `Member` 타입을 정의한다. 실제 객체는 클래스 인스턴스 생성 표현식이 실행될 때 만들어진다.

```java
new Member();
```

생성된 객체를 이후 코드에서 사용하려면 참조 변수를 연결한다.

```java
Member member = new Member();
```

이 코드는 다음 과정으로 나눌 수 있다.

```text
Member          member          =          new Member();
타입            변수 이름                  객체 생성
```

오른쪽의 `new Member()`가 객체를 만들고, 객체에 접근할 참조값이 왼쪽의 `member` 변수에 저장된다. 참조 변수와 객체는 같은 대상이 아니다. `member`는 객체를 가리키는 변수이고, 실제 객체는 `new` 표현식으로 생성된 실행 중의 대상이다.

### 3.1 하나의 클래스로 여러 객체를 만들 수 있다

같은 클래스를 기반으로 객체를 여러 개 만들 수 있다.

```java
Member firstMember = new Member();
Member secondMember = new Member();
Member thirdMember = new Member();
```

`Member` 클래스는 하나지만 `new Member()`가 세 번 실행되었으므로 서로 다른 객체가 세 개 생성된다.

```java
firstMember.name = "kim";
secondMember.name = "lee";
thirdMember.name = "park";

System.out.println(firstMember.name);  // kim
System.out.println(secondMember.name); // lee
System.out.println(thirdMember.name);  // park
```

세 객체는 같은 필드와 메서드 선언을 따르지만 각 객체가 보관하는 상태는 독립적이다. `firstMember`의 이름을 바꾸어도 다른 객체의 이름은 바뀌지 않는다.

### 3.2 객체는 실행 중의 개별 대상을 나타낸다

게시판 프로그램에서 `Member` 클래스는 회원 객체의 공통 정의를 제공하고, 각 `Member` 객체는 개별 회원을 나타낼 수 있다.

```java
Member member = new Member();
Post post = new Post();
Comment comment = new Comment();
```

프로그램은 이렇게 생성된 객체가 자신의 상태를 관리하고 다른 객체와 메서드를 호출하며 동작하도록 구성된다. 클래스는 공통 정의를 제공하고, 객체는 그 정의를 바탕으로 실행 중에 존재하는 개별 대상이다.

## 4. 객체와 인스턴스는 관점이 다르다

다음 코드로 생성된 대상을 객체라고 부를 수도 있고 인스턴스라고 부를 수도 있다.

```java
Member member = new Member();
```

**객체(Object)** 는 프로그램 실행 중 만들어진 대상을 일반적으로 가리키는 표현이다. **인스턴스(Instance)** 는 그 객체가 어떤 클래스나 타입을 바탕으로 만들어졌는지에 초점을 맞춘 표현이다.

<!-- table-caption: 객체와 인스턴스의 표현 차이 -->

| 구분 | 객체 | 인스턴스 |
| --- | --- | --- |
| 강조점 | 실행 중 존재하는 대상 | 클래스와 객체의 관계 |
| 표현 | `Member` 객체 | `Member` 클래스의 인스턴스 |

`new Member()`로 만들어진 대상은 하나의 객체이며, `Member` 클래스와의 관계에서는 `Member`의 인스턴스다.

```text
Member 객체를 생성했다.
Member 클래스의 인스턴스를 생성했다.
Member 클래스를 인스턴스화했다.
```

세 표현은 같은 생성 과정을 가리키지만 강조점이 다르다. 객체는 생성된 대상을, 인스턴스는 그 대상과 클래스의 관계를 강조한다.

## 5. 정리

* 클래스는 객체의 공통 상태와 행동을 정의하면서 자바 프로그램에서 사용할 새로운 참조형 타입을 만든다.
* 클래스 선언만으로 객체가 생성되지는 않으며 `new` 표현식이 실행될 때 새로운 객체가 만들어진다.
* 참조 변수는 객체 자체가 아니라 생성된 객체에 접근하기 위한 참조값을 저장한다.
* 하나의 클래스로 여러 객체를 만들 수 있고 각 객체의 인스턴스 상태는 서로 독립적이다.
* 객체는 실행 중의 대상을 가리키고 인스턴스는 그 객체와 특정 클래스의 관계를 강조하는 표현이다.

## 6. 참고 자료

### 공식 자료

* [Java Language Specification 26 - Classes](https://docs.oracle.com/javase/specs/jls/se26/html/jls-8.html)
* [Java Language Specification 26 - Class Instance Creation Expressions](https://docs.oracle.com/javase/specs/jls/se26/html/jls-15.html#jls-15.9)
* [Dev.java - Creating Classes](https://dev.java/learn/classes-objects/creating-classes/)
* [Dev.java - Creating and Using Objects](https://dev.java/learn/classes-objects/creating-objects/)

### 한글 참고 링크

* [우아한형제들 기술블로그 - 생각하라, 객체지향처럼](https://techblog.woowahan.com/2502/)
* [Inpa Dev - 자바 객체 지향 클래스 문법 총정리](https://inpa.tistory.com/entry/JAVA-%E2%98%95-%EA%B0%9D%EC%B2%B4-%EC%A7%80%ED%96%A5OOP-%ED%81%B4%EB%9E%98%EC%8A%A4-%EB%AC%B8%EB%B2%95-%F0%9F%92%AF-%EC%B4%9D%EC%A0%95%EB%A6%AC)
* [MangKyu's Diary - 객체에게 역할과 책임을 부여하는 객체 지향 프로그래밍](https://mangkyu.tistory.com/400)
