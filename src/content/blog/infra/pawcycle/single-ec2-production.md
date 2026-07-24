---
title: "제한된 비용에서 단일 EC2 운영 구조를 선택한 이유"
description: "PawCycle Commerce를 단일 EC2에 배포하면서 비용과 장애 격리 사이에서 어떤 선택을 했고, proxy 단절 문제를 어떻게 해결하고 검증했는지 정리한다."
date: 2026-07-24
updated: 2026-07-24
lastVerified: 2026-07-24
slug: "infra/pawcycle/single-ec2-production"
aliases: []
commentKey: "/blog/infra/pawcycle/single-ec2-production/"
category: "Infra"
tags:
    - AWS
    - EC2
    - Docker Compose
    - Troubleshooting
testedWith:
    ec2: "t3.small"
    os: "Ubuntu 24.04 LTS"
book: ""
series: "pawcycle-commerce-운영-트러블슈팅"
chapter: 1
heroImage: "/og-image.svg"
draft: true
---


## 1. 제한된 비용을 운영환경을 만들어야 했다

PawCycle Commerce의 첫 운영 배포에서는 EC2 `t3.small` 한 대에 Nginx, Frontend, Backend와 MySQL을 함께 실행했다. 운영체제는 Ubuntu 24.04였으며, 네 개의 서비스는 Docker Compose로 관리했다.

처음부터 서버와 데이터베이스