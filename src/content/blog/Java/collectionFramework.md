---
title: "자바 컬렉션 프레임워크는 무엇일까?"
description: "자바 컬렉션 프레임워크의 공통 인터페이스와 주요 구현체가 순서, 중복, 키 조회와 처리 방향을 어떻게 표현하는지 알아본다."
date: 2026-05-28
updated: 2026-07-23
lastVerified: 2026-07-23
slug: "java/collectionframework"
aliases: []
commentKey: "/blog/java/collectionframework/"
category: "Java"
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

## 1. 여러 객체를 어떤 구조로 저장할까?

프로그램에서는 여러 객체를 저장한 뒤 추가, 조회, 삭제와 순회를 반복한다. 배열도 여러 값을 담을 수 있지만 길이가 고정되고 요소를 추가하거나 제거하는 공통 메서드를 제공하지 않는다.

```java
String[] names = new String[2];
names[0] = "kim";
names[1] = "lee";
```

자바 컬렉션 프레임워크(Java Collections Framework)는 여러 객체를 다루는 공통 인터페이스와 구현 클래스를 제공한다. 같은 종류의 작업을 일관된 메서드로 표현할 수 있고, 데이터의 성질에 맞는 자료구조를 선택할 수 있다.

```java
List<String> names = new ArrayList<>();

names.add("kim");
names.add("lee");
```

이 글의 Java 코드 조각은 설명에 필요한 선언과 호출만 보여 준다. 별도 언급이 없으면 `java.util` import와 코드를 감싸는 클래스·메서드는 생략한다.

## 2. 인터페이스가 공통 사용 방법을 정의한다

컬렉션 구현체는 내부 구조가 달라도 같은 인터페이스의 계약을 따를 수 있다.

```java
List<String> arrayList = new ArrayList<>();
List<String> linkedList = new LinkedList<>();

arrayList.add("java");
linkedList.add("java");

System.out.println(arrayList.get(0));
System.out.println(linkedList.get(0));
```

`ArrayList`는 배열을 기반으로 하고 `LinkedList`는 연결 구조를 사용하지만, 두 객체 모두 `List`의 `add()`와 `get()`을 제공한다.

변수 타입을 인터페이스로 선언하면 호출 코드는 구체적인 저장 방식보다 필요한 역할에 의존한다.

```java
List<String> names = new ArrayList<>();
```

구현체를 바꾸더라도 호출 코드가 사용한 `List`의 계약과 동작 조건을 만족하면 변경 범위를 줄일 수 있다. 다만 시간 복잡도, 순회 순서, `null` 허용 여부와 수정 가능성은 구현체마다 다시 확인해야 한다.

## 3. Collection과 Map은 서로 다른 계층이다

주요 인터페이스의 관계는 다음과 같다.

```text
Iterable
└─ Collection
   ├─ List
   ├─ Set
   └─ Queue
      └─ Deque

Map
```

`List`, `Set`, `Queue`와 `Deque`는 `Collection` 계층에 속한다. `Map`은 하나의 요소가 아니라 키와 값의 대응 관계를 저장하므로 `Collection`을 상속하지 않는다.

```java
Collection<String> names = new ArrayList<>();

names.add("kim");
names.remove("kim");
```

```java
Map<Long, String> members = new HashMap<>();

members.put(1L, "kim");
String name = members.get(1L);
```

`Map`을 순회할 때 키와 값을 함께 사용한다면 `entrySet()`을 순회할 수 있다.

```java
for (Map.Entry<Long, String> entry : members.entrySet()) {
    System.out.println(
            entry.getKey() + ": " + entry.getValue()
    );
}
```

## 4. 주요 인터페이스는 데이터의 성질을 표현한다

### 4.1 List는 순서와 위치를 가진다

`List`는 요소의 순서를 유지하고 인덱스로 접근한다. 같은 값도 여러 번 저장할 수 있다.

```java
List<String> names = new ArrayList<>();

names.add("kim");
names.add("lee");
names.add("kim");

System.out.println(names.get(1)); // lee
System.out.println(names);        // [kim, lee, kim]
```

대표 구현체는 `ArrayList`와 `LinkedList`다. 일반적인 목록에서는 임의 위치 조회가 빠르고 메모리 사용이 단순한 `ArrayList`를 먼저 검토한다. `LinkedList`는 목록 기능과 양쪽 끝을 사용하는 `Deque` 역할이 함께 필요한 경우에 선택할 수 있다.

### 4.2 Set은 중복 없는 요소의 집합을 표현한다

`Set`은 같은 요소를 중복해서 저장하지 않는다.

```java
Set<String> tags = new HashSet<>();

tags.add("Java");
tags.add("Spring");
tags.add("Java");

System.out.println(tags.size()); // 2
```

`HashSet`은 순회 순서를 보장하지 않는다. 삽입 순서를 유지해야 하면 `LinkedHashSet`, 정렬된 순서가 필요하면 `TreeSet`을 검토한다.

해시 기반 집합은 객체의 `equals()`와 `hashCode()`를 사용해 같은 요소인지 판단한다. 직접 만든 객체를 저장한다면 두 메서드의 계약이 중복 판정과 조회 결과에 영향을 준다.

### 4.3 Queue와 Deque는 처리 방향을 표현한다

`Queue`는 처리할 요소를 보관한다. 일반적인 큐는 먼저 넣은 요소를 먼저 꺼내는 선입선출 방식으로 사용한다.

```java
Queue<String> jobs = new ArrayDeque<>();

jobs.offer("first");
jobs.offer("second");

System.out.println(jobs.poll()); // first
```

`Deque`는 양쪽 끝에서 요소를 추가하고 제거할 수 있어 큐와 스택 역할을 모두 표현한다.

```java
Deque<Integer> stack = new ArrayDeque<>();

stack.push(10);
stack.push(20);

System.out.println(stack.pop()); // 20
```

오래된 `Stack` 클래스보다 `Deque` 구현체인 `ArrayDeque`를 스택 용도로 사용하는 방식이 권장된다.

`PriorityQueue`는 입력 순서가 아니라 가장 우선순위가 높은 요소를 머리로 선택한다.

```java
Queue<Integer> numbers = new PriorityQueue<>();

numbers.offer(30);
numbers.offer(10);
numbers.offer(20);

System.out.println(numbers.poll()); // 10
```

`poll()`을 반복하면 우선순위 순서로 요소를 꺼낼 수 있다. 반면 `iterator()`나 컬렉션 전체 출력은 정렬된 순회를 보장하지 않는다. 자연 순서를 사용할 수 없는 객체라면 `Comparable`을 구현하거나 `Comparator`를 전달해야 한다.

### 4.4 Map은 키와 값을 연결한다

`Map`은 중복되지 않는 키에 값을 연결한다. 같은 키로 값을 다시 저장하면 기존 값이 교체된다.

```java
Map<Long, String> members = new HashMap<>();

members.put(1L, "kim");
members.put(2L, "lee");
members.put(1L, "park");

System.out.println(members.get(1L)); // park
```

대표 구현체는 다음과 같다.

* `HashMap`은 키의 순회 순서를 보장하지 않는다.
* `LinkedHashMap`은 기본적으로 삽입 순서를 유지하며 생성자 설정에 따라 접근 순서로 구성할 수도 있다.
* `TreeMap`은 키의 자연 순서나 `Comparator`에 따라 정렬한다.

## 5. 제네릭과 수정 가능 여부를 확인한다

컬렉션은 제네릭으로 저장할 요소 타입을 선언한다.

```java
List<String> names = new ArrayList<>();

names.add("kim");
String first = names.get(0);
```

`List<String>`에는 `String`과 호환되는 값만 추가할 수 있으므로 잘못된 타입 사용을 컴파일 단계에서 확인할 수 있다. 기본형은 타입 인자로 사용할 수 없어 `int` 대신 `Integer` 같은 래퍼 클래스를 사용한다.

```java
List<Integer> numbers = new ArrayList<>();

numbers.add(10);
numbers.add(20);
```

인터페이스에 변경 메서드가 존재한다고 해서 모든 구현이 수정을 허용하는 것은 아니다. `List.of()`가 반환하는 리스트는 수정할 수 없고 `null` 요소도 허용하지 않는다.

```java
List<String> categories = List.of("Java", "Spring");

categories.add("JPA"); // 실행 시 UnsupportedOperationException
```

수정 가능 여부는 변수 타입만으로 판단할 수 없다. 같은 `List` 타입이라도 실제 객체의 생성 방법과 구현체에 따라 변경 메서드의 결과가 달라진다.

## 6. 구현체는 필요한 동작을 기준으로 선택한다

<!-- table-caption: 대표 컬렉션 구현체의 선택 기준 -->

| 필요 조건 | 대표 선택지 |
| --- | --- |
| 순서가 있는 일반적인 목록 | `ArrayList` |
| 중복 없는 요소 모음 | `HashSet` |
| 삽입 순서를 유지하는 집합 | `LinkedHashSet` |
| 정렬된 집합 | `TreeSet` |
| 일반적인 큐 또는 스택 | `ArrayDeque` |
| 우선순위 기반 처리 | `PriorityQueue` |
| 키로 값을 조회 | `HashMap` |
| 키 삽입 순서를 유지 | `LinkedHashMap` |
| 키 정렬 순서를 유지 | `TreeMap` |

이 표는 출발점이다. 실제 선택에서는 데이터 크기, 조회와 삽입 패턴, 순서, `null` 허용 여부, 수정 가능성, 동시 접근과 정렬 기준을 함께 확인한다.

## 7. 정리

* 자바 컬렉션 프레임워크는 여러 객체를 다루는 공통 인터페이스와 구현 클래스를 제공한다.
* `List`, `Set`, `Queue`와 `Deque`는 `Collection` 계층에 속하고 키와 값을 연결하는 `Map`은 별도 계층이다.
* 컬렉션 인터페이스는 순서, 중복, 처리 방향과 키 조회처럼 데이터에 필요한 성질을 표현한다.
* 구현체를 바꿀 때는 인터페이스 계약뿐 아니라 성능, 순회 순서, `null` 허용 여부와 수정 가능성을 확인해야 한다.
* 제네릭은 저장할 요소 타입을 컴파일 단계에서 제한하며 `List.of()` 같은 팩터리 메서드는 수정할 수 없는 컬렉션을 만든다.

## 8. 참고 자료

### 공식 자료

* [Java SE 17 API - Collections Framework Overview](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/doc-files/coll-overview.html)
* [Java SE 17 API - Collection](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Collection.html)
* [Java SE 17 API - List](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/List.html)
* [Java SE 17 API - Queue](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Queue.html)
* [Java SE 17 API - PriorityQueue](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/PriorityQueue.html)
* [Java SE 17 API - Map](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Map.html)
* [Java SE 17 API - LinkedHashMap](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/LinkedHashMap.html)

### 한글 참고 링크

* [Tecoble - ArrayList vs LinkedList](https://tecoble.techcourse.co.kr/post/2021-05-10-arraylist-linkedlist/)
* [Tecoble - HashMap은 어떻게 동작할까?](https://tecoble.techcourse.co.kr/post/2021-11-26-hashmap/)
* [Inpa Dev - Java Collections Framework 종류 총정리](https://inpa.tistory.com/entry/JAVA-%E2%98%95-%EC%BB%AC%EB%A0%89%EC%85%98-%ED%94%84%EB%A0%88%EC%9E%84%EC%9B%8C%ED%81%AC-%EC%A2%85%EB%A5%98-%F0%9F%92%AF-%EC%B4%9D%EC%A0%95%EB%A6%AC)
