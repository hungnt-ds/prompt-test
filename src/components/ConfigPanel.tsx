import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { Sun, Moon, Trash2, MessageSquare, Clock, Edit2, Check, Plus, Minus } from 'lucide-react';
import { preserveMultipleNewlines } from '@/utils/markdownUtils';
import type { ChatMessage } from '@/App';

interface ConfigPanelProps {
  text: string;
  setText: (text: string) => void;
  speed: number;
  setSpeed: (speed: number) => void;
  effectType: 'typewriter' | 'scroll' | 'timed_chat';
  setEffectType: (type: 'typewriter' | 'scroll' | 'timed_chat') => void;
  onPlay: () => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  inputMode: 'monologue' | 'dialogue';
  setInputMode: (mode: 'monologue' | 'dialogue') => void;
  chatMessages: ChatMessage[];
  setChatMessages: (messages: ChatMessage[]) => void;
}

export function ConfigPanel({
  text,
  setText,
  speed,
  setSpeed,
  effectType,
  setEffectType,
  onPlay,
  theme,
  setTheme,
  inputMode,
  setInputMode,
  chatMessages,
  setChatMessages,
}: ConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Ref để auto-focus vào textarea khi bấm sửa
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingId && editTextareaRef.current) {
      editTextareaRef.current.focus();
      // Move cursor to end
      const len = editTextareaRef.current.value.length;
      editTextareaRef.current.setSelectionRange(len, len);
    }
  }, [editingId]);

  const handleInsertChat = (index: number, speaker: 'A' | 'B') => {
    const newId = Date.now().toString();
    const newMessage: ChatMessage = { 
      id: newId, 
      speaker, 
      text: '', 
      duration: 3 
    };
    
    const newMessages = [...chatMessages];
    newMessages.splice(index + 1, 0, newMessage);
    setChatMessages(newMessages);
    setEditingId(newId);
  };

  const handleDeleteChat = (id: string) => {
    setChatMessages(chatMessages.filter(msg => msg.id !== id));
    if (editingId === id) setEditingId(null);
  };
  
  const handleDurationChange = (id: string, newDuration: number) => {
    setChatMessages(chatMessages.map(msg => 
      msg.id === id ? { ...msg, duration: Math.max(1, newDuration) } : msg
    ));
  };

  const handleTextChange = (id: string, newText: string) => {
    setChatMessages(chatMessages.map(msg => 
      msg.id === id ? { ...msg, text: newText } : msg
    ));
  };

  const handleFinishEdit = (id: string) => {
    // Nếu rỗng quá thì báo xóa luôn? Không, cứ để đó người dùng tự xóa
    // Cập nhật lại số giây dựa trên text mới
    const msg = chatMessages.find(m => m.id === id);
    if (msg) {
      const wordCount = msg.text.trim().split(/\s+/).length;
      const suggestedDuration = Math.max(2, Math.ceil(wordCount / 2));
      handleDurationChange(id, suggestedDuration);
    }
    setEditingId(null);
  };

  return (
    <div className={`w-full max-w-3xl mx-auto rounded-2xl shadow-2xl overflow-hidden font-sans transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-900 border border-gray-800 text-gray-100' : 'bg-white border border-gray-200 text-gray-900'
    }`}>
      {/* Header */}
      <div className={`p-6 border-b flex justify-between items-start ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
        <div>
          <h1 className={`text-3xl font-bold tracking-tight ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
            Prompt Test Challenge
          </h1>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            Nhập văn bản (hỗ trợ Markdown) và cấu hình hiệu ứng hiển thị
          </p>
        </div>
        
        {/* Nút Đổi Theme */}
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={`p-2 rounded-full transition-colors outline-none ${
            theme === 'dark' ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'
          }`}
          title={theme === 'dark' ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối'}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {/* Mode Toggle */}
      <div className={`p-4 border-b flex justify-center ${theme === 'dark' ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
        <div className={`flex rounded-xl p-1.5 w-full max-w-md shadow-inner ${theme === 'dark' ? 'bg-gray-950' : 'bg-gray-200'}`}>
          <button 
            onClick={() => {
              setInputMode('monologue');
              if (effectType === 'timed_chat') setEffectType('scroll');
            }}
            className={`flex-1 py-2.5 px-4 text-sm font-bold rounded-lg transition-all outline-none ${
              inputMode === 'monologue' 
                ? (theme === 'dark' ? 'bg-gray-700 text-white shadow-md' : 'bg-white text-gray-900 shadow-md') 
                : (theme === 'dark' ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700')
            }`}
          >
            Độc thoại (Markdown)
          </button>
          <button 
            onClick={() => {
              setInputMode('dialogue');
              if (effectType === 'typewriter') setEffectType('scroll');
            }}
            className={`flex-1 py-2.5 px-4 text-sm font-bold rounded-lg transition-all outline-none flex items-center justify-center gap-2 ${
              inputMode === 'dialogue' 
                ? (theme === 'dark' ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-600 text-white shadow-md') 
                : (theme === 'dark' ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700')
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Đối thoại (Chat)
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-8">
        
        {/* Section 1: Nội dung Prompt */}
        {inputMode === 'monologue' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className={`text-lg font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>Nội dung Prompt</label>
              {/* Tabs cho Markdown */}
              <div className={`flex space-x-1 p-1 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <button 
                  onClick={() => setActiveTab('edit')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors outline-none ${
                    activeTab === 'edit' 
                      ? (theme === 'dark' ? 'bg-gray-700 text-white shadow-sm' : 'bg-white text-blue-600 shadow-sm') 
                      : (theme === 'dark' ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50')
                  }`}
                >
                  Chỉnh sửa (MD)
                </button>
                <button 
                  onClick={() => setActiveTab('preview')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors outline-none ${
                    activeTab === 'preview' 
                      ? (theme === 'dark' ? 'bg-gray-700 text-white shadow-sm' : 'bg-white text-blue-600 shadow-sm') 
                      : (theme === 'dark' ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50')
                  }`}
                >
                  Xem trước
                </button>
              </div>
            </div>
            
            {activeTab === 'edit' ? (
              <textarea 
                value={text}
                onChange={(e) => setText(e.target.value)}
                className={`w-full h-48 border rounded-xl p-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-y font-mono text-sm leading-relaxed outline-none ${
                  theme === 'dark' 
                    ? 'bg-[#0f111a] text-gray-200 border-gray-700 custom-scrollbar-dark' 
                    : 'bg-gray-50 text-gray-900 border-gray-300 custom-scrollbar'
                }`}
                placeholder="# Nhập tiêu đề ở đây...\n\nSử dụng định dạng **Markdown** để làm nổi bật văn bản của bạn.\n\n- Gõ chữ\n- Cuộn lên"
              />
            ) : (
              <div className={`w-full h-48 border rounded-xl p-4 overflow-y-auto prose prose-sm max-w-none ${
                theme === 'dark' 
                  ? 'bg-[#0f111a] border-gray-700 custom-scrollbar-dark prose-invert' 
                  : 'bg-gray-50 border-gray-300 custom-scrollbar'
              }`}>
                {text ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                    {preserveMultipleNewlines(text)}
                  </ReactMarkdown>
                ) : (
                  <span className={`italic not-prose ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>Chưa có nội dung...</span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className={`text-lg font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>Kịch bản Chat</label>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleInsertChat(chatMessages.length - 1, 'A')}
                  className={`text-xs px-2 py-1 rounded border flex items-center gap-1 transition-colors ${
                    theme === 'dark' ? 'border-gray-700 hover:bg-gray-800 text-gray-300' : 'border-gray-300 hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <Plus className="w-3 h-3" /> Người A
                </button>
                <button 
                  onClick={() => handleInsertChat(chatMessages.length - 1, 'B')}
                  className={`text-xs px-2 py-1 rounded border flex items-center gap-1 transition-colors bg-blue-600/10 border-blue-500/30 text-blue-500 hover:bg-blue-600/20`}
                >
                  <Plus className="w-3 h-3" /> Người B
                </button>
              </div>
            </div>
            
            <div className={`w-full h-[320px] border rounded-xl p-4 overflow-y-auto flex flex-col gap-3 ${
              theme === 'dark' ? 'bg-[#0f111a] border-gray-700 custom-scrollbar-dark' : 'bg-gray-50 border-gray-300 custom-scrollbar'
            }`}>
              {chatMessages.length === 0 ? (
                <div className={`m-auto italic text-sm ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
                  Chưa có đoạn hội thoại nào. Bấm nút Thêm ở trên hoặc nhập ở dưới.
                </div>
              ) : (
                chatMessages.map((msg, index) => (
                  <div key={msg.id} className={`flex w-full group ${msg.speaker === 'A' ? 'justify-start' : 'justify-end'}`}>
                    <div className="flex flex-col gap-1 max-w-[85%] relative">
                      <div className={`flex items-center gap-2 ${msg.speaker === 'A' ? 'flex-row pl-2' : 'flex-row-reverse pr-2'}`}>
                        <span className={`text-xs font-bold ${msg.speaker === 'A' ? 'text-gray-500' : 'text-blue-500'}`}>
                          Người {msg.speaker}
                        </span>
                        {/* Duration Input - Custom Stepper UI */}
                        <div className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-xs border ${
                          theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-600'
                        }`}>
                          <Clock className="w-3 h-3 ml-1 text-gray-500" />
                          <button 
                            onClick={() => handleDurationChange(msg.id, msg.duration - 1)}
                            className={`p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${msg.duration <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={msg.duration <= 1}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          
                          <span className="w-4 text-center font-mono font-medium select-none">
                            {msg.duration}
                          </span>
                          
                          <button 
                            onClick={() => handleDurationChange(msg.id, msg.duration + 1)}
                            className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <span className="mr-1">s</span>
                        </div>

                        {/* Floating Buttons (Hover to show, now inline horizontal) */}
                        {editingId !== msg.id && (
                          <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 ${
                            msg.speaker === 'A' ? 'ml-1' : 'mr-1'
                          }`}>
                            <button 
                              onClick={() => setEditingId(msg.id)}
                              className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-blue-500 transition-colors"
                              title="Sửa nội dung"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleInsertChat(index, msg.speaker === 'A' ? 'B' : 'A')}
                              className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-green-500 transition-colors"
                              title="Chèn thêm câu trả lời ở dưới"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteChat(msg.id)}
                              className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-red-500 transition-colors"
                              title="Xoá câu này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className={`relative text-sm rounded-2xl transition-all ${
                        editingId === msg.id 
                          ? (theme === 'dark' ? 'bg-gray-800 border border-blue-500 ring-2 ring-blue-500/20 shadow-lg p-1' : 'bg-white border border-blue-500 ring-2 ring-blue-500/20 shadow-lg p-1')
                          : (msg.speaker === 'A' 
                              ? (theme === 'dark' ? 'bg-gray-800 text-gray-200 rounded-bl-sm px-4 py-2' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm px-4 py-2')
                              : (theme === 'dark' ? 'bg-blue-600 text-white rounded-br-sm px-4 py-2' : 'bg-blue-500 text-white rounded-br-sm shadow-sm px-4 py-2'))
                      }`}>
                        
                        {editingId === msg.id ? (
                          <div className="relative">
                            <textarea
                              ref={editTextareaRef}
                              value={msg.text}
                              onChange={(e) => handleTextChange(msg.id, e.target.value)}
                              onBlur={() => handleFinishEdit(msg.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.ctrlKey) {
                                  handleFinishEdit(msg.id);
                                }
                              }}
                              className={`w-full min-h-[60px] bg-transparent border-none p-2 focus:ring-0 resize-none outline-none ${
                                theme === 'dark' ? 'text-white' : 'text-gray-900'
                              }`}
                              placeholder="Nhập nội dung thoại..."
                            />
                            <button
                              onClick={() => handleFinishEdit(msg.id)}
                              className="absolute bottom-2 right-2 bg-blue-500 hover:bg-blue-600 text-white p-1.5 rounded-full shadow-md transition-transform active:scale-95"
                              title="Lưu (Ctrl + Enter)"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div 
                            className="prose prose-sm max-w-none cursor-pointer" 
                            onDoubleClick={() => setEditingId(msg.id)}
                            title="Nhấp đúp để sửa"
                          >
                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                              {msg.text || '*Nội dung trống*'}
                            </ReactMarkdown>
                          </div>
                        )}

                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Section 2: Loại hiệu ứng */}
        <div className="space-y-3">
          <label className={`text-lg font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>Loại hiệu ứng</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {inputMode === 'monologue' ? (
              <>
                <button 
                  onClick={() => setEffectType('scroll')}
                  className={`py-3 px-4 rounded-xl font-semibold transition-transform active:scale-95 border outline-none ${
                    effectType === 'scroll' 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 border-blue-500' 
                      : (theme === 'dark' ? 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50')
                  }`}
                >
                  Cuộn lên (Scroll)
                </button>
                <button 
                  onClick={() => setEffectType('typewriter')}
                  className={`py-3 px-4 rounded-xl font-semibold transition-transform active:scale-95 border outline-none ${
                    effectType === 'typewriter' 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 border-blue-500' 
                      : (theme === 'dark' ? 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50')
                  }`}
                >
                  Gõ chữ (Typewriter)
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => setEffectType('scroll')}
                  className={`py-3 px-4 rounded-xl font-semibold transition-transform active:scale-95 border outline-none ${
                    effectType === 'scroll' 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 border-blue-500' 
                      : (theme === 'dark' ? 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50')
                  }`}
                >
                  Cuộn bong bóng (WPM)
                </button>
                <button 
                  onClick={() => setEffectType('timed_chat')}
                  className={`py-3 px-4 rounded-xl font-semibold transition-transform active:scale-95 border outline-none flex items-center justify-center gap-2 ${
                    effectType === 'timed_chat' 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 border-blue-500' 
                      : (theme === 'dark' ? 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50')
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  Hiện theo thời gian (Focus)
                </button>
              </>
            )}
          </div>
        </div>

        {/* Section 3: Tốc độ chạy */}
        {effectType !== 'timed_chat' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className={`text-lg font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>Tốc độ chạy</label>
              <div className={`px-3 py-1 rounded-md border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
                <span className={`font-mono font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>{speed}</span> 
                <span className={`text-xs font-semibold ml-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {effectType === 'scroll' ? 'WPM' : 'ms/ký tự'}
                </span>
              </div>
            </div>
            
            {/* Range Slider */}
            <input 
              type="range" 
              min={10} 
              max={effectType === 'scroll' ? 500 : 200} 
              value={speed} 
              step={effectType === 'scroll' ? 5 : 10}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className={`w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 outline-none ${
                theme === 'dark' ? 'bg-gray-700 hover:accent-blue-400' : 'bg-gray-200 hover:accent-blue-600'
              }`}
            />
            
            {/* Preset Buttons */}
            {effectType === 'scroll' && (
              <div className="flex flex-wrap gap-2 pt-2">
                {[
                  { label: 'Mới học', value: 100 },
                  { label: 'Khá', value: 130 },
                  { label: 'Tốt', value: 160 },
                  { label: 'Bản xứ', value: 200 },
                ].map((level) => (
                  <button
                    key={level.label}
                    onClick={() => setSpeed(level.value)}
                    className={`px-4 py-2 text-sm rounded-full border transition-colors outline-none ${
                      speed === level.value 
                        ? 'bg-blue-600 border-blue-500 text-white font-medium shadow-md' 
                        : (theme === 'dark' 
                            ? 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white' 
                            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-900')
                    }`}
                  >
                    {level.label} ({level.value})
                  </button>
                ))}
              </div>
            )}
            
            <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
              {effectType === 'scroll' 
                ? 'Tốc độ đọc tính bằng số Từ mỗi Phút (Words Per Minute). Hãy chọn một cột mốc phù hợp với trình độ của bạn để luyện tập hiệu quả hơn.' 
                : 'Thời gian chờ giữa mỗi ký tự (ms). Càng nhỏ gõ càng nhanh.'}
            </p>
          </div>
        )}

      </div>

      {/* Footer / Submit */}
      <div className={`p-6 border-t ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
        <button 
          onClick={onPlay}
          className="w-full py-4 rounded-xl text-lg font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-lg shadow-blue-900/30 transition-all flex justify-center items-center gap-2 active:scale-[0.98] outline-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
          </svg>
          Bắt đầu hiệu ứng
        </button>
      </div>

    </div>
  );
}
