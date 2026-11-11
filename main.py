from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from fastapi.responses import RedirectResponse
import string, random

DATABASE_URL = "sqlite:///urls.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class URL(Base):
    __tablename__ = "urls"
    id = Column(Integer, primary_key=True, index=True)
    original_url = Column(String, unique=True, nullable=False)
    short_code = Column(String, unique=True, nullable=False, index=True)


Base.metadata.create_all(bind=engine)

class URLRequest(BaseModel):
    original_url: HttpUrl


class URLResponse(BaseModel):
    original_url: str
    short_code: str
    short_url: str

    class Config:
        orm_mode = True


def generate_short_code(length: int=6):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))


app = FastAPI(title="URL Shortener API",
              description="A simple URL shortener service",
              version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.post("/shorten", response_model=URLResponse)
def create_short_url(url_request: URLRequest, db: Session = Depends(get_db)):
    original_url = str(url_request.original_url)

    existing_url = db.query(URL).filter(URL.original_url == original_url).first()
    if existing_url:
        return URLResponse(
            original_url=existing_url.original_url,
            short_code=existing_url.short_code,
            short_url=f"http://localhost:8000/{existing_url.short_code}"
        )

    short_code = generate_short_code()
    while db.query(URL).filter(URL.short_code == short_code).first():
        short_code = generate_short_code()
    
    new_url = URL(original_url=original_url, short_code=short_code)
    db.add(new_url)
    db.commit()
    db.refresh(new_url)
    return URLResponse(
        original_url=new_url.original_url,
        short_code=new_url.short_code,
        short_url=f"http://localhost:8000/{new_url.short_code}"
    )


@app.get("/all", response_model=list[URLResponse])
def get_all_urls(db: Session = Depends(get_db)):
    urls = db.query(URL).all()
    result = [
        URLResponse(
            original_url=url.original_url,
            short_code=url.short_code,
            short_url=f"http://localhost:8000/{url.short_code}"
        ) for url in urls
    ]
    return result


@app.get("/{short_code}")
def redirect_to_original(short_code: str, db: Session = Depends(get_db)):
    url_entry = db.query(URL).filter(URL.short_code == short_code).first()
    if not url_entry:
        raise HTTPException(status_code=404, detail="Short URL not found")
    return RedirectResponse(url=url_entry.original_url)


@app.delete("/delete/{short_code}")
def delete_short_url(short_code: str, db: Session = Depends(get_db)):
    url_entry = db.query(URL).filter(URL.short_code == short_code).first()
    if not url_entry:
        raise HTTPException(status_code=404, detail="Short URL not found")
    db.delete(url_entry)
    db.commit()
    return {"detail": "Short URL deleted successfully"}
