---
title: "Flyway는 데이터베이스 변경을 어떻게 관리할까?"
description: "Flyway의 마이그레이션 실행 방식, 파일 규칙, 체크섬과 Spring Boot·Hibernate의 역할 분리를 정리한다."
date: 2026-06-17
updated: 2026-07-23
lastVerified: 2026-07-23
slug: "db/flyway/flyway"
aliases: []
commentKey: "/blog/db/flyway/flyway/"
category: "DB"
tags:
    - Spring Boot
    - Flyway
    - Database Migration
book: ""
chapter: 1
heroImage: "/og-image.svg"
draft: false
---

## 1. 데이터베이스 변경도 이력이 필요하다

애플리케이션 기능이 바뀌면 테이블, 컬럼, 인덱스와 제약 조건도 함께 바뀐다. 개발자가 자신의 로컬 데이터베이스를 직접 수정하는 것만으로는 여러 환경을 같은 상태로 유지하기 어렵다.

* 어떤 SQL을 누가 실행했는지 알기 어렵다.
* 개발, 테스트와 운영 환경의 적용 순서가 달라질 수 있다.
* 새 환경을 만들 때 필요한 변경을 처음부터 재현하기 어렵다.
* 이미 적용한 SQL을 다시 실행하거나 누락할 수 있다.

Flyway는 데이터베이스 변경을 마이그레이션 파일로 기록하고 정해진 순서로 실행한다. 애플리케이션 코드와 SQL 파일을 함께 버전 관리하면 어떤 코드가 어떤 스키마를 기대하는지 검토할 수 있다.

## 2. Flyway는 무엇을 비교할까?

Flyway는 프로젝트에서 발견한 마이그레이션과 데이터베이스에 이미 적용된 이력을 비교한다.

```text
프로젝트의 마이그레이션 파일 검색
→ flyway_schema_history의 적용 이력 조회
→ 아직 적용하지 않은 Versioned Migration 확인
→ 버전 순서대로 실행
→ 변경된 Repeatable Migration 실행
→ 실행 결과와 체크섬 기록
```

기본 스키마 이력 테이블인 `flyway_schema_history`에는 버전, 설명, 스크립트 이름, 체크섬, 실행 시간과 성공 여부 등이 기록된다. 이미 적용된 Versioned Migration은 다시 실행하지 않고 새로 발견된 마이그레이션만 실행한다.

```sql
SELECT
    installed_rank,
    version,
    description,
    script,
    checksum,
    success
FROM flyway_schema_history
ORDER BY installed_rank;
```

Flyway는 데이터베이스를 Git 저장소처럼 되돌리는 도구가 아니다. **변경 스크립트와 적용 이력을 비교해 데이터베이스를 앞으로 이동시키는 도구**에 가깝다.

## 3. Spring Boot에서는 언제 실행될까?

Spring Boot 애플리케이션에 Flyway가 구성되어 있으면 애플리케이션 시작 과정에서 마이그레이션을 실행할 수 있다. 기본 SQL 마이그레이션 위치는 `classpath:db/migration`이며 설정으로 변경할 수 있다.

```text
src
└─ main
   └─ resources
      └─ db
         └─ migration
            ├─ V1__create_member_table.sql
            └─ V2__add_member_nickname.sql
```

데이터베이스 종류에 따라 Flyway의 데이터베이스 전용 모듈이 추가로 필요할 수 있다. 의존성 구성은 사용 중인 Spring Boot와 Flyway 버전, 대상 데이터베이스의 공식 문서를 기준으로 확인해야 한다.

애플리케이션 시작 시 자동 실행은 편리하지만 배포 방식에 따라 별도 마이그레이션 단계로 분리할 수도 있다. 중요한 기준은 애플리케이션 코드가 실행되기 전에 필요한 스키마 변경이 성공했고, 실패했을 때 애플리케이션 배포가 계속되지 않도록 만드는 것이다.

## 4. Versioned Migration은 한 번만 실행한다

Versioned Migration은 각 파일에 고유한 버전을 부여하고 버전 순서대로 한 번만 실행한다.

```text
V1__create_member_table.sql
V2__add_member_nickname.sql
V2_1__create_member_email_index.sql
```

기본 파일명은 다음 구조를 사용한다.

```text
V<버전>__<설명>.sql
```

* `V`는 Versioned Migration 접두사다.
* 버전은 각 마이그레이션을 구분하는 고유한 값이다.
* 두 개의 밑줄은 버전과 설명을 구분한다.
* 설명은 파일이 수행하는 변경을 나타낸다.

버전은 숫자 의미에 따라 정렬된다. 팀에서 단순 증가 번호나 타임스탬프 같은 규칙을 정할 수 있지만 프로젝트 안에서는 한 방식을 일관되게 사용해야 한다.

다음은 MySQL을 대상으로 작성한 간단한 예시다.

```sql
CREATE TABLE member (
    id BIGINT NOT NULL AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_member_email UNIQUE (email)
);
```

## 5. Repeatable Migration은 언제 다시 실행될까?

Repeatable Migration은 버전 없이 `R` 접두사를 사용한다.

```text
R__create_member_summary_view.sql
```

Repeatable Migration은 파일의 체크섬이 바뀌면 다시 실행된다. Versioned Migration이 모두 실행된 뒤 적용되며, 같은 실행 안에서는 설명 순서로 처리된다.

View, Procedure와 Function처럼 하나의 최신 정의를 반복 적용해야 하는 데이터베이스 객체에 사용할 수 있다. 여러 번 실행해도 원하는 최종 상태가 되도록 `CREATE OR REPLACE` 같은 구문을 사용할 수 있는지 확인해야 한다.

일반적인 테이블 생성과 컬럼 변경은 Versioned Migration이 중심이 된다. Repeatable Migration을 단순히 “수정해도 되는 마이그레이션”으로 이해하면 안 된다.

## 6. 적용된 Versioned Migration을 수정하면 안 되는 이유

Flyway는 Versioned Migration을 적용할 때 파일 내용으로 체크섬을 계산해 이력에 저장한다. 영구적인 하위 환경에 이미 적용한 파일을 나중에 수정하면 현재 파일과 저장된 체크섬이 달라진다.

```text
Migration checksum mismatch for migration version 1

Applied to database : -838055220
Resolved locally    : 1153225404
```

이 오류는 데이터베이스에 실행된 SQL과 저장소의 마이그레이션 파일이 더 이상 같은 변경을 나타내지 않는다는 뜻이다.

이미 적용한 구조를 바꿔야 한다면 기존 파일을 고치는 대신 새 Versioned Migration을 추가해 앞으로 이동하는 것이 기본 원칙이다.

```text
V1__create_member_table.sql
V2__add_member_nickname.sql
V3__change_member_name_length.sql
```

`repair` 명령은 체크섬 불일치를 무조건 해결하는 버튼이 아니다. 변경이 의도된 것인지, 실제 데이터베이스 구조가 어떤 상태인지 검증한 뒤 이력 정보를 바로잡을 때 사용해야 한다. 원인을 확인하지 않고 실행하면 저장소의 파일과 실제 데이터베이스 변경이 다르다는 사실을 숨길 수 있다.

## 7. Hibernate의 스키마 자동 생성과 역할을 어떻게 나눌까?

Hibernate의 `ddl-auto`는 엔티티 매핑을 기준으로 스키마를 생성하거나 변경할 수 있다. 학습과 일회성 테스트에는 편리하지만 운영 환경의 변경 SQL, 적용 순서와 검토 이력을 명시적으로 남기기 어렵다.

Spring Boot 공식 문서는 데이터베이스 초기화 방식을 여러 개 섞기보다 한 가지 메커니즘을 사용하는 것을 권장한다. Flyway를 스키마 변경 도구로 선택했다면 `schema.sql`, Hibernate의 자동 변경과 Flyway가 동시에 구조를 변경하지 않도록 역할을 분리하는 편이 안전하다.

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate
```

`validate`는 Hibernate가 테이블을 생성하거나 변경하지 않고 엔티티 매핑과 데이터베이스 구조가 호환되는지 검사한다. Flyway가 변경을 실행하고 Hibernate가 자신이 알고 있는 매핑 관점에서 결과를 확인하도록 나눌 수 있다.

다만 Hibernate 검증이 인덱스, 모든 제약 조건과 운영 데이터 변경까지 완전하게 검증하는 것은 아니다. 마이그레이션 SQL 자체에 대한 테스트와 데이터베이스별 검증도 필요하다.

## 8. 마이그레이션 작업 흐름

마이그레이션을 추가할 때는 다음 흐름을 기준으로 관리할 수 있다.

1. 엔티티 수정과 별개로 실제 데이터베이스 변경이 필요한지 확인한다.
2. 새 Versioned Migration을 작성하고 SQL과 롤아웃 영향을 리뷰한다.
3. 비어 있는 데이터베이스에 처음부터 전체 마이그레이션을 실행한다.
4. 기존 버전의 데이터베이스에도 새 마이그레이션만 적용되는지 확인한다.
5. 애플리케이션 테스트와 Hibernate 검증을 실행한다.
6. 테스트와 운영 환경에 동일한 마이그레이션 파일을 같은 순서로 배포한다.

컬럼을 `NOT NULL`로 변경하거나 대용량 인덱스를 추가하는 작업은 SQL 문법만 맞는다고 안전하지 않다. 기존 데이터, 잠금 시간, 롤백 전략과 애플리케이션의 이전·새 버전이 동시에 실행되는 배포 조건도 함께 검토해야 한다.

## 9. 정리

* Flyway는 데이터베이스 변경을 파일로 기록하고 각 환경에 같은 순서로 적용하기 위한 마이그레이션 도구다.
* Versioned Migration은 고유한 버전 순서대로 한 번 실행하며, 적용된 파일은 수정하지 않고 새 마이그레이션으로 변경을 이어 간다.
* Repeatable Migration은 체크섬이 바뀔 때 다시 실행되며 View나 Procedure처럼 최신 정의를 반복 적용할 대상에 적합하다.
* `flyway_schema_history`와 체크섬은 프로젝트의 파일과 데이터베이스 적용 이력이 달라지는 문제를 감지한다.
* Flyway가 스키마 변경을 담당한다면 Hibernate는 `validate`로 매핑 호환성을 확인하도록 역할을 나눌 수 있다.
* 마이그레이션은 SQL 실행 여부뿐 아니라 기존 데이터, 잠금과 배포 중 버전 호환성까지 검토해야 한다.

## 10. 참고 자료

### 공식 자료

* [Redgate Flyway — Migrations](https://documentation.red-gate.com/flyway/flyway-concepts/migrations)
* [Redgate Flyway — Versioned migrations](https://documentation.red-gate.com/flyway/flyway-concepts/migrations/versioned-migrations)
* [Redgate Flyway — Repeatable migrations](https://documentation.red-gate.com/flyway/flyway-concepts/migrations/repeatable-migrations)
* [Redgate Flyway — Validate](https://documentation.red-gate.com/flyway/reference/commands/validate)
* [Spring Boot — Database Initialization](https://docs.spring.io/spring-boot/how-to/data-initialization.html)

### 한글 참고 링크

* [우아한테크코스 — Flyway와 데이터베이스 마이그레이션](https://tecoble.techcourse.co.kr/post/2021-10-23-flyway/)
* [넥스트리 — Flyway 사용 중 마주한 문제와 해결 과정](https://www.nextree.io/flyway-sayong-jung-majuhan-munjewa-haegyeol-gwajeong/)
