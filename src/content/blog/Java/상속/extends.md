---
title: "자바의 상속은 무엇일까?"
description: "자바 상속이 타입 관계를 만드는 방식과 extends, 생성자 연결, 메서드 오버라이딩, 설계 시 확인할 조건을 알아본다."
date: 2026-06-25
updated: 2026-07-23
lastVerified: 2026-07-23
slug: "java/상속/extends"
aliases: []
commentKey: "/blog/java/상속/extends/"
category: "Java"
tags:
    - Java
    - OOP
    - Inheritance
    - extends
    - super
testedWith:
    java: "17"
book: ""
chapter: 1
heroImage: "/og-image.svg"
draft: false
---

## 1. 상속은 어떤 관계를 만들까?

상속(Inheritance)은 관련된 클래스 사이에 상위 클래스와 하위 클래스의 타입 관계를 만드는 기능이다.

```java
class TextDocument extends Document {
}
```

`TextDocument`는 `Document`를 직접 상속한다. 이 관계에서 `Document`는 상위 클래스, `TextDocument`는 하위 클래스다.

상속을 선언하면 하위 클래스는 상위 클래스가 제공하는 상태와 행동을 바탕으로 기능을 확장할 수 있다. 동시에 `TextDocument` 객체를 `Document` 타입으로 사용할 수 있는 관계가 만들어진다.

```text
TextDocument is a Document.
```

코드가 비슷하다는 이유만으로 상속 관계가 성립하지는 않는다. 하위 클래스는 상위 클래스가 약속한 공개 동작과 상태 규칙을 유지해야 한다.

## 2. extends와 super로 클래스의 초기화를 연결한다

다음 예제는 `InheritanceExample.java` 한 파일로 컴파일할 수 있는 전체 코드다.

```java
class Document {

    private final String title;

    protected Document(String title) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException(
                    "제목은 비어 있을 수 없습니다."
            );
        }

        this.title = title;
    }

    public String getTitle() {
        return title;
    }

    public String describe() {
        return "문서: " + title;
    }
}

class TextDocument extends Document {

    private final String content;

    TextDocument(String title, String content) {
        super(title);

        if (content == null) {
            throw new IllegalArgumentException(
                    "내용은 null일 수 없습니다."
            );
        }

        this.content = content;
    }

    public String getContent() {
        return content;
    }

    @Override
    public String describe() {
        return super.describe()
                + ", 내용 길이: "
                + content.length();
    }
}

public class InheritanceExample {

    public static void main(String[] args) {
        Document document = new TextDocument(
                "상속",
                "상속 관계를 설명합니다."
        );

        System.out.println(document.getTitle());
        System.out.println(document.describe());
    }
}
```

`TextDocument` 생성자는 `super(title)`로 직접 상위 클래스의 생성자를 호출한다. 상위 클래스가 담당하는 `title`을 먼저 초기화한 뒤 하위 클래스가 `content`를 초기화한다.

생성자는 해당 클래스의 상태를 초기화하므로 하위 클래스에 상속되지 않는다. 상위 클래스에 접근 가능한 매개변수 없는 생성자가 없다면 하위 클래스는 호출할 생성자를 직접 지정해야 한다.

```java
class Parent {

    Parent(String name) {
    }
}

class Child extends Parent {

    Child(String name) {
        super(name);
    }
}
```

생성자에서 `this(...)` 또는 `super(...)`를 호출한다면 생성자 본문의 첫 문장에 있어야 한다. 명시적인 호출이 없으면 컴파일러는 접근 가능한 매개변수 없는 상위 생성자를 호출하는 `super()`를 추가한다.

## 3. 상속되는 멤버와 접근 가능한 멤버를 구분한다

하위 클래스는 상위 클래스의 멤버를 상속하지만 모든 멤버에 직접 접근할 수 있는 것은 아니다.

* `public`과 `protected` 인스턴스 멤버는 접근 조건을 만족하면 하위 클래스에서 사용할 수 있다.
* `package-private` 멤버는 하위 클래스가 같은 패키지에 있을 때 접근할 수 있다.
* `private` 멤버는 하위 클래스 코드에서 직접 접근할 수 없다.
* 생성자는 상속되지 않는다.

전체 예제에서 `Document.title`은 `private`이므로 `TextDocument`가 직접 읽거나 변경할 수 없다. 대신 상위 클래스가 제공하는 `getTitle()`과 `describe()`를 사용한다.

상태 필드를 `protected`로 공개하면 하위 클래스가 상위 클래스의 검증을 우회해 값을 변경할 수 있다. 상태는 `private`으로 유지하고 확장에 필요한 동작만 `protected` 메서드로 제공하면 상위 클래스의 규칙을 지키기 쉽다.

자바 클래스는 하나의 클래스만 직접 상속할 수 있다.

```java
// 컴파일 오류: 클래스 두 개를 직접 상속할 수 없다.
// class TextDocument extends Document, Content {
// }
```

일반 클래스가 `extends`를 생략하면 직접 상위 클래스는 `Object`다.

## 4. 오버라이딩은 실제 객체의 동작을 선택한다

오버라이딩(Overriding)은 상위 타입의 인스턴스 메서드를 하위 클래스에서 다시 정의하는 기능이다.

전체 예제에서 `TextDocument`는 `Document.describe()`를 재정의한다.

```java
@Override
public String describe() {
    return super.describe()
            + ", 내용 길이: "
            + content.length();
}
```

호출 변수의 타입은 `Document`지만 실제 객체는 `TextDocument`다.

```java
Document document = new TextDocument(
        "상속",
        "상속 관계를 설명합니다."
);

System.out.println(document.describe());
```

실행할 인스턴스 메서드는 실제 객체를 기준으로 선택되므로 `TextDocument.describe()`가 호출된다. 이 동작이 하위 객체를 상위 타입으로 다룰 수 있게 하는 다형성의 기반이다.

`@Override`를 붙이면 컴파일러가 실제로 상위 타입의 메서드를 재정의하는지 검사한다. 오버라이딩 메서드는 상위 메서드보다 접근 범위를 좁힐 수 없고 `final` 메서드는 재정의할 수 없다.

`super.describe()`는 별도의 상위 객체를 호출하는 표현이 아니다. 현재 객체에서 상위 클래스에 선언된 구현을 선택한다.

## 5. 상속 관계는 상위 타입의 규칙을 유지해야 한다

상속을 적용할 때는 하위 클래스가 상위 클래스의 한 종류로 동작할 수 있는지 먼저 확인한다.

상위 클래스가 모든 문서는 비어 있지 않은 제목을 가진다고 보장한다면 `TextDocument`도 그 조건을 유지해야 한다. 상위 타입을 사용하는 코드가 기대하는 입력 조건, 반환 결과와 상태 변경 규칙을 하위 클래스가 깨뜨리면 타입 대체가 어려워진다.

상속은 하위 클래스가 상위 클래스의 공개 API와 확장 지점에 의존하게 만든다. 상위 클래스의 생성자나 메서드 동작이 바뀌면 하위 클래스에도 영향이 전달되고, 상속 계층이 깊어질수록 실제 동작을 추적하기 어려워진다.

공통 코드만 재사용하려는 목적이라면 기존 객체를 필드로 포함하고 기능을 위임하는 조합도 선택할 수 있다. 상속은 타입 관계와 변경 영향을 감수할 이유가 있을 때 사용한다.

## 6. 생성자에서 오버라이딩 가능한 메서드를 호출하지 않는다

상위 클래스 생성자에서 오버라이딩 가능한 메서드를 호출하면 하위 클래스의 필드 초기화가 끝나기 전에 하위 메서드가 실행될 수 있다.

다음 코드는 `ConstructorOverrideExample.java`로 실행할 수 있는 오류 예제다.

```java
public class ConstructorOverrideExample {

    static class Parent {

        Parent() {
            printState();
        }

        void printState() {
            System.out.println("parent");
        }
    }

    static class Child extends Parent {

        private String state = "ready";

        @Override
        void printState() {
            System.out.println(state.length());
        }
    }

    public static void main(String[] args) {
        new Child(); // 실행 시 NullPointerException
    }
}
```

`Child`를 생성할 때 `Parent()`가 먼저 실행된다. `Parent()`가 호출한 `printState()`는 실제 객체의 `Child.printState()`로 연결되지만, 이 시점에는 `Child.state`의 초기화식이 실행되기 전이라 값은 `null`이다.

상위 클래스 생성자에서는 하위 클래스가 재정의할 수 있는 인스턴스 메서드에 의존하지 않는다. 초기화에 필요한 로직은 상위 클래스가 직접 책임지는 비재정의 메서드나 생성자 내부 코드로 처리한다.

## 7. 정리

* 상속은 `extends`로 상위 클래스와 하위 클래스의 타입 관계를 만들며 자바 클래스는 하나의 클래스만 직접 상속할 수 있다.
* 생성자는 상속되지 않고 `super(...)` 호출을 통해 상위 클래스와 하위 클래스의 초기화가 연결된다.
* 오버라이딩된 인스턴스 메서드는 변수 타입이 아니라 실제 객체를 기준으로 선택된다.
* 상속 관계는 코드 중복보다 하위 클래스가 상위 타입의 공개 동작과 상태 규칙을 유지할 수 있는지를 먼저 확인한다.
* 상위 클래스 생성자에서 오버라이딩 가능한 메서드를 호출하면 하위 클래스 초기화 전의 상태를 사용할 수 있으므로 피해야 한다.

## 8. 참고 자료

### 공식 자료

* [Java Language Specification 17 - Classes](https://docs.oracle.com/javase/specs/jls/se17/html/jls-8.html)
* [Java Language Specification 17 - Constructor Declarations](https://docs.oracle.com/javase/specs/jls/se17/html/jls-8.html#jls-8.8)
* [Java Language Specification 17 - Overriding](https://docs.oracle.com/javase/specs/jls/se17/html/jls-8.html#jls-8.4.8)
* [Dev.java - Inheritance](https://dev.java/learn/inheritance/what-is-inheritance/)

### 한글 참고 링크

* [MangKyu's Diary - 코드의 재사용, 상속보다 합성을 사용해야 하는 이유](https://mangkyu.tistory.com/199)
* [Tecoble - 상속보다는 조합을 사용하자](https://tecoble.techcourse.co.kr/post/2020-05-18-inheritance-vs-composition/)
* [MangKyu's Diary - 생성자에서 재정의 가능한 메소드를 호출하면 안되는 이유](https://mangkyu.tistory.com/140)
