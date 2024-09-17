import smtplib
from pydantic import EmailStr
from app.src.database.config import SMTP_SERVER, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


async def send_email(email: EmailStr, subject: str, send_body: str, type_email: str = None):
    msg = MIMEMultipart()
    msg['From'] = SMTP_USERNAME
    msg['To'] = email
    msg['Subject'] = subject
    body = send_body
    msg.attach(MIMEText(body, 'html'))

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.sendmail(SMTP_USERNAME, email, msg.as_string())
        server.quit()

        if type_email is None:
            print("Email send successfully!")
        else:
            print(f"{type_email} email sent successfully!")
    except Exception as e:
        print(f"Failed to send email: {e}")


async def send_verification_email(email: EmailStr, token: str):
    verification_link = f"http://127.0.0.1:8000/auth/verify-email?token={token}"
    body = f"Click on the following link to verify your email: {verification_link}"

    await send_email(
        email=email,
        subject="Verification email, EventTool",
        send_body=body,
        type_email="Verification"
    )


async def send_updated_data_email(updated_data: dict, email: EmailStr):
    await send_email(
        email=email,
        subject="Your data was updated, EventTool",
        send_body="Dear user, your data was updated!",
        type_email="Update"
    )
    print(f"Updated data: {updated_data}")
