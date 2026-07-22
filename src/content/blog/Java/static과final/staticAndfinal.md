---
title: "[Java] 자바의 static과 final은 무엇일까?"
description: "static 멤버가 클래스에 속하는 방식과 final이 변수의 재할당, 메서드의 오버라이딩, 클래스의 상속을 제한하는 범위를 정리한다."
date: 2026-06-24
updated: 2026-07-23
lastVerified: 2026-07-23
category: "Java"
slug: "java/static과final/staticandfinal"
commentKey: "/blog/java/static과final/staticandfinal/"
tags:
    - Java
    - static
    - final
testedWith:
    java: "17"
book: ""
chapter: 1
heroImage: "/og-image.svg"
draft: false
---

## 1. 들어가기 전

접근 제한자는 클래스와 멤버를 어느 범위까지 공개할지 정한다. `private` 멤버는 클래스 내부에서만 접근할 수 있고, `public` 멤버는 외부 코드에서도 사용할 수 있다.

하지만 접근 범위만으로는 멤버가 객체마다 존재하는지, 클래스에 하나만 존재하는지 표현할 수 없다. 값을 다시 대입할 수 있는지, 하위 클래스가 메서드를 재정의하거나 클래스를 상속할 수 있는지도 별도의 문제다.

자바에서는 이러한 성질을 `static`과 `final`로 표현한다.

| 키워드 | 표현하는 내용 |
| --- | --- |
| `static` | 필드나 메서드가 개별 객체가 아니라 클래스에 속한다. |
| `final` | 선언 위치에 따라 재할당, 오버라이딩 또는 상속을 제한한다. |

두 키워드는 역할이 다르다. `static` 필드도 값을 변경할 수 있고, `final` 인스턴스 필드는 객체마다 따로 존재할 수 있다.

```java
private static int memberCount;
private final String email;
```

`memberCount`는 모든 `Member` 객체가 공유하는 클래스 필드다. `email`은 객체마다 존재하지만 초기화된 뒤 다른 값으로 다시 대입할 수 없다.

## 2. static은 클래스에 속한다

일반적인 인스턴스 필드는 객체마다 별도로 존재한다. `static` 필드는 특정 객체가 아니라 클래스에 속하므로 객체를 여러 개 생성해도 하나의 값을 공유한다.

### 2.1 static 필드

회원 객체가 생성된 수를 저장하는 필드를 생각해 보자.

```java
public class Member {

    private static int memberCount;

    private final String email;

    public Member(String email) {
        this.email = email;
        memberCount++;
    }

    public String getEmail() {
        return email;
    }

    public static int getMemberCount() {
        return memberCount;
    }
}
```

두 객체는 서로 다른 이메일을 가지지만 `memberCount`는 함께 사용한다.

```java
Member first = new Member("first@example.com");
Member second = new Member("second@example.com");

System.out.println(first.getEmail());
System.out.println(second.getEmail());
System.out.println(Member.getMemberCount());
```

```text
first@example.com
second@example.com
2
```

`email`은 인스턴스 필드이므로 객체마다 다른 값을 저장한다. `memberCount`는 클래스에 속한 정적 필드이므로 두 객체를 생성하는 동안 같은 값이 증가한다.

정적 멤버는 클래스 이름으로 접근하는 편이 의미가 분명하다.

```java
int count = Member.getMemberCount();
```

자바 문법상 객체 참조를 사용해 정적 메서드를 호출할 수도 있다.

```java
int count = first.getMemberCount();
```

이 코드는 `getMemberCount()`가 `first` 객체의 상태를 사용하는 것처럼 보인다. 실제 호출 대상은 `Member` 클래스이므로 `Member.getMemberCount()`로 작성한다.

> [!warning] 공유되는 가변 상태
>
> 변경 가능한 `static` 필드는 여러 객체와 코드가 하나의 값을 함께 수정한다. 위의 `memberCount++`는 공유 특성을 설명하기 위한 예제이며, 여러 스레드가 동시에 실행하면 증가 연산의 결과가 유실될 수 있다.
>
> `static`은 값을 공유하게 만들지만 공유된 값을 동시성 문제로부터 보호하지는 않는다.

### 2.2 static 메서드

인스턴스 메서드는 호출 대상 객체를 기준으로 실행된다.

```java
Member member = new Member("member@example.com");
String email = member.getEmail();
```

`getEmail()` 안에서는 현재 호출 대상인 `member` 객체의 필드에 접근할 수 있다. `this`도 이 객체를 가리킨다.

정적 메서드는 특정 객체를 대상으로 호출하지 않는다.

```java
public class EmailNormalizer {

    public static String normalize(String email) {
        return email.trim().toLowerCase();
    }
}
```

객체를 생성하지 않고 클래스 이름으로 호출한다.

```java
String email = EmailNormalizer.normalize(
        " MEMBER@EXAMPLE.COM "
);

System.out.println(email); // member@example.com
```

정적 메서드에는 현재 객체가 없으므로 `this`와 `super`를 사용할 수 없다. 인스턴스 필드에도 직접 접근할 수 없다.

```java
public class Member {

    private String email;
    private static int memberCount;

    public static void printInformation() {
        System.out.println(memberCount);

        // 컴파일 오류
        // System.out.println(email);
        // System.out.println(this.email);
    }
}
```

`memberCount`는 클래스에 속하므로 정적 메서드에서 사용할 수 있다. 반면 `email`은 객체마다 값이 다르다. 현재 객체가 없는 정적 메서드에서는 어느 객체의 이메일을 읽어야 하는지 정할 수 없다.

객체를 매개변수로 전달받으면 해당 객체의 인스턴스 메서드를 호출할 수 있다.

```java
public static void printEmail(Member member) {
    System.out.println(member.getEmail());
}
```

정적 메서드는 입력값만으로 결과를 계산하는 기능이나 클래스 전체가 공유하는 정적 필드를 관리하는 기능에 사용할 수 있다. 정적 팩토리 메서드처럼 객체를 생성해 반환하는 경우에도 사용한다.

객체 생성을 피하려고 모든 메서드를 `static`으로 만들 필요는 없다. 객체의 상태에 따라 결과가 달라지는 행동은 인스턴스 메서드로 표현해야 어떤 객체가 그 행동을 수행하는지 드러난다.

`static`과 싱글톤도 구분해야 한다. `static`은 멤버가 클래스에 속한다는 뜻이고, 싱글톤은 특정 클래스의 객체가 하나만 생성되도록 제한하는 설계 방식이다.

### 2.3 클래스 초기화와 static 초기화 블록

정적 필드의 초기화 코드는 해당 클래스가 초기화될 때 실행된다. 대표적으로 클래스의 객체를 처음 생성하거나 정적 메서드를 호출하고, 상수 변수가 아닌 정적 필드를 처음 사용할 때 클래스 초기화가 일어난다.

정적 필드 초기화식과 정적 초기화 블록은 소스 코드에 작성된 순서대로 실행된다.

```java
public class AppConfig {

    private static int maxRetryCount = 3;

    static {
        maxRetryCount += 2;
    }

    public static int getMaxRetryCount() {
        return maxRetryCount;
    }
}
```

정적 필드에 먼저 `3`이 들어가고, 이어서 정적 초기화 블록이 실행되어 값이 `5`가 된다.

```java
System.out.println(AppConfig.getMaxRetryCount()); // 5
```

정적 초기화 블록은 여러 문장이 필요하거나 메서드를 호출해야 하는 초기화에 사용할 수 있다. 값 하나를 바로 대입할 수 있다면 필드 선언에서 초기화하는 편이 간단하다.

```java
private static final int MAX_RETRY_COUNT = 5;
```

## 3. final은 변경과 확장을 제한한다

`final`은 변수, 필드, 메서드와 클래스에 사용할 수 있다. 어디에 선언했는지에 따라 제한하는 대상이 달라진다.

| 선언 위치 | `final`의 의미 |
| --- | --- |
| 변수 또는 필드 | 값을 한 번 할당한 뒤 다시 할당할 수 없다. |
| 메서드 | 하위 클래스에서 오버라이딩할 수 없다. |
| 클래스 | 다른 클래스가 상속할 수 없다. |

### 3.1 final 변수와 필드

일반 변수에는 새로운 값을 다시 대입할 수 있다.

```java
int retryCount = 1;

retryCount = 2;
retryCount = 3;
```

`final` 변수에는 값을 한 번만 할당할 수 있다.

```java
final int maxRetryCount = 3;

// 컴파일 오류
// maxRetryCount = 5;
```

인스턴스 필드도 `final`로 선언할 수 있다. 객체마다 다른 값이 필요하다면 생성자에서 초기화한다.

```java
public class Member {

    private final String email;

    public Member(String email) {
        this.email = email;
    }

    public String getEmail() {
        return email;
    }
}
```

`email`은 `Member` 객체마다 별도로 존재한다. 각 객체의 생성자에서 값이 정해지지만, 생성이 끝난 뒤에는 다른 문자열을 다시 대입할 수 없다.

선언할 때 값을 넣지 않은 `final` 필드는 모든 생성 경로에서 초기화되어야 한다.

```java
public class Member {

    private final String email;

    public Member(String email) {
        this.email = email;
    }

    public Member() {
        this("guest@example.com");
    }
}
```

두 생성자 중 어느 쪽을 호출해도 `email`에는 한 번 값이 할당된다. 생성자가 끝날 때까지 초기화되지 않는 경로가 있으면 컴파일 오류가 발생한다.

### 3.2 final 참조와 불변 객체

기본형 변수에 `final`을 선언하면 실제 값을 다시 대입할 수 없다.

```java
final int age = 20;

// 컴파일 오류
// age = 21;
```

참조형 변수에 `final`을 선언하면 다른 객체의 참조값을 다시 대입할 수 없다.

```java
List<String> source = new ArrayList<>();
final List<String> names = source;

// 컴파일 오류
// names = new ArrayList<>();
```

`final`이 제한하는 것은 `names` 변수의 재할당이다. 현재 가리키는 `ArrayList` 객체는 여전히 변경할 수 있다.

```java
names.add("Kim");
names.add("Lee");

System.out.println(names); // [Kim, Lee]
```

따라서 참조형 필드에 `final`을 선언한 것만으로 객체 전체가 불변이 되지는 않는다.

```java
public class Members {

    private final List<String> names;

    public Members(List<String> names) {
        this.names = List.copyOf(names);
    }

    public List<String> getNames() {
        return names;
    }
}
```

`List.copyOf()`로 전달받은 목록을 복사하면 외부의 원본 리스트가 변경되어도 `Members`가 보관하는 목록에는 반영되지 않는다. 반환된 목록에도 원소를 추가하거나 제거할 수 없다.

다만 목록의 원소가 가변 객체라면 원소 내부의 상태까지 자동으로 불변이 되는 것은 아니다. `final`은 참조의 재할당을 제한하며, 객체의 불변성은 필드 구성과 외부 노출 방식까지 함께 설계해야 한다.

### 3.3 final 메서드와 클래스

메서드에 `final`을 선언하면 하위 클래스가 해당 메서드를 오버라이딩할 수 없다.

```java
public class Account {

    public final void validate() {
        System.out.println("계좌 상태를 검사합니다.");
    }
}
```

하위 클래스에서 같은 메서드를 재정의하면 컴파일 오류가 발생한다.

```java
public class SavingsAccount extends Account {

    // 컴파일 오류
    // @Override
    // public void validate() {
    // }
}
```

클래스에 `final`을 선언하면 해당 클래스를 상속할 수 없다.

```java
public final class Money {

    private final long amount;

    public Money(long amount) {
        this.amount = amount;
    }

    public long getAmount() {
        return amount;
    }
}
```

```java
// 컴파일 오류
// public class DiscountMoney extends Money {
// }
```

`final` 메서드는 특정 동작이 오버라이딩으로 바뀌지 않아야 할 때 사용한다. `final` 클래스는 더 이상의 하위 타입을 허용하지 않을 때 사용한다.

하위 클래스의 구현을 요구하는 `abstract`와 상속을 금지하는 `final`은 목적이 충돌하므로 하나의 클래스를 `abstract final`로 선언할 수 없다.

## 4. static final은 두 의미를 함께 가진다

`static`과 `final`을 함께 선언해도 각 키워드의 의미는 그대로 유지된다.

```java
public static final int MAX_RETRY_COUNT = 3;
```

`static`이므로 클래스에 하나만 존재하고, `final`이므로 초기화된 뒤 다른 값을 다시 대입할 수 없다.

| 선언 | 객체마다 따로 존재하는가? | 다시 할당할 수 있는가? |
| --- | --- | --- |
| 인스턴스 필드 | 예 | 예 |
| `final` 인스턴스 필드 | 예 | 아니요 |
| `static` 필드 | 아니요 | 예 |
| `static final` 필드 | 아니요 | 아니요 |

클래스 전체에서 공유하며 변경하지 않을 값은 일반적으로 `static final`로 선언한다.

```java
public class RetryPolicy {

    public static final int MAX_RETRY_COUNT = 3;
    public static final int CONNECTION_TIMEOUT_SECONDS = 10;
}
```

상수 이름은 대문자로 작성하고 여러 단어는 밑줄로 구분한다.

Java 언어 명세에서 말하는 **상수 변수(Constant Variable)** 는 모든 `static final` 필드를 뜻하지 않는다. `final`로 선언된 기본형 또는 `String` 변수이면서 컴파일 타임에 계산할 수 있는 상수 표현식으로 초기화되어야 한다.

```java
public static final int MAX_RETRY_COUNT = 3;
public static final String APPLICATION_NAME = "blog";
```

다음 필드도 `static final`이지만 명세에서 정의한 상수 변수는 아니다.

```java
public static final Integer DEFAULT_PORT =
        Integer.valueOf(8080);

public static final Object LOCK =
        new Object();
```

`Integer`와 `Object`는 기본형이나 `String`이 아니다. 메서드 호출과 객체 생성도 상수 표현식에 해당하지 않는다.

참조형에 적용되는 `final`의 성질은 `static final`에서도 같다. 참조를 다른 객체로 바꿀 수 없을 뿐, 가리키는 객체가 가변이라면 내부 상태는 바뀔 수 있다.

```java
private static final List<String> MEMBERS =
        new ArrayList<>();
```

`MEMBERS`에 새로운 리스트를 대입할 수는 없지만 기존 리스트에는 값을 추가할 수 있다. 이 목록은 클래스 전체에서 공유되는 가변 상태가 된다.

변경되지 않아야 하는 목록이라면 처음부터 수정할 수 없는 형태로 만든다.

```java
public class SupportedCategories {

    private static final List<String> VALUES =
            List.of("JAVA", "SPRING");

    public static List<String> values() {
        return VALUES;
    }
}
```

`VALUES`의 참조를 다른 리스트로 변경할 수 없고, `List.of()`로 만든 목록에도 원소를 추가하거나 제거할 수 없다.

## 5. 정리

`static`은 멤버의 소속을 객체가 아닌 클래스로 바꾼다. 정적 필드는 모든 객체가 공유하며, 정적 메서드는 특정 객체 없이 실행되므로 `this`와 인스턴스 상태를 직접 사용할 수 없다.

`final`은 선언 위치에 따라 제한하는 대상이 달라진다. 변수와 필드에서는 재할당을, 메서드에서는 오버라이딩을, 클래스에서는 상속을 막는다.

`static final`은 클래스에 하나만 존재하며 다시 할당할 수 없는 필드를 표현한다. 참조형 필드라면 참조의 재할당만 제한하므로, 참조 대상 객체의 변경 가능성은 별도로 확인해야 한다.

## 6. 참고 자료

### 공식 자료

* [Java Language Specification 17 - Types, Values, and Variables](https://docs.oracle.com/javase/specs/jls/se17/html/jls-4.html#jls-4.12.4)
* [Java Language Specification 17 - Classes](https://docs.oracle.com/javase/specs/jls/se17/html/jls-8.html)
* [Java Language Specification 17 - Initialization of Classes and Interfaces](https://docs.oracle.com/javase/specs/jls/se17/html/jls-12.html#jls-12.4)

### 한글 참고 링크

* [Tecoble - 정적 메소드, 너 써도 될까?](https://tecoble.techcourse.co.kr/post/2020-07-16-static-method/)
* [Tecoble - 불변 객체를 만드는 방법](https://tecoble.techcourse.co.kr/post/2020-05-18-immutable-object/)
* [MangKyu's Diary - 불변 객체와 final을 사용해야 하는 이유](https://mangkyu.tistory.com/131)
* [기억보단 기록을 - 일급 컬렉션의 소개와 사용 이유](https://jojoldu.tistory.com/412)
