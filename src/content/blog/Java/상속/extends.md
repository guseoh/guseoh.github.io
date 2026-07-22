---
title: "[Java] 자바의 상속은 무엇일까?"
description: "자바 상속의 의미와 extends, 생성자 연결, 메서드 오버라이딩, 상속 관계를 설계할 때 확인할 조건을 알아본다."
date: 2026-06-25
updated: 2026-07-23
lastVerified: 2026-07-23
category: "Java"
slug: "java/상속/extends"
commentKey: "/blog/java/상속/extends/"
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
draft: true
---

## 1. 들어가기 전

상속(Inheritance)은 관련된 클래스 사이에 상위 클래스와 하위 클래스의 관계를 만드는 기능이다. 하위 클래스는 상위 클래스가 제공하는 상태와 행동을 바탕으로 새로운 상태나 행동을 추가할 수 있고, 상속받은 메서드를 자신의 목적에 맞게 재정의할 수도 있다.

```java
class TextDocument extends Document {
}
```

`TextDocument`는 `Document`를 직접 상속한다. 이 관계에서 `Document`는 상위 클래스이고 `TextDocument`는 하위 클래스다.

상속은 공통 코드를 재사용하는 문법이면서 동시에 타입 관계를 만든다. 하위 클래스가 상위 클래스의 한 종류로 사용될 수 있어야 하며, 상위 클래스의 규칙과 공개된 동작을 유지해야 한다. 단순히 비슷한 필드나 중복 코드가 있다는 이유만으로 상속을 선택하면 두 클래스가 강하게 결합될 수 있다.

## 2. extends로 상위 클래스와 하위 클래스의 관계를 선언한다

하위 클래스는 클래스 선언부에서 `extends` 뒤에 직접 상속할 상위 클래스를 지정한다.

```java
class Document {

    private final String title;

    protected Document(String title) {
        this.title = title;
    }

    public String getTitle() {
        return title;
    }
}
```

```java
class TextDocument extends Document {

    private final String content;

    TextDocument(String title, String content) {
        super(title);
        this.content = content;
    }

    public String getContent() {
        return content;
    }
}
```

`TextDocument`는 `Document`가 제공하는 `getTitle()`을 사용할 수 있고 자신이 추가한 `content`와 `getContent()`도 가진다.

```java
TextDocument document = new TextDocument(
        "상속",
        "상속 관계를 설명합니다."
);

System.out.println(document.getTitle());
System.out.println(document.getContent());
```

자바 클래스는 하나의 클래스만 직접 상속할 수 있다.

```java
// 컴파일 오류: 클래스 두 개를 직접 상속할 수 없다.
// class TextDocument extends Document, Content {
// }
```

일반 클래스에서 `extends`를 생략하면 직접 상위 클래스는 `Object`다.

```java
class Document {
}

class Document extends Object {
}
```

두 선언은 일반 클래스의 직접 상위 클래스가 `Object`라는 점에서 같은 관계를 표현한다.

## 3. 상속되는 멤버와 접근 가능한 멤버를 구분한다

하위 클래스는 상위 클래스의 멤버를 상속하지만 접근 제한자와 멤버 종류에 따라 사용할 수 있는 방식이 다르다.

* `public`과 `protected` 인스턴스 멤버는 접근 조건을 만족하면 하위 클래스에서 사용할 수 있다.
* `package-private` 멤버는 하위 클래스가 같은 패키지에 있을 때 접근할 수 있다.
* `private` 멤버는 하위 클래스에서 직접 접근할 수 없다.
* 생성자는 하위 클래스에 상속되지 않는다.

상위 클래스의 `private` 필드는 하위 클래스 객체의 상태를 구성할 수 있지만 하위 클래스 코드에서 직접 읽거나 변경할 수 없다. 상위 클래스가 제공하는 메서드를 통해 사용한다.

```java
class Document {

    private final String title;

    protected Document(String title) {
        this.title = title;
    }

    protected String title() {
        return title;
    }
}
```

```java
class TextDocument extends Document {

    TextDocument(String title) {
        super(title);
    }

    public String describe() {
        return "제목: " + title();
    }
}
```

필드를 `protected`로 직접 공개하면 하위 클래스가 상위 클래스의 검증을 거치지 않고 상태를 변경할 수 있다. 상태는 `private`으로 감추고 확장에 필요한 동작을 `protected` 메서드로 제공하는 편이 상위 클래스의 규칙을 유지하기 쉽다.

## 4. 생성자는 상속되지 않고 super()로 연결된다

생성자는 해당 클래스가 담당하는 상태를 초기화한다. 상위 클래스와 하위 클래스는 초기화해야 할 필드가 다르므로 상위 클래스의 생성자가 하위 클래스에 상속되지는 않는다.

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
}
```

```java
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
}
```

`super(title)`는 직접 상위 클래스의 생성자를 호출한다. 하나의 `TextDocument` 객체를 만드는 과정에서 상위 클래스가 담당하는 `title`을 먼저 초기화한 뒤 하위 클래스가 `content`를 초기화한다.

생성자에서 다른 생성자를 명시적으로 호출하지 않으면 컴파일러는 매개변수가 없는 상위 클래스 생성자를 호출하는 `super()`를 추가한다.

```java
class Parent {

    Parent() {
    }
}

class Child extends Parent {

    Child() {
        // super()가 암묵적으로 호출된다.
    }
}
```

상위 클래스에 접근 가능한 매개변수 없는 생성자가 없다면 하위 클래스가 호출할 생성자를 직접 지정해야 한다.

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

`super`는 사용 위치에 따라 상위 클래스의 멤버 또는 생성자를 선택한다.

<!-- table-caption: super 사용 형태 -->

| 표현 | 의미 |
| --- | --- |
| `super.field` | 상위 클래스에 선언된 필드 선택 |
| `super.method()` | 상위 클래스의 메서드 구현 호출 |
| `super(...)` | 직접 상위 클래스의 생성자 호출 |

`super`는 별도의 상위 클래스 객체를 가리키는 참조 변수가 아니다. 현재 객체에서 상위 클래스에 선언된 멤버나 생성자를 명시적으로 선택하는 키워드다.

## 5. 오버라이딩으로 상속받은 동작을 재정의한다

오버라이딩(Overriding)은 상위 타입의 인스턴스 메서드를 하위 클래스에서 다시 정의하는 기능이다.

```java
class Document {

    public String describe() {
        return "문서";
    }
}
```

```java
class TextDocument extends Document {

    @Override
    public String describe() {
        return "텍스트 문서";
    }
}
```

`TextDocument` 객체에서 `describe()`를 호출하면 하위 클래스가 재정의한 메서드가 실행된다.

```java
Document document = new TextDocument();

System.out.println(document.describe()); // 텍스트 문서
```

변수 타입은 `Document`지만 실제 객체가 `TextDocument`이므로 오버라이딩된 메서드가 선택된다.

`@Override`는 메서드가 실제로 상위 타입의 메서드를 재정의하는지 컴파일러가 검사하게 한다. 이름이나 매개변수 타입을 잘못 작성하면 컴파일 오류가 발생하므로 오버라이딩 메서드에 명시한다.

상위 클래스의 기존 구현을 사용하려면 `super.method()`를 호출할 수 있다.

```java
@Override
public String describe() {
    return super.describe() + ": " + content.length() + "자";
}
```

오버라이딩하는 메서드는 상위 메서드보다 접근 범위를 좁힐 수 없고, `final` 메서드는 재정의할 수 없다.

## 6. 상속 관계는 코드 중복보다 타입 규칙을 먼저 본다

상속을 사용할 때는 하위 클래스가 상위 클래스의 한 종류로 동작할 수 있는지 확인한다.

```text
TextDocument is a Document.
```

상위 클래스가 모든 문서는 제목을 가진다고 보장한다면 하위 클래스도 제목이 없는 상태를 허용해서는 안 된다. 상위 타입을 사용하는 코드가 기대하는 입력 조건, 반환 결과와 상태 규칙을 하위 클래스가 유지해야 한다.

상속은 하위 클래스가 상위 클래스의 공개 API와 확장 지점에 의존하게 만든다. 상위 클래스의 생성자나 메서드 동작이 바뀌면 하위 클래스에도 영향이 전달될 수 있다. 상속 계층이 깊어지면 실제 동작을 이해하기 위해 여러 클래스를 추적해야 한다.

단순히 공통 코드를 재사용하려는 목적이라면 기존 객체를 필드로 포함하고 기능을 위임하는 조합도 고려할 수 있다. 상속은 두 타입 사이의 관계와 변경 영향을 감수할 이유가 있을 때 사용한다.

### 6.1 생성자에서 오버라이딩 가능한 메서드를 호출하지 않는다

상위 클래스 생성자에서 오버라이딩 가능한 메서드를 호출하면 하위 클래스의 필드 초기화가 끝나기 전에 하위 클래스 메서드가 실행될 수 있다.

```java
class Parent {

    Parent() {
        printState();
    }

    void printState() {
        System.out.println("parent");
    }
}
```

```java
class Child extends Parent {

    private String state = "ready";

    @Override
    void printState() {
        System.out.println(state.length());
    }
}
```

```java
new Child(); // NullPointerException
```

`Child`를 만드는 과정에서 `Parent()`가 먼저 실행된다. `Parent()`의 `printState()` 호출은 실제 객체의 오버라이딩된 `Child.printState()`를 실행한다. 이 시점에는 `Child`의 필드 초기화식이 실행되기 전이므로 `state`는 기본값인 `null`이다.

상위 클래스 생성자에서는 하위 클래스가 재정의할 수 없는 `private`, `final` 또는 `static` 메서드만 사용하는 편이 안전하다.

## 7. 정리

* 상속은 `extends`로 상위 클래스와 하위 클래스의 타입 관계를 만들며 자바 클래스는 하나의 클래스만 직접 상속할 수 있다.
* 하위 클래스는 접근 가능한 상위 클래스 멤버를 사용할 수 있지만 생성자는 상속되지 않고 `super(...)`로 초기화 과정이 연결된다.
* 오버라이딩은 상위 타입의 인스턴스 메서드를 하위 클래스가 다시 정의하며 실제 객체의 구현이 실행된다.
* 상속 관계는 공통 코드보다 하위 클래스가 상위 클래스의 한 종류로서 계약과 상태 규칙을 유지할 수 있는지를 먼저 확인한다.
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
