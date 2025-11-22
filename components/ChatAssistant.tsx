
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { streamChatResponse, streamOpenAIResponse } from '../services/geminiService';

// --- Feedback Form Component ---
const FeedbackForm = ({ onClose }: { onClose: () => void }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = () => {
    // Process feedback (simulated backend call)
    console.log("Feedback Submitted:", { 
        rating, 
        comment, 
        timestamp: new Date().toISOString(),
        agent: 'AIDE-RegGenie'
    });
    
    setIsSubmitted(true);
    setTimeout(onClose, 2500);
  };

  if (isSubmitted) {
    return (
        <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-sm w-full text-center animate-in fade-in zoom-in duration-300 border border-slate-100">
            <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Thank You!</h3>
            <p className="text-sm text-slate-500">Your feedback helps improve our regulatory AI models.</p>
        </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-100">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>
                Rate AI Performance
            </h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>
        <div className="p-6 space-y-6">
            <div className="flex flex-col items-center gap-3">
                <span className="text-sm font-medium text-slate-600">How accurate was the regulatory advice?</span>
                <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            className="focus:outline-none transition-all duration-200 hover:scale-110 active:scale-95"
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setRating(star)}
                        >
                            <svg 
                                className={`w-9 h-9 ${star <= (hoverRating || rating) ? 'text-amber-400 fill-amber-400 drop-shadow-sm' : 'text-slate-200'}`} 
                                viewBox="0 0 24 24" 
                                stroke="currentColor" 
                                strokeWidth={star <= (hoverRating || rating) ? "0" : "1.5"}
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                            >
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                        </button>
                    ))}
                </div>
                <span className="text-xs font-bold text-cyan-600 h-4 uppercase tracking-wider">
                    {hoverRating === 1 && "Inaccurate"}
                    {hoverRating === 2 && "Needs Improvement"}
                    {hoverRating === 3 && "Satisfactory"}
                    {hoverRating === 4 && "Very Good"}
                    {hoverRating === 5 && "Exceptional"}
                    {!hoverRating && rating > 0 && (
                        rating === 1 ? "Inaccurate" : rating === 2 ? "Needs Improvement" : rating === 3 ? "Satisfactory" : rating === 4 ? "Very Good" : "Exceptional"
                    )}
                </span>
            </div>
            
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Additional Comments</label>
                <textarea
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 min-h-[100px] resize-none bg-slate-50 focus:bg-white transition-colors"
                    placeholder="Share details about specific regulatory queries or general feedback..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                ></textarea>
            </div>

            <button
                onClick={handleSubmit}
                disabled={rating === 0}
                className="w-full bg-gradient-to-r from-slate-800 to-slate-900 text-white font-bold py-3.5 rounded-xl hover:from-slate-900 hover:to-black disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-slate-200 hover:shadow-slate-300 flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
            >
                <span>Submit Feedback</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </button>
        </div>
    </div>
  );
}

interface ChatAssistantProps {
    openaiKey?: string;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ openaiKey: propOpenaiKey }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'init', role: 'model', text: 'Hello! I am your Regulatory Intelligence Assistant. I can help you navigate GMP, GCP, PV, and other healthcare regulations. Ask me about specific guidelines, comparison of regional requirements, or compliance strategies.', timestamp: Date.now() }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [provider, setProvider] = useState<'gemini' | 'openai'>('gemini');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Prioritize user-supplied key (from settings), then fallback to environment variable
  const openaiKey = propOpenaiKey || process.env.openai_api_key;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputValue,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Prepare history for API
    const history = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    // Create a placeholder for the model response
    const modelMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: modelMsgId, role: 'model', text: '', timestamp: Date.now() }]);

    let fullText = '';
    try {
      if (provider === 'openai' && openaiKey) {
          await streamOpenAIResponse(history, userMsg.text, openaiKey, (chunk) => {
            fullText += chunk;
            setMessages(prev => prev.map(m => 
              m.id === modelMsgId ? { ...m, text: fullText } : m
            ));
          });
      } else {
          // Default to Gemini
          await streamChatResponse(history, userMsg.text, (chunk) => {
            fullText += chunk;
            setMessages(prev => prev.map(m => 
              m.id === modelMsgId ? { ...m, text: fullText } : m
            ));
          });
      }
    } catch (error) {
      console.error("Chat error", error);
      setMessages(prev => prev.map(m => 
        m.id === modelMsgId ? { ...m, text: `I encountered an error processing your request with ${provider === 'openai' ? 'ChatGPT' : 'AIDE-RegGenie_1.0'}. Please check your API key configuration.` } : m
      ));
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
      {/* Chat Header / Toolbar */}
      <div className="px-4 py-3 border-b border-slate-100 bg-white flex justify-between items-center z-10">
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_5px] ${provider === 'gemini' ? 'bg-cyan-500 shadow-cyan-400' : 'bg-green-500 shadow-green-400'}`}></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Session</span>
              </div>
              
              {/* Model Selector (Only if OpenAI Key is present) */}
              {openaiKey && (
                  <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                      <button 
                        onClick={() => setProvider('gemini')}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${provider === 'gemini' ? 'bg-white text-cyan-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                         <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 0 5.373 0 12s5.373 12 12 12z" fill="currentColor" className="text-cyan-600 opacity-20"/><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" fill="currentColor"/></svg>
                         AIDE-RegGenie_1.0
                      </button>
                      <button 
                        onClick={() => setProvider('openai')}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${provider === 'openai' ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                         <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0843 7.6148-4.2632a.67.67 0 0 0 .3924-.4765.7008.7008 0 0 0-.055-.552l-3.155-6.9065-3.324 5.7937a.64.64 0 0 1-.5533.3227h-6.612a4.494 4.494 0 0 1 .558-5.2441 4.4545 4.4545 0 0 1 4.8645-.858l-.1258.071L5.184 7.25a.667.667 0 0 0-.2512.8694l2.5108 5.506 4.008-2.244a.6413.6413 0 0 1 .6335.0036l6.0273 3.3753a4.4972 4.4972 0 0 1-4.8525 7.67z"/></svg>
                         GPT-4o
                      </button>
                  </div>
              )}
          </div>

          <button 
             onClick={() => setIsFeedbackOpen(true)}
             className="text-xs font-bold text-cyan-600 hover:text-cyan-800 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 group"
          >
             <svg className="w-3.5 h-3.5 text-cyan-500 group-hover:text-cyan-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>
             Rate Response
          </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
              msg.role === 'user' 
                ? 'bg-gradient-to-br from-cyan-600 to-teal-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
            }`}>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {msg.text}
              </p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
             <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="relative">
          <textarea
            className="w-full border border-slate-300 rounded-xl pl-4 pr-12 py-3 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none resize-none text-sm shadow-sm"
            placeholder={`Ask ${provider === 'gemini' ? 'AIDE-RegGenie_1.0' : 'GPT-4o'} about regulations...`}
            rows={2}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          ></textarea>
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
            className={`absolute right-2 bottom-2.5 p-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm ${provider === 'gemini' ? 'bg-slate-900 hover:bg-slate-800' : 'bg-green-600 hover:bg-green-700'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-400 mt-2 font-medium">
          AI-generated content. Verify with official source documentation.
        </p>
      </div>

      {/* Feedback Modal Overlay */}
      {isFeedbackOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px] p-4 transition-all">
              <FeedbackForm onClose={() => setIsFeedbackOpen(false)} />
          </div>
      )}
    </div>
  );
};

export default ChatAssistant;
