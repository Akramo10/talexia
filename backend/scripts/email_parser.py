import os
import asyncio
import imaplib
import email
from email.header import decode_header
from dotenv import load_dotenv
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.database import AsyncSessionLocal
from app.models.application import Application
from app.models.company import Company

# Load environment variables
load_dotenv()

IMAP_SERVER = os.getenv("EMAIL_HOST", "imap.gmail.com")
EMAIL_ACCOUNT = os.getenv("EMAIL_USER")
EMAIL_PASSWORD = os.getenv("EMAIL_APP_PASSWORD")

REJECTION_KEYWORDS = ["malheureusement", "pas retenu", "regrets", "unsuccessful", "other direction", "ce poste n'a pas été pourvu", "not moving forward", "cannot proceed"]
INTERVIEW_KEYWORDS = ["entretien", "interview", "invitation à échanger", "premier contact", "discuter de vive voix", "vidéo", "teams"]

def clean_text(text):
    return text.lower().replace('\n', ' ').replace('\r', '')

async def process_emails():
    print(f"Connecting to IMAP server: {IMAP_SERVER}")
    
    if not EMAIL_ACCOUNT or not EMAIL_PASSWORD:
        print("ERROR: EMAIL_USER or EMAIL_APP_PASSWORD not set in .env")
        return

    try:
        mail = imaplib.IMAP4_SSL(IMAP_SERVER)
        mail.login(EMAIL_ACCOUNT, EMAIL_PASSWORD)
        mail.select("inbox")

        # Search for all unread emails
        status, messages = mail.search(None, "UNSEEN")
        if status != "OK":
            print("No unread emails found.")
            return

        email_ids = messages[0].split()
        print(f"Found {len(email_ids)} unread emails.")

        async with AsyncSessionLocal() as session:
            # Load all active applications
            result = await session.execute(select(Application).options(selectinload(Application.company)))
            applications = result.scalars().all()

            for e_id in email_ids:
                status, msg_data = mail.fetch(e_id, "(RFC822)")
                for response_part in msg_data:
                    if isinstance(response_part, tuple):
                        msg = email.message_from_bytes(response_part[1])
                        
                        subject, encoding = decode_header(msg["Subject"])[0]
                        if isinstance(subject, bytes):
                            subject = subject.decode(encoding if encoding else "utf-8", errors='ignore')
                        
                        sender = msg.get("From")
                        print(f"\nProcessing Email: '{subject}' from {sender}")

                        body = ""
                        if msg.is_multipart():
                            for part in msg.walk():
                                content_type = part.get_content_type()
                                content_disposition = str(part.get("Content-Disposition"))
                                if content_type == "text/plain" and "attachment" not in content_disposition:
                                    charset = part.get_content_charset() or 'utf-8'
                                    try:
                                        payload = part.get_payload(decode=True)
                                        if isinstance(payload, bytes):
                                            body += payload.decode(charset, errors='ignore')
                                    except Exception as e:
                                        print(f"Error decoding body part: {e}")
                        else:
                            charset = msg.get_content_charset() or 'utf-8'
                            payload = msg.get_payload(decode=True)
                            if isinstance(payload, bytes):
                                body = payload.decode(charset, errors='ignore')

                        cleaned_body = clean_text(body + " " + subject)
                        
                        # Determine new status based on keywords
                        new_status = None
                        if any(kw in cleaned_body for kw in REJECTION_KEYWORDS):
                            new_status = "Rejected"
                        elif any(kw in cleaned_body for kw in INTERVIEW_KEYWORDS):
                            new_status = "Interview"

                        if new_status:
                            # Try to match the email to an application based on Company Name
                            for app in applications:
                                if app.company and app.company.name.lower() in cleaned_body:
                                    print(f"  -> Matched Application: {app.company.name}")
                                    if app.status != new_status:
                                        print(f"  -> Updating status from {app.status} to {new_status}")
                                        app.status = new_status
                                        session.add(app)
                                    else:
                                        print(f"  -> Status is already {new_status}, no change.")
                                    break
                            else:
                                print(f"  -> Extracted Status: {new_status}, but could not match to any Company in the database.")
                        else:
                            print("  -> No status inference keywords found.")
            
            await session.commit()
            print("\nDatabase update complete.")
            
    except Exception as e:
        print(f"Error during email processing: {e}")
    finally:
        try:
            mail.close()
            mail.logout()
        except:
            pass

if __name__ == "__main__":
    # Add project root to PYTHONPATH dynamically if needed, 
    # but assuming script is run with `python -m scripts.email_parser` from backend dir
    asyncio.run(process_emails())
