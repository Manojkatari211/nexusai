import { useState, useRef } from 'react'
import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'
const sessionId = uuidv4()
const BACKEND_URL = 'https://nexusai-backend-8mbf.onrender.com'
interface Message { role: 'user' | 'assistant'; content: string; sources?: Source[]; confidence?: number }
interface Source { file: string; chunk: number; preview: string }
function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [question, setQuestion] = useState('')
  const [uploading, setUploading] = useState(false)
  const [querying, setQuerying] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const handleUpload = async (file: File) => {
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      await axios.post(`${BACKEND_URL}/upload`, formData)
      setUploadedFile(file.name)
      setMessages([{ role: 'assistant', content: `Document "${file.name}" uploaded! Ask me anything about it.` }])
    } catch { alert('Upload failed. Wait 30 seconds and try again.') }
    setUploading(false)
  }
  const handleQuery = async () => {
    if (!question.trim() || !uploadedFile) return
    const userMsg: Message = { role: 'user', content: question }
    setMessages(prev => [...prev, userMsg])
    setQuestion('')
    setQuerying(true)
    try {
      const res = await axios.post(`${BACKEND_URL}/query`, { question, session_id: sessionId })
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.answer, sources: res.data.sources, confidence: res.data.confidence }])
    } catch { alert('Query failed.') }
    setQuerying(false)
  }
  return (
    <div style={{ minHeight: '100vh', background: '#030712', color: 'white', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ borderBottom: '1px solid #1f2937', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 32, height: 32, background: '#3b82f6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>N</div>
          <span style={{ fontSize: 20, fontWeight: 600 }}>NexusAI</span>
          <span style={{ fontSize: 12, color: '#6b7280', background: '#1f2937', padding: '2px 8px', borderRadius: 999 }}>Multi-Document Intelligence</span>
        </div>
        {uploadedFile && <span style={{ fontSize: 12, color: '#4ade80' }}>{uploadedFile}</span>}
      </header>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ width: 280, borderRight: '1px solid #1f2937', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', fontWeight: 500 }}>Upload Document</p>
          <div onClick={() => fileInputRef.current?.click()} onDragOver={e => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f?.type === 'application/pdf') handleUpload(f) }} style={{ border: `2px dashed ${dragOver ? '#3b82f6' : '#374151'}`, borderRadius: 12, padding: 24, textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
            <p style={{ fontSize: 14, color: '#9ca3af' }}>Drop PDF here or click to browse</p>
            <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => e.target.files && handleUpload(e.target.files[0])} />
          </div>
          {uploading && <p style={{ fontSize: 12, color: '#60a5fa', textAlign: 'center' }}>Processing...</p>}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {messages.length === 0 && <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}><div style={{ fontSize: 64, marginBottom: 16 }}>🧠</div><h2 style={{ fontSize: 24, fontWeight: 600, color: '#d1d5db', marginBottom: 8 }}>NexusAI</h2><p style={{ color: '#6b7280', maxWidth: 400 }}>Upload a PDF and ask questions about it.</p></div>}
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '70%', borderRadius: 16, padding: '12px 16px', background: msg.role === 'user' ? '#2563eb' : '#1f2937' }}>
                  <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>{msg.content}</p>
                  {msg.confidence && <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ height: 4, flex: 1, background: '#374151', borderRadius: 2, overflow: 'hidden' }}><div style={{ height: '100%', background: '#22c55e', width: `${msg.confidence * 100}%` }} /></div><span style={{ fontSize: 12, color: '#9ca3af' }}>{Math.round(msg.confidence * 100)}%</span></div>}
                  {msg.sources && msg.sources.length > 0 && <div style={{ marginTop: 12 }}><p style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500, marginBottom: 4 }}>Sources:</p>{msg.sources.map((src, j) => <div key={j} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 8, marginBottom: 4 }}><p style={{ fontSize: 12, color: '#60a5fa', fontWeight: 500, margin: '0 0 4px' }}>{src.file} — chunk {src.chunk}</p><p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{src.preview}</p></div>)}</div>}
                </div>
              </div>
            ))}
            {querying && <div style={{ display: 'flex', justifyContent: 'flex-start' }}><div style={{ background: '#1f2937', borderRadius: 16, padding: '12px 16px' }}><div style={{ display: 'flex', gap: 4 }}>{[0,1,2].map(i => <span key={i} style={{ width: 8, height: 8, background: '#3b82f6', borderRadius: '50%' }} />)}</div></div></div>}
          </div>
          <div style={{ borderTop: '1px solid #1f2937', padding: 16 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleQuery()} placeholder={uploadedFile ? 'Ask anything about your document...' : 'Upload a document first...'} disabled={!uploadedFile || querying} style={{ flex: 1, background: '#1f2937', border: '1px solid #374151', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: 'white', outline: 'none' }} />
              <button onClick={handleQuery} disabled={!uploadedFile || querying || !question.trim()} style={{ background: '#2563eb', border: 'none', borderRadius: 12, padding: '12px 20px', fontSize: 14, fontWeight: 500, color: 'white', cursor: 'pointer' }}>Ask</button>
            </div>
            <p style={{ fontSize: 12, color: '#374151', textAlign: 'center', marginTop: 8 }}>NexusAI — Python • FastAPI • OpenAI API • React • TypeScript</p>
          </div>
        </div>
      </div>
    </div>
  )
}
export default App
