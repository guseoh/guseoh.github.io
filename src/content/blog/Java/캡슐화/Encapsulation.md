---
title: "[Java] 자바의 캡슐화는 무엇일까?"
description: "객체의 상태와 규칙을 내부에 모으고, 공개된 행동으로 상태를 변경하는 캡슐화의 의미를 알아보자."
date: 2026-06-24
updated: 2026-06-27
category: "Java"
slug: "java/캡슐화/encapsulation"
commentKey: "/blog/java/캡슐화/encapsulation/"
tags:
    - Java
    - OOP
    - Encapsulation
book: ""
chapter: 1
heroImage: "/og-image.svg"
draft: false
---

## 1. 들어가기 전

이전 글에서는 접근 제한자를 사용해 클래스와 멤버에 접근할 수 있는 범위를 정하는 방법을 살펴봤다. 필드를 `private`으로 선언하면 외부 코드가 해당 필드에 직접 접근할 수 없다.

그렇다고 객체의 상태가 자동으로 보호되는 것은 아니다.

```java.
public class BankAccount {

    private long balance;

    public void setBalance(long balance) {
        this.balance = balance;
    }
}
```

`balance`는 외부에서 직접 변경할 수 없지만, 공개된 `setBalance()`를 호출하면 제한 없이 값을 저장할 수 있다.

```java
BankAccount account = new BankAccount();

account.setBalance(-10_000);
```

계좌 잔액이 음수가 될 수 없다는 규칙이 있어도 현재 객체는 그 규칙을 지키지 못한다. 필드에 대한 직접 접근만 막았을 뿐, 상태를 변경하는 방법은 그대로 외부에 열어 두었기 때문이다.

객체가 자신의 상태를 보호하려면 어떤 값을 저장할 수 있는지, 상태가 어떤 과정을 거쳐 바뀌는지까지 내부에서 관리해야 한다. 이러한 설계 원리를 **캡슐화(Encapsulation)** 라고 한다.

## 2. 상태와 규칙을 객체 안에 모은다

캡슐화는 객체의 상태와 그 상태를 다루는 행동을 함께 두고, 외부에는 필요한 기능만 공개하는 객체지향 원칙이다.

`BankAccount`의 잔액을 외부에서 직접 바꾸는 대신 입금과 출금이라는 행동으로 변경해보자.

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

외부 코드는 잔액을 직접 계산해서 저장하지 않는다. 계좌에 수행할 작업을 요청한다.

```java
BankAccount account = new BankAccount(10_000);

account.deposit(5_000);
account.withdraw(3_000);

System.out.println(account.getBalance()); // 12_000
```

초기 잔액은 음수가 될 수 없고, 입금액과 출금액은 0보다 커야 한다. 출금할 때는 현재 잔액도 확인한다. 이 규칙은 생성자와 `deposit()`, `withdraw()` 안에 있으므로 어느 코드에서 계좌를 사용하더라도 같은 조건이 적용된다.

객체가 상태를 변경하는 동안 계속 만족해야 하는 규칙을 **불변식(Invariant)** 이라고 한다. 불변식은 객체의 값이 변하지 않는다는 의미가 아니다. 값이 바뀌더라도 객체가 유효한 상태를 유지하기 위해 지켜야 하는 조건이다.

현재 예제에서는 잔액을 바꿀 수 있는 경로가 생성자, `deposit()`, `withdraw()`로 제한된다. 새로운 출금 규칙이 추가되더라도 계좌를 사용하는 모든 코드를 찾아다니지 않고 `BankAccount` 안에서 변경할 수 있다.

## 3. 캡슐화가 깨지는 지점

필드를 `private`으로 선언하는 것은 캡슐화의 시작이다. 공개된 메서드가 내부 상태를 제한 없이 노출하거나, 객체가 판단해야 할 규칙을 외부로 넘기면 접근 제한자를 사용해도 캡슐화는 약해진다.

### 3.1 상태보다 행동을 공개한다

다음 메서드는 잔액을 변경할 수 있게 해주지만 변경 목적을 드러내지 않는다.

```java
account.setBalance(20_000);
```

이 값이 입금 결과인지, 출금 결과인지, 잘못된 초기화인지 호출 코드만 보고는 알기 어렵다. 잔액을 변경하기 전에 어떤 조건을 검사해야 하는지도 외부 코드가 알아야 한다.

상태 변경의 목적을 메서드 이름으로 표현하면 객체가 제공하는 기능과 적용되는 규칙이 함께 드러난다.

```java
account.deposit(10_000);
account.withdraw(3_000);
```

`Setter` 자체가 잘못된 문법은 아니다. 단순히 데이터를 전달하거나 프레임워크가 값을 바인딩하는 객체에서는 필요할 수 있다. 하지만 상태와 규칙을 가진 객체의 모든 필드에 `Setter`를 열어 두면 외부 코드가 객체의 상태를 직접 조립하게 된다.

현재 예제에서 `BankAccount`가 제공해야 할 기능은 잔액을 임의의 값으로 교체하는 작업이 아니라 입금과 출금이다.

### 3.2 객체가 판단할 일을 외부로 꺼내지 않는다

`Getter`로 값을 조회한 뒤 외부에서 계산하고 다시 저장하는 구조도 상태 변경 규칙을 객체 밖으로 밀어낸다.

```java
if (account.getBalance() >= amount) {
    account.setBalance(account.getBalance() - amount);
}
```

이 코드는 계좌 밖에서 현재 잔액을 조회하고, 출금 가능 여부를 판단하며, 새로운 잔액까지 계산한다. 같은 출금 기능이 필요한 곳마다 잔액 부족 여부와 계산식이 반복될 수 있다.

출금 규칙을 가진 객체에 행동을 요청하면 호출하는 쪽은 금액만 전달하면 된다.

```java
account.withdraw(amount);
```

`Getter` 역시 항상 제거해야 하는 것은 아니다. 화면에 잔액을 표시하거나 응답 객체를 만드는 과정에서는 현재 상태를 조회해야 한다. 문제가 되는 지점은 값을 읽는 행위 자체가 아니라, 읽어 온 값을 바탕으로 외부 코드가 객체 대신 규칙을 판단하고 상태까지 변경하는 구조다.

### 3.3 내부의 가변 객체를 그대로 노출하지 않는다

필드가 컬렉션처럼 변경 가능한 객체라면 참조를 그대로 반환하는 것만으로 내부 상태가 외부에 노출될 수 있다.

```java
public class BankAccount {

    private final List<String> histories = new ArrayList<>();

    public List<String> getHistories() {
        return histories;
    }
}
```

호출자는 반환받은 리스트를 통해 계좌가 관리하는 내역을 직접 지울 수 있다.

```java
account.getHistories().clear();
```

내부 목록을 직접 반환하지 않고 수정할 수 없는 목록을 반환하면 외부에서 원소를 추가하거나 제거하지 못한다.

```java
public List<String> getHistories() {
    return List.copyOf(histories);
}
```

외부에서 컬렉션을 전달받아 필드에 저장할 때도 같은 경계를 고려해야 한다.

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

호출자가 생성자에 전달했던 원본 리스트를 나중에 변경해도 `BankAccount`가 보관하는 목록에는 반영되지 않는다. 이렇게 외부에서 전달받거나 외부로 반환하는 가변 데이터를 복사해 내부 상태를 보호하는 방법을 **방어적 복사(Defensive Copy)** 라고 한다.

`List.copyOf()`가 보호하는 범위는 리스트의 구조다. 리스트에 들어 있는 원소 자체가 가변 객체라면 원소의 필드를 변경하는 것까지 막지는 못한다. 현재 예제의 `String`은 불변 객체이므로 원소의 상태가 바뀌는 문제는 발생하지 않는다.

캡슐화에서 중요한 경계는 `private` 키워드 하나로 끝나지 않는다. 객체가 상태 변경 규칙을 직접 관리하는지, 외부에 공개한 메서드와 반환값을 통해 내부 상태가 우회해서 변경될 수 있는지를 함께 살펴봐야 한다.

## 4. 참고 자료

### 공식 자료

* [Oracle Java Tutorials - What Is an Object?](https://docs.oracle.com/javase/tutorial/java/concepts/object.html)

* [Oracle Java Tutorials - Controlling Access to Members of a Class](https://docs.oracle.com/javase/tutorial/java/javaOO/accesscontrol.html)

* [Java SE API - List](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/List.html)

### 한글 참고 링크

* [Tecoble - Getter를 사용하는 대신 객체에 메시지를 보내자](https://tecoble.techcourse.co.kr/post/2020-04-28-ask-instead-of-getter/)

* [Tecoble - 디미터 법칙](https://tecoble.techcourse.co.kr/post/2020-06-02-law-of-demeter/)

* [HS_dev_log - 깊은 복사(Deep Copy)와 얕은 복사(Shallow Copy)](https://innovation123.tistory.com/217)

* [이펙티브 자바 아이템 50 - 적시에 방어적 복사본을 만들라](https://github.com/peeljunKim/effective-java/discussions/121)
