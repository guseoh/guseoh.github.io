---
title: "[Java] 자바 컬렉션 프레임워크는 무엇일까?"
description: "자바 컬렉션 프레임워크가 여러 객체를 저장하고 다루는 공통 인터페이스를 제공하는 방식과 주요 컬렉션의 역할을 알아본다."
date: 2026-05-28
updated: 2026-07-23
lastVerified: 2026-07-23
category: "Java"
slug: "java/collectionframework"
commentKey: "/blog/java/collectionframework/"
tags:
    - Java
    - Collection
    - Data Structure
testedWith:
    java: "17"
series: "data-structure"
chapter: 1
heroImage: "/og-image.svg"
draft: false
---

## 1. 들어가기 전

프로그램에서는 여러 객체를 하나의 묶음으로 저장하고 조회하거나 삭제해야 한다.

```java
List<String> names = new ArrayList<>();

names.add("kim");
names.add("lee");
```

배열도 여러 값을 저장할 수 있지만 생성할 때 길이가 정해지며 요소 추가와 삭제를 위한 공통 메서드를 제공하지 않는다.

```java
String[] names = new String[2];
names[0] = "kim";
names[1] = "lee";
```

자바 컬렉션 프레임워크(Java Collections Framework)는 여러 객체를 저장하고 다루기 위한 인터페이스, 구현 클래스와 알고리즘을 표준화해 제공한다.

컬렉션을 선택할 때는 구현 클래스 이름부터 외우기보다 데이터에 필요한 성질을 먼저 정한다.

* 입력 순서를 유지해야 하는가?
* 같은 값을 여러 번 저장할 수 있는가?
* 키로 값을 찾아야 하는가?
* 앞이나 뒤에서 값을 넣고 꺼내야 하는가?
* 정렬이나 우선순위가 필요한가?

이 요구에 따라 `List`, `Set`, `Queue`, `Deque`, `Map` 가운데 역할에 맞는 인터페이스를 선택하고 그 역할을 구현한 클래스를 사용한다.

## 2. 컬렉션 프레임워크는 공통 사용 방법을 제공한다

컬렉션 프레임워크가 없으면 자료구조마다 요소 추가, 조회, 삭제와 순회 방법이 서로 달라질 수 있다. 자바는 인터페이스로 공통 동작을 정의하고 여러 구현 클래스가 이를 따르도록 구성한다.

```java
List<String> arrayList = new ArrayList<>();
List<String> linkedList = new LinkedList<>();
```

두 객체의 내부 구조는 다르지만 `List` 인터페이스를 구현하므로 호출 코드는 같은 메서드를 사용할 수 있다.

```java
arrayList.add("java");
linkedList.add("java");

System.out.println(arrayList.get(0));
System.out.println(linkedList.get(0));
```

변수 타입을 구현 클래스보다 인터페이스로 선언하면 호출 코드는 필요한 역할에 의존한다.

```java
List<String> names = new ArrayList<>();
```

`names`를 사용하는 코드는 `ArrayList`의 내부 배열보다 순서가 있는 목록이라는 `List`의 계약을 사용한다. 구현체를 바꾸더라도 사용한 메서드와 성능 특성이 호환되는 범위에서는 호출 코드를 적게 수정할 수 있다.

## 3. Collection과 Map은 서로 다른 구조다

컬렉션 프레임워크의 주요 인터페이스는 다음과 같이 구분할 수 있다.

```text
Iterable
└─ Collection
   ├─ List
   ├─ Set
   └─ Queue
      └─ Deque

Map
```

`List`, `Set`, `Queue`와 `Deque`는 `Collection` 계층에 속한다. `Map`은 키와 값의 대응 관계를 저장하므로 `Collection`을 상속하지 않는다.

`Collection`은 하나의 요소를 추가하고 제거하거나 전체 요소를 순회하는 동작을 중심으로 한다.

```java
Collection<String> names = new ArrayList<>();

names.add("kim");
names.remove("kim");
```

`Map`은 키를 기준으로 값을 저장하고 찾는다.

```java
Map<Long, String> members = new HashMap<>();

members.put(1L, "kim");
String name = members.get(1L);
```

`Map`을 순회할 때는 키, 값 또는 키와 값의 쌍 가운데 어떤 관점으로 볼지 선택한다.

```java
for (Map.Entry<Long, String> entry
        : members.entrySet()) {
    System.out.println(
            entry.getKey() + ": " + entry.getValue()
    );
}
```

## 4. 주요 인터페이스는 서로 다른 데이터 성질을 표현한다

### 4.1 List는 순서와 위치를 가진다

`List`는 요소의 순서를 유지하고 인덱스로 요소에 접근한다. 같은 값도 여러 번 저장할 수 있다.

```java
List<String> names = new ArrayList<>();

names.add("kim");
names.add("lee");
names.add("kim");

System.out.println(names.get(1)); // lee
System.out.println(names);        // [kim, lee, kim]
```

대표 구현체에는 `ArrayList`와 `LinkedList`가 있다. 일반적인 목록에서는 `ArrayList`가 널리 사용되며, `LinkedList`는 연결 구조와 `Deque` 역할이 함께 필요한 상황에서 검토할 수 있다.

### 4.2 Set은 중복 없는 요소의 집합을 표현한다

`Set`은 같은 요소를 중복해서 저장하지 않는다.

```java
Set<String> tags = new HashSet<>();

tags.add("Java");
tags.add("Spring");
tags.add("Java");

System.out.println(tags.size()); // 2
```

`HashSet`은 입력 순서를 보장하지 않는다. 입력 순서를 유지해야 하면 `LinkedHashSet`, 정렬된 순서가 필요하면 `TreeSet`을 검토할 수 있다.

`HashSet`과 같은 해시 기반 컬렉션은 객체의 `equals()`와 `hashCode()` 결과를 사용해 같은 요소인지 판단한다. 직접 만든 객체를 저장한다면 두 메서드의 계약이 컬렉션 동작에 영향을 준다.

### 4.3 Queue와 Deque는 처리 순서를 표현한다

`Queue`는 요소를 넣고 처리할 순서를 표현한다. 일반적인 큐는 먼저 넣은 요소를 먼저 꺼내는 선입선출 구조로 사용한다.

```java
Queue<String> jobs = new ArrayDeque<>();

jobs.offer("first");
jobs.offer("second");

System.out.println(jobs.poll()); // first
```

`Deque`는 양쪽 끝에서 요소를 추가하고 제거할 수 있다. 큐와 스택 역할을 모두 표현할 수 있다.

```java
Deque<Integer> stack = new ArrayDeque<>();

stack.push(10);
stack.push(20);

System.out.println(stack.pop()); // 20
```

오래된 `Stack` 클래스보다 `Deque` 구현체인 `ArrayDeque`를 스택 용도로 사용하는 방식이 일반적이다.

`PriorityQueue`는 입력 순서보다 요소의 우선순위에 따라 다음 값을 선택한다.

```java
Queue<Integer> numbers = new PriorityQueue<>();

numbers.offer(30);
numbers.offer(10);
numbers.offer(20);

System.out.println(numbers.poll()); // 10
```

자연 순서를 사용할 수 없는 객체라면 `Comparable`을 구현하거나 `Comparator`를 전달해 정렬 기준을 제공해야 한다.

### 4.4 Map은 키와 값을 연결한다

`Map`은 중복되지 않는 키에 값을 연결한다. 같은 키로 값을 다시 저장하면 기존 값이 교체된다.

```java
Map<Long, String> members = new HashMap<>();

members.put(1L, "kim");
members.put(2L, "lee");
members.put(1L, "park");

System.out.println(members.get(1L)); // park
```

대표 구현체에는 `HashMap`, `LinkedHashMap`, `TreeMap`이 있다.

* `HashMap`은 키의 입력 순서를 보장하지 않는다.
* `LinkedHashMap`은 정해진 순회 순서를 유지한다.
* `TreeMap`은 키의 자연 순서나 `Comparator`에 따라 정렬한다.

## 5. 제네릭으로 저장할 요소 타입을 제한한다

컬렉션은 제네릭을 사용해 저장할 요소 타입을 선언한다.

```java
List<String> names = new ArrayList<>();
```

`List<String>`에는 `String`과 호환되는 값만 추가할 수 있다.

```java
names.add("kim");

// 컴파일 오류
// names.add(10);
```

값을 꺼낼 때도 별도의 형 변환 없이 `String`으로 사용할 수 있다.

```java
String first = names.get(0);
```

제네릭의 타입 인자에는 기본형을 직접 사용할 수 없다. 기본형 값을 저장하려면 래퍼 클래스를 사용한다.

```java
List<Integer> numbers = new ArrayList<>();

numbers.add(10);
numbers.add(20);
```

## 6. 구현체는 필요한 동작과 성능 특성으로 선택한다

같은 인터페이스를 구현해도 내부 자료구조와 허용하는 값이 다를 수 있다. 구현체를 고를 때는 다음 기준을 함께 확인한다.

<!-- table-caption: 대표 컬렉션 구현체의 선택 기준 -->

| 필요 조건 | 대표 선택지 |
| --- | --- |
| 순서가 있는 일반적인 목록 | `ArrayList` |
| 중복 없는 요소 모음 | `HashSet` |
| 입력 순서를 유지하는 집합 | `LinkedHashSet` |
| 정렬된 집합 | `TreeSet` |
| 일반적인 큐 또는 스택 | `ArrayDeque` |
| 우선순위 기반 처리 | `PriorityQueue` |
| 키로 값을 조회 | `HashMap` |
| 키 입력 순서를 유지 | `LinkedHashMap` |
| 키 정렬 순서를 유지 | `TreeMap` |

이 표는 출발점이다. 실제 선택에서는 데이터 크기, 조회와 삽입 패턴, `null` 허용 여부, 동시 접근과 정렬 기준을 함께 확인해야 한다.

컬렉션 인터페이스는 대부분 변경 가능한 동작을 제공한다. `List.of()`와 `Set.of()`처럼 수정할 수 없는 컬렉션을 만들 수도 있다.

```java
List<String> categories =
        List.of("Java", "Spring");

// UnsupportedOperationException
// categories.add("JPA");
```

수정 가능 여부는 변수 타입만으로 결정되지 않는다. `List` 타입의 변수라도 실제 객체가 수정 불가능한 구현이라면 변경 메서드 호출이 실패한다.

## 7. 정리

* 자바 컬렉션 프레임워크는 여러 객체를 저장하고 조회하며 삭제하는 공통 인터페이스와 구현 클래스를 제공한다.
* `List`, `Set`, `Queue`와 `Deque`는 `Collection` 계층에 속하고 키와 값을 연결하는 `Map`은 별도의 계층이다.
* 컬렉션은 순서, 중복, 처리 방향, 키 조회와 정렬처럼 데이터에 필요한 성질을 기준으로 인터페이스를 선택한다.
* 변수 타입을 인터페이스로 선언하면 호출 코드는 구체 구현보다 필요한 역할과 계약에 의존할 수 있다.
* 제네릭은 저장할 요소 타입을 컴파일 단계에서 제한하며 구현체는 동작 특성과 성능 요구를 함께 고려해 선택한다.

## 8. 참고 자료

### 공식 자료

* [Java SE 17 API - Collection](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Collection.html)
* [Java SE 17 API - List](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/List.html)
* [Java SE 17 API - Set](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Set.html)
* [Java SE 17 API - Queue](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Queue.html)
* [Java SE 17 API - Map](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Map.html)
* [Java Collections Framework Design FAQ](https://docs.oracle.com/javase/8/docs/technotes/guides/collections/designfaq.html)

### 한글 참고 링크

* [Tecoble - ArrayList vs LinkedList](https://tecoble.techcourse.co.kr/post/2021-05-10-arraylist-linkedlist/)
* [Tecoble - HashMap은 어떻게 동작할까?](https://tecoble.techcourse.co.kr/post/2021-11-26-hashmap/)
* [Inpa Dev - Java Collections Framework 종류 총정리](https://inpa.tistory.com/entry/JAVA-%E2%98%95-%EC%BB%AC%EB%A0%89%EC%85%98-%ED%94%84%EB%A0%88%EC%9E%84%EC%9B%8C%ED%81%AC-%EC%A2%85%EB%A5%98-%F0%9F%92%AF-%EC%B4%9D%EC%A0%95%EB%A6%AC)
