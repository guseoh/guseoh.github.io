---
title: "[Git] Git Flow와 GitHub Flow는 무엇이 다를까?"
description: "Git Flow와 GitHub Flow의 브랜치 구조, 작업 흐름과 선택 기준을 비교한다."
date: 2026-03-27
updated: 2026-07-23
lastVerified: 2026-07-23
category: "Git"
slug: "git_branch"
commentKey: "/blog/git_branch/"
tags:
    - Git
    - Branch Strategy
    - Git Flow
    - GitHub Flow
heroImage: "/og-image.svg"
draft: false
---

## 1. 브랜치 전략이 필요한 이유

Git 브랜치는 특정 커밋을 가리키는 이동 가능한 포인터다. 기능 개발을 위해 브랜치를 만들면 배포 가능한 코드와 작업 중인 변경을 서로 다른 커밋 흐름으로 관리할 수 있다.

브랜치를 만드는 것만으로 협업 방식이 정해지지는 않는다. 팀은 다음과 같은 운영 규칙도 함께 결정해야 한다.

* 작업 브랜치를 어느 브랜치에서 만들 것인가
* 변경을 어떤 검증 절차를 거쳐 병합할 것인가
* 배포 가능한 상태를 어느 브랜치에 유지할 것인가
* 릴리스 준비와 긴급 수정을 별도 흐름으로 관리할 것인가
* 병합이 끝난 브랜치를 언제 삭제할 것인가

이 규칙을 브랜치 전략이라고 한다. 대표적인 방식으로 Git Flow와 GitHub Flow가 있지만, 어느 한쪽이 모든 프로젝트에 적합한 것은 아니다. 배포 주기와 릴리스 관리 방식에 따라 필요한 구조가 달라진다.

## 2. Git Flow

Git Flow는 장기간 유지되는 메인 브랜치 두 개와 목적별 보조 브랜치를 사용하는 모델이다. 릴리스 버전을 일정 기간 준비하고 운영 버전과 다음 개발 버전을 분리해야 하는 환경에 맞는다.

### 2.1 메인 브랜치

Git Flow의 중심에는 다음 두 브랜치가 있다.

* `main`: 현재 운영에 배포된 버전을 관리한다. 원래 모델에서는 `master`라는 이름을 사용했다.
* `develop`: 다음 릴리스에 포함할 개발 결과를 통합한다.

`main`과 `develop`을 분리하면 운영 버전과 다음 버전의 개발 상태를 동시에 관리할 수 있다. 대신 두 브랜치 사이의 변경 흐름과 병합 시점을 지속적으로 관리해야 한다.

### 2.2 보조 브랜치

보조 브랜치는 작업 목적이 끝나면 삭제하는 임시 브랜치다.

| 브랜치 | 시작 지점 | 병합 대상 | 목적 |
| --- | --- | --- | --- |
| `feature/*` | `develop` | `develop` | 기능 개발 |
| `release/*` | `develop` | `main`, `develop` | 릴리스 안정화와 버전 준비 |
| `hotfix/*` | `main` | `main`, `develop` | 운영 버전의 긴급 수정 |

`release/*`와 `hotfix/*`를 두 브랜치에 다시 병합하는 이유는 운영 코드에 반영한 변경이 이후 개발 버전에서도 사라지지 않게 하기 위해서다.

### 2.3 기능 개발과 릴리스 흐름

다음 명령은 Git Flow의 핵심 흐름을 단순화한 예다. 실제 협업에서는 직접 병합하는 대신 Pull Request와 CI 검증을 사용할 수 있다.

```bash
# develop에서 기능 브랜치를 만든다.
git switch develop
git pull --ff-only origin develop
git switch -c feature/category

# 기능 개발 결과를 원격 저장소에 올린다.
git add .
git commit -m "feat: 카테고리 기능 추가"
git push -u origin feature/category
```

기능이 `develop`에 통합되고 릴리스 범위가 정해지면 `release/*` 브랜치를 만든다.

```bash
# 릴리스 준비 브랜치를 만든다.
git switch develop
git switch -c release/1.2.0

# 검증이 끝난 릴리스를 main과 develop에 반영한다.
git switch main
git merge --no-ff release/1.2.0
git tag -a v1.2.0 -m "release: 1.2.0"

git switch develop
git merge --no-ff release/1.2.0

git branch -d release/1.2.0
```

Git Flow는 릴리스 준비 상태를 별도로 유지할 수 있지만, 브랜치가 많고 병합 경로가 복잡하다. 변경을 `main`에 자주 병합해 곧바로 배포하는 프로젝트에서는 관리 비용이 더 크게 느껴질 수 있다.

## 3. GitHub Flow

GitHub Flow는 배포 가능한 `main`과 짧게 유지하는 작업 브랜치를 중심으로 한 방식이다. 별도의 `develop`이나 `release` 브랜치를 기본 구조로 두지 않는다.

### 3.1 기본 원칙

GitHub Flow의 작업 단위는 하나의 브랜치와 Pull Request다.

1. 최신 `main`에서 작업 브랜치를 만든다.
2. 변경을 작은 커밋으로 기록하고 원격 저장소에 올린다.
3. Pull Request에서 변경 이유, 코드와 테스트 결과를 검토한다.
4. 검증이 끝나면 `main`에 병합한다.
5. 병합한 작업 브랜치는 삭제한다.
6. `main`의 변경을 배포한다.

`main`이 항상 배포 가능한 상태여야 하므로, 병합 전에 자동 테스트와 리뷰를 통과하게 하는 것이 중요하다. 배포가 자동화되어 있다면 병합과 배포 사이의 간격도 짧아진다.

### 3.2 작업 흐름

```bash
# 최신 main에서 작업 브랜치를 만든다.
git switch main
git pull --ff-only origin main
git switch -c feature/category

# 변경을 커밋하고 원격 저장소에 올린다.
git add .
git commit -m "feat: 카테고리 기능 추가"
git push -u origin feature/category
```

Pull Request가 병합된 뒤에는 로컬과 원격의 작업 브랜치를 삭제한다.

```bash
git switch main
git pull --ff-only origin main
git branch -d feature/category
git push origin --delete feature/category
```

브랜치 삭제는 커밋을 즉시 제거하는 작업이 아니다. 병합된 커밋은 `main`에서 계속 접근할 수 있고, 불필요한 브랜치 이름만 정리된다.

## 4. Git Flow와 GitHub Flow 비교

| 기준 | Git Flow | GitHub Flow |
| --- | --- | --- |
| 장기 유지 브랜치 | `main`, `develop` | `main` |
| 릴리스 준비 | `release/*`에서 별도 관리 | `main` 병합 전후의 자동 검증과 배포로 관리 |
| 긴급 수정 | `hotfix/*` 흐름 사용 | `main`에서 작업 브랜치를 만들어 동일한 PR 절차 사용 |
| 적합한 배포 방식 | 버전 단위, 정기 릴리스 | 잦은 병합과 지속적 배포 |
| 관리 비용 | 상대적으로 큼 | 상대적으로 작음 |

Git Flow는 여러 버전을 동시에 관리하거나 릴리스 안정화 기간이 필요한 프로젝트에서 의미가 있다. GitHub Flow는 하나의 운영 버전을 빠르게 개선하고 `main`을 기준으로 자동 배포하는 환경에 잘 맞는다.

## 5. 어떤 전략을 선택해야 할까?

브랜치 개수가 많다고 변경이 더 안전해지는 것은 아니다. 각 브랜치의 책임과 병합 경로를 팀이 실제로 유지할 수 있어야 한다.

다음 조건이라면 Git Flow를 검토할 수 있다.

* 정해진 버전과 일정에 따라 릴리스한다.
* 운영 버전과 다음 개발 버전을 장기간 분리해야 한다.
* 릴리스 안정화 작업을 기능 개발과 분리해야 한다.
* 여러 운영 버전에 수정 사항을 반영해야 한다.

다음 조건이라면 GitHub Flow가 단순하다.

* `main`에 병합한 변경을 자주 배포한다.
* CI가 테스트와 빌드를 자동으로 검증한다.
* 하나의 운영 버전을 지속적으로 개선한다.
* 작은 Pull Request 단위로 리뷰할 수 있다.

개인 프로젝트나 소규모 웹 서비스에서는 `main → 작업 브랜치 → Pull Request → main` 흐름만으로도 충분한 경우가 많다. 배포 방식이 복잡해졌을 때 필요한 브랜치를 추가하는 편이, 처음부터 모든 보조 브랜치를 유지하는 것보다 운영 규칙을 이해하기 쉽다.

## 6. 브랜치를 운영할 때 확인할 점

* 작업 브랜치는 최신 기준 브랜치에서 만든다.
* 하나의 브랜치에는 하나의 명확한 변경 목적을 둔다.
* 병합 전 테스트와 리뷰 조건을 정한다.
* `main`에 직접 푸시하지 않도록 브랜치 보호 규칙을 사용할 수 있다.
* 병합된 원격 브랜치는 삭제해 활성 작업과 완료된 작업을 구분한다.
* 오래 유지된 브랜치는 기준 브랜치의 변경을 반영하고 충돌을 조기에 해결한다.

## 7. 정리

* 브랜치 전략은 브랜치 이름만 정하는 규칙이 아니라 작업 시작점, 검증, 병합, 배포와 삭제 흐름을 정하는 운영 방식이다.
* Git Flow는 운영 버전과 다음 개발 버전, 릴리스 준비와 긴급 수정을 여러 브랜치로 분리한다.
* GitHub Flow는 배포 가능한 `main`과 짧게 유지하는 작업 브랜치, Pull Request를 중심으로 동작한다.
* 배포 주기와 버전 관리 방식이 단순하다면 필요한 브랜치만 유지하는 전략이 관리하기 쉽다.
* 병합이 끝난 브랜치를 삭제하면 커밋 이력은 보존하면서 활성 브랜치 목록을 정리할 수 있다.

## 8. 참고 자료

### 공식 자료

* [Git - Branching Workflows](https://git-scm.com/book/en/v2/Git-Branching-Branching-Workflows)
* [Git - Branch Management](https://git-scm.com/book/en/v2/Git-Branching-Branch-Management)
* [GitHub flow](https://docs.github.com/en/get-started/using-github/github-flow)
* [A successful Git branching model](https://nvie.com/posts/a-successful-git-branching-model/)

### 한글 참고 링크

* [GitHub 플로우](https://docs.github.com/ko/get-started/using-github/github-flow)
