from openai import OpenAI
from PyPDF2 import PdfReader
from dotenv import load_dotenv
import io

load_dotenv()

client = OpenAI()
document_chunks = []
session_histories = {}

def process_document(content: bytes, filename: str) -> dict:
    global document_chunks
    document_chunks = []
    
    pdf = PdfReader(io.BytesIO(content))
    text = ""
    for page in pdf.pages:
        text += page.extract_text()
    
    chunk_size = 1000
    overlap = 200
    start = 0
    
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        document_chunks.append({
            "text": chunk,
            "source": filename,
            "chunk_id": len(document_chunks)
        })
        start = end - overlap
    
    return {"chunks": len(document_chunks)}

def find_relevant_chunks(question: str, k: int = 3) -> list:
    if not document_chunks:
        return []
    question_lower = question.lower()
    scored_chunks = []
    for chunk in document_chunks:
        text_lower = chunk["text"].lower()
        words = question_lower.split()
        score = sum(1 for word in words if word in text_lower)
        scored_chunks.append((score, chunk))
    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    return [chunk for score, chunk in scored_chunks[:k]]

def query_document(question: str, session_id: str) -> dict:
    global document_chunks
    
    if not document_chunks:
        return {
            "answer": "Please upload a document first.",
            "sources": [],
            "confidence": 0.0
        }
    
    relevant_chunks = find_relevant_chunks(question)
    context = "\n\n".join([chunk["text"] for chunk in relevant_chunks])
    
    if session_id not in session_histories:
        session_histories[session_id] = []
    
    session_histories[session_id].append({
        "role": "user",
        "content": question
    })
    
    messages = [
        {
            "role": "system",
            "content": f"You are a helpful assistant. Answer questions based only on this context:\n\n{context}\n\nIf the answer is not in the context, say so clearly."
        }
    ] + session_histories[session_id]
    
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=messages,
        temperature=0
    )
    
    answer = response.choices[0].message.content
    
    session_histories[session_id].append({
        "role": "assistant",
        "content": answer
    })
    
    sources = []
    for chunk in relevant_chunks:
        source = {
            "file": chunk["source"],
            "chunk": chunk["chunk_id"],
            "preview": chunk["text"][:150] + "..."
        }
        if source not in sources:
            sources.append(source)
    
    confidence = min(0.95, 0.6 + (len(sources) * 0.1))
    
    return {
        "answer": answer,
        "sources": sources,
        "confidence": round(confidence, 2)
    }