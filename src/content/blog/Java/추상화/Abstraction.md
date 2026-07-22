---
title: "[Java] 자바의 추상화는 무엇일까?"
description: "객체지향의 추상화가 필요한 이유와 추상 클래스로 공통 흐름과 구현마다 달라지는 동작을 분리하는 방법을 알아본다."
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
testedWith:
    java: "17"
book: ""
chapter: 1
heroImage: "/og-image.svg"
draft: false
---

## 1. 들어가기 전

프로그램은 현실의 대상을 모든 정보와 함께 옮기지 않는다. 현재 해결하려는 문제에 필요한 속성과 행동을 선택하고 나머지는 모델에서 제외한다.

같은 회원을 다루더라도 로그인 기능에서는 인증 정보와 계정 상태가 필요하고, 배송 기능에서는 배송지와 연락처가 필요하다. 어떤 문제를 해결하느냐에 따라 같은 대상에서 선택하는 특징이 달라진다.

이처럼 **현재 문제에 필요한 특징과 역할을 선택하여 모델을 만드는 과정**을 추상화(Abstraction)라고 한다.

추상화는 `abstract` 키워드와 같은 뜻이 아니다. 추상화는 설계 과정이고, 추상 클래스와 추상 메서드는 그 결과를 자바 코드로 표현하는 방법 중 하나다.

## 2. 객체를 공통 역할로 바라본다

여러 객체를 하나의 타입으로 묶을 때는 필드 구조보다 외부에 제공하는 역할을 먼저 본다.

일반 배송 정책과 무료 배송 정책은 내부 데이터와 계산식이 다르다. 하지만 둘 다 주문 금액을 받아 배송비를 계산한다는 역할을 제공한다.

```text
주문 금액을 받는다.
        ↓
배송비를 계산한다.
        ↓
계산 결과를 반환한다.
```

두 객체를 같은 타입으로 다룰 수 있는 이유는 같은 필드를 가져서가 아니라 **배송비를 계산할 수 있다는 행동을 공통으로 제공하기 때문**이다.

추상화는 공통점을 무조건 많이 모으는 작업이 아니다. 호출 코드가 알아야 할 역할과 결과를 선택하고, 구현마다 달라지는 세부 내용을 역할 뒤로 숨긴다.

## 3. 추상 클래스로 공통 흐름과 변경 지점을 분리한다

배송비 정책마다 계산식은 다르지만 다음 실행 순서는 같다고 가정해 보자.

1. 주문 금액을 검증한다.
2. 정책별 배송비를 계산한다.
3. 계산 결과를 검증한다.
4. 배송비를 반환한다.

공통 흐름과 검증은 상위 클래스가 담당하고 실제 계산식은 하위 클래스에 맡길 수 있다.

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

외부 호출자는 `calculate()`를 사용한다. 이 메서드는 입력을 검증하고 `calculateFee()`에 실제 계산을 맡긴 뒤 결과를 다시 검증한다.

`calculateFee()`에는 구현부가 없다. 배송비를 계산해야 한다는 역할만 선언하고 구체적인 계산 방법은 하위 클래스가 제공한다.

`calculate()`는 `final`이므로 하위 클래스가 공통 실행 순서를 바꿀 수 없다. 정책이 추가되어도 입력 검증과 결과 검증은 유지되고 달라지는 부분은 계산식으로 제한된다.

### 3.1 구체 클래스는 정책별 계산을 구현한다

일반 배송 정책은 주문 금액이 50,000원 이상이면 무료이고 그보다 작으면 3,000원을 반환한다.

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

호출 코드는 구체 클래스의 계산식을 알지 않아도 `DeliveryFeePolicy`의 `calculate()`만 사용한다. 실제 객체에 따라 오버라이딩된 `calculateFee()`가 실행된다.

### 3.2 상위 클래스는 공통 조건을 유지한다

음수인 주문 금액을 전달하면 정책별 계산을 시작하기 전에 `IllegalArgumentException`이 발생한다.

```java
DeliveryFeePolicy policy =
        new StandardDeliveryFeePolicy();

policy.calculate(-1_000);
```

하위 클래스가 실수로 음수 배송비를 반환하면 상위 클래스의 결과 검증에서 `IllegalStateException`이 발생한다.

```java
public final class InvalidDeliveryFeePolicy
        extends DeliveryFeePolicy {

    @Override
    protected long calculateFee(long orderAmount) {
        return -1_000;
    }
}
```

이 클래스는 반환 타입이 `long`이므로 컴파일된다. 값의 범위는 실행 중에 `validateDeliveryFee()`가 확인한다.

상위 클래스가 입력과 결과를 검증하면 각 정책에서 같은 조건을 반복하지 않아도 된다. 다만 모든 차이를 상속 계층으로 해결할 필요는 없다. 공통 상태와 구현이 필요하지 않고 역할만 공유한다면 인터페이스가 더 단순할 수 있다.

## 4. abstract는 일부 구현을 하위 클래스에 맡긴다

`abstract`는 추상 클래스와 추상 메서드를 선언하는 자바 키워드다.

### 4.1 추상 클래스는 직접 생성할 수 없다

```java
// 컴파일 오류
// DeliveryFeePolicy policy =
//         new DeliveryFeePolicy();
```

실제 객체는 추상 클래스를 상속하고 필요한 추상 메서드를 구현한 구체 클래스의 생성자를 호출해 만든다.

```java
DeliveryFeePolicy policy =
        new StandardDeliveryFeePolicy();
```

추상 클래스도 일반 클래스처럼 필드, 생성자와 구현된 메서드를 가질 수 있다. `DeliveryFeePolicy`에서는 `calculate()`와 검증 메서드가 구현된 메서드다.

### 4.2 추상 메서드는 본문 없이 역할만 선언한다

```java
protected abstract long calculateFee(long orderAmount);
```

추상 클래스가 아닌 구체 하위 클래스는 상속받은 추상 메서드를 구현해야 한다.

```java
// 컴파일 오류: calculateFee()를 구현하지 않았다.
// public class FixedDeliveryFeePolicy
//         extends DeliveryFeePolicy {
// }
```

구현을 더 아래의 하위 클래스에 맡기려면 현재 클래스도 `abstract`로 선언해야 한다.

```java
public abstract class AdditionalDeliveryFeePolicy
        extends DeliveryFeePolicy {
}
```

현재 예제에서 상위 클래스는 공통 실행 순서와 검증을 책임지고 하위 클래스는 정책별 계산식을 구현한다. `abstract`는 이 역할 분리를 컴파일 단계에서 확인하게 한다.

## 5. 추상화와 구현 은닉을 구분한다

추상화는 현재 문제에서 필요한 역할과 행동을 선택하는 과정이다. 구현 은닉은 그 역할을 수행하는 내부 코드와 상태를 외부에서 직접 사용하지 못하게 감추는 것이다.

`DeliveryFeePolicy`는 호출자에게 `calculate()`라는 역할을 제공한다. 호출자는 정책별 계산식과 검증 순서를 알 필요가 없다. 이 구조에는 역할 선택이라는 추상화와 내부 계산을 감추는 구현 은닉이 함께 나타난다.

그러나 `abstract` 클래스를 선언했다고 추상화가 자동으로 잘된 것은 아니다. 공통 역할이 불분명하거나 하위 클래스가 상위 클래스의 규칙을 유지하지 못한다면 문법은 맞아도 적절한 타입 관계가 아니다.

먼저 호출 코드가 무엇을 필요로 하는지, 구현마다 무엇이 같고 무엇이 달라지는지를 정한 뒤 추상 클래스나 인터페이스를 선택한다.

## 6. 정리

* 추상화는 현실의 모든 정보를 옮기는 대신 현재 문제에 필요한 상태와 행동을 선택해 모델을 만드는 과정이다.
* 여러 객체는 필드 구조가 아니라 외부에 제공하는 공통 역할을 기준으로 하나의 상위 타입으로 묶을 수 있다.
* 추상 클래스는 공통 상태와 구현을 제공하면서 일부 동작의 구현을 하위 클래스에 맡길 때 사용할 수 있다.
* 추상 메서드는 본문 없이 역할만 선언하며 구체 하위 클래스는 해당 메서드의 구현을 제공해야 한다.
* `abstract`는 추상화 결과를 표현하는 문법 중 하나이며 먼저 공통 역할과 변경 지점을 설계해야 한다.

## 7. 참고 자료

### 공식 자료

* [Java Language Specification 17 - Classes](https://docs.oracle.com/javase/specs/jls/se17/html/jls-8.html)
* [Dev.java - Abstract Methods and Classes](https://dev.java/learn/inheritance/abstract-classes/)

### 한글 참고 링크

* [우아한형제들 기술블로그 - 생각하라, 객체지향처럼](https://techblog.woowahan.com/2502/)
* [기계인간 John Grib - Java Abstract Class](https://johngrib.github.io/wiki/java/abstract-class/)
* [기계인간 John Grib - 템플릿 메소드 패턴](https://johngrib.github.io/wiki/pattern/template-method/)
