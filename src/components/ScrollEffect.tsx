import { useEffect, useState, useRef } from 'react';
import { Play, Pause, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { preserveMultipleNewlines } from '@/utils/markdownUtils';

interface ScrollEffectProps {
  text: string;
  speed: number;
  setSpeed: (speed: number) => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

export function ScrollEffect({ text, speed, setSpeed, theme, setTheme }: ScrollEffectProps) {
  // Bắt đầu ngay từ dưới cùng màn hình
  const [offset, setOffset] = useState(() => window.innerHeight);
  const [isPaused, setIsPaused] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  
  // Ref để truy cập nhanh state trong loop requestAnimationFrame
  const isPausedRef = useRef(isPaused);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Khi text thay đổi, reset lại vị trí
  useEffect(() => {
    setOffset(window.innerHeight);
  }, [text]);

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = 0;

    const animate = (time: number) => {
      if (lastTime === 0) lastTime = time;
      let delta = time - lastTime;
      
      // Tránh bước nhảy vọt (jump) nếu frame bị lag hoặc chuyển tab
      if (delta > 50) delta = 16;
      lastTime = time;

      if (!isPausedRef.current) {
        let currentSpeedPx = 150; // Fallback
        
        if (textRef.current) {
          const totalHeight = textRef.current.offsetHeight;
          // Đếm tổng số từ (mỗi từ cách nhau bởi khoảng trắng)
          const totalWords = Math.max(1, text.trim().split(/\s+/).length);
          
          // Tính pixel per second theo WPM: px/s = (WPM / 60) * (Tổng chiều cao / Tổng số từ)
          currentSpeedPx = (speed / 60) * (totalHeight / totalWords);
        }

        const pixelsToMove = (currentSpeedPx * delta) / 1000;
        
        setOffset((prev) => {
          const newOffset = prev - pixelsToMove;
          
          // Nếu text đã cuộn hết lên khỏi màn hình
          if (textRef.current) {
            const elementHeight = textRef.current.offsetHeight;
            const contentHeight = elementHeight - window.innerHeight;
            // Nếu đã cuộn hết nội dung thật (trừ đi padding ảo), quay lại từ đầu
            if (newOffset < -contentHeight) {
              return window.innerHeight;
            }
          }
          
          return newOffset;
        });
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [speed]);

  // Click to Rewind
  const handleLineClick = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    const el = e.currentTarget;
    const offsetTop = el.offsetTop;
    const clientHeight = el.clientHeight;
    
    // Tính toán để dòng chữ nằm ngay giữa màn hình
    const targetOffset = (window.innerHeight / 2) - offsetTop - (clientHeight / 2);
    setOffset(targetOffset);
  };

  return (
    <div className={`absolute inset-0 w-full h-full overflow-hidden flex justify-center items-start group ${theme === 'dark' ? 'bg-black' : 'bg-white'}`}>
      
      {/* Thanh công cụ nổi ở góc phải */}
      <div className={`absolute top-4 right-4 z-50 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-md px-4 py-2 rounded-full border ${theme === 'dark' ? 'bg-black/50 border-white/20' : 'bg-white/80 border-black/20 shadow-lg'}`}>
        
        {/* Điều chỉnh tốc độ (WPM) */}
        <div className="flex items-center gap-3 w-48">
          <span className={`text-xs font-mono w-14 text-right ${theme === 'dark' ? 'text-white' : 'text-black'}`}>{speed} WPM</span>
          <Slider
            min={10}
            max={500}
            step={5}
            value={[speed]}
            onValueChange={(val) => setSpeed(Array.isArray(val) ? val[0] : (val as number))}
            className={`w-full ${theme === 'dark' ? '[&_[data-slot=slider-track]]:!bg-white/30' : '[&_[data-slot=slider-track]]:!bg-black/20'} [&_[data-slot=slider-range]]:!bg-purple-500`}
          />
        </div>
        
        <div className={`w-px h-6 ${theme === 'dark' ? 'bg-white/20' : 'bg-black/20'}`}></div>

        {/* Nút Đổi màu */}
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className={`rounded-full w-10 h-10 ${theme === 'dark' ? 'text-white hover:bg-white/20' : 'text-black hover:bg-black/10'}`}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>

        {/* Nút Pause/Play */}
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setIsPaused(!isPaused)}
          className={`rounded-full w-10 h-10 ${theme === 'dark' ? 'text-white hover:bg-white/20' : 'text-black hover:bg-black/10'}`}
        >
          {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
        </Button>
      </div>

      <div 
        ref={textRef}
        className={`w-full max-w-5xl px-6 md:px-12 text-4xl md:text-6xl font-sans text-center leading-relaxed pb-[100vh] relative ${theme === 'dark' ? 'text-white' : 'text-black'}`}
        style={{ transform: `translateY(${offset}px)` }}
      >
        <ReactMarkdown 
          remarkPlugins={[remarkGfm, remarkBreaks]}
          components={{
            p: ({node, ...props}) => <p onClick={handleLineClick} className="hover:text-purple-400 cursor-pointer transition-colors duration-200 min-h-[1.5rem] mb-12" {...props} />,
            h1: ({node, ...props}) => <h1 onClick={handleLineClick} className={`text-6xl md:text-8xl font-bold hover:text-purple-400 cursor-pointer transition-colors duration-200 mb-16 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} {...props} />,
            h2: ({node, ...props}) => <h2 onClick={handleLineClick} className={`text-5xl md:text-7xl font-bold hover:text-purple-400 cursor-pointer transition-colors duration-200 mb-14 ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`} {...props} />,
            h3: ({node, ...props}) => <h3 onClick={handleLineClick} className={`text-4xl md:text-6xl font-bold hover:text-purple-400 cursor-pointer transition-colors duration-200 mb-12 ${theme === 'dark' ? 'text-teal-400' : 'text-teal-600'}`} {...props} />,
            ul: ({node, ...props}) => <ul className="list-disc list-inside mb-12 text-left inline-block" {...props} />,
            ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-12 text-left inline-block" {...props} />,
            li: ({node, ...props}) => <li onClick={handleLineClick} className={`hover:text-purple-400 cursor-pointer transition-colors duration-200 mb-6 ${theme === 'dark' ? 'marker:text-blue-500' : 'marker:text-blue-600'}`} {...props} />,
            blockquote: ({node, ...props}) => <blockquote onClick={handleLineClick} className={`hover:text-purple-400 cursor-pointer transition-colors duration-200 border-l-8 border-purple-500 pl-8 mb-12 italic text-left inline-block ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} {...props} />,
            strong: ({node, ...props}) => <strong className={`font-bold ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} {...props} />,
            em: ({node, ...props}) => <em className={`italic ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} {...props} />,
          }}
        >
          {preserveMultipleNewlines(text)}
        </ReactMarkdown>
      </div>
    </div>
  );
}
