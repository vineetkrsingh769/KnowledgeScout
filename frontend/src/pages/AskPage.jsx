import React, { useMemo, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';

function AskPage() {
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [docName, setDocName] = useState('');
  const { token } = useAuth();
  
  const messagesEndRef = useRef(null);

  const documentId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('docId') || undefined;
  }, [location.search]);

  // Load document details if scoped
  useEffect(() => {
    if (documentId) {
      axios.get(`/api/docs/${documentId}`)
        .then(res => {
          if (res.data && res.data.document) {
            setDocName(res.data.document.originalName);
          }
        })
        .catch(err => console.error("Failed to fetch document details:", err));
    } else {
      setDocName('');
    }
  }, [documentId]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleClearChat = () => {
    setMessages([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery || loading) return;

    const userMessage = { role: 'user', content: trimmedQuery };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      const historyPayload = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await axios.post('/api/ask', {
        query: trimmedQuery,
        k: 3,
        documentId,
        history: historyPayload
      });

      setMessages(prev => [...prev, {
        role: 'model',
        content: response.data.answer,
        sources: response.data.sources
      }]);
    } catch (error) {
      console.error('Query failed:', error);
      setMessages(prev => [...prev, {
        role: 'model',
        content: 'Sorry, I encountered an error while processing your question. Please check your connection and try again.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 h-[calc(100vh-80px)] flex flex-col">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
            Ask KnowledgeScout
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {docName ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                📄 Document: {docName}
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                📚 Searching across all documents
              </span>
            )}
          </p>
        </div>
        
        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="flex items-center space-x-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-500 hover:text-orange-600 hover:border-orange-200 transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Clear Chat</span>
          </button>
        )}
      </div>

      {/* Chat Stream Window */}
      <div className="flex-1 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col mb-4 min-h-0">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl flex items-center justify-center mb-4 text-orange-600 shadow-md">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Start a Conversation</h3>
              <p className="text-gray-500 mt-2 max-w-sm">
                Ask questions about your uploaded documents. You can reference details, ask for summaries, or synthesize knowledge across files!
              </p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm border ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white border-transparent'
                    : 'bg-gray-50 text-gray-800 border-gray-100'
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                  {/* Render Sources/Citations if available */}
                  {msg.role === 'model' && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-200/60">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Sources:</p>
                      <div className="space-y-1.5">
                        {msg.sources.map((src, sIdx) => (
                          <details key={sIdx} className="text-xs group">
                            <summary className="cursor-pointer text-orange-600 hover:text-orange-700 font-medium flex items-center space-x-1 outline-none">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span>{src.documentName} (Page {src.pageNumber})</span>
                              <span className="text-[10px] bg-orange-100 text-orange-800 px-1.5 py-0.2 rounded-full font-semibold">
                                Match: {src.score}
                              </span>
                            </summary>
                            <div className="mt-1.5 p-2 bg-white rounded border border-gray-200 text-gray-600 leading-relaxed max-h-32 overflow-y-auto">
                              {src.content}
                            </div>
                          </details>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Typing Indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-50 text-gray-800 border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-sm text-gray-500 font-medium">KnowledgeScout is thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question about your documents..."
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-800 transition-all duration-200 outline-none"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl hover:from-orange-700 hover:to-amber-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 transition-all duration-200 flex items-center justify-center shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AskPage;

