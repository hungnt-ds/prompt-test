import { useEffect, useState, useRef } from 'react';
import { Play, Pause, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { preserveMultipleNewlines } from '@/utils/markdownUtils';
import type { ChatMessage } from '@/App';

interface TimedChatEffectProps {
  messages: ChatMessage[];
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

export function TimedChatEffect({ messages, theme, setTheme }: TimedChatEffectProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const activeBubbleRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef(isPaused);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Handle auto-scroll to keep active bubble in the center
  useEffect(() => {
    if (activeBubbleRef.current && containerRef.current) {
      const offsetTop = activeBubbleRef.current.offsetTop;
      const clientHeight = activeBubbleRef.current.clientHeight;
      const targetOffset = (window.innerHeight / 2) - offsetTop - (clientHeight / 2);
      
      containerRef.current.style.transform = `translateY(${targetOffset}px)`;
    }
  }, [activeIndex, theme]);

  // Timer loop for the active message
  useEffect(() => {
    if (activeIndex >= messages.length) return;

    const currentDuration = messages[activeIndex].duration;
    const totalMs = currentDuration * 1000;
    const intervalMs = 50;
    let remainingMs = totalMs;
    setProgress(100);

    const timer = setInterval(() => {
      if (!isPausedRef.current) {
        remainingMs -= intervalMs;
        const newProgress = Math.max(0, (remainingMs / totalMs) * 100);
        setProgress(newProgress);

        if (remainingMs <= 0) {
          clearInterval(timer);
          setActiveIndex(prev => prev + 1);
        }
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [activeIndex, messages, isPaused]);

  return (
    <div className={`absolute inset-0 w-full h-full overflow-hidden flex justify-center items-start group ${theme === 'dark' ? 'bg-black' : 'bg-white'}`}>
      
      {/* Floating Toolbar */}
      <div className={`absolute top-4 right-4 z-50 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-md px-4 py-2 rounded-full border ${theme === 'dark' ? 'bg-black/50 border-white/20' : 'bg-white/80 border-black/20 shadow-lg'}`}>
        <Button 
          variant="ghost" size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={`rounded-full w-10 h-10 ${theme === 'dark' ? 'text-white hover:bg-white/20' : 'text-black hover:bg-black/10'}`}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
        <Button 
          variant="ghost" size="icon"
          onClick={() => setIsPaused(!isPaused)}
          className={`rounded-full w-10 h-10 ${theme === 'dark' ? 'text-white hover:bg-white/20' : 'text-black hover:bg-black/10'}`}
        >
          {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
        </Button>
      </div>

      <div 
        ref={containerRef}
        className="w-full max-w-5xl px-6 md:px-12 flex flex-col gap-16 py-[50vh] transition-transform duration-1000 ease-in-out relative"
      >
        {messages.map((msg, index) => {
          const isActive = index === activeIndex;
          const isUpcoming = index > activeIndex;

          return (
            <div 
              key={msg.id}
              ref={isActive ? activeBubbleRef : null}
              className={`flex w-full transition-all duration-700 ${
                msg.speaker === 'A' ? 'justify-start' : 'justify-end'
              } ${
                isActive 
                  ? 'opacity-100 scale-100 filter-none' 
                  : isUpcoming 
                    ? 'opacity-30 scale-95 blur-sm' 
                    : 'opacity-40 scale-95 blur-[2px]'
              }`}
            >
              <div className="flex flex-col gap-2 max-w-[85%] relative">
                <div className="flex justify-between items-center px-4">
                  <span className={`text-xl font-bold uppercase tracking-wider ${
                    msg.speaker === 'A' 
                      ? (theme === 'dark' ? 'text-gray-400' : 'text-gray-500')
                      : (theme === 'dark' ? 'text-blue-400' : 'text-blue-600')
                  }`}>
                    Người {msg.speaker}
                  </span>
                  
                  {/* Hiển thị số giây */}
                  <span className={`text-sm font-bold font-mono ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                    {msg.duration}s
                  </span>
                </div>

                <div 
                  onClick={() => setActiveIndex(index)}
                  className={`p-6 md:p-10 text-4xl md:text-6xl font-sans leading-relaxed shadow-lg relative overflow-hidden cursor-pointer hover:opacity-90 select-none ${
                    msg.speaker === 'A' 
                      ? (theme === 'dark' 
                          ? 'bg-gray-800 text-white rounded-tr-[3rem] rounded-br-[3rem] rounded-bl-[3rem] rounded-tl-xl' 
                          : 'bg-gray-100 text-gray-900 border border-gray-200 rounded-tr-[3rem] rounded-br-[3rem] rounded-bl-[3rem] rounded-tl-xl')
                      : (theme === 'dark' 
                          ? 'bg-blue-600 text-white rounded-tl-[3rem] rounded-bl-[3rem] rounded-br-[3rem] rounded-tr-xl' 
                          : 'bg-blue-500 text-white rounded-tl-[3rem] rounded-bl-[3rem] rounded-br-[3rem] rounded-tr-xl')
                  } ${isActive ? 'shadow-2xl shadow-blue-500/20' : ''}`}
                >
                  {/* Lớp phủ trong suốt để bắt trọn sự kiện click, chặn bôi đen chữ */}
                  <div className="absolute inset-0 z-10" />

                  <div className="relative z-0">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm, remarkBreaks]}
                      components={{
                        p: ({node, ...props}) => <p className="min-h-[1.5rem] mb-6 last:mb-0" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-extrabold underline decoration-2 underline-offset-8" {...props} />,
                      }}
                    >
                      {preserveMultipleNewlines(msg.text)}
                    </ReactMarkdown>
                  </div>

                  {/* Thanh thời gian (Progress Bar) cho tin nhắn Active */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 h-2 w-full bg-black/20">
                      <div 
                        className={`h-full transition-all duration-75 ease-linear ${msg.speaker === 'A' ? 'bg-blue-500' : 'bg-white'}`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Kết thúc */}
        {activeIndex >= messages.length && (
          <div className={`text-center text-3xl font-bold py-20 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
            Đã kết thúc
          </div>
        )}
      </div>
    </div>
  );
}
