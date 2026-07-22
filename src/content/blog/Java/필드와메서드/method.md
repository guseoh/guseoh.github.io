---
title: "[Java] 자바의 필드와 메서드는 무엇일까?"
description: "자바 객체의 상태를 저장하는 필드와 행동을 구현하는 메서드의 선언, 호출, 매개변수와 반환값을 알아본다."
date: 2026-06-18
updated: 2026-07-23
lastVerified: 2026-07-23
category: "Java"
slug: "java/필드와메서드/method"
commentKey: "/blog/java/필드와메서드/method/"
tags:
    - Java
    - Field
    - Method
testedWith:
    java: "17"
book: ""
chapter: 1
heroImage: "/og-image.svg"
draft: false
---

## 1. 들어가기 전

클래스는 같은 종류의 객체가 가질 상태와 행동을 정의한다. 자바에서는 객체가 유지할 상태를 **필드(Field)** 로, 객체가 수행할 행동을 **메서드(Method)** 로 표현한다.

```java
class Member {

    String name;
    int loginCount;

    void changeName(String newName) {
        name = newName;
    }

    int login() {
        loginCount++;
        return loginCount;
    }
}
```

`name`과 `loginCount`는 회원 객체가 기억하는 값이다. 이름을 바꾸고 로그인 횟수를 증가시키는 작업은 메서드가 담당한다.

필드와 메서드를 함께 선언하면 객체가 무엇을 기억하고 그 상태를 이용해 어떤 작업을 수행하는지가 하나의 클래스 안에 드러난다.

## 2. 필드는 객체가 유지할 상태를 저장한다

필드는 클래스 내부에서 메서드 바깥에 선언하는 변수다.

```java
class Member {

    String name;
    int loginCount;
}
```

같은 클래스로 객체를 여러 개 만들더라도 각 객체의 인스턴스 필드는 서로 독립적이다.

```java
Member first = new Member();
Member second = new Member();

first.name = "kim";
second.name = "lee";

System.out.println(first.name);  // kim
System.out.println(second.name); // lee
```

두 객체는 같은 필드 선언을 따르지만 실제 값은 객체마다 따로 보관한다. `first.name`을 변경해도 `second.name`은 바뀌지 않는다.

### 2.1 필드와 지역 변수의 역할은 다르다

객체가 사용하는 모든 값을 필드로 만들 필요는 없다. 필드에는 메서드 호출이 끝난 뒤에도 객체가 계속 기억해야 할 상태를 둔다. 한 번의 작업 안에서만 필요한 값은 지역 변수로 선언한다.

```java
String createIntroduction(String prefix) {
    String message =
            prefix + name + " (로그인 " + loginCount + "회)";

    return message;
}
```

`name`과 `loginCount`는 여러 메서드 호출에서 계속 사용하므로 필드다. `message`는 소개 문장을 만드는 동안에만 필요하므로 지역 변수다.

<!-- table-caption: 필드와 지역 변수의 차이 -->

| 구분 | 필드 | 지역 변수 |
| --- | --- | --- |
| 선언 위치 | 클래스 내부, 메서드 외부 | 메서드나 블록 내부 |
| 역할 | 객체가 유지할 상태 저장 | 실행 중 잠시 필요한 값 저장 |
| 사용 범위 | 객체의 여러 메서드 | 선언된 메서드나 블록 |
| 초기화 | 타입에 맞는 기본값 제공 | 사용하기 전에 직접 초기화 |

한 번의 계산에서만 필요한 값을 필드로 올리면 객체의 상태가 불필요하게 늘어난다. 여러 메서드가 같은 필드를 읽고 변경하게 되어 값의 변경 범위를 추적하기도 어려워진다.

### 2.2 필드와 지역 변수의 초기화 규칙

필드는 선언할 때 값을 지정할 수 있다.

```java
int loginCount = 0;
```

초기값을 작성하지 않으면 숫자형은 `0`, `boolean`은 `false`, 참조형은 `null`로 초기화된다.

```java
class Member {

    String name;    // null
    int loginCount; // 0
}
```

지역 변수에는 기본값이 자동으로 들어가지 않는다.

```java
void printCount() {
    int count;

    // 컴파일 오류: count가 초기화되지 않았다.
    // System.out.println(count);
}
```

객체가 생성될 때 반드시 필요한 값은 타입 기본값에 맡기지 않고 생성 과정에서 명시적으로 전달하고 검증해야 한다.

## 3. 메서드는 객체의 행동을 구현한다

메서드는 입력을 받아 작업을 수행하고 필요하면 결과를 반환하는 코드의 묶음이다. 객체의 필드를 읽거나 변경할 수 있고 다른 메서드를 호출할 수도 있다.

메서드 선언은 반환 타입, 메서드 이름, 매개변수 목록과 본문으로 구성된다.

```text
반환 타입 메서드명(매개변수 목록) {
    실행할 코드
}
```

다음 메서드는 새 이름을 받아 `name` 필드를 변경한다.

```java
void changeName(String newName) {
    name = newName;
}
```

`void`는 호출한 곳에 반환할 값이 없다는 뜻이다. `newName`은 메서드가 작업에 사용할 값을 받는 매개변수다.

로그인 횟수를 증가시킨 뒤 결과를 돌려주려면 반환 타입을 `int`로 선언한다.

```java
int login() {
    loginCount++;
    return loginCount;
}
```

반환값은 선언한 반환 타입과 호환되어야 한다. `return`이 실행되면 현재 메서드의 실행이 끝난다.

### 3.1 매개변수와 인자는 서로 다른 위치의 용어다

메서드를 호출할 때 전달하는 값을 인자, 메서드 선언에서 값을 받는 변수를 매개변수라고 한다.

```java
void changeName(String newName) {
    name = newName;
}

member.changeName("lee");
```

`newName`은 매개변수이고, 호출할 때 전달한 `"lee"`는 인자다. 인자의 값은 매개변수에 복사되며 매개변수 타입에 대입할 수 있어야 한다.

매개변수가 여러 개라면 선언된 개수와 순서에 맞게 인자를 전달해야 한다.

```java
String createIntroduction(String prefix, String suffix) {
    return prefix + name + suffix;
}
```

```java
String text = member.createIntroduction("회원: ", "님");
```

조건에 맞는 메서드를 찾지 못하면 컴파일 오류가 발생한다.

### 3.2 반환값은 호출한 코드에서 다시 사용할 수 있다

반환값이 있는 메서드는 결과를 변수에 저장하거나 다른 표현식의 일부로 사용할 수 있다.

```java
int count = member.login();
System.out.println(count);
```

```java
System.out.println(member.login());
```

두 번째 코드는 `login()`의 반환값을 `println()`의 인자로 바로 전달한다. 다만 `login()`은 호출될 때마다 상태를 변경하므로 호출 횟수에 따라 결과도 달라진다.

조회만 수행하는 메서드와 상태를 변경하는 메서드의 이름을 구분하면 호출 코드에서 부수 효과를 예상하기 쉽다.

## 4. 메서드 이름과 시그니처는 호출 방법을 결정한다

메서드 이름은 수행하는 행동이 드러나는 동사로 작성하는 경우가 많다.

```text
changeName
increaseViewCount
calculateTotalPrice
findMember
cancelOrder
```

`process`, `handle`, `execute`처럼 범위가 넓은 이름보다 실제 동작을 표현할 수 있다면 구체적인 이름을 선택한다. 논리값을 반환하는 메서드는 `isActive()`, `hasPermission()`, `canCancel()`처럼 결과의 의미가 읽히도록 작성할 수 있다.

자바에서 메서드 시그니처는 메서드 이름과 매개변수 타입으로 구성된다. 다음 메서드의 시그니처는 `changeName(String)`이다.

```java
void changeName(String newName) {
    name = newName;
}
```

반환 타입과 매개변수 이름은 메서드 시그니처에 포함되지 않는다. 따라서 반환 타입만 다른 메서드를 같은 이름과 매개변수로 중복 선언할 수 없다.

```java
// 컴파일 오류: 두 메서드의 시그니처가 같다.
int calculate(int value) {
    return value;
}

// double calculate(int value) {
//     return value;
// }
```

매개변수의 개수나 타입이 다르면 같은 이름을 사용할 수 있으며 이를 오버로딩이라고 한다.

```java
int calculate(int value) {
    return value;
}

int calculate(int first, int second) {
    return first + second;
}
```

## 5. 객체의 상태 변경은 의미가 드러나는 메서드에 맡긴다

필드를 외부에 직접 공개하면 어느 코드에서 어떤 이유로 값이 바뀌는지 제어하기 어렵다.

```java
member.loginCount = -10;
```

상태를 변경하는 규칙을 메서드에 두면 객체가 허용하는 변경만 제공할 수 있다.

```java
class Member {

    private int loginCount;

    int login() {
        loginCount++;
        return loginCount;
    }
}
```

호출 코드는 `loginCount`를 직접 계산하지 않고 `login()`이라는 행동을 요청한다. 필드는 객체가 유지할 상태를 저장하고, 메서드는 그 상태를 읽고 변경하는 규칙을 구현한다.

## 6. 정리

* 필드는 메서드 호출이 끝난 뒤에도 객체가 유지해야 할 상태를 저장하며 인스턴스 필드의 값은 객체마다 독립적이다.
* 지역 변수는 하나의 메서드나 블록에서만 필요한 값을 저장하고 사용하기 전에 직접 초기화해야 한다.
* 메서드는 반환 타입, 이름, 매개변수와 본문으로 구성되며 객체의 상태를 읽거나 변경하는 행동을 구현한다.
* 매개변수는 메서드 선언에서 값을 받는 변수이고 인자는 메서드를 호출할 때 전달하는 값이다.
* 상태 변경을 의미가 드러나는 메서드에 맡기면 객체가 허용하는 변경 규칙을 한곳에서 관리할 수 있다.

## 7. 참고 자료

### 공식 자료

* [Dev.java - Creating Variables and Naming Them](https://dev.java/learn/language-basics/variables/)
* [Dev.java - Defining Methods](https://dev.java/learn/classes-objects/defining-methods/)
* [Dev.java - Calling Methods and Constructors](https://dev.java/learn/classes-objects/calling-methods-constructors/)
* [Java Language Specification 26 - Members of a Class](https://docs.oracle.com/javase/specs/jls/se26/html/jls-8.html#jls-8.2)
* [Java Language Specification 26 - Method Declarations](https://docs.oracle.com/javase/specs/jls/se26/html/jls-8.html#jls-8.4)

### 한글 참고 링크

* [Inpa Dev - 자바 객체 지향 클래스 문법 총정리](https://inpa.tistory.com/entry/JAVA-%E2%98%95-%EA%B0%9D%EC%B2%B4-%EC%A7%80%ED%96%A5OOP-%ED%81%B4%EB%9E%98%EC%8A%A4-%EB%AC%B8%EB%B2%95-%F0%9F%92%AF-%EC%B4%9D%EC%A0%95%EB%A6%AC)
* [Hstory - 자바 오버로딩이란](https://hstory0208.tistory.com/entry/Java%EC%9E%90%EB%B0%94-%EC%98%A4%EB%B2%84%EB%A1%9C%EB%94%A9-overloading%EC%9D%B4%EB%9E%80)
