from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routers import stock, portfolio

load_dotenv()

app = FastAPI(title="Oracle's Edge API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stock.router)
app.include_router(portfolio.router)

@app.get("/api/health")
def health_check():
    return {"status": "ok"}
