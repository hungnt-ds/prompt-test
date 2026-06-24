import { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { preserveMultipleNewlines } from '@/utils/markdownUtils';

interface TypewriterEffectProps {
  text: string;
  speed: number;
  theme: 'dark' | 'light';
  onComplete?: () => void;
}

export function TypewriterEffect({ text, speed, theme, onComplete }: TypewriterEffectProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [index, setIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (index < text.length) {
      setIsFinished(false);
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text.charAt(index));
        setIndex((prev) => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      setIsFinished(true);
      onComplete();
    } else {
      setIsFinished(true);
    }
  }, [index, text, speed, onComplete]);

  // Reset when text changes
  useEffect(() => {
    setDisplayedText('');
    setIndex(0);
    setIsFinished(false);
  }, [text]);

  return (
    <div 
      ref={containerRef}
      className={`w-full max-w-4xl font-sans text-left leading-relaxed text-4xl md:text-6xl ${theme === 'dark' ? 'text-white' : 'text-black'}`}
    >
      <ReactMarkdown 
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          p: ({node, ...props}) => <p className="mb-8" {...props} />,
          h1: ({node, ...props}) => <h1 className={`text-6xl md:text-8xl font-bold mb-10 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} {...props} />,
          h2: ({node, ...props}) => <h2 className={`text-5xl md:text-7xl font-bold mb-8 ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`} {...props} />,
          h3: ({node, ...props}) => <h3 className={`text-4xl md:text-6xl font-bold mb-6 ${theme === 'dark' ? 'text-teal-400' : 'text-teal-600'}`} {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc list-inside mb-8" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-8" {...props} />,
          li: ({node, ...props}) => <li className={`mb-4 ${theme === 'dark' ? 'marker:text-blue-500' : 'marker:text-blue-600'}`} {...props} />,
          blockquote: ({node, ...props}) => <blockquote className={`border-l-8 border-purple-500 pl-8 mb-8 italic ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} {...props} />,
          strong: ({node, ...props}) => <strong className={`font-bold ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} {...props} />,
          em: ({node, ...props}) => <em className={`italic ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} {...props} />,
        }}
      >
        {preserveMultipleNewlines(displayedText)}
      </ReactMarkdown>
      {/* Con trỏ nhấp nháy */}
      {!isFinished && (
        <span className={`inline-block w-[0.5em] h-[1em] ml-1 align-middle animate-pulse ${theme === 'dark' ? 'bg-blue-500' : 'bg-blue-600'}`}></span>
      )}
    </div>
  );
}
