from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rag import process_document, query_document
import uvicorn

app = FastAPI(title="NexusAI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    question: str
    session_id: str

class QueryResponse(BaseModel):
    answer: str
    sources: list
    confidence: float

@app.get("/")
def root():
    return {"message": "NexusAI is running"}

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    content = await file.read()
    result = process_document(content, file.filename)
    return {"message": f"Document {file.filename} processed successfully", "chunks": result["chunks"]}

@app.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    result = query_document(request.question, request.session_id)
    return QueryResponse(
        answer=result["answer"],
        sources=result["sources"],
        confidence=result["confidence"]
    )

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)