---
title: "자바 패키지는 무엇일까?"
description: "자바 패키지가 타입 이름을 구분하고 코드의 접근 경계를 만드는 방식, package 선언과 import의 실제 역할을 알아본다."
date: 2026-07-23
updated: 2026-07-23
lastVerified: 2026-07-23
category: "Java"
slug: "java/패키지/package"
commentKey: "/blog/java/패키지/package/"
tags:
    - Java
    - Package
    - Import
testedWith:
    java: "17"
book: ""
chapter: 1
heroImage: "/og-image.svg"
draft: false
---

## 1. 들어가기 전

`static`은 멤버가 객체와 클래스 중 어디에 속하는지 나타내고, `final`은 재할당이나 상속과 오버라이딩을 제한한다. 그러나 클래스가 많아지면 멤버의 성질만으로는 코드를 구분하기 어렵다.

서로 다른 기능에서 같은 이름의 클래스를 만들 수도 있고, 외부에 공개할 클래스와 내부에서만 사용할 구현을 나눌 필요도 생긴다.

```text
member.Member
order.Member
```

두 클래스의 단순 이름은 모두 `Member`지만 패키지 이름이 다르므로 서로 다른 타입이다. 자바의 패키지(package)는 관련된 타입을 묶고, 타입의 전체 이름과 접근 범위를 결정하는 언어 수준의 단위다.

## 2. 패키지는 타입의 이름 공간을 만든다

패키지에 속한 타입은 패키지 이름을 포함한 전체 이름으로 구분된다.

```java
com.example.member.Member
com.example.order.Member
```

`Member`는 단순 이름(simple name)이고 `com.example.member.Member`는 패키지를 포함한 정규화된 이름이다. 서로 다른 패키지는 같은 단순 이름의 타입을 각각 선언할 수 있다.

```java
com.example.member.Member member;
com.example.order.Member orderMember;
```

패키지가 없다면 프로젝트나 외부 라이브러리에서 같은 클래스 이름을 사용할 때 충돌을 피하기 어렵다. 패키지 이름을 포함하면 타입이 어느 코드 묶음에 속하는지도 함께 드러난다.

패키지 이름은 일반적으로 소문자로 작성한다. 외부에 배포하는 코드에서는 이름 충돌을 줄이기 위해 인터넷 도메인을 거꾸로 사용한 접두사를 자주 사용한다.

```text
com.example.blog
io.github.guseoh
```

이 방식은 문법적 의무가 아니라 널리 배포되는 패키지 이름을 고유하게 만들기 위한 명명 관례다.

## 3. package 선언이 소스 파일의 소속을 정한다

소스 파일이 이름 있는 패키지에 속하려면 `package` 선언을 작성한다.

```java
package com.example.member;

public class Member {
}
```

일반적인 자바 컴파일 단위는 다음 순서로 구성된다.

```text
package 선언
import 선언
최상위 클래스와 인터페이스 선언
```

`package` 선언은 최대 하나만 작성할 수 있으며 `import`와 타입 선언보다 앞에 온다. 주석과 공백은 그보다 먼저 올 수 있다.

### 3.1 패키지와 디렉터리는 같은 개념이 아니다

파일 시스템을 사용하는 일반적인 프로젝트는 패키지 이름을 디렉터리 구조에 대응시킨다.

```text
src/
└─ com/
   └─ example/
      └─ member/
         └─ Member.java
```

```java
package com.example.member;
```

이 구조에서 `com.example.member`는 패키지 이름이고 `com/example/member`는 소스 파일을 저장한 경로다. 패키지는 소스 코드의 `package` 선언으로 정해지는 언어 개념이며, 디렉터리는 컴파일러와 빌드 도구가 소스와 클래스 파일을 찾기 쉽게 만드는 저장 구조다.

두 구조를 일치시키면 IDE, `javac`, Gradle과 Maven 같은 도구가 타입의 위치를 예측할 수 있다. `javac -d`로 컴파일하면 컴파일러도 패키지 이름에 맞는 하위 디렉터리를 만들고 클래스 파일을 저장한다.

### 3.2 package 선언이 없으면 이름 없는 패키지에 속한다

`package` 선언이 없는 컴파일 단위는 이름 없는 패키지(unnamed package)에 속한다.

```java
public class Main {

    public static void main(String[] args) {
        System.out.println("Hello");
    }
}
```

이름 없는 패키지는 작은 예제나 임시 프로그램을 빠르게 실행할 때 사용할 수 있다. 여러 패키지로 구성되는 애플리케이션에서는 이름 있는 패키지를 사용해야 타입 이름과 접근 경계를 명확하게 관리할 수 있다.

## 4. import는 다른 패키지 타입의 이름을 줄인다

다른 패키지의 타입은 전체 이름으로 참조할 수 있다.

```java
java.util.List<String> names = new java.util.ArrayList<>();
```

`import`를 선언하면 현재 컴파일 단위에서 타입의 단순 이름을 사용할 수 있다.

```java
import java.util.ArrayList;
import java.util.List;

List<String> names = new ArrayList<>();
```

`import`는 클래스 파일을 현재 패키지로 복사하지 않는다. 라이브러리를 설치하거나 Gradle·Maven 의존성을 추가하는 문법도 아니다. 컴파일러가 현재 소스 파일에서 `List`라는 단순 이름을 `java.util.List`로 해석할 수 있게 한다.

`import`의 영향 범위는 해당 선언이 작성된 컴파일 단위다. 한 파일에 작성한 `import`가 같은 패키지의 다른 파일에 자동으로 적용되지는 않는다.

### 4.1 같은 패키지와 java.lang은 import하지 않는다

같은 패키지에 선언된 타입은 단순 이름으로 바로 사용할 수 있다.

```java
package com.example.member;

public class MemberService {

    private final Member member;

    public MemberService(Member member) {
        this.member = member;
    }
}
```

`MemberService`와 `Member`가 모두 `com.example.member`에 속한다면 별도의 `import`가 필요 없다.

모든 일반 컴파일 단위는 `java.lang`의 `public` 타입을 자동으로 가져온다. 따라서 `String`, `Object`, `System`은 다음 선언 없이 사용할 수 있다.

```java
// 작성하지 않아도 된다.
// import java.lang.String;
```

### 4.2 별표 import는 하위 패키지를 포함하지 않는다

다음 선언은 `java.util` 패키지의 접근 가능한 타입을 필요할 때 단순 이름으로 사용할 수 있게 한다.

```java
import java.util.*;
```

`java.util.concurrent`는 별개의 패키지이므로 포함되지 않는다.

```java
import java.util.*;
import java.util.concurrent.ExecutorService;
```

패키지 이름이 점으로 이어져 보여도 상위 패키지와 하위 패키지 사이에 특별한 포함 관계나 접근 권한이 생기는 것은 아니다.

### 4.3 같은 단순 이름이 충돌하면 전체 이름을 사용한다

서로 다른 패키지의 같은 이름을 한 파일에서 사용하면 두 타입을 모두 단순 이름으로 가져올 수 없다.

```java
import java.util.Date;

Date utilDate = new Date();
java.sql.Date sqlDate = new java.sql.Date(
        System.currentTimeMillis()
);
```

한 타입은 `import`하고 다른 타입은 전체 이름으로 작성하거나, 둘 다 전체 이름으로 구분할 수 있다.

## 5. 패키지는 접근 제어의 경계이기도 하다

접근 제한자를 작성하지 않은 최상위 클래스와 멤버는 같은 패키지에서만 접근할 수 있다. 이를 package-private 접근이라고 한다.

```java
package com.example.member;

final class MemberNameNormalizer {

    private MemberNameNormalizer() {
    }

    static String normalize(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException(
                    "이름은 비어 있을 수 없습니다."
            );
        }

        return name.trim();
    }
}
```

`MemberNameNormalizer`는 `public`이 아니므로 `com.example.member` 밖에서는 직접 사용할 수 없다. 같은 패키지의 공개 클래스는 이 구현을 내부에서 사용할 수 있다.

```java
package com.example.member;

public class Member {

    private final String name;

    public Member(String name) {
        this.name = MemberNameNormalizer.normalize(name);
    }

    public String getName() {
        return name;
    }
}
```

외부 코드에는 `Member`만 공개하고 이름 정규화 구현은 패키지 안에 감췄다. 패키지는 클래스를 정리하는 폴더 역할에 그치지 않고 공개 API와 내부 구현을 나누는 경계가 될 수 있다.

### 5.1 하위 패키지는 같은 패키지가 아니다

다음 두 패키지는 이름이 계층적으로 보이지만 접근 제어에서는 서로 다른 패키지다.

```text
com.example.member
com.example.member.internal
```

`com.example.member.internal`의 코드는 `com.example.member`의 package-private 타입이나 멤버에 접근할 수 없다. 하위 디렉터리에 있다는 사실만으로 상위 패키지의 내부 구현 권한을 얻지 않는다.

패키지 구조를 설계할 때는 디렉터리 모양뿐 아니라 어떤 클래스가 같은 접근 경계를 공유해야 하는지도 함께 고려해야 한다.

## 6. 패키지가 있는 코드를 컴파일하고 실행한다

다음 세 파일로 구성된 예제를 실행해 보자.

```text
src/
└─ com/
   └─ example/
      ├─ app/
      │  └─ Main.java
      └─ member/
         ├─ Member.java
         └─ MemberNameNormalizer.java
```

`Main`은 다른 패키지에 있는 공개 타입 `Member`를 가져와 사용한다.

```java
package com.example.app;

import com.example.member.Member;

public class Main {

    public static void main(String[] args) {
        Member member = new Member("  Kim  ");
        System.out.println(member.getName());
    }
}
```

프로젝트 루트에서 다음 명령으로 컴파일한다.

```bash
javac -d out \
  src/com/example/member/MemberNameNormalizer.java \
  src/com/example/member/Member.java \
  src/com/example/app/Main.java
```

`-d out`은 생성할 클래스 파일의 기준 디렉터리를 `out`으로 지정한다. 컴파일 결과는 패키지 구조에 맞게 저장된다.

```text
out/
└─ com/
   └─ example/
      ├─ app/Main.class
      └─ member/
         ├─ Member.class
         └─ MemberNameNormalizer.class
```

실행할 때는 클래스 경로에 `out`을 지정하고 `Main`의 전체 이름을 사용한다.

```bash
java -cp out com.example.app.Main
```

```text
Kim
```

`java com.example.app.Main`에서 사용하는 이름은 파일 경로가 아니라 실행할 클래스의 패키지를 포함한 전체 이름이다.

## 7. 정리

* 패키지는 관련된 타입을 묶고 같은 단순 이름의 타입을 전체 이름으로 구분한다.
* `package` 선언은 컴파일 단위가 속할 패키지를 정하며 일반적인 프로젝트에서는 패키지 이름과 디렉터리 구조를 일치시킨다.
* `import`는 다른 패키지의 접근 가능한 타입을 현재 소스 파일에서 단순 이름으로 참조하게 하며 의존성 추가나 클래스 로딩을 수행하지 않는다.
* `java.lang`과 같은 패키지의 타입은 별도 `import` 없이 사용할 수 있고 별표 import는 하위 패키지를 포함하지 않는다.
* package-private 접근과 독립적인 하위 패키지 규칙을 이용하면 공개 타입과 패키지 내부 구현의 경계를 나눌 수 있다.

## 8. 참고 자료

### 공식 자료

* [Java Language Specification 17 - Packages and Modules](https://docs.oracle.com/javase/specs/jls/se17/html/jls-7.html)
* [Java Language Specification 17 - Names](https://docs.oracle.com/javase/specs/jls/se17/html/jls-6.html)
* [Java 17 javac Command](https://docs.oracle.com/en/java/javase/17/docs/specs/man/javac.html)

### 한글 참고 링크

* [워너블로그 - Java 패키지는 무엇인가?](https://leeheeweon.github.io/2023/12/12/what-is-package/)
* [어제 오늘 내일 - Java 패키지와 import 구조 이해](https://hianna.tistory.com/1085)
* [현구막 기술 블로그 - Java package-private은 안 쓰나요?](https://hyeon9mak.github.io/Java-dont-use-package-private/)
