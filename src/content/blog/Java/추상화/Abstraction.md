---
title: "[Java] 자바의 추상화는 무엇일까?"
description: "객체지향의 추상화가 필요한 이유와 추상 클래스로 공통 흐름과 구현마다 달라지는 동작을 분리하는 방법을 정리한다."
date: 2026-06-26
updated: 2026-07-23
lastVerified: 2026-07-23
category: "Java"
slug: "java/추상화/abstraction"
commentKey: "/blog/java/추상화/abstraction/"
tags:
    - Java
    - OOP
    - Abstraction
    - Abstract Class
testedWith: { java: "17" }
book: ""
chapter: 1
heroImage: "/og-image.svg"
draft: false
---

## 1. 들어가기 전

이전 글에서는 상속을 사용해 상위 클래스의 상태와 행동을 하위 클래스가 물려받는 방법을 살펴봤다. 상속 관계를 만들기 전에는 여러 객체를 어떤 기준으로 묶을지, 외부에 어떤 역할을 제공할지부터 정해야 한다.

이 과정이 **추상화(Abstraction)** 다.

프로그램은 현실의 대상을 그대로 옮기지 않는다. 현재 해결하려는 문제에 필요한 속성과 행동을 선택하고, 나머지는 모델에서 제외한다. 로그인 기능에서는 회원의 인증 정보가 필요하지만 배송지와 포인트는 필요하지 않은 것처럼, 같은 대상도 문제에 따라 다르게 표현된다.

이 글에서는 추상화의 의미를 먼저 살펴보고, 여러 배송비 정책의 공통 흐름과 서로 다른 계산식을 추상 클래스로 분리한다.

## 2. 문제에 필요한 특징과 역할을 선택한다

같은 회원을 다루더라도 기능마다 필요한 정보는 다르다.

<!-- table-caption: 기능에 따라 달라지는 회원의 정보와 행동 -->

| 문제 | 필요한 정보와 행동 |
| --- | --- |
| 로그인 | 인증 정보, 계정 상태, 인증 가능 여부 |
| 상품 배송 | 수령인, 배송지, 연락처 |
| 포인트 관리 | 포인트 잔액, 적립과 사용 규칙 |

로그인 기능에서 회원의 배송지를 관리할 필요는 없다. 반대로 상품을 배송하는 과정에서는 인증 비밀번호를 알 필요가 없다.

추상화는 이처럼 **현재 문제를 해결하는 데 필요한 특징을 선택하는 과정**이다. 현실의 모든 정보를 클래스 하나에 담는 것이 아니라, 프로그램에서 사용할 역할과 행동을 기준으로 모델을 만든다.

여러 객체를 하나의 타입으로 묶을 때도 같은 기준을 적용할 수 있다.

일반 배송 정책에는 기본 배송비와 무료 배송 기준이 필요하다. 무료 배송 정책은 별도의 금액 정보 없이 항상 0원을 반환할 수 있다. 내부 데이터는 다르지만 두 객체 모두 외부에 같은 역할을 제공한다.

```text
주문 금액을 받는다.
        ↓
배송비를 계산한다.
        ↓
계산 결과를 반환한다.
```

두 객체를 같은 타입으로 다룰 수 있는 이유는 필드가 비슷해서가 아니라 **배송비를 계산한다는 행동이 같기 때문**이다.

## 3. 공통 흐름과 달라지는 계산을 분리한다

배송비 정책마다 계산식은 다르지만 다음 흐름은 공통으로 유지해야 한다고 가정해 보자.

1. 주문 금액을 검증한다.
2. 정책에 맞는 배송비를 계산한다.
3. 계산 결과를 검증한다.
4. 배송비를 반환한다.

공통된 실행 순서와 검증은 상위 클래스에 두고, 실제 계산식은 하위 클래스에 맡길 수 있다.

```java
public abstract class DeliveryFeePolicy {

    public final long calculate(long orderAmount) {
        validateOrderAmount(orderAmount);

        long deliveryFee = calculateFee(orderAmount);

        validateDeliveryFee(deliveryFee);
        return deliveryFee;
    }

    protected abstract long calculateFee(long orderAmount);

    private void validateOrderAmount(long orderAmount) {
        if (orderAmount < 0) {
            throw new IllegalArgumentException(
                    "주문 금액은 음수일 수 없습니다."
            );
        }
    }

    private void validateDeliveryFee(long deliveryFee) {
        if (deliveryFee < 0) {
            throw new IllegalStateException(
                    "배송비는 음수일 수 없습니다."
            );
        }
    }
}
```

외부 호출자는 `calculate()`를 사용한다. 이 메서드는 주문 금액을 검증하고 `calculateFee()`에 실제 계산을 맡긴 뒤 결과가 음수가 아닌지 확인한다.

`calculateFee()`에는 구현부가 없다. 배송비를 계산해야 한다는 역할만 선언하고, 계산 방법은 하위 클래스가 정한다.

`calculate()`는 `final`이므로 하위 클래스에서 재정의할 수 없다. 정책이 추가되더라도 입력 검증과 결과 검증 순서는 그대로 유지되고, 변경되는 부분은 `calculateFee()`의 계산식으로 제한된다.

### 3.1 정책마다 계산식을 구현한다

일반 배송 정책은 주문 금액이 50,000원 이상이면 0원을, 그보다 작으면 3,000원을 반환한다.

```java
public final class StandardDeliveryFeePolicy
        extends DeliveryFeePolicy {

    private static final long FREE_DELIVERY_THRESHOLD = 50_000;
    private static final long BASIC_DELIVERY_FEE = 3_000;

    @Override
    protected long calculateFee(long orderAmount) {
        if (orderAmount >= FREE_DELIVERY_THRESHOLD) {
            return 0;
        }

        return BASIC_DELIVERY_FEE;
    }
}
```

무료 배송 정책은 주문 금액과 관계없이 0원을 반환한다.

```java
public final class FreeDeliveryFeePolicy
        extends DeliveryFeePolicy {

    @Override
    protected long calculateFee(long orderAmount) {
        return 0;
    }
}
```

두 클래스는 계산식이 다르지만 외부에 제공하는 사용 방법은 같다.

```java
public class DeliveryFeeExample {

    public static void main(String[] args) {
        DeliveryFeePolicy standardPolicy =
                new StandardDeliveryFeePolicy();

        DeliveryFeePolicy freePolicy =
                new FreeDeliveryFeePolicy();

        System.out.println(standardPolicy.calculate(40_000));
        System.out.println(standardPolicy.calculate(60_000));
        System.out.println(freePolicy.calculate(40_000));
    }
}
```

```text
3000
0
0
```

`standardPolicy.calculate(40_000)`을 호출하면 상위 클래스의 `calculate()`가 주문 금액을 먼저 검증한다. 이후 실제 객체인 `StandardDeliveryFeePolicy`의 `calculateFee()`가 3,000원을 반환하고, 상위 클래스가 그 결과를 다시 검증한다.

`freePolicy`도 같은 `calculate()`를 사용하지만 실제 객체가 다르므로 `FreeDeliveryFeePolicy`의 계산식이 실행된다. 호출 코드는 구체적인 계산식을 알지 않아도 `calculate()`라는 공통 동작만 사용한다.

### 3.2 상위 클래스가 공통 조건을 지킨다

`calculate()`는 0 이상의 주문 금액만 받으며, 계산 결과도 0 이상이어야 한다.

음수인 주문 금액을 전달하면 계산을 시작하기 전에 `IllegalArgumentException`이 발생한다.

```java
DeliveryFeePolicy policy =
        new StandardDeliveryFeePolicy();

policy.calculate(-1_000);
```

하위 클래스가 실수로 음수 배송비를 반환하는 경우에는 `IllegalStateException`이 발생한다.

```java
public final class InvalidDeliveryFeePolicy
        extends DeliveryFeePolicy {

    @Override
    protected long calculateFee(long orderAmount) {
        return -1_000;
    }
}
```

이 클래스는 `long` 값을 반환하므로 컴파일된다. 값이 올바른 범위에 있는지는 실행 중에 상위 클래스의 `validateDeliveryFee()`가 검사한다.

상위 클래스가 입력과 결과를 검증하므로 각 배송비 정책에서 같은 조건을 반복해서 구현하지 않아도 된다.

## 4. 현재 예제에 필요한 `abstract` 규칙

추상화는 문제에 필요한 역할과 책임을 선택하는 설계 과정이며, `abstract`는 그 결과를 클래스와 메서드로 표현하는 자바 문법 가운데 하나다.

### 4.1 추상 클래스는 직접 생성할 수 없다

`abstract`로 선언한 클래스는 `new`로 직접 생성할 수 없다.

```java
// 컴파일 오류
DeliveryFeePolicy policy =
        new DeliveryFeePolicy();
```

실제 객체는 추상 클래스를 상속하고 필요한 메서드를 구현한 구체 클래스의 생성자를 호출해 만든다.

```java
DeliveryFeePolicy policy =
        new StandardDeliveryFeePolicy();
```

추상 클래스도 일반 클래스처럼 필드, 생성자와 구현된 메서드를 가질 수 있다. 현재 예제에서는 `calculate()`와 두 검증 메서드가 구현된 메서드에 해당한다.

### 4.2 추상 메서드는 하위 클래스가 구현한다

추상 메서드는 실행할 본문 없이 선언만 작성한다.

```java
protected abstract long calculateFee(long orderAmount);
```

추상 클래스가 아닌 구체 클래스는 상속받은 추상 메서드의 구현을 제공해야 한다.

다음 클래스는 `calculateFee()`를 구현하지 않았으므로 컴파일되지 않는다.

```java
// 컴파일 오류
public class FixedDeliveryFeePolicy
        extends DeliveryFeePolicy {
}
```

구현을 더 아래의 하위 클래스에 맡기려면 현재 클래스도 `abstract`로 선언해야 한다.

```java
public abstract class AdditionalDeliveryFeePolicy
        extends DeliveryFeePolicy {
}
```

현재 예제에서 상위 클래스는 공통 실행 순서와 검증을 책임지고, 하위 클래스는 정책별 계산식을 구현한다. `abstract`는 이 역할 분리를 코드로 강제한다.

## 5. 정리

추상화에서는 현실의 모든 정보를 옮기기보다 현재 문제에 필요한 역할과 행동을 선택한다. 여러 객체가 같은 행동을 제공한다면 하나의 상위 타입으로 묶을 수 있다.

추상 클래스는 공통 상태와 구현을 보관하면서 일부 동작을 하위 클래스에 맡길 때 사용할 수 있다. 현재 예제에서는 `calculate()`가 공통 흐름을 고정하고, `calculateFee()`가 정책별 차이를 표현한다.

`abstract` 키워드를 사용했다고 설계가 자동으로 좋아지는 것은 아니다. 먼저 어떤 역할을 공통으로 제공하고 어떤 부분이 구현마다 달라지는지 정한 뒤, 그 결과를 표현하는 문법으로 사용해야 한다.

## 6. 참고 자료

### 공식 자료

* [The Java Language Specification, Java SE 17 Edition - Chapter 8. Classes](https://docs.oracle.com/javase/specs/jls/se17/html/jls-8.html)
* [Abstract Methods and Classes - Dev.java](https://dev.java/learn/inheritance/abstract-classes/)

### 한글 참고 링크

* [우아한형제들 기술블로그 - 생각하라, 객체지향처럼](https://techblog.woowahan.com/2502/)
* [기계인간 John Grib - Java Abstract Class](https://johngrib.github.io/wiki/java/abstract-class/)
* [기계인간 John Grib - 템플릿 메소드 패턴](https://johngrib.github.io/wiki/pattern/template-method/)
