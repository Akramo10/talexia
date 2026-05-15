import io
import re
from dataclasses import dataclass

import pandas as pd


EMAIL_PATTERN = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")


@dataclass
class ImportedRecipient:
    email: str
    company_name: str | None = None
    contact_name: str | None = None


class ImportService:
    EMAIL_ALIASES = {"email", "e-mail", "mail", "adresse email", "adresse_email"}
    COMPANY_ALIASES = {"company_name", "company", "entreprise", "societe", "société"}
    CONTACT_ALIASES = {"contact_name", "contact", "nom", "name", "prenom", "prénom"}

    @classmethod
    def parse_contacts(cls, content: bytes, filename: str) -> tuple[list[ImportedRecipient], list[dict[str, str]]]:
        lower_name = filename.lower()
        if lower_name.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        elif lower_name.endswith((".xls", ".xlsx")):
            df = pd.read_excel(io.BytesIO(content))
        else:
            raise ValueError("Format non supporté. Utilisez CSV, XLS ou XLSX.")

        columns = {str(col).strip().lower(): col for col in df.columns}
        email_col = cls._find_column(columns, cls.EMAIL_ALIASES)
        if email_col is None:
            raise ValueError("Aucune colonne email détectée.")

        company_col = cls._find_column(columns, cls.COMPANY_ALIASES)
        contact_col = cls._find_column(columns, cls.CONTACT_ALIASES)
        recipients: list[ImportedRecipient] = []
        invalid_rows: list[dict[str, str]] = []
        seen: set[str] = set()

        for index, row in df.iterrows():
            email = str(row.get(email_col, "")).strip().lower()
            if not email or email == "nan" or not EMAIL_PATTERN.match(email):
                invalid_rows.append({"row": str(index + 2), "reason": "email invalide"})
                continue
            if email in seen:
                invalid_rows.append({"row": str(index + 2), "reason": "doublon ignoré"})
                continue
            seen.add(email)

            company_name = cls._optional_value(row.get(company_col)) if company_col else None
            contact_name = cls._optional_value(row.get(contact_col)) if contact_col else None
            recipients.append(ImportedRecipient(email=email, company_name=company_name, contact_name=contact_name))

        return recipients, invalid_rows

    @staticmethod
    def _find_column(columns: dict[str, object], aliases: set[str]):
        for normalized, original in columns.items():
            if normalized in aliases:
                return original
        return None

    @staticmethod
    def _optional_value(value: object) -> str | None:
        text = str(value).strip()
        return None if not text or text == "nan" else text
