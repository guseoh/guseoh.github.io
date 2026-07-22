---
title: "자바의 접근 제한자는 무엇일까?"
description: "자바의 public, protected, package-private, private 접근 범위와 공개 범위를 최소화해야 하는 이유를 알아본다."
date: 2026-06-22
updated: 2026-07-23
lastVerified: 2026-07-23
category: "Java"
slug: "java/접근제한자/accessmodifier"
commentKey: "/blog/java/접근제한자/accessmodifier/"
tags:
    - Java
    - Access Modifier
    - Encapsulation
testedWith:
    java: "17"
book: ""
chapter: 1
heroImage: "/og-image.svg"
draft: false
---

## 1. 들어가기 전

생성자에서 객체의 초기 상태를 검증해도 외부 코드가 필드를 직접 변경할 수 있다면 규칙을 유지하기 어렵다.

```java
public class Member {

    public String email;

    public Member(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException(
                    "이메일은 비어 있을 수 없습니다."
            );
        }

        this.email = email;
    }
}
```

```java
Member member = new Member("member@example.com");
member.email = null;
```

`email`이 `public`이므로 외부 코드는 생성자의 검증을 거치지 않고 값을 바꿀 수 있다. 자바의 접근 제한자(access modifier)는 클래스와 멤버에 접근할 수 있는 코드의 범위를 정한다.

접근 제한자는 단순히 컴파일 오류를 만드는 문법이 아니다. 외부에 공개할 기능과 내부 구현을 구분하고, 다른 코드가 클래스의 세부 구조에 의존하는 범위를 조절한다.

## 2. 접근 수준은 네 가지다

자바에서 사용하는 접근 수준은 `public`, `protected`, `package-private`, `private` 네 가지다.

```text
private < package-private < protected < public
```

`package-private`은 별도의 키워드가 아니다. 접근 제한자를 작성하지 않았을 때 적용되는 접근 수준을 가리킨다.

<!-- table-caption: 접근 수준별 사용 가능 범위 -->

| 접근 수준 | 같은 클래스 | 같은 패키지 | 다른 패키지의 하위 클래스 | 그 밖의 외부 코드 |
| --- | --- | --- | --- | --- |
| `private` | O | X | X | X |
| `package-private` | O | O | X | X |
| `protected` | O | O | O | X |
| `public` | O | O | O | O |

표는 기본 범위를 요약한 것이다. 다른 패키지의 하위 클래스에서 `protected` 멤버에 접근할 때는 상속 관계와 접근 표현식의 타입까지 함께 적용된다.

### 2.1 private은 클래스 내부 구현을 감춘다

`private` 멤버는 해당 클래스를 선언한 최상위 클래스의 내부에서만 사용할 수 있다.

```java
public class Member {

    private String email;

    private void validateEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException(
                    "이메일은 비어 있을 수 없습니다."
            );
        }
    }
}
```

다른 클래스는 같은 패키지에 있거나 `Member`를 상속하더라도 `email`과 `validateEmail()`에 직접 접근할 수 없다.

필드를 `private`으로 감추면 외부 코드가 필드 구조에 직접 의존하지 않는다. 클래스는 필요한 조회와 상태 변경 메서드만 공개하고 내부 표현은 외부 계약을 유지하는 범위에서 바꿀 수 있다.

### 2.2 package-private은 패키지를 구현 경계로 사용한다

접근 제한자를 생략하면 같은 패키지에서만 사용할 수 있다.

```java
class EmailValidator {

    boolean isValid(String email) {
        return email != null && email.contains("@");
    }
}
```

`EmailValidator`와 `isValid()`는 같은 패키지의 코드에서만 접근할 수 있다. 패키지 밖에는 공개 인터페이스만 보여 주고 구현 클래스는 `package-private`으로 둘 수 있다.

```java
public interface EmailSender {

    void send(String email);
}
```

```java
class SmtpEmailSender implements EmailSender {

    @Override
    public void send(String email) {
        // SMTP 전송
    }
}
```

다른 패키지는 `EmailSender`를 사용할 수 있지만 `SmtpEmailSender`를 직접 참조할 수 없다. 구현을 패키지 안에 숨기면 외부 코드가 구체 클래스보다 공개된 역할에 의존하도록 만들 수 있다.

접근 제한자를 생략한 상태를 `default` 접근 제한자라고 부르기도 하지만 자바 문법에 `default`라는 접근 제한자는 없다. `default`는 인터페이스 기본 메서드와 `switch` 등 다른 문법에서 사용하는 키워드다.

### 2.3 protected는 패키지 접근과 상속 접근을 제공한다

`protected` 멤버는 같은 패키지에서 사용할 수 있다. 다른 패키지에서는 해당 클래스를 상속한 하위 클래스가 상속 관계를 통해 접근할 수 있다.

```java
package account;

public class Account {

    private long balance;

    protected void decreaseBalance(long amount) {
        if (amount <= 0 || balance < amount) {
            throw new IllegalArgumentException(
                    "출금할 수 없는 금액입니다."
            );
        }

        balance -= amount;
    }
}
```

```java
package saving;

import account.Account;

public class SavingsAccount extends Account {

    public void withdraw(long amount) {
        decreaseBalance(amount);
    }
}
```

`SavingsAccount`는 다른 패키지에 있지만 `Account`의 하위 클래스이므로 상속받은 `decreaseBalance()`를 호출할 수 있다.

다른 패키지의 하위 클래스가 `protected` 멤버를 임의의 상위 클래스 객체를 통해 사용할 수 있는 것은 아니다.

```java
public void withdrawFrom(Account account, long amount) {
    // 컴파일 오류
    // account.decreaseBalance(amount);
}
```

다른 패키지에서는 현재 하위 클래스 객체의 상속 관계를 통해 접근해야 한다. `protected`는 외부 전체에 공개하는 접근 수준이 아니라 하위 클래스가 확장에 필요한 기능을 사용하도록 허용하는 범위다.

### 2.4 public은 외부에 공개할 API를 만든다

`public` 최상위 클래스는 다른 패키지에서 사용할 수 있다. `public` 멤버는 해당 클래스를 사용할 수 있는 모든 코드에 공개된다.

```java
public class Member {

    private final String nickname;

    public Member(String nickname) {
        this.nickname = nickname;
    }

    public String getNickname() {
        return nickname;
    }
}
```

공개된 클래스와 메서드는 여러 코드가 의존할 수 있다. 이름, 매개변수, 반환 타입과 외부에서 관찰할 수 있는 동작을 바꾸면 호출 코드에도 영향이 전달된다.

외부에서 사용할 가능성만으로 모든 선언을 `public`으로 열기보다 실제로 공개해야 하는 기능에만 사용한다.

## 3. 선언 위치에 따라 사용할 수 있는 접근 제한자가 다르다

최상위 클래스와 클래스 내부의 멤버는 사용할 수 있는 접근 제한자가 다르다.

### 3.1 최상위 클래스는 public 또는 package-private이다

소스 파일의 최상위 영역에 선언한 클래스에는 `public` 또는 `package-private`만 사용할 수 있다.

```java
public class Member {
}

class MemberValidator {
}
```

최상위 클래스를 `private`이나 `protected`로 선언하면 컴파일 오류가 발생한다.

```java
// 컴파일 오류
// private class PrivateMember {
// }

// 컴파일 오류
// protected class ProtectedMember {
// }
```

하나의 소스 파일에는 `public` 최상위 타입을 하나만 선언할 수 있으며 파일 이름은 그 타입의 이름과 같아야 한다.

### 3.2 클래스 멤버에는 네 가지 접근 수준을 사용할 수 있다

필드, 메서드, 생성자와 멤버 클래스에는 네 가지 접근 수준을 사용할 수 있다.

```java
public class Member {

    private String email;

    protected Member() {
    }

    public Member(String email) {
        this.email = email;
    }

    String normalizeEmail() {
        return email.trim().toLowerCase();
    }
}
```

생성자의 접근 범위를 제한하면 객체를 만들 수 있는 코드도 제한된다. `private` 생성자는 같은 클래스 내부에서만 호출할 수 있고, `package-private` 생성자는 같은 패키지에서만 호출할 수 있다.

## 4. 오버라이딩에서는 접근 범위를 좁힐 수 없다

하위 클래스가 상위 클래스의 메서드를 오버라이딩할 때 접근 범위를 더 좁게 바꿀 수 없다.

```java
class Parent {

    protected void print() {
    }
}
```

```java
class Child extends Parent {

    @Override
    public void print() {
    }
}
```

`protected` 메서드를 `public`으로 넓혀 재정의하는 것은 가능하다. 반대로 `private`이나 `package-private`으로 좁히면 컴파일 오류가 발생한다.

상위 타입을 사용하는 코드는 상위 클래스가 공개한 범위에서 메서드를 호출할 수 있어야 한다. 하위 클래스가 접근 범위를 좁히면 상위 타입의 사용 가능 범위를 깨뜨리기 때문에 허용되지 않는다.

`private` 메서드는 하위 클래스에서 접근할 수 없으므로 상속받아 오버라이딩하는 대상이 아니다. 하위 클래스에 같은 이름과 매개변수의 메서드를 선언해도 별개의 메서드다.

## 5. 필요한 최소 범위만 공개한다

접근 범위를 넓히면 당장 호출하기는 편하지만 더 많은 코드가 내부 구조에 의존할 수 있다. 공개 범위는 필요한 수준에서 시작한다.

```java
public class BankAccount {

    private long balance;

    public void deposit(long amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException(
                    "입금액은 0보다 커야 합니다."
            );
        }

        balance += amount;
    }

    public long getBalance() {
        return balance;
    }
}
```

외부 코드는 `balance`를 직접 바꾸지 않고 `deposit()`이라는 공개 동작을 사용한다. 필드를 감추는 것만으로 모든 설계가 완성되지는 않지만 객체가 상태 변경 규칙을 관리할 경계를 만든다.

접근 제한자는 Java 언어가 보장하는 접근 규칙이다. 캡슐화는 이 문법을 이용해 상태와 구현을 어디까지 숨기고 어떤 행동을 공개할지 결정하는 설계 원칙이다. `private`을 사용했다고 캡슐화가 자동으로 완성되는 것은 아니며 공개 메서드가 어떤 변경을 허용하는지도 함께 설계해야 한다.

## 6. 정리

* `private`은 클래스 내부 구현을 감추고 `package-private`은 같은 패키지를 구현 경계로 사용할 수 있게 한다.
* `protected`는 같은 패키지와 다른 패키지의 하위 클래스에 접근을 허용하지만 외부 전체에 공개하는 범위는 아니다.
* `public` 선언은 외부 코드가 의존할 수 있는 API가 되므로 실제로 공개해야 하는 타입과 멤버에만 사용한다.
* 최상위 클래스에는 `public`과 `package-private`만 사용할 수 있고 클래스 멤버에는 네 가지 접근 수준을 적용할 수 있다.
* 오버라이딩하는 메서드는 상위 메서드보다 접근 범위를 좁힐 수 없으며 공개 범위는 필요한 최소 수준에서 시작한다.

## 7. 참고 자료

### 공식 자료

* [Java Language Specification 26 - Names and Access Control](https://docs.oracle.com/javase/specs/jls/se26/html/jls-6.html)
* [Java Language Specification 26 - Class Members](https://docs.oracle.com/javase/specs/jls/se26/html/jls-8.html#jls-8.2)
* [Java Language Specification 26 - Overriding](https://docs.oracle.com/javase/specs/jls/se26/html/jls-8.html#jls-8.4.8)
* [Oracle Java Tutorials - Controlling Access to Members of a Class](https://docs.oracle.com/javase/tutorial/java/javaOO/accesscontrol.html)

### 한글 참고 링크

* [Inkyu Yoon - 자바의 접근 제어자와 protected와 private는 왜 사용되는가?](https://inkyu-yoon.github.io/docs/Language/Java/AccessModifier)
* [MangKyu's Diary - 부모 클래스의 메소드 오버라이딩이 더 큰 범위의 접근 제어자만 가능한 이유](https://mangkyu.tistory.com/228)
* [컬리 기술 블로그 - Java 버전별 캡슐화 정책 강화](https://helloworld.kurly.com/blog/75-java-module-with-gson-serialization/)
