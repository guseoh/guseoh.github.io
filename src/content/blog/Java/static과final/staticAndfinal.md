---
title: "자바의 static과 final은 무엇일까?"
description: "static 멤버가 클래스에 속하는 방식과 final이 변수 재할당, 메서드 오버라이딩과 클래스 상속을 제한하는 범위를 알아본다."
date: 2026-06-24
updated: 2026-07-23
lastVerified: 2026-07-23
slug: "java/static과final/staticandfinal"
aliases: []
commentKey: "/blog/java/static과final/staticandfinal/"
category: "Java"
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

접근 제한자는 클래스와 멤버를 어느 범위까지 공개할지 정한다. 그러나 멤버가 객체마다 존재하는지 클래스에 하나만 존재하는지, 값을 다시 대입할 수 있는지와 상속으로 동작을 바꿀 수 있는지는 별도의 성질이다.

자바는 이를 `static`과 `final`로 표현한다.

<!-- table-caption: static과 final의 역할 -->

| 키워드 | 표현하는 내용 |
| --- | --- |
| `static` | 멤버가 개별 객체가 아니라 클래스에 속한다. |
| `final` | 선언 위치에 따라 재할당, 오버라이딩 또는 상속을 제한한다. |

```java
private static int memberCount;
private final String email;
```

`memberCount`는 모든 `Member` 객체가 공유하는 클래스 필드다. `email`은 객체마다 존재하지만 초기화된 뒤 다른 값으로 다시 대입할 수 없다.

두 키워드는 역할이 다르다. `static` 필드도 값을 변경할 수 있고 `final` 인스턴스 필드는 객체마다 따로 존재할 수 있다.

## 2. static 멤버는 클래스에 속한다

일반적인 인스턴스 필드는 객체마다 별도로 존재한다. `static` 필드는 특정 객체가 아니라 클래스에 속하므로 객체를 여러 개 만들어도 하나의 값을 공유한다.

### 2.1 static 필드는 모든 객체가 같은 값을 사용한다

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

`email`은 객체마다 다른 인스턴스 필드다. `memberCount`는 클래스에 하나만 존재하는 정적 필드이므로 두 객체가 같은 값을 증가시킨다.

정적 멤버는 클래스 이름으로 접근한다.

```java
int count = Member.getMemberCount();
```

자바 문법상 객체 참조로 정적 메서드를 호출할 수도 있지만 특정 객체의 상태를 사용하는 것처럼 보인다.

```java
// 가능하지만 권장하지 않는 표현
int count = first.getMemberCount();
```

실제 호출 대상은 `Member` 클래스이므로 `Member.getMemberCount()`로 작성하는 편이 의미가 분명하다.

변경 가능한 `static` 필드는 여러 코드가 같은 상태를 수정한다. `memberCount++`은 공유 특성을 설명하기 위한 예제이며 여러 스레드가 동시에 실행하면 증가 결과가 유실될 수 있다. `static`은 값을 공유하게 만들지만 동시성 안전성을 보장하지 않는다.

### 2.2 static 메서드는 특정 객체 없이 실행된다

정적 메서드는 객체를 생성하지 않고 클래스 이름으로 호출할 수 있다.

```java
public class EmailNormalizer {

    public static String normalize(String email) {
        return email.trim().toLowerCase();
    }
}
```

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

`memberCount`는 클래스에 속하므로 사용할 수 있다. `email`은 객체마다 값이 다른데 정적 메서드에는 어느 객체를 사용할지 결정할 현재 객체가 없다.

객체를 매개변수로 전달받으면 해당 객체의 인스턴스 메서드를 호출할 수 있다.

```java
public static void printEmail(Member member) {
    System.out.println(member.getEmail());
}
```

입력값만으로 결과를 계산하거나 클래스 전체가 공유하는 정적 상태를 관리하는 기능은 정적 메서드로 표현할 수 있다. 객체의 상태에 따라 결과가 달라지는 행동은 인스턴스 메서드로 두어 어떤 객체가 행동을 수행하는지 드러낸다.

### 2.3 static 초기화는 클래스 초기화 시점에 실행된다

정적 필드 초기화식과 정적 초기화 블록은 클래스가 초기화될 때 소스 코드에 작성된 순서대로 실행된다.

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

```java
System.out.println(AppConfig.getMaxRetryCount()); // 5
```

정적 필드에 `3`이 먼저 들어가고 정적 초기화 블록이 실행되어 값이 `5`가 된다. 값 하나를 바로 대입할 수 있다면 필드 선언에서 초기화하는 편이 간단하다.

## 3. final은 선언 위치에 따라 다른 대상을 제한한다

`final`은 변수와 필드, 메서드와 클래스에 사용할 수 있다.

<!-- table-caption: final을 선언한 위치별 의미 -->

| 선언 위치 | `final`의 의미 |
| --- | --- |
| 변수 또는 필드 | 값을 한 번 할당한 뒤 다시 할당할 수 없다. |
| 메서드 | 하위 클래스에서 오버라이딩할 수 없다. |
| 클래스 | 다른 클래스가 상속할 수 없다. |

### 3.1 final 변수와 필드는 다시 할당할 수 없다

```java
final int maxRetryCount = 3;

// 컴파일 오류
// maxRetryCount = 5;
```

인스턴스 필드를 `final`로 선언하면 객체를 만들 때 값을 정하고 이후 다시 대입할 수 없다.

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

선언할 때 초기화하지 않은 `final` 필드는 모든 생성 경로에서 한 번 초기화되어야 한다.

```java
public class Member {

    private final String email;

    public Member() {
        this("guest@example.com");
    }

    public Member(String email) {
        this.email = email;
    }
}
```

어느 생성자를 호출하더라도 `email`이 정확히 한 번 초기화된다. 생성자가 끝날 때까지 값이 정해지지 않는 경로가 있으면 컴파일 오류가 발생한다.

### 3.2 final 참조가 객체를 불변으로 만들지는 않는다

참조형 변수에 `final`을 선언하면 다른 객체의 참조값을 다시 대입할 수 없다.

```java
final List<String> names = new ArrayList<>();

// 컴파일 오류
// names = new ArrayList<>();
```

현재 가리키는 `ArrayList` 객체는 여전히 변경할 수 있다.

```java
names.add("Kim");
names.add("Lee");

System.out.println(names); // [Kim, Lee]
```

`final`이 제한하는 것은 변수의 재할당이다. 객체의 불변성은 객체의 상태 변경 메서드, 필드 구성과 가변 데이터를 외부에 노출하는 방식까지 함께 설계해야 한다.

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

`List.copyOf()`로 복사한 목록에는 원소를 추가하거나 제거할 수 없다. 다만 원소 자체가 가변 객체라면 원소 내부 상태까지 자동으로 불변이 되는 것은 아니다.

### 3.3 final 메서드와 클래스는 확장을 제한한다

메서드에 `final`을 선언하면 하위 클래스가 해당 메서드를 오버라이딩할 수 없다.

```java
public class Account {

    public final void validate() {
        System.out.println("계좌 상태를 검사합니다.");
    }
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

`final` 메서드는 오버라이딩으로 동작이 바뀌지 않아야 할 때 사용한다. `final` 클래스는 더 이상의 하위 타입을 허용하지 않을 때 사용한다.

## 4. static final은 클래스에 하나만 존재하고 다시 할당할 수 없다

`static`과 `final`을 함께 사용하면 두 키워드의 의미가 모두 적용된다.

```java
public static final int MAX_RETRY_COUNT = 3;
```

`static`이므로 클래스에 하나만 존재하고 `final`이므로 초기화된 뒤 다른 값을 다시 대입할 수 없다.

<!-- table-caption: static과 final 조합별 필드 성질 -->

| 선언 | 객체마다 존재하는가 | 다시 할당할 수 있는가 |
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

Java 언어 명세의 상수 변수(Constant Variable)는 모든 `static final` 필드를 뜻하지 않는다. `final`인 기본형 또는 `String` 변수이면서 상수 표현식으로 초기화되어야 한다.

```java
public static final int MAX_RETRY_COUNT = 3;
public static final String APPLICATION_NAME = "blog";
```

다음 필드는 `static final`이지만 명세에서 정의한 상수 변수는 아니다.

```java
public static final Integer DEFAULT_PORT =
        Integer.valueOf(8080);

public static final Object LOCK = new Object();
```

참조형 `static final` 필드도 참조의 재할당만 제한한다. 가리키는 객체가 가변이라면 클래스 전체에서 공유되는 가변 상태가 될 수 있다.

## 5. 정리

* `static` 필드와 메서드는 특정 객체가 아니라 클래스에 속하며 정적 메서드에는 현재 객체를 나타내는 `this`가 없다.
* 변경 가능한 정적 필드는 여러 코드와 객체가 함께 수정하는 공유 상태가 되며 `static` 자체는 동시성 안전성을 보장하지 않는다.
* `final` 변수와 필드는 재할당을 제한하고 `final` 메서드는 오버라이딩을, `final` 클래스는 상속을 막는다.
* 참조형 변수에 `final`을 붙여도 참조 대상 객체의 상태 변경까지 막지는 않으므로 불변성과 구분해야 한다.
* `static final` 필드는 클래스에 하나만 존재하고 다시 할당할 수 없지만 모든 `static final` 필드가 언어 명세의 상수 변수인 것은 아니다.

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
