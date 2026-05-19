from __future__ import annotations

import logging
from io import BytesIO
from pathlib import Path
from typing import BinaryIO

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import HTTPException

from app.core.config import settings

logger = logging.getLogger(__name__)


class S3Service:
    @staticmethod
    def _client():
        if not settings.aws_access_key_id or not settings.aws_secret_access_key:
            logger.error("AWS credentials are missing for S3 bucket %s", settings.aws_s3_bucket)
            raise HTTPException(status_code=500, detail="Configuration Amazon S3 manquante.")
        if not settings.aws_s3_bucket:
            logger.error("AWS_S3_BUCKET is missing")
            raise HTTPException(status_code=500, detail="Bucket Amazon S3 manquant.")
        return boto3.client(
            "s3",
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
        )

    @staticmethod
    def upload_file_to_s3(file_bytes: bytes, s3_key: str, content_type: str | None = None) -> None:
        S3Service.upload_fileobj_to_s3(BytesIO(file_bytes), s3_key, content_type)

    @staticmethod
    def upload_fileobj_to_s3(file_obj: BinaryIO, s3_key: str, content_type: str | None = None) -> None:
        try:
            file_obj.seek(0)
            logger.info("Uploading campaign attachment to S3: bucket=%s key=%s", settings.aws_s3_bucket, s3_key)
            S3Service._client().upload_fileobj(
                file_obj,
                settings.aws_s3_bucket,
                s3_key,
                ExtraArgs={
                    "ContentType": content_type or "application/octet-stream",
                    "ServerSideEncryption": "AES256",
                },
            )
        except (BotoCoreError, ClientError) as exc:
            logger.exception("S3 upload failed for key=%s", s3_key)
            raise HTTPException(status_code=502, detail=f"Upload S3 impossible: {exc}") from exc

    @staticmethod
    def delete_file_from_s3(s3_key: str) -> None:
        try:
            logger.info("Deleting S3 object: bucket=%s key=%s", settings.aws_s3_bucket, s3_key)
            S3Service._client().delete_object(Bucket=settings.aws_s3_bucket, Key=s3_key)
        except (BotoCoreError, ClientError) as exc:
            logger.exception("S3 delete failed for key=%s", s3_key)
            raise HTTPException(status_code=502, detail=f"Suppression S3 impossible: {exc}") from exc

    @staticmethod
    def generate_presigned_download_url(s3_key: str, filename: str, expires_in: int = 900) -> str:
        try:
            logger.info("Generating S3 presigned download URL: bucket=%s key=%s", settings.aws_s3_bucket, s3_key)
            return S3Service._client().generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": settings.aws_s3_bucket,
                    "Key": s3_key,
                    "ResponseContentDisposition": f'attachment; filename="{filename}"',
                },
                ExpiresIn=expires_in,
            )
        except (BotoCoreError, ClientError) as exc:
            logger.exception("S3 presigned URL failed for key=%s", s3_key)
            raise HTTPException(status_code=502, detail=f"URL de telechargement impossible: {exc}") from exc

    @staticmethod
    def download_file_from_s3(s3_key: str, destination: str | Path) -> None:
        try:
            logger.info("Downloading S3 object for Gmail send: bucket=%s key=%s", settings.aws_s3_bucket, s3_key)
            S3Service._client().download_file(settings.aws_s3_bucket, s3_key, str(destination))
        except (BotoCoreError, ClientError) as exc:
            logger.exception("S3 download failed for key=%s", s3_key)
            raise HTTPException(status_code=502, detail=f"Telechargement S3 impossible: {exc}") from exc


upload_file_to_s3 = S3Service.upload_file_to_s3
delete_file_from_s3 = S3Service.delete_file_from_s3
generate_presigned_download_url = S3Service.generate_presigned_download_url
