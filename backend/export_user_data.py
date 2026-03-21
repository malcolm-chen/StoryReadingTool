#!/usr/bin/env python3
"""
从 PostgreSQL 读取指定用户，并把 chat_history 里引用的 S3 音频下载到本地。

用于测试数据库 / S3 是否配置正确。

用法（在 backend 目录下，需已配置 .env）:
  python export_user_data.py 用户名
  python export_user_data.py jiaju --out ./user_export
  python export_user_data.py jiaju --include-password   # 导出 JSON 里保留密码字段（慎用）
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# 在 import db_pg 之前加载 .env
load_dotenv(Path(__file__).resolve().parent / ".env")

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from sqlalchemy import select
from sqlalchemy.orm import Session

from db_pg import User, get_engine


def collect_s3_keys_from_chat_history(chat_history) -> set[str]:
    """从嵌套的 chat_history JSON 里收集 message['audio'] 等 S3 object key。"""
    keys: set[str] = set()

    def walk(node):
        if isinstance(node, dict):
            aud = node.get("audio")
            if isinstance(aud, str) and aud.strip():
                # 本项目的 key 形如 audio/user/...；也兼容纯 key 字符串
                if aud.startswith("audio/") or "/" in aud:
                    keys.add(aud.strip())
            for v in node.values():
                walk(v)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(chat_history or {})
    return keys


def safe_local_name(s3_key: str) -> str:
    return s3_key.replace("/", "__").replace("\\", "_")


def main() -> int:
    parser = argparse.ArgumentParser(description="导出单个用户的 Postgres 数据并下载 S3 音频")
    parser.add_argument("username", help="用户名（users.username）")
    parser.add_argument(
        "--out",
        default="./user_export",
        help="输出目录（默认 ./user_export/<username>）",
    )
    parser.add_argument(
        "--include-password",
        action="store_true",
        help="在 user.json 中写入明文 password（默认会打码）",
    )
    parser.add_argument(
        "--skip-s3",
        action="store_true",
        help="只读数据库，不下载 S3",
    )
    args = parser.parse_args()

    bucket = os.getenv("S3_BUCKET")
    region = os.getenv("AWS_REGION", "us-east-1")

    out_root = Path(args.out).resolve()
    user_dir = out_root / args.username
    audio_dir = user_dir / "s3_audio"
    user_dir.mkdir(parents=True, exist_ok=True)

    print("连接 PostgreSQL …")
    try:
        engine = get_engine()
    except Exception as e:
        print(f"ERROR: 无法连接数据库: {e}", file=sys.stderr)
        return 1

    with Session(engine) as session:
        user = session.scalar(select(User).where(User.username == args.username))
        if not user:
            print(f"ERROR: 用户不存在: {args.username!r}", file=sys.stderr)
            return 2

        asked = user.asked_questions
        if asked is None:
            asked = {}
        ch = user.chat_history
        if ch is None:
            ch = {}

        payload = {
            "id": user.id,
            "username": user.username,
            "password": user.password if args.include_password else "***REDACTED***",
            "current_book": user.current_book,
            "current_page": user.current_page,
            "asked_questions": asked,
            "chat_history": ch,
        }

        json_path = user_dir / "user.json"
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        print(f"OK: 已写入 {json_path}")

        s3_keys = collect_s3_keys_from_chat_history(ch)
        print(f"在 chat_history 中发现 {len(s3_keys)} 个 S3 音频引用")

    if args.skip_s3:
        print("已跳过 S3（--skip-s3）")
        return 0

    if not bucket:
        print("WARN: 未设置 S3_BUCKET，跳过下载", file=sys.stderr)
        return 0

    s3 = boto3.client(
        "s3",
        region_name=region,
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        config=Config(signature_version="s3v4"),
    )

    audio_dir.mkdir(parents=True, exist_ok=True)
    manifest = []
    ok, fail = 0, 0
    for key in sorted(s3_keys):
        local_path = audio_dir / safe_local_name(key)
        try:
            obj = s3.get_object(Bucket=bucket, Key=key)
            body = obj["Body"].read()
            local_path.write_bytes(body)
            manifest.append({"key": key, "local": str(local_path), "bytes": len(body)})
            ok += 1
            print(f"  下载 OK: {key} -> {local_path.name} ({len(body)} bytes)")
        except ClientError as e:
            fail += 1
            err = e.response.get("Error", {}).get("Code", str(e))
            manifest.append({"key": key, "error": err})
            print(f"  下载 FAIL: {key} ({err})", file=sys.stderr)

    manifest_path = user_dir / "s3_download_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump({"bucket": bucket, "ok": ok, "fail": fail, "files": manifest}, f, indent=2)
    print(f"清单: {manifest_path}")
    return 0 if fail == 0 else 3


if __name__ == "__main__":
    raise SystemExit(main())
