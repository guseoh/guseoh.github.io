---
title: "fork, exec와 wait는 어떻게 프로세스를 실행할까?"
description: "Unix 계열 운영체제에서 fork, exec 계열과 waitpid가 프로세스를 생성하고 실행 결과를 회수하는 흐름을 설명한다."
date: 2026-05-25
updated: 2026-07-23
lastVerified: 2026-07-23
slug: "os/os_3"
aliases: []
commentKey: "/blog/os/os_3/"
category: "OS"
tags:
    - OS
    - Process API
    - Unix
    - Linux
series: "아주-쉬운-세가지-이야기"
chapter: 3
heroImage: "/og-image.svg"
draft: false
---

## 1. Unix는 왜 프로세스 생성과 프로그램 실행을 나눌까?

프로세스는 운영체제가 관리하는 실행 단위다. Unix 계열 운영체제에서는 새 프로그램을 실행하는 흐름을 대체로 세 단계로 나눈다.

1. `fork()`로 현재 프로세스를 바탕으로 자식 프로세스를 만든다.
2. 자식 프로세스가 `exec` 계열 함수를 호출해 실행할 프로그램을 교체한다.
3. 부모 프로세스가 `wait()` 또는 `waitpid()`로 자식의 상태 변화를 기다리고 종료 정보를 회수한다.

```text
부모 프로세스
→ fork()
→ 부모 프로세스 + 자식 프로세스
→ 자식이 exec 계열 함수 호출
→ 자식의 실행 이미지가 새 프로그램으로 교체
→ 부모가 waitpid()로 종료 상태 회수
```

`fork()`와 `exec`를 분리하면 자식이 새 프로그램을 실행하기 전에 파일 디스크립터를 바꾸거나 환경 변수를 설정하는 준비 작업을 할 수 있다. 셸의 입출력 재지정과 파이프도 이 틈을 이용한다.

## 2. fork()는 무엇을 만들까?

`fork()`는 호출한 프로세스를 부모로 두는 자식 프로세스를 생성한다. 호출에 성공하면 부모와 자식 모두 `fork()` 다음 명령부터 실행한다.

둘을 구분하는 기준은 반환값이다.

| 실행 위치 | `fork()` 반환값 |
| --- | --- |
| 부모 프로세스 | 생성된 자식의 PID |
| 자식 프로세스 | `0` |
| 생성 실패 | `-1` |

```c
pid_t pid = fork();

if (pid < 0) {
    perror("fork");
    return EXIT_FAILURE;
}

if (pid == 0) {
    printf("child\n");
} else {
    printf("parent: child pid=%d\n", pid);
}
```

부모와 자식은 `fork()` 이후 같은 코드에서 출발하지만 같은 프로세스는 아니다. 서로 다른 PID와 독립된 가상 주소 공간을 가진다. 현대 운영체제는 보통 모든 메모리 페이지를 즉시 복사하지 않고, 쓰기가 발생할 때 필요한 페이지를 복사하는 copy-on-write 방식으로 비용을 줄인다.

열린 파일 디스크립터처럼 부모에게서 상속되는 자원도 있다. 따라서 부모와 자식이 같은 파일 설명을 가리킬 수 있으며, 프로그램을 작성할 때 어떤 자원을 공유하고 어떤 자원을 닫아야 하는지 확인해야 한다.

## 3. 부모와 자식의 실행 순서는 정해져 있을까?

`fork()` 직후 부모와 자식 중 어느 쪽이 먼저 CPU를 할당받을지는 일반적으로 보장되지 않는다. 스케줄러의 결정과 시스템 상태에 따라 출력 순서가 달라질 수 있다.

```text
가능한 출력 1
child
parent

가능한 출력 2
parent
child
```

이 순서를 필요로 하는 프로그램은 우연한 스케줄링 결과에 의존하지 않고 동기화 수단을 사용해야 한다. 부모가 자식의 종료 이후에 작업을 계속해야 한다면 `wait()` 또는 `waitpid()`를 사용할 수 있다.

## 4. exec는 하나의 함수일까?

흔히 `exec()`라고 부르지만 실제로는 `execl()`, `execv()`, `execlp()`, `execvp()`와 같은 함수군이다. 이 함수들은 인자와 실행 파일 탐색 방식이 다르며, 최종적으로 운영체제의 프로그램 실행 기능을 사용한다.

`exec` 계열 함수가 성공하면 현재 프로세스의 실행 이미지가 새 프로그램으로 교체된다.

* PID는 새로 만들어지지 않는다.
* 기존 코드, 데이터, 힙과 스택은 새 프로그램 실행에 맞게 바뀐다.
* 성공한 호출은 기존 코드로 반환하지 않는다.
* 실패하면 `-1`을 반환하고 기존 프로세스가 계속 실행된다.

```c
execl("/bin/echo", "echo", "child process", (char *) NULL);

perror("execl");
_exit(127);
```

`perror()` 아래 코드는 `execl()`이 실패한 경우에만 실행된다. 자식에서 `exec`가 실패했을 때는 부모 프로세스에서 복사된 표준 입출력 버퍼를 다시 처리하지 않도록 `_exit()`를 사용할 수 있다.

## 5. wait()와 waitpid()는 무엇을 회수할까?

자식이 종료하면 운영체제는 종료 코드처럼 부모가 확인해야 할 최소 정보를 잠시 유지한다. 부모가 이를 회수하지 않으면 자식은 좀비 상태로 남을 수 있다.

`wait()`는 종료한 자식 중 하나를 기다린다. `waitpid()`는 특정 PID를 지정하거나 옵션을 사용해 더 세밀하게 기다릴 수 있다.

```c
int status;

if (waitpid(pid, &status, 0) < 0) {
    perror("waitpid");
    return EXIT_FAILURE;
}

if (WIFEXITED(status)) {
    printf("child exit status: %d\n", WEXITSTATUS(status));
}
```

`status`는 단순한 종료 코드 자체가 아니다. 매크로를 사용해 정상 종료인지, 신호에 의해 종료됐는지와 같은 상태를 해석해야 한다.

`waitpid(pid, &status, 0)`은 지정한 자식의 상태가 바뀔 때까지 부모를 대기시킨다. 이는 부모와 자식의 전체 실행 순서를 통제하는 기능이 아니라, 부모가 해당 자식의 상태 변화를 기다리고 정보를 회수하는 기능이다.

## 6. 하나의 프로그램으로 흐름 확인하기

다음 코드는 부모가 자식을 만들고, 자식이 `/bin/echo`로 실행 이미지를 바꾸며, 부모가 종료 상태를 회수하는 전체 예제다. Linux 또는 다른 POSIX 계열 환경에서 C 컴파일러로 실행할 수 있다.

```c
#include <stdio.h>
#include <stdlib.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

int main(void) {
    pid_t pid = fork();

    if (pid < 0) {
        perror("fork");
        return EXIT_FAILURE;
    }

    if (pid == 0) {
        execl("/bin/echo", "echo", "child process", (char *) NULL);

        perror("execl");
        _exit(127);
    }

    int status;

    if (waitpid(pid, &status, 0) < 0) {
        perror("waitpid");
        return EXIT_FAILURE;
    }

    if (WIFEXITED(status)) {
        printf("child exit status: %d\n", WEXITSTATUS(status));
    }

    return EXIT_SUCCESS;
}
```

```bash
gcc -Wall -Wextra -pedantic process_api.c -o process_api
./process_api
```

```text
child process
child exit status: 0
```

부모는 `waitpid()`에서 기다리므로 자식의 출력이 끝난 뒤 종료 상태를 출력한다. 자식이 `execl()`에 성공하면 원래 자식 코드로 돌아오지 않고 `/bin/echo` 프로그램으로 실행된다.

## 7. 셸은 이 구조를 어떻게 사용할까?

셸이 외부 명령을 실행하는 기본 흐름은 다음과 같다.

```text
사용자가 명령 입력
→ 셸이 fork()로 자식 생성
→ 자식이 파일 디스크립터와 환경 설정
→ 자식이 exec 계열 함수로 명령 실행
→ 부모 셸이 waitpid()로 자식 종료 대기
→ 셸이 종료 상태를 확인하고 프롬프트 출력
```

파이프를 구현할 때는 `fork()`와 `exec` 사이에서 자식의 표준 입력 또는 표준 출력을 파이프 파일 디스크립터로 연결한다. 프로그램 실행 기능과 프로세스 준비 단계를 분리했기 때문에 셸이 같은 실행 모델 위에 입출력 재지정과 파이프를 조합할 수 있다.

## 8. 정리

* `fork()`는 호출한 프로세스를 부모로 하는 자식 프로세스를 만들고 부모와 자식에 서로 다른 반환값을 제공한다.
* 부모와 자식의 실행 순서는 스케줄러에 따라 달라질 수 있으므로 필요한 순서는 명시적인 동기화로 보장해야 한다.
* `exec`는 하나의 함수가 아니라 함수군이며, 성공하면 PID를 유지한 채 현재 실행 이미지를 새 프로그램으로 교체한다.
* `wait()`와 `waitpid()`는 부모가 자식의 상태 변화를 기다리고 종료 정보를 회수하게 한다.
* `fork()`와 `exec` 사이의 준비 단계 덕분에 셸은 입출력 재지정과 파이프를 구성할 수 있다.

## 9. 참고 자료

### 공식 자료

* [Operating Systems: Three Easy Pieces - Interlude: Process API](https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-api.pdf)
* [Linux manual page - fork(2)](https://man7.org/linux/man-pages/man2/fork.2.html)
* [Linux manual page - execve(2)](https://man7.org/linux/man-pages/man2/execve.2.html)
* [Linux manual page - wait(2)](https://man7.org/linux/man-pages/man2/waitpid.2.html)

### 한글 참고 링크

* [운영체제: 아주 쉬운 세 가지 이야기 - 프로세스 API](https://pages.cs.wisc.edu/~remzi/OSTEP/Korean/05-cpu-api.pdf)
