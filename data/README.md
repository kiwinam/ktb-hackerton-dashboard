# KTB 해커톤 대시보드 — 학생 데이터 임포트 가이드

이 폴더에는 KTB 해커톤 대시보드의 Firestore `students` 컬렉션에 학생 데이터를 일괄 등록하는 스크립트가 있습니다.

---

## 📁 폴더 구조

```
data/
├── import_students_to_firestore.py   # 메인 임포트 스크립트
├── firebase-service-account.json     # Firebase Admin SDK 서비스 계정 키 (Git 미포함)
├── Makefile                          # 자주 쓰는 명령어 단축키 모음
├── README.md                         # 이 파일
└── <N기_스프레드시트>.xlsx            # 기수별 학생 명단 엑셀 파일
```

> ⚠️ `firebase-service-account.json`은 민감한 키 파일입니다. **절대 Git에 커밋하지 마세요.**

---

## 📋 엑셀 파일 형식

임포트 스크립트가 읽는 엑셀 열 구조는 다음과 같습니다.

| 열  | 내용           | 비고              |
|-----|----------------|-------------------|
| A   | 순번 (ID)      | 비어 있어도 무방   |
| B   | 과정명         | 예: 풀스택, 인공지능 |
| C   | 국문명         | 예: 홍길동         |
| D   | 영문명         | 예: gildong.hong   |
| H   | 생년월일       | 예: 2000.01.17, 000117, 20000117 |

- 1행은 헤더로 간주하며 건너뜁니다.
- 시트 이름이 `P-4기`, `4기` 등이면 기수를 자동으로 추출합니다.

---

## 🗄️ Firestore 저장 구조

각 학생 문서는 `students` 컬렉션에 아래 형태로 저장됩니다.

```
문서 ID: {기수}_{과정}_{국문명}_{YYMMDD}
         예) 4_풀스택_홍길동_000117

필드:
  birthdate  : "000117"               (string)
  course     : "풀스택"               (string)
  generation : 4                      (int)
  id         : "4_풀스택_홍길동_000117"  (string)
  isAdmin    : false                  (boolean)
  kor_name   : "홍길동"               (string)
  name       : "gildong.hong(홍길동)" (string)
  voteCount  : 0                      (int)
```

---

## 🚀 사전 준비

### 1. Python 패키지 설치

```bash
pip install firebase-admin openpyxl
```

### 2. 서비스 계정 키 발급

1. [Firebase Console](https://console.firebase.google.com/) → 프로젝트 설정 → 서비스 계정
2. **새 비공개 키 생성** 클릭 → JSON 파일 다운로드
3. 다운로드된 파일을 `data/firebase-service-account.json`으로 저장

---

## ▶️ 실행 방법

### 방법 1: Makefile 사용 (권장)

```bash
cd data/

# 미리보기 (Firestore에 저장하지 않음)
make preview EXCEL="4기_스프레드시트.xlsx" GENERATION=4

# 실제 Firestore 등록
make import EXCEL="4기_스프레드시트.xlsx" GENERATION=4

# 과정명을 강제 지정할 때
make import EXCEL="4기_스프레드시트.xlsx" GENERATION=4 COURSE=인공지능
```

### 방법 2: 직접 python 명령어 실행

```bash
cd data/

# 미리보기 (DRY RUN) — Firestore에 저장하지 않음
python import_students_to_firestore.py \
  --excel "4기_스프레드시트.xlsx" \
  --service-account "./firebase-service-account.json" \
  --generation 4

# 실제 Firestore 등록 (--commit 추가)
python import_students_to_firestore.py \
  --excel "4기_스프레드시트.xlsx" \
  --service-account "./firebase-service-account.json" \
  --generation 4 \
  --commit
```

---

## ⚙️ 스크립트 옵션 전체 목록

| 옵션 | 필수 | 설명 |
|------|------|------|
| `--excel` | ✅ | 엑셀 파일 경로 |
| `--service-account` | ✅ | Firebase 서비스 계정 JSON 경로 |
| `--generation` | ❌ | 기수 번호 (생략 시 시트명에서 자동 추출) |
| `--sheet` | ❌ | 시트 이름 (생략 시 첫 번째 시트 사용) |
| `--course` | ❌ | 과정명 강제 지정 (생략 시 B열 값 사용) |
| `--commit` | ❌ | 실제 저장 여부. 없으면 미리보기만 실행 |
| `--errors-csv` | ❌ | 검증 실패 행 저장 경로 (기본: `students_import_errors.csv`) |

---

## 🔁 새 기수 학생 추가 절차

1. **엑셀 파일 준비**: `N기_스프레드시트.xlsx` 형태로 `data/` 폴더에 저장
2. **미리보기 실행**: `make preview EXCEL="N기_스프레드시트.xlsx" GENERATION=N`
3. **결과 확인**: 정상 데이터 건수 / 실패 건수 확인. 실패 원인은 `students_import_errors.csv` 참조
4. **문제 수정**: 실패 건수가 있으면 엑셀 수정 후 2단계 반복
5. **실제 등록**: `make import EXCEL="N기_스프레드시트.xlsx" GENERATION=N`

---

## ❓ 자주 묻는 질문

**Q. A열(순번)이 일부 비어 있는데 오류가 나나요?**  
A. 아닙니다. A열 순번은 Firestore 문서에 저장되지 않으며, 비어 있어도 임포트에 문제가 없습니다.

**Q. 같은 학생을 두 번 임포트하면 어떻게 되나요?**  
A. Firestore `setDoc` 방식으로 동작하므로, 같은 문서 ID(`기수_과정_국문명_YYMMDD`)가 이미 존재하면 **덮어씁니다**. 기존 데이터 유실에 주의하세요.

**Q. `Missing or insufficient permissions` 오류가 발생합니다.**  
A. Firestore 보안 규칙을 확인하세요. 프로젝트 루트에서 `firebase deploy --only firestore:rules`를 실행하면 규칙이 배포됩니다.
