#!/usr/bin/env python3
import argparse
import re
import sys
from pathlib import Path
import firebase_admin
from firebase_admin import credentials, firestore

COLLECTION_NAME = "students"
BATCH_LIMIT = 500

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Firestore students 컬렉션의 name 필드에서 한글명을 추출하여 kor_name 필드를 신설합니다."
    )
    parser.add_argument(
        "--service-account",
        default="./data/firebase-service-account.json",
        help="Firebase Admin SDK 서비스 계정 JSON 파일 경로",
    )
    parser.add_argument(
        "--commit",
        action="store_true",
        help="실제 Firestore 컬렉션을 갱신합니다. 생략하면 미리보기만 실행합니다.",
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

    print("students 컬렉션 문서를 조회 중...")
    try:
        docs = db.collection(COLLECTION_NAME).stream()
    except Exception as exc:
        print(f"[오류] 문서 조회 실패: {exc}", file=sys.stderr)
        return 1

    updates = []
    pattern = re.compile(r'\(([^)]+)\)')

    for doc in docs:
        data = doc.to_dict()
        name = str(data.get("name", "")).strip()
        
        match = pattern.search(name)
        if match:
            kor_name = match.group(1).strip()
        else:
            kor_name = name

        updates.append({
            "id": doc.id,
            "ref": doc.reference,
            "old_name": name,
            "new_kor_name": kor_name
        })

    print()
    print("===== kor_name 필드 마이그레이션 미리보기 =====")
    print(f"조회된 학생 문서 수: {len(updates)}건")
    print("상위 10건 미리보기:")
    for item in updates[:10]:
        print(f" - students/{item['id']}: name='{item['old_name']}' -> kor_name='{item['new_kor_name']}'")
    
    if len(updates) > 10:
        print(f"   ... 외 {len(updates) - 10}건")

    if not args.commit:
        print()
        print("[DRY RUN] Firestore에는 아직 변경 사항을 저장하지 않았습니다.")
        print("실제 변경하려면 '--commit' 옵션을 추가하여 실행하세요.")
        return 0

    print()
    print("Firestore 업데이트를 적용하는 중...")
    committed_count = 0
    try:
        for start in range(0, len(updates), BATCH_LIMIT):
            chunk = updates[start : start + BATCH_LIMIT]
            batch = db.batch()
            for update in chunk:
                batch.update(update["ref"], {"kor_name": update["new_kor_name"]})
            batch.commit()
            committed_count += len(chunk)
            print(f"[완료] {committed_count}/{len(updates)}건 kor_name 갱신 완료")
    except Exception as exc:
        print(f"[오류] 업데이트 도중 실패: {exc}", file=sys.stderr)
        return 1

    print()
    print(f"[성공] students 컬렉션 {committed_count}개 문서의 kor_name 필드를 성공적으로 갱신했습니다.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
