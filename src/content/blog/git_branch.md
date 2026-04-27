---
title: "[Git] Git branch 전략 정리"
description: "Git Flow와 GitHub Flow의 차이를 정리하고 개인 Board 프로젝트에 맞는 브랜치 운영 방식을 선택한 기록"
date: 2026-03-27
updated: 2026-04-27
category: Git
tags: ["Git", "GitHub Flow", "DevOps"]
featured: false
draft: false
---

## 깃 브랜치 전략이란?

깃 브랜치 전략은 **프로젝트를 진행할 때 브랜치를 어떤 기준으로 나누고, 어떤 흐름으로 개발하고, 어떤 시점에 병합할지를 정한 작업 규칙**입니다..  
단순히 브랜치를 여러 개 만드는 것이 아니라 **협업, 배포, 유지보수**를 더 안정적으로 하기 위한 방식이라고 볼 수 있습니다.


프로젝트를 진행하다 보면 새로운 기능 개발, 버그 수정, 리팩토링, 배포 준비 같은 작업이 동시에 일어납니다. 이 모든 작업을 하나의 브랜치에서만 처리하면 코드가 뒤섞이기 쉽고, 어떤 변경이 왜 들어갔는지 추적하기도 어려워집니다.

요약하자면,
- 배포 가능한 코드와 개발 중인 코드를 분리할 수 있습니다.
- 기능별 작업 이력을 명확하게 관리할 수 있습니다.
- 협업 시 충돌을 줄이고 리뷰 흐름을 만들 수 있습니다.
- 문제가 생겼을 때 어느 작업에서 발생했는지 추적하기 쉽습니다.

## Git Flow 전략

Git Flow는 가장 전통적으로 많이 사용되는 브랜치 전략입니다.  
기능 개발, 배포 준비, 긴급 수정 같은 작업을 브랜치별로 엄격하게 나누는 방식입니다.

### 1. 메인 브랜치

Git Flow 개발 모델의 핵심에는 수명이 무한한 두 개의 메인 브랜치가 있습니다.
- `master`
- `develop`

`master` 브랜치는 대부분의 Git 사용자에게 익숙한 브랜치입니다. 그리고 이와 병행해서 `develop` 이라는 또 다른 브랜치가 존재합니다.

Git Flow에서는
- `origin/master`: 항상 프로덕션 배포가 가능한 상태의 소스 코드를 반영하는 메인 브랜치
- `origin/develop`: 다음 릴리스를 위해 지금까지 완료된 최신 개발 변경사항이 반영되는 메인 브랜치

즉, `master`는 **지금 바로 배포 가능한 안정 버전** `develop`는 **다음 배포를 준비하는 개발 통합 버전**입니다.

### 2. 보조 브랜치

Git Flow에서는 `master`, `develop` 외에도 여러 개의 보조 브랜치를 사용합니다.

이 브랜치들은 다음 목적을 위해 존재합니다.
- 여러 개발자가 동시에 병렬로 작업할 수 있도록 돕기 위해
- 기능 단위 작업을 추적하기 쉽게 하기 위해
- 배포 준비를 하기 위해
- 운영 중 발생한 긴급 문제를 빠르게 수정하기 위해

이 보조 브랜치들은 **일시적으로만 존재하는 브랜치로, 목적이 끝나면 삭제**됩니다.

보조 브랜치 종류는 다음과 같습니다.
1. `feature`: 새로운 기능을 개발하는 브랜치
2. `release`: 다음 출시 버전을 준비하는 브랜치
3. `hotfix`: 출시된 제품의 버그를 고치기 위한 브랜치 


### 작업 흐름
1. `develop`에서 기능 브랜치를 만듭니다.
2. 기능 개발을 진행합니다.
3. 완료되면 `develop`와 합칩니다.
4. 여러 기능이 모여 안정화되면 최종적으로 `master`로 배포합니다.

```bash
# 1. develop에서 기능 브랜치 생성
git checkout develop
git pull origin develop
git checkout -b feature/category

# 2. 기능 개발 후 커밋
git add .
git commit -m "feat: 카테고리 기능 추가"
git push -u origin feature/category

# 3. develop와 합치기: merge 방식
git checkout develop
git pull origin develop
git merge feature/category
git branch -d feature/category
git push origin --delete feature/category

# 4. master로 배포
git checkout master
git pull origin master
git merge develop
git push origin master
```

## GitHub Flow 전략

GitHub Flow는 GitHub 환경에서 많이 사용하는 간단한 브랜치 전략입니다.  
복잡한 브랜치 구조를 두지 않고, `main` 브랜치를 중심으로 작업 브랜치를 생성하고 Pull Request를 통해 병합하는 방식입니다.

Git Flow처럼 `develop`, `release`, `hotfix` 브랜치를 따로 두지 않고, 필요한 작업이 생길 때마다 `main`에서 브랜치를 나누어 개발한 뒤 다시 `main`으로 합치는 구조를 가집니다.

### 1. main 브랜치

`main` 브랜치는 언제든 배포할 수 있는 안정적인 상태를 유지해야 합니다.  
그래서 GitHub Flow에서는 아래 규칙을 따릅니다.
- 직접 `main`에서 작업하지 않는다.
- 기능 개발이나 버그 수정은 별도 브랜치에서 진행한다.
- 검토와 테스트가 끝난 코드만 `main`에 병합한다.

### 2. 작업 브랜치

기능 추가, 버그 수정, 리팩토링 등 모든 작업은 `main`에서 분기한 별도 브랜치에서 진행합니다.

예를 들면 `feature/login`, `feature/category` 등이 있습니다.

작업마다 브랜치를 나누기 때문에 변경 목적이 명확해지고, PR 단위 관리도 쉬워집니다.

### 작업 흐름

1. `main`에서 작업 브랜치 생성
2. 기능 개발 진행
3. 원격 저장소로 push
4. Pull Request 생성
5. `main`에 병합    

```bash
# 1. main에서 작업 브랜치 생성
git checkout main
git pull origin main
git checkout -b feature/category

# 2. 기능 개발 진행
git add .
git commit -m "feat: 카테고리 기능 추가"

# 3. 원격 저장소로 push
git push -u origin feature/category

# 4. Pull Request 생성

# 5. main에 병합
git checkout main
git pull origin main
git branch -d feature/category
git push origin --delete feature/category
```

## 내 Board 프로젝트에서는 어떤 전략을 사용할까?

개인 프로젝트이고 배포 단위가 크지 않기 때문에 Git Flow보다는 GitHub Flow가 더 적합하다고 판단했다.

현재는 다음 흐름을 사용한다.

1. `main` 브랜치는 항상 배포 가능한 상태로 유지한다.
2. 기능 단위로 `feature/*` 브랜치를 생성한다.
3. 로컬 검증 또는 PR 확인 후 `main`에 병합한다.
4. `main`에 push되면 GitHub Actions를 통해 EC2에 배포한다.

이 방식을 선택한 이유는 개인 프로젝트에서 `develop`, `release`, `hotfix` 브랜치를 모두 운영하면 관리 비용이 더 커지기 때문이다.

```bash
git checkout main
git pull origin main
git checkout -b feature/category
```





## 참고
https://sweeb.tistory.com/119  
https://nvie.com/posts/a-successful-git-branching-model/  
https://docs.github.com/en/get-started/using-github/github-flow
