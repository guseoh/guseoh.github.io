---
title: "JPA 연관관계 매핑: 객체 참조와 외래 키"
description: "객체 참조와 외래 키로 이해하는 JPA 연관관계 매핑"
date: 2026-08-20
updated: 2026-08-20
lastVerified: 2026-08-20
slug: "jpa/relationship-mapping"
aliases: []
commentKey: "/blog/jpa/relationship-mapping/"
category: "JPA"
tags:
    - JPA
    - Hibernate
    - Association Mapping
    - ManyToOne
testedWith: {}
book: ""
series: ""
chapter: 1
heroImage: "/og-image.svg"
draft: false
---



## 1. 객체 참조와 외래 키

객체와 관계형 데이터베이스는 관계를 표현하는 방법이 다르다.

객체에서는 다른 객체를 직접 참조한다.

```java
public class Order {
    private Member member;
}
```

`Order`는 `Member` 객체를 알고 있으므로 `order.getMember()`처럼 관계를 따라갈 수 있다.

테이블은 객체 참조 대신 **외래 키(Foreign Key)** 를 사용한다.

```text
orders
----------------
id
member_id (FK)
```

`member_id`에는 `members` 테이블의 기본 키가 저장된다.

JPA의 연관관계 매핑은 이 둘을 연결합니다. Java에서는 엔티티를 참조하고, 데이터베이스에서는 그 엔티티의 식별자를 외래 키로 저장한다.

연관관계를 사용하지 않는다면 객체가 외래 키 값을 직접 들고 있을 수도 있다.

```java
private Long memberId;
```

이렇게 모델링하면 회원 정보가 필요할 때 `memberId`를 이용해 `Member`를 다시 조회해야 한다.

```java
Member member = memberRepository.findById(order.getMemberId())
    .orElseThrow();
```

엔티티를 직접 참조하면 객체 관계를 그대로 사용할 수 있다.

```java
Member member = order.getMember();
```

ORM을 사용하면 객체 모델에서는 객체 참조를 유지하면서, JPA가 이를 관계형 데이터베이스의 외래 키와 연결해 준다.

## 2. 다대일 단방향 매핑

한 명의 회원이 여러 주문을 만들 수 있다고 가정 해보면, 데이터베이스에서는 여러 `orders` 행이 하나의 `members` 행을 참조한다.

```text
Member 1 ───── N Order
```

`Order` 입장에서 보면 여러 주문이 하나의 회원을 바라보므로 **다대일(N:1)** 관계이다.

JPA에서는 `@ManyToOne`으로 표현한다.

```java
@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id")
    private Member member;
}
```

```java
@ManyToOne
private Member member;
```

현재 엔티티인 `Order`가 `Many`, 참조 대상인 `Member`가 `One`이다.

`@JoinColumn`은 이 연관관계에서 사용할 외래 키 컬럼을 지정한다.

```java
@JoinColumn(name = "member_id")
```

따라서 `Order.member`는 `orders.member_id`를 통해 `members.id`와 연결된다.

```text
Order.member
      │
      │ JPA 매핑
      ↓
orders.member_id
      │
      ↓
members.id
```

## 3. 다중성과 방향은 따로 생각한다

`Member 1 : N Order` 관계라고 해서 두 객체가 반드시 서로를 참조해야 하는 것은 아니다.

아래 매핑에서는 `Order`만 `Member`를 알고 있다.

```java
public class Order {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id")
    private Member member;
}
```

반대편 `Member`에는 주문 컬렉션이 없다.

```java
public class Member {

    private Long id;
}
```

객체에서는 `Order → Member` 방향으로만 이동할 수 있으므로 **단방향 연관관계**이다.

```java
order.getMember();  // 가능

member.getOrders(); // 불가능
```

관계형 데이터베이스에서는 외래 키를 기준으로 JOIN할 수 있기 때문에 `orders`에서 `members`를 조회할 수도 있고, 반대로 특정 회원의 주문을 찾는 SQL도 작성할 수 있다.

```sql
select *
from orders o
join members m
    on o.member_id = m.id;
```

객체의 방향은 **어떤 객체에서 다른 객체로 탐색할 수 있는가**를 나타내고, 다중성은 **두 엔티티가 몇 대 몇으로 관계를 맺는가**를 나타낸다.

## 4. 연관관계와 지연 로딩

연관관계를 매핑했다는 것과 연관된 엔티티를 항상 함께 조회한다는 것은 같은 의미가 아니다.

```java
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "member_id")
private Member member;
```

`fetch = FetchType.LAZY`는 연관된 엔티티의 데이터를 **언제 조회할지** 결정한다.

### 4.1 연관관계를 모두 즉시 조회하면 어떤 일이 생길까

`Order`를 조회한다고 해서 항상 `Member`의 이름이나 이메일까지 필요한 것은 아니다.

```java
Order order = entityManager.find(Order.class, orderId);
```

주문 상태나 주문 시간만 필요한 경우에도 연관된 `Member`를 항상 함께 조회하면 불필요한 데이터 조회가 발생할 수 있다.

`LAZY`는 연관된 엔티티의 조회 시점을 실제로 필요한 순간까지 미룬다.

`@ManyToOne`의 기본 Fetch 전략은 `EAGER`입니다. 따라서 다대일 관계를 지연 로딩하려면 `LAZY`를 명시해야 한다.

### 4.2 아직 조회하지 않은 Member를 어떻게 참조할까

```java
private Member member;
```

`Order`에는 `member` 필드가 있지만 지연 로딩으로 인해 아직 `Member`의 데이터를 조회하지 않았다면 이 필드에는 무엇이 들어갈까?

Hibernate는 대표적으로 **프록시(Proxy)** 를 사용한다.

```text
Order
id = 100
member_id = 1
```

`Order`를 조회하면 `member_id = 1`이라는 외래 키 값은 알고 있다. 하지만 지연 로딩이 적용되어 있다면 이 시점에 `members` 테이블까지 조회하지 않고 실제 `Member`를 대신할 프록시 객체를 둘 수 있다.

```text
Order
 ├─ id = 100
 └─ member
       ↓
   Member Proxy
       └─ id = 1
```

프록시는 실제 엔티티를 대신하는 객체입니다. 어떤 `Member`를 나타내는지는 알고 있지만, 이름이나 이메일처럼 실제 엔티티의 상태는 아직 조회하지 않은 상태일 수 있다.

따라서 `Order.member`가 `null`인 채로 기다리는 것이 아니라, **연관관계를 표현할 객체는 존재하고 실제 데이터 조회만 뒤로 미뤄진다.**

### 4.3 실제 데이터가 필요한 순간의 초기화

`Order`를 처음 조회할 때는 주문 데이터를 읽으면서 연관관계를 표현하는 데 필요한 외래 키 값도 함께 가져온다.

```sql
select
    o.id,
    o.member_id,
    o.status,
    o.ordered_at
from orders o
where o.id = ?;
```

이 시점에는 `member_id`는 알고 있지만 `Member`의 이름이나 이메일 같은 상태는 아직 조회하지 않았을 수 있다.

```java
String memberName = order.getMember().getName();
```

프록시가 초기화되지 않은 상태에서 실제 엔티티의 값이 필요해지면 Hibernate가 프록시를 초기화한다.

```text
order.getMember().getName()
        ↓
Member Proxy
        ↓
실제 Member 상태 필요
        ↓
프록시 초기화
```

이 과정을 **프록시 초기화**라고 한다.

초기화 과정에서 필요한 `Member`의 상태가 아직 로딩되지 않았다면 Hibernate는 데이터베이스에서 해당 엔티티를 조회하고 영속성 컨텍스트에서 관리한다.

```text
프록시 초기화
      ↓
Member 상태가 필요한가?
      ↓
필요한 데이터가 아직 없음
      ↓
SELECT
      ↓
Member 상태 로딩
```

따라서 `LAZY`는 단순히 "`getMember()`를 호출하면 무조건 SQL이 실행된다"는 의미가 아닙니다. 실제 엔티티의 상태가 필요한 시점과 현재 영속성 컨텍스트의 상태에 따라 조회 여부가 결정된다.

## 5. 참고 자료

- [꾸준히 성장하는 개발자스토리 - JPA 연관관계 매핑 기초](https://ssdragon.tistory.com/77)
- [Jakarta Persistence 3.2 Specification](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2)