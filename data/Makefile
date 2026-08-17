# Makefile for KTB Hackerton Dashboard - Data Scripts
# 사용법: make <target> EXCEL=파일명.xlsx [GENERATION=N] [COURSE=과정명]
#
# 예시:
#   make preview EXCEL="4기_스프레드시트.xlsx" GENERATION=4
#   make import  EXCEL="4기_스프레드시트.xlsx" GENERATION=4

# ─── 설정 (변경 필요) ────────────────────────────────────────────────────────
SA          := ./firebase-service-account.json   # 서비스 계정 JSON 경로
EXCEL       ?= ""                                 # 엑셀 파일명 (필수)
GENERATION  ?=                                    # 기수 번호 (선택, 생략 시 시트명 자동 추출)
COURSE      ?=                                    # 과정명 강제 지정 (선택, 생략 시 B열 사용)
SCRIPT      := import_students_to_firestore.py

# ─── 내부 인자 조합 ───────────────────────────────────────────────────────────
_BASE_ARGS  := --excel $(EXCEL) --service-account $(SA)
_GEN_ARG    := $(if $(GENERATION),--generation $(GENERATION),)
_CRS_ARG    := $(if $(COURSE),--course "$(COURSE)",)
_ARGS       := $(_BASE_ARGS) $(_GEN_ARG) $(_CRS_ARG)

# ─── 타겟 ─────────────────────────────────────────────────────────────────────
.PHONY: help preview import

## help: 사용법 출력
help:
	@echo ""
	@echo "┌─────────────────────────────────────────────────────────────────────┐"
	@echo "│         KTB Hackerton - 학생 데이터 Firestore 임포트 도구             │"
	@echo "└─────────────────────────────────────────────────────────────────────┘"
	@echo ""
	@echo "사용법:"
	@echo "  make preview  EXCEL=<파일명>  [GENERATION=N] [COURSE=과정명]"
	@echo "  make import   EXCEL=<파일명>  [GENERATION=N] [COURSE=과정명]"
	@echo ""
	@echo "예시:"
	@echo "  make preview EXCEL=\"4기_스프레드시트.xlsx\" GENERATION=4"
	@echo "  make import  EXCEL=\"4기_스프레드시트.xlsx\" GENERATION=4"
	@echo "  make import  EXCEL=\"5기_스프레드시트.xlsx\" GENERATION=5 COURSE=인공지능"
	@echo ""

## preview: 미리보기 (Firestore에 저장하지 않음)
preview:
	@if [ -z "$(EXCEL)" ] || [ "$(EXCEL)" = '""' ]; then \
		echo "[오류] EXCEL 인자가 필요합니다. 예: make preview EXCEL=\"4기_스프레드시트.xlsx\""; \
		exit 1; \
	fi
	python $(SCRIPT) $(_ARGS)

## import: 실제 Firestore에 저장 (--commit)
import:
	@if [ -z "$(EXCEL)" ] || [ "$(EXCEL)" = '""' ]; then \
		echo "[오류] EXCEL 인자가 필요합니다. 예: make import EXCEL=\"4기_스프레드시트.xlsx\""; \
		exit 1; \
	fi
	python $(SCRIPT) $(_ARGS) --commit
