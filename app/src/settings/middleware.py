from fastapi.middleware.cors import CORSMiddleware
from app.src.main import app

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # "http://localhost:3000",  # Дозволяє frontend на 3000 порту
        # "https://myfrontend.com"  # Замінити на реальний домен
    ],
    allow_credentials=True,  # Дозволяє cookies
    allow_methods=["*"],
    allow_headers=["*"],
)
