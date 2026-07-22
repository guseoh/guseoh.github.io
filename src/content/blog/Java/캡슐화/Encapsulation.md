---
title: "[Java] 자바의 캡슐화는 무엇일까?"
description: "객체의 상태와 규칙을 내부에 모으고 공개된 행동으로 상태를 변경하는 캡슐화의 의미를 알아본다."
date: 2026-06-24
updated: 2026-07-23
lastVerified: 2026-07-23
category: "Java"
slug: "java/캡슐화/encapsulation"
commentKey: "/blog/java/캡슐화/encapsulation/"
tags:
    - Java
    - OOP
    - Encapsulation
testedWith:
    java: "17"
book: ""
chapter: 1
heroImage: "/og-image.svg"
draft: false
---

## 1. 들어가기 전

필드를 `private`으로 선언하면 외부 코드가 해당 필드에 직접 접근할 수 없다. 하지만 필드를 감추는 것만으로 객체의 상태와 규칙이 자동으로 보호되지는 않는다.

```java
public class BankAccount {

    private long balance;

    public void setBalance(long balance) {
        this.balance = balance;
    }
}
```

`balance`는 직접 변경할 수 없지만 공개된 `setBalance()`를 호출하면 어떤 값이든 저장할 수 있다.

```java
BankAccount account = new BankAccount();
account.setBalance(-10_000);
```

계좌 잔액이 음수가 될 수 없다는 규칙이 있어도 현재 객체는 그 조건을 지키지 못한다. 필드 접근만 막았을 뿐 상태를 변경하는 방법과 판단은 외부에 열려 있기 때문이다.

객체가 자신의 상태를 보호하려면 어떤 값을 허용하고 어떤 과정을 거쳐 상태를 변경할지 내부에서 관리해야 한다. 이러한 설계 원리를 **캡슐화(Encapsulation)** 라고 한다.

## 2. 상태와 규칙을 객체 안에 모은다

캡슐화는 객체의 상태와 그 상태를 다루는 행동을 함께 두고 외부에는 필요한 기능만 공개하는 객체지향 원칙이다.

잔액을 임의의 값으로 교체하는 메서드 대신 입금과 출금이라는 행동을 제공해 보자.

```java
public class BankAccount {

    private long balance;

    public BankAccount(long initialBalance) {
        if (initialBalance < 0) {
            throw new IllegalArgumentException(
                    "초기 잔액은 음수일 수 없습니다."
            );
        }

        this.balance = initialBalance;
    }

    public void deposit(long amount) {
        validatePositiveAmount(amount);
        balance += amount;
    }

    public void withdraw(long amount) {
        validatePositiveAmount(amount);

        if (balance < amount) {
            throw new IllegalStateException("잔액이 부족합니다.");
        }

        balance -= amount;
    }

    public long getBalance() {
        return balance;
    }

    private static void validatePositiveAmount(long amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException(
                    "금액은 0보다 커야 합니다."
            );
        }
    }
}
```

외부 코드는 잔액을 계산해서 저장하지 않고 계좌에 수행할 작업을 요청한다.

```java
BankAccount account = new BankAccount(10_000);

account.deposit(5_000);
account.withdraw(3_000);

System.out.println(account.getBalance()); // 12_000
```

초기 잔액은 음수가 될 수 없고 입금액과 출금액은 0보다 커야 한다. 출금할 때는 현재 잔액도 확인한다. 이 규칙은 생성자와 상태 변경 메서드 안에 있으므로 계좌를 사용하는 모든 코드에 같은 조건이 적용된다.

객체가 상태를 변경하는 동안 계속 만족해야 하는 조건을 **불변식(Invariant)** 이라고 한다. 불변식은 값이 전혀 변하지 않는다는 뜻이 아니다. 값이 바뀌더라도 객체가 유효한 상태를 유지하기 위해 지켜야 하는 규칙이다.

## 3. 상태보다 행동을 공개한다

다음 메서드는 잔액을 변경할 수 있게 하지만 변경 목적을 표현하지 않는다.

```java
account.setBalance(20_000);
```

이 값이 입금 결과인지 출금 결과인지 호출 코드만으로는 알기 어렵다. 어떤 검증을 해야 하는지도 외부 코드가 알아야 한다.

상태 변경의 목적을 메서드 이름으로 표현하면 객체가 제공하는 기능과 규칙이 함께 드러난다.

```java
account.deposit(10_000);
account.withdraw(3_000);
```

`Setter`는 잘못된 문법이 아니다. 단순한 데이터 전달 객체처럼 규칙 없이 값을 담는 구조에서는 사용할 수 있다. 그러나 상태와 불변식을 가진 객체의 모든 필드에 `Setter`를 열어 두면 외부 코드가 객체의 상태를 직접 조립하게 된다.

현재 `BankAccount`가 제공해야 할 기능은 잔액을 임의의 값으로 교체하는 작업이 아니라 입금과 출금이다.

### 3.1 객체가 판단할 규칙을 외부로 꺼내지 않는다

`Getter`로 값을 조회한 뒤 외부에서 계산하고 다시 저장하면 상태 변경 규칙이 객체 밖으로 이동한다.

```java
if (account.getBalance() >= amount) {
    account.setBalance(account.getBalance() - amount);
}
```

이 코드는 계좌 밖에서 잔액을 조회하고 출금 가능 여부를 판단하며 새 잔액을 계산한다. 같은 출금 기능이 필요한 곳마다 조건과 계산식이 반복될 수 있다.

```java
account.withdraw(amount);
```

출금 규칙을 가진 객체에 행동을 요청하면 호출하는 쪽은 금액만 전달하면 된다. 규칙이 바뀌어도 `BankAccount` 내부의 출금 로직을 수정하면 된다.

`Getter` 역시 항상 제거할 대상은 아니다. 화면이나 응답에 현재 잔액을 표시하려면 상태 조회가 필요하다. 문제는 값을 읽는 행위보다 읽어 온 값을 바탕으로 외부 코드가 객체 대신 규칙을 판단하고 상태까지 변경하는 구조다.

## 4. 가변 객체를 그대로 노출하면 내부 상태가 우회해서 변경된다

필드가 컬렉션처럼 변경 가능한 객체라면 참조를 그대로 반환하는 것만으로 내부 상태가 외부에 노출될 수 있다.

```java
public class BankAccount {

    private final List<String> histories = new ArrayList<>();

    public List<String> getHistories() {
        return histories;
    }
}
```

호출자는 반환받은 목록을 직접 변경할 수 있다.

```java
account.getHistories().clear();
```

수정할 수 없는 복사본을 반환하면 외부에서 목록의 구조를 바꾸지 못한다.

```java
public List<String> getHistories() {
    return List.copyOf(histories);
}
```

외부에서 컬렉션을 전달받아 필드에 저장할 때도 같은 경계를 고려한다.

```java
public class BankAccount {

    private final List<String> histories;

    public BankAccount(List<String> histories) {
        this.histories = List.copyOf(histories);
    }

    public List<String> getHistories() {
        return histories;
    }
}
```

호출자가 생성자에 전달한 원본 목록을 나중에 변경해도 객체가 보관하는 목록에는 반영되지 않는다. 외부에서 전달받거나 외부로 반환하는 가변 데이터를 복사해 내부 상태를 보호하는 방법을 **방어적 복사(Defensive Copy)** 라고 한다.

`List.copyOf()`가 보호하는 범위는 목록의 구조다. 원소 자체가 가변 객체라면 원소 내부 상태의 변경까지 막지는 못한다. 현재 예제의 `String`은 불변 객체이므로 원소 상태가 바뀌는 문제는 없다.

## 5. 접근 제한자와 캡슐화는 같은 개념이 아니다

접근 제한자는 Java 언어가 접근 가능 범위를 검사하는 문법이다. 캡슐화는 상태와 규칙을 객체 내부에 모으고 필요한 행동만 외부에 공개하는 설계 원칙이다.

필드를 `private`으로 선언해도 제한 없는 `Setter`를 제공하거나 내부 가변 객체를 그대로 반환하면 외부에서 상태를 우회해서 변경할 수 있다. 반대로 객체가 상태 변경 경로를 의미 있는 메서드로 제한하고 입력과 결과를 검증하면 객체가 자신의 규칙을 관리할 수 있다.

캡슐화는 내부를 무조건 숨기는 것이 아니라 외부 코드가 알아야 할 계약과 객체가 내부에서 책임질 구현을 구분하는 과정이다.

## 6. 정리

* 캡슐화는 객체의 상태와 상태 변경 규칙을 내부에 모으고 외부에는 필요한 행동만 공개하는 설계 원칙이다.
* 필드를 `private`으로 선언해도 제한 없는 `Setter`를 제공하면 객체의 상태 규칙을 외부 코드가 우회할 수 있다.
* 상태를 임의의 값으로 교체하는 메서드보다 입금과 출금처럼 변경 목적과 검증이 드러나는 행동을 제공한다.
* 객체가 판단할 조건과 계산을 외부로 꺼내지 않으면 규칙 변경의 범위를 객체 내부로 제한할 수 있다.
* 내부의 가변 객체를 전달하거나 반환할 때 방어적 복사를 사용하면 외부 참조를 통한 상태 변경을 줄일 수 있다.

## 7. 참고 자료

### 공식 자료

* [Oracle Java Tutorials - What Is an Object?](https://docs.oracle.com/javase/tutorial/java/concepts/object.html)
* [Oracle Java Tutorials - Controlling Access to Members of a Class](https://docs.oracle.com/javase/tutorial/java/javaOO/accesscontrol.html)
* [Java SE 26 API - List](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/List.html)

### 한글 참고 링크

* [Tecoble - Getter를 사용하는 대신 객체에 메시지를 보내자](https://tecoble.techcourse.co.kr/post/2020-04-28-ask-instead-of-getter/)
* [Tecoble - 디미터 법칙](https://tecoble.techcourse.co.kr/post/2020-06-02-law-of-demeter/)
* [HS_dev_log - 깊은 복사와 얕은 복사](https://innovation123.tistory.com/217)
* [이펙티브 자바 아이템 50 - 적시에 방어적 복사본을 만들라](https://github.com/peeljunKim/effective-java/discussions/121)
