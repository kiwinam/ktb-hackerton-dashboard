#!/usr/bin/env python3
import argparse
import sys
from pathlib import Path
import firebase_admin
from firebase_admin import credentials, firestore

COLLECTION_NAME = "students"

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Firestore students 컬렉션에 테스트 수강생 데이터를 등록합니다."
    )
    parser.add_argument(
        "--service-account",
        default="./data/firebase-service-account.json",
        help="Firebase Admin SDK 서비스 계정 JSON 파일 경로",
    )
    parser.add_argument(
        "--generation",
        type=int,
        default=3,
        help="테스트 수강생의 기수 (기본값: 4)",
    )
    parser.add_argument(
        "--commit",
        action="store_true",
        help="실제 Firestore에 데이터를 추가합니다. 생략하면 미리보기만 실행합니다.",
    )
    return parser.parse_args()

def initialize_firestore(service_account_path: Path):
    if not firebase_admin._apps:
        credential = credentials.Certificate(str(service_account_path))
        firebase_admin.initialize_app(credential)
    return firestore.client()

def main() -> int:
    args = parse_args()
    service_account_path = Path(args.service_account).expanduser().resolve()

    if not service_account_path.is_file():
        print(f"[오류] 서비스 계정 JSON 파일을 찾을 수 없습니다: {service_account_path}", file=sys.stderr)
        return 1

    try:
        db = initialize_firestore(service_account_path)
    except Exception as exc:
        print(f"[오류] Firestore 연결 초기화 실패: {exc}", file=sys.stderr)
        return 1

    # 테스트 데이터 구성
    courses_config = {
        "인공지능": "ai",
        "풀스택": "fs",
        "클라우드": "cl"
    }

    test_students = []
    generation = args.generation
    birthdate = "990101"

    for course_name, prefix in courses_config.items():
        for i in range(1, 4):
            kor_name = f"{course_name} 테스트{i}"
            display_name = f"test.{prefix}{i}({kor_name})"
            doc_id = f"{generation}_{course_name}_{kor_name}_{birthdate}"
            
            student_data = {
                "birthdate": birthdate,
                "course": course_name,
                "generation": generation,
                "isAdmin": False,
                "kor_name": kor_name,
                "name": display_name,
                "voteCount": 0
            }
            
            test_students.append({
                "id": doc_id,
                "data": student_data
            })

    print()
    print("===== 테스트 수강생 데이터 생성 목록 =====")
    print(f"생성할 기수: {generation}기")
    print(f"생성 대상 수: {len(test_students)}건")
    print("목록:")
    for item in test_students:
        d = item["data"]
        print(f" - ID: {item['id']}")
        print(f"   Name: '{d['name']}' / KorName: '{d['kor_name']}' / Course: '{d['course']}'")
    
    if not args.commit:
        print()
        print("[DRY RUN] Firestore에는 아직 변경 사항을 저장하지 않았습니다.")
        print("실제 반영하려면 '--commit' 옵션을 추가하여 실행하세요.")
        return 0

    print()
    print("Firestore에 테스트 수강생 데이터 추가 중...")
    try:
        batch = db.batch()
        for item in test_students:
            doc_ref = db.collection(COLLECTION_NAME).document(item["id"])
            batch.set(doc_ref, item["data"])
        batch.commit()
    except Exception as exc:
        print(f"[오류] Firestore 데이터 삽입 실패: {exc}", file=sys.stderr)
        return 1

    print()
    print(f"[성공] students 컬렉션에 {len(test_students)}개의 테스트 수강생 데이터를 성공적으로 등록했습니다.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
