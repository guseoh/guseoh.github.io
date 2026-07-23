---
title: "회원 삭제 시 연관 게시글과 댓글은 어떻게 처리할까?"
description: "회원 삭제가 게시글과 댓글에 미치는 영향을 정리하고, 현재 Board 프로젝트에서 명시 삭제를 선택한 이유와 트랜잭션 경계를 살펴본다."
date: 2026-05-26
updated: 2026-07-23
lastVerified: 2026-07-23
slug: "board/spring-delete-policy"
aliases: []
commentKey: "/blog/board/spring-delete-policy/"
category: "Board"
tags:
    - Spring
    - JPA
    - Transaction
series: "board-프로젝트-개선-기록"
chapter: 3
heroImage: "/og-image.svg"
draft: true
---

## 1. 회원 한 명만 삭제하는 문제가 아니다

Board 프로젝트의 회원은 게시글과 댓글을 작성한다. 회원이 작성한 게시글에는 다른 회원의 댓글도 달릴 수 있다. 따라서 회원 삭제는 `member` 테이블의 행 하나를 제거하는 작업으로 끝나지 않는다.

```text
Member
 ├── Post
 │    └── Comment
 └── Comment
```

삭제 정책을 정할 때는 다음 데이터를 함께 봐야 한다.

- 회원이 직접 작성한 게시글
- 회원이 직접 작성한 댓글
- 회원이 작성한 게시글에 다른 회원이 남긴 댓글
- 추후 회원과 연결될 좋아요, 알림과 첨부파일

특히 회원 A가 작성한 게시글에 B와 C가 댓글을 남겼다면, A의 탈퇴가 B와 C의 데이터 삭제로 이어져도 되는지는 서비스 정책에 따라 달라진다.

## 2. 선택할 수 있는 삭제 정책

회원 삭제 정책은 크게 물리 삭제, 상태 기반 삭제와 연관관계 자동 삭제로 나눠 볼 수 있다.

### 2.1 연관 데이터를 함께 물리 삭제한다

회원과 연결된 게시글과 댓글을 실제 테이블에서 제거하는 방식이다. 데이터가 남지 않고 조회 조건도 단순하지만, 다른 회원이 작성한 댓글까지 사라질 수 있다.

```text
회원 A 삭제
 └── A가 작성한 게시글 삭제
      ├── B가 작성한 댓글 삭제
      └── C가 작성한 댓글 삭제
```

서비스가 이 동작을 요구한다면 문제가 없다. 반대로 게시글의 대화 기록을 유지해야 한다면 다른 정책이 필요하다.

### 2.2 회원 상태만 탈퇴로 변경한다

회원 행을 지우지 않고 탈퇴 상태를 기록하는 방식이다.

```java
private boolean deleted;
private LocalDateTime deletedAt;
```

게시글과 댓글의 문맥을 유지할 수 있지만, 모든 조회에서 탈퇴 상태를 고려해야 한다. 이메일, 닉네임과 같은 개인정보를 얼마나 보관하고 언제 익명화하거나 삭제할지도 별도로 정해야 한다.

### 2.3 JPA의 삭제 전파를 사용한다

`CascadeType.REMOVE`는 부모 엔티티가 삭제될 때 연관된 자식 엔티티로 삭제 연산을 전파한다.

```java
@OneToMany(mappedBy = "member", cascade = CascadeType.REMOVE)
private List<Post> posts = new ArrayList<>();
```

`orphanRemoval = true`는 부모와의 연관관계가 끊어진 자식 엔티티를 제거하는 설정이다.

```java
@OneToMany(mappedBy = "post", orphanRemoval = true)
private List<Comment> comments = new ArrayList<>();
```

두 설정은 코드를 줄여 주지만 삭제 범위가 엔티티 매핑에 들어간다. 부모와 자식의 생명주기가 실제로 같을 때 사용해야 하며, 회원 삭제처럼 다른 사용자의 데이터에 영향을 주는 기능에서는 서비스 정책을 먼저 확정해야 한다.

## 3. 현재 프로젝트는 명시 삭제를 사용한다

현재 Board 프로젝트에서는 삭제 대상을 서비스 코드에 직접 나열한다. 정책이 아직 확장되는 단계이므로 어떤 데이터가 제거되는지 호출 순서에서 확인할 수 있는 방식을 선택했다.

```java
@Service
@RequiredArgsConstructor
public class MemberDeletionService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final MemberRepository memberRepository;

    @Transactional
    public void deleteMember(Long memberId) {
        commentRepository.deleteAllByMemberId(memberId);
        commentRepository.deleteAllByPostMemberId(memberId);
        postRepository.deleteAllByMemberId(memberId);
        memberRepository.deleteById(memberId);
    }
}
```

삭제 순서는 외래 키 방향을 따른다.

1. 회원이 직접 작성한 댓글을 삭제한다.
2. 회원의 게시글에 달린 댓글을 삭제한다.
3. 댓글이 제거된 게시글을 삭제한다.
4. 마지막으로 회원을 삭제한다.

부모인 회원이나 게시글을 먼저 삭제하면 아직 남은 자식 행이 외래 키를 참조하므로 제약 조건 위반이 발생할 수 있다.

### 3.1 트랜잭션 경계는 외부에서 호출되는 메서드에 둔다

기존 글의 예제는 `private` 메서드에 `@Transactional`을 선언했다. Spring의 기본 프록시 방식에서는 외부 호출이 프록시를 통과할 때 트랜잭션 인터셉터가 동작한다. `private` 메서드는 프록시의 호출 진입점으로 사용할 수 없고, 같은 클래스 안의 자기 호출도 프록시를 거치지 않는다.

따라서 삭제 작업 전체를 하나의 트랜잭션으로 묶으려면 외부에서 호출되는 서비스 메서드에 트랜잭션 경계를 둔다.

```java
@Transactional
public void deleteMember(Long memberId) {
    deleteRelatedData(memberId);
    memberRepository.deleteById(memberId);
}

private void deleteRelatedData(Long memberId) {
    commentRepository.deleteAllByMemberId(memberId);
    commentRepository.deleteAllByPostMemberId(memberId);
    postRepository.deleteAllByMemberId(memberId);
}
```

`deleteRelatedData()`는 별도의 트랜잭션을 시작하지 않는다. 이미 `deleteMember()`에서 시작된 트랜잭션 안에서 실행된다. 삭제 도중 예외가 밖으로 전파되면 같은 트랜잭션에 포함된 변경이 함께 롤백된다.

## 4. 명시 삭제에서 확인할 점

명시 삭제는 삭제 범위를 드러내지만 도메인이 추가될 때 서비스 코드도 함께 수정해야 한다. 좋아요나 첨부파일을 추가하고 삭제 로직에서 빠뜨리면 외래 키 오류가 발생하거나 외부 저장소에 파일만 남을 수 있다.

현재 단계에서는 다음 테스트가 필요하다.

- 회원이 작성한 게시글과 댓글이 모두 삭제되는지 확인한다.
- 회원의 게시글에 다른 회원이 작성한 댓글도 현재 정책대로 삭제되는지 확인한다.
- 중간 삭제에서 예외가 발생하면 앞선 삭제가 롤백되는지 확인한다.
- 존재하지 않는 회원을 삭제할 때의 결과를 확인한다.
- 새 연관 도메인이 추가되면 회원 삭제 정책에 포함할지 결정한다.

회원 탈퇴와 관리자 강제 삭제가 다른 동작을 요구하게 되면 두 유스케이스를 분리해야 한다. 예를 들어 일반 탈퇴는 개인정보를 익명화하고 글을 유지하며, 관리자 삭제는 정책 위반 데이터까지 물리 삭제하도록 정할 수 있다.

## 5. 정리

회원 삭제는 연관관계 설정만으로 결정할 문제가 아니라 서비스가 어떤 기록을 보존할지 정하는 정책 문제다. 현재 프로젝트는 정책이 변할 가능성과 외래 키 삭제 순서를 코드에서 확인하기 위해 명시 삭제를 사용한다.

삭제 작업 전체는 외부에서 호출되는 서비스 메서드의 트랜잭션 안에서 실행한다. `private` 메서드에 `@Transactional`을 붙여 별도의 트랜잭션이 시작된다고 설명해서는 안 된다.

## 6. 참고 자료

### 공식 자료

* [Spring Framework - Using @Transactional](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html)
* [Jakarta Persistence Specification](https://jakarta.ee/specifications/persistence/)

### 한글 참고 링크

* [Transactional - hyoguoo.log](https://hyoguoo.github.io/docs/spring/transactional/)
* [JPA Entity 삭제: orphanRemoval vs CascadeType.REMOVE - 뱀귤 블로그](https://bcp0109.tistory.com/332)
