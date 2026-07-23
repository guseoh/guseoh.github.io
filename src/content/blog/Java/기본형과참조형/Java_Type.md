---
title: "자바의 기본형과 참조형은 무엇일까?"
description: "자바 변수에 저장되는 기본형 값과 참조값의 차이, 대입과 메서드 호출에서 값이 복사되는 방식을 알아본다."
date: 2026-06-15
updated: 2026-07-23
lastVerified: 2026-07-23
slug: "java/기본형과참조형/java_type"
aliases: []
commentKey: "/blog/java/기본형과참조형/java_type/"
category: "Java"
tags:
    - Java
    - Primitive Type
    - Reference Type
testedWith:
    java: "17"
book: ""
chapter: 1
heroImage: "/og-image.svg"
draft: false
---

## 1. 들어가기 전

자바의 변수 선언은 겉으로 비슷해 보인다.

```java
int age = 20;
boolean active = true;
String name = "kim";
Member member = new Member("kim");
```

하지만 변수에 저장되는 값의 종류는 다르다. `int`와 `boolean` 같은 기본형 변수에는 데이터 값이 저장되고, `String`과 `Member` 같은 참조형 변수에는 객체를 가리키는 참조값이 저장된다.

이 차이는 변수 대입, 객체 비교, `null`, 메서드 인자 전달을 이해하는 기준이 된다. 핵심은 기본형은 스택, 참조형은 힙처럼 메모리 위치만으로 구분하는 것이 아니라 **변수에 어떤 값이 들어 있는지**를 구분하는 데 있다.

## 2. 자바 타입은 기본형과 참조형으로 나뉜다

자바의 타입은 크게 기본형과 참조형으로 나뉜다.

<!-- table-caption: 기본형과 참조형의 차이 -->

| 구분 | 변수에 저장되는 값 | 대표적인 타입 |
| --- | --- | --- |
| 기본형 | 숫자, 문자, 논리와 같은 데이터 값 | `byte`, `short`, `int`, `long`, `float`, `double`, `char`, `boolean` |
| 참조형 | 객체를 가리키는 참조값 또는 `null` | 클래스, 인터페이스, 배열, 타입 변수 |

```java
int age = 20;
Member member = new Member("kim");
```

`age`에는 정수 값 `20`이 저장된다. `member`에는 `Member` 객체 자체가 들어가는 것이 아니라, 생성된 객체에 접근할 수 있는 참조값이 저장된다.

참조값을 주소라고 간단히 표현하기도 하지만 자바 개발자가 직접 읽거나 수정하는 메모리 주소와 같지는 않다. 자바 코드는 참조값을 통해 객체의 필드와 메서드에 접근한다.

### 2.1 기본형은 데이터 값을 저장한다

자바가 제공하는 기본형은 여덟 가지다.

<!-- table-caption: 자바 기본형의 분류 -->

| 분류 | 타입 | 특징 |
| --- | --- | --- |
| 논리형 | `boolean` | `true` 또는 `false`를 표현한다. |
| 문자형 | `char` | 하나의 UTF-16 코드 단위를 표현한다. |
| 정수형 | `byte`, `short`, `int`, `long` | 정수 범위를 크기별로 표현한다. |
| 실수형 | `float`, `double` | IEEE 754 부동소수점 값을 표현한다. |

기본형은 객체가 아니므로 `null`을 저장할 수 없다.

```java
int count = 0;
boolean active = false;

// 컴파일 오류
// int number = null;
```

필드와 배열 요소는 타입에 맞는 기본값으로 초기화된다. 숫자형은 `0`, `boolean`은 `false`, `char`는 `\u0000`이 기본값이다. 지역 변수는 자동으로 초기화되지 않으므로 사용하기 전에 값을 직접 대입해야 한다.

```java
class Member {

    int loginCount; // 0
    boolean active; // false
}
```

```java
void printCount() {
    int count;

    // 컴파일 오류: 지역 변수 count가 초기화되지 않았다.
    // System.out.println(count);
}
```

### 2.2 참조형은 객체에 접근할 참조값을 저장한다

클래스, 인터페이스, 배열과 타입 변수는 참조형이다.

```java
String name = "kim";
Member member = new Member("kim");
List<String> names = new ArrayList<>();
int[] numbers = new int[3];
```

배열의 요소가 기본형이어도 배열 자체는 객체다. 따라서 `int[]` 변수에는 배열 객체를 가리키는 참조값이 저장된다.

참조형 변수에는 아무 객체도 가리키지 않는다는 뜻으로 `null`을 저장할 수 있다.

```java
Member member = null;
```

`null`인 참조를 통해 필드나 메서드에 접근하면 `NullPointerException`이 발생한다.

```java
Member member = null;

member.changeName("lee"); // NullPointerException
```

## 3. 변수 대입은 저장된 값을 복사한다

자바에서 다른 변수에 값을 대입하면 원본 변수에 저장된 값이 복사된다.

### 3.1 기본형을 대입하면 데이터 값이 복사된다

```java
int first = 10;
int second = first;

second = 20;

System.out.println(first);  // 10
System.out.println(second); // 20
```

`second = first`가 실행될 때 정수 값 `10`이 복사된다. 두 변수는 서로 독립적이므로 `second`를 변경해도 `first`는 바뀌지 않는다.

### 3.2 참조형을 대입하면 참조값이 복사된다

```java
Member first = new Member("kim");
Member second = first;
```

`second`에는 `first`가 가진 참조값이 복사된다. 변수는 두 개지만 두 참조값이 같은 객체를 가리킨다.

```java
second.changeName("lee");

System.out.println(first.getName());  // lee
System.out.println(second.getName()); // lee
```

`second`를 통해 변경한 대상은 두 변수가 함께 가리키는 하나의 객체다. 반대로 `second`에 새 객체의 참조값을 대입하면 두 변수는 서로 다른 객체를 가리킨다.

```java
Member first = new Member("kim");
Member second = first;

second = new Member("lee");

System.out.println(first.getName());  // kim
System.out.println(second.getName()); // lee
```

### 3.3 `==`는 기본형 값과 참조형 동일성을 비교한다

기본형에서 `==`는 두 데이터 값이 같은지 비교한다.

```java
int first = 10;
int second = 10;

System.out.println(first == second); // true
```

참조형에서 `==`는 두 변수가 같은 객체를 가리키는지 비교한다.

```java
Member first = new Member("kim");
Member second = new Member("kim");

System.out.println(first == second); // false
```

두 객체가 같은 이름을 가져도 별도로 생성된 객체이므로 동일하지 않다. 객체가 가진 논리적인 값을 비교하려면 해당 타입이 정의한 `equals()`를 사용한다.

```java
String first = new String("java");
String second = new String("java");

System.out.println(first == second);      // false
System.out.println(first.equals(second)); // true
```

`String`은 문자열 내용이 같으면 `true`를 반환하도록 `equals()`를 구현한다. 직접 만든 클래스는 객체를 어떤 값으로 비교할지 정한 뒤 `equals()`와 `hashCode()`를 함께 구현해야 한다.

## 4. 자바의 메서드 호출은 항상 값에 의한 전달이다

자바는 메서드를 호출할 때 인자의 값을 매개변수에 복사한다. 기본형과 참조형 모두 값에 의한 전달이다. 차이는 복사되는 값이 데이터 값인지 참조값인지에 있다.

```text
기본형 인자 → 데이터 값이 복사된다.
참조형 인자 → 참조값이 복사된다.
```

### 4.1 기본형 매개변수를 바꿔도 호출한 변수는 바뀌지 않는다

```java
public class ParameterExample {

    public static void main(String[] args) {
        int number = 10;

        changeNumber(number);

        System.out.println(number); // 10
    }

    private static void changeNumber(int number) {
        number = 20;
    }
}
```

`main()`의 `number`와 `changeNumber()`의 매개변수는 서로 다른 변수다. 값 `10`이 복사되므로 메서드 내부에서 매개변수를 변경해도 호출한 변수에는 영향을 주지 않는다.

### 4.2 참조값이 복사되면 같은 객체를 변경할 수 있다

```java
public class ParameterExample {

    public static void main(String[] args) {
        Member member = new Member("kim");

        changeName(member);

        System.out.println(member.getName()); // lee
    }

    private static void changeName(Member member) {
        member.changeName("lee");
    }
}
```

호출한 변수와 매개변수에는 같은 참조값이 들어 있다. 따라서 매개변수를 통해 객체의 상태를 변경하면 호출한 쪽에서도 변경된 객체를 확인한다.

매개변수에 새 객체의 참조값을 대입하는 것은 다르다.

```java
private static void replaceMember(Member member) {
    member = new Member("lee");
}
```

이 코드는 복사된 매개변수만 새 참조값으로 바꾼다. 호출한 쪽의 변수는 여전히 기존 객체를 가리킨다. 자바가 참조형만 별도의 참조 전달 방식을 사용하는 것이 아니라, 참조값이라는 값이 복사되기 때문에 나타나는 결과다.

## 5. 래퍼 클래스는 기본형 값을 객체로 다룬다

자바는 각 기본형에 대응하는 래퍼 클래스를 제공한다.

<!-- table-caption: 기본형과 래퍼 클래스의 대응 -->

| 기본형 | 래퍼 클래스 |
| --- | --- |
| `byte` | `Byte` |
| `short` | `Short` |
| `int` | `Integer` |
| `long` | `Long` |
| `float` | `Float` |
| `double` | `Double` |
| `char` | `Character` |
| `boolean` | `Boolean` |

기본형을 래퍼 객체로 자동 변환하는 과정을 오토박싱, 래퍼 객체에서 기본형 값을 꺼내는 과정을 언박싱이라고 한다.

```java
Integer boxed = 10;  // 오토박싱
int number = boxed;  // 언박싱
```

래퍼 클래스는 참조형이므로 `null`을 저장할 수 있다. `null`을 기본형으로 언박싱하면 메서드를 호출할 객체가 없으므로 `NullPointerException`이 발생한다.

```java
Integer boxed = null;

int number = boxed; // NullPointerException
```

제네릭의 타입 인자에는 기본형을 직접 사용할 수 없다. 컬렉션에는 대응하는 래퍼 클래스를 사용한다.

```java
List<Integer> numbers = new ArrayList<>();
numbers.add(10);
```

래퍼 객체도 참조형이므로 값 비교에는 `equals()`를 사용한다. 오토박싱 과정에서 일부 값이 캐시될 수 있으므로 `==`의 결과에 의존해서는 안 된다.

## 6. 정리

* 기본형 변수에는 데이터 값이 저장되고, 참조형 변수에는 객체에 접근하기 위한 참조값이나 `null`이 저장된다.
* 변수 대입은 언제나 저장된 값을 복사하므로 기본형은 데이터 값이, 참조형은 참조값이 복사된다.
* 같은 참조값을 가진 여러 변수는 하나의 객체를 가리키므로 어느 변수를 통해 상태를 바꾸어도 같은 변경 결과를 확인한다.
* 자바의 메서드 호출은 항상 값에 의한 전달이며, 참조형 인자를 전달할 때도 객체가 아니라 참조값이 복사된다.
* 래퍼 클래스는 기본형 값을 객체로 다루게 하지만 `null` 언박싱과 참조 비교에 주의해야 한다.

## 7. 참고 자료

### 공식 자료

* [Java Language Specification 26 - Types, Values, and Variables](https://docs.oracle.com/javase/specs/jls/se26/html/jls-4.html)
* [Dev.java - Primitive Types](https://dev.java/learn/language-basics/primitive-types/)
* [Dev.java - Autoboxing and Unboxing](https://dev.java/learn/numbers-strings/autoboxing/)
* [Dev.java - Arrays](https://dev.java/learn/language-basics/arrays/)
* [Java SE API - Objects](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Objects.html)

### 한글 참고 링크

* [MangKyu's Diary - Java는 Call By Value인가 Call By Reference인가](https://mangkyu.tistory.com/322)
* [Tecoble - 자바의 Wrapper Class](https://tecoble.techcourse.co.kr/post/2021-05-03-wrapper-class/)
