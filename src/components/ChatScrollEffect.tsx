import { useEffect, useState, useRef } from 'react';
import { Play, Pause, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { preserveMultipleNewlines } from '@/utils/markdownUtils';
import type { ChatMessage } from '@/App';

interface ChatScrollEffectProps {
  messages: ChatMessage[];
  speed: number;
  setSpeed: (speed: number) => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

export function ChatScrollEffect({ messages, speed, setSpeed, theme, setTheme }: ChatScrollEffectProps) {
  const [offset, setOffset] = useState(() => window.innerHeight);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const isPausedRef = useRef(isPaused);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Reset offset when messages change
  useEffect(() => {
    setOffset(window.innerHeight);
  }, [messages]);

  // Animation Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime: number | null = null;

    const animate = (time: number) => {
      if (lastTime === null) {
        lastTime = time;
      }
      const delta = time - lastTime;
      lastTime = time;

      if (!isPausedRef.current) {
        let currentSpeedPx = 150; // Fallback
        
        if (containerRef.current) {
          const totalHeight = containerRef.current.offsetHeight;
          // Đếm tổng số từ trong tất cả tin nhắn
          const totalWords = Math.max(1, messages.reduce((acc, msg) => acc + msg.text.trim().split(/\s+/).length, 0));
          
          currentSpeedPx = (speed / 60) * (totalHeight / totalWords);
        }

        const pixelsToMove = (currentSpeedPx * delta) / 1000;
        
        setOffset((prev) => {
          const newOffset = prev - pixelsToMove;
          
          if (containerRef.current) {
            const elementHeight = containerRef.current.offsetHeight;
            const contentHeight = elementHeight - window.innerHeight;
            if (newOffset < -contentHeight) {
              return window.innerHeight; // Loop back ngay khi vừa hết nội dung
            }
          }
          return newOffset;
        });
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [speed, messages]);

  // Click to Rewind
  const handleBubbleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const el = e.currentTarget;
    const offsetTop = el.offsetTop;
    const clientHeight = el.clientHeight;
    
    // Tính toán để bong bóng nằm ngay giữa màn hình
    const targetOffset = (window.innerHeight / 2) - offsetTop - (clientHeight / 2);
    setOffset(targetOffset);
  };

  return (
    <div className={`absolute inset-0 w-full h-full overflow-hidden flex justify-center items-start group ${theme === 'dark' ? 'bg-black' : 'bg-white'}`}>
      
      {/* Floating Toolbar */}
      <div className={`absolute top-4 right-4 z-50 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-md px-4 py-2 rounded-full border ${theme === 'dark' ? 'bg-black/50 border-white/20' : 'bg-white/80 border-black/20 shadow-lg'}`}>
        <div className="flex items-center gap-3 w-48">
          <span className={`text-xs font-mono w-14 text-right ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{speed} WPM</span>
          <Slider
            min={10} max={500} step={5}
            value={[speed]}
            onValueChange={(val) => setSpeed(Array.isArray(val) ? val[0] : (val as number))}
            className={`w-full ${theme === 'dark' ? '[&_[data-slot=slider-track]]:!bg-white/30' : '[&_[data-slot=slider-track]]:!bg-black/20'} [&_[data-slot=slider-range]]:!bg-purple-500`}
          />
        </div>
        <div className={`w-px h-6 ${theme === 'dark' ? 'bg-white/20' : 'bg-black/20'}`}></div>
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
        className="w-full max-w-5xl px-6 md:px-12 flex flex-col gap-10 pb-[100vh] relative"
        style={{ transform: `translateY(${offset}px)` }}
      >
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={`flex w-full transition-opacity duration-200 ${
              msg.speaker === 'A' ? 'justify-start' : 'justify-end'
            }`}
          >
            <div className="flex flex-col gap-2 max-w-[80%]">
              <span className={`text-xl font-bold uppercase tracking-wider ${
                msg.speaker === 'A' 
                  ? (theme === 'dark' ? 'text-gray-400 pl-4' : 'text-gray-500 pl-4')
                  : (theme === 'dark' ? 'text-blue-400 text-right pr-4' : 'text-blue-600 text-right pr-4')
              }`}>
                Người {msg.speaker}
              </span>
              <div 
                onClick={handleBubbleClick}
                className={`p-6 md:p-10 text-4xl md:text-6xl font-sans leading-relaxed shadow-lg relative cursor-pointer hover:opacity-90 select-none ${
                  msg.speaker === 'A' 
                    ? (theme === 'dark' 
                        ? 'bg-gray-800 text-white rounded-tr-[3rem] rounded-br-[3rem] rounded-bl-[3rem] rounded-tl-xl' 
                        : 'bg-gray-100 text-gray-900 border border-gray-200 rounded-tr-[3rem] rounded-br-[3rem] rounded-bl-[3rem] rounded-tl-xl')
                    : (theme === 'dark' 
                        ? 'bg-blue-600 text-white rounded-tl-[3rem] rounded-bl-[3rem] rounded-br-[3rem] rounded-tr-xl' 
                        : 'bg-blue-500 text-white rounded-tl-[3rem] rounded-bl-[3rem] rounded-br-[3rem] rounded-tr-xl')
                }`}
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
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
