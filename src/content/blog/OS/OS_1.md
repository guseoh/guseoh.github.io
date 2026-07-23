---
title: "운영체제는 어떤 일을 할까?"
description: "운영체제가 CPU와 메모리를 가상화하고, 여러 실행 흐름과 영속 저장 장치를 관리하는 이유를 Java 예제로 살펴본다."
date: 2026-05-20
updated: 2026-07-23
lastVerified: 2026-07-23
slug: "os/os_1"
aliases: []
commentKey: "/blog/os/os_1/"
category: "OS"
tags:
    - OS
    - Process
    - Concurrency
series: "아주-쉬운-세가지-이야기"
chapter: 1
heroImage: "/og-image.svg"
draft: false
---

## 1. 운영체제는 하드웨어를 관리하고 사용하기 쉬운 형태로 제공한다

프로그램이 실행되려면 CPU, 메모리, 저장 장치와 입출력 장치가 필요하다. 여러 프로그램이 동시에 실행되면 한정된 자원을 누구에게 얼마나 제공할지 정해야 하고, 한 프로그램의 잘못된 접근이 다른 프로그램에 영향을 주지 않도록 막아야 한다.

운영체제는 이 사이에서 두 가지 역할을 맡는다.

- CPU, 메모리와 저장 장치 같은 자원을 관리한다.
- 프로그램이 하드웨어의 세부 동작을 직접 다루지 않도록 추상화된 인터페이스를 제공한다.

응용 프로그램은 파일을 저장하기 위해 디스크 블록의 위치를 직접 계산하지 않는다. 파일 API를 호출하면 운영체제의 파일 시스템과 장치 드라이버가 실제 입출력을 처리한다. 프로세스도 물리 CPU와 메모리를 직접 독점하지 않고 운영체제가 제공하는 실행 환경 안에서 동작한다.

## 2. CPU를 여러 프로그램이 함께 사용한다

CPU는 명령어를 실행한다. 실행할 프로그램이 여러 개라면 운영체제의 스케줄러가 어떤 실행 흐름에 CPU 시간을 줄지 결정한다.

다음 프로그램은 실행 인자로 받은 문자열을 1초마다 출력한다.

```java
public class CpuExample {

    public static void main(String[] args)
            throws InterruptedException {
        if (args.length != 1) {
            System.err.println(
                    "사용법: java CpuExample <문자열>"
            );
            return;
        }

        while (true) {
            Thread.sleep(1_000);
            System.out.println(args[0]);
        }
    }
}
```

이 프로그램을 서로 다른 터미널에서 여러 번 실행하면 각 Java 프로그램은 별도의 프로세스로 실행된다. 사용자는 여러 프로세스가 동시에 동작한다고 느끼지만, 실제 CPU 코어 수는 제한되어 있다.

운영체제는 실행 가능한 프로세스와 스레드 사이에서 CPU를 전환한다. 시분할은 CPU 시간을 나누어 제공하는 방식이고, 라운드 로빈은 사용할 수 있는 여러 스케줄링 정책 중 하나다. 범용 운영체제가 모든 작업을 반드시 단순한 라운드 로빈으로 실행하는 것은 아니다.

프로세스가 CPU를 계속 사용하다가 다른 프로세스로 전환될 때 운영체제는 현재 실행 상태를 보관하고 다음 실행 상태를 복원한다. 이를 문맥 교환이라고 한다.

## 3. 프로세스마다 독립된 가상 주소 공간을 제공한다

여러 프로세스는 같은 물리 메모리를 사용하지만 각 프로세스는 자신만의 가상 주소 공간을 사용하는 것처럼 동작한다. 운영체제와 하드웨어의 메모리 관리 장치는 가상 주소를 물리 주소로 변환하고, 허용되지 않은 메모리 접근을 막는다.

다음 프로그램은 프로세스 ID와 객체의 값을 출력한다.

```java
public class MemoryExample {

    static class Box {
        int value;
    }

    public static void main(String[] args)
            throws InterruptedException {
        Box box = new Box();
        long pid = ProcessHandle.current().pid();

        System.out.printf("프로세스 ID: %d%n", pid);

        while (true) {
            Thread.sleep(1_000);
            box.value++;
            System.out.printf(
                    "(%d) box.value = %d%n",
                    pid,
                    box.value
            );
        }
    }
}
```

첫 번째 프로세스의 출력은 다음과 같을 수 있다.

```text
프로세스 ID: 12001
(12001) box.value = 1
(12001) box.value = 2
(12001) box.value = 3
```

두 번째 프로세스는 다른 프로세스 ID와 별도의 값을 가진다.

```text
프로세스 ID: 12002
(12002) box.value = 1
(12002) box.value = 2
(12002) box.value = 3
```

두 프로그램이 같은 `MemoryExample` 코드를 실행하더라도 각 프로세스의 `Box` 객체는 서로 다른 주소 공간에 존재한다. 한 프로세스에서 `box.value`를 바꿔도 다른 프로세스의 객체 값은 변하지 않는다.

가상 메모리는 단순한 주소 분리만을 뜻하지 않는다. 운영체제는 물리 메모리보다 큰 주소 공간을 제공하고, 필요한 페이지를 메모리에 올리거나 저장 장치로 내보내는 작업도 수행할 수 있다. 이 세부 동작은 가상 메모리 글에서 별도로 다룰 범위다.

## 4. 같은 프로세스의 스레드는 메모리를 공유한다

프로세스가 서로 독립된 주소 공간을 사용하는 것과 달리, 같은 프로세스 안의 스레드는 힙에 있는 객체를 공유할 수 있다. 여러 스레드가 같은 값을 동시에 변경하면 실행 순서에 따라 결과가 달라질 수 있다.

```java
public class ThreadRaceExample {

    private static int counter;

    public static void main(String[] args)
            throws InterruptedException {
        int loops = 100_000;

        Thread first = new Thread(
                () -> increase(loops)
        );
        Thread second = new Thread(
                () -> increase(loops)
        );

        first.start();
        second.start();

        first.join();
        second.join();

        System.out.println(counter);
    }

    private static void increase(int loops) {
        for (int i = 0; i < loops; i++) {
            counter++;
        }
    }
}
```

두 스레드가 각각 100,000번 증가시키므로 기대값은 200,000이다. 하지만 `counter++`는 값을 읽고, 증가시키고, 다시 저장하는 여러 단계로 실행된다. 두 스레드의 단계가 겹치면 한쪽 증가 결과가 사라져 200,000보다 작은 값이 나올 수 있다.

이처럼 여러 실행 흐름이 공유 상태에 접근하고 실행 순서에 따라 결과가 달라지는 상황을 경쟁 상태라고 한다.

### 4.1 동기화는 공유 상태에 대한 접근 규칙을 만든다

다음 예제는 증가 연산을 `synchronized` 메서드 안에서 수행한다.

```java
public class SynchronizedCounter {

    private int value;

    public synchronized void increment() {
        value++;
    }

    public synchronized int getValue() {
        return value;
    }
}
```

같은 `SynchronizedCounter` 객체에 대해 한 스레드가 동기화 메서드를 실행하는 동안 다른 스레드는 같은 객체의 동기화 메서드에 동시에 들어갈 수 없다. 상호 배제를 통해 증가 연산이 서로 겹치지 않게 한다.

동기화를 운영체제가 제공하는 두 가지 방식으로만 구분할 수는 없다. Java 프로그램에서는 JVM의 모니터, `Lock`, `AtomicInteger` 같은 동시성 도구를 사용할 수 있고, 그 구현에는 CPU의 원자 명령과 운영체제의 스케줄링·대기 기능이 함께 관여할 수 있다.

동기화는 경쟁 상태를 막는 데 필요하지만, 잠금 범위가 넓으면 스레드가 기다리는 시간이 늘어난다. 공유할 필요가 없는 상태를 분리하고, 보호해야 할 임계 영역을 먼저 찾은 뒤 적절한 도구를 선택해야 한다.

## 5. 파일 시스템은 데이터를 영속적으로 저장한다

메모리에 있는 일반적인 데이터는 프로세스가 종료되거나 전원이 꺼지면 유지되지 않는다. 운영체제는 파일 시스템을 통해 저장 장치의 공간을 파일과 디렉터리 형태로 제공한다.

```java
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

public class FilePersistenceExample {

    public static void main(String[] args) {
        Path path = Path.of("file.txt");

        try {
            Files.writeString(
                    path,
                    "hello world\n",
                    StandardOpenOption.CREATE,
                    StandardOpenOption.TRUNCATE_EXISTING,
                    StandardOpenOption.WRITE
            );

            System.out.println(
                    "파일 쓰기 완료: "
                            + path.toAbsolutePath()
            );
        } catch (IOException exception) {
            System.err.println(
                    "파일 쓰기 실패: "
                            + exception.getMessage()
            );
        }
    }
}
```

Java 코드는 `Files.writeString()`을 호출하지만 실제 쓰기 요청은 JVM과 운영체제의 시스템 인터페이스를 거쳐 파일 시스템과 저장 장치로 전달된다. 파일 시스템은 파일 이름, 디렉터리 구조, 접근 권한과 저장 위치를 관리한다.

파일 쓰기 메서드가 반환되었다는 사실만으로 모든 데이터가 물리 저장 장치에 영구 반영되었다고 단정할 수는 없다. 운영체제와 저장 장치는 성능을 위해 데이터를 버퍼링할 수 있으며, 장애에도 견뎌야 하는 저장 방식은 동기화 쓰기, 파일 시스템과 데이터베이스의 보장 범위를 함께 확인해야 한다.

## 6. 정리

운영체제는 한정된 하드웨어 자원을 여러 프로그램이 사용할 수 있도록 관리한다. CPU 시간을 배분하고, 프로세스마다 가상 주소 공간을 제공하며, 파일 시스템으로 영속 저장 공간을 제공한다.

프로세스는 서로 분리된 주소 공간을 사용하지만 같은 프로세스의 스레드는 상태를 공유할 수 있다. 공유 상태를 동시에 변경할 때는 실행 순서와 원자성을 고려해 동기화해야 한다.

## 7. 참고 자료

### 공식 자료

* [Operating Systems: Three Easy Pieces](https://pages.cs.wisc.edu/~remzi/OSTEP/)
* [Java Tutorials - Synchronization](https://docs.oracle.com/javase/tutorial/essential/concurrency/sync.html)
* [Java Tutorials - Atomic Access](https://docs.oracle.com/javase/tutorial/essential/concurrency/atomic.html)

### 한글 참고 링크

* [운영체제 개요 - 운영체제 2024](https://os2024.jeju.ai/week01/intro.html)
* [OSTEP Korean Version - 운영체제 2024](https://os2024.jeju.ai/references/ostep/index.html)
* [Java로 동기화를 해보자 - Tecoble](https://tecoble.techcourse.co.kr/post/2021-10-23-java-synchronize/)
