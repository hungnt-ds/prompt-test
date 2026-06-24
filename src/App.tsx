import { useState } from 'react';
import { ConfigPanel } from '@/components/ConfigPanel';
import { TypewriterEffect } from '@/components/TypewriterEffect';
import { ScrollEffect } from '@/components/ScrollEffect';
import { ChatScrollEffect } from '@/components/ChatScrollEffect';
import { TimedChatEffect } from '@/components/TimedChatEffect';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export interface ChatMessage {
  id: string;
  speaker: 'A' | 'B';
  text: string;
  duration: number; // in seconds
}

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [text, setText] = useState('was synonymous\nwith hotel room\ntrashing. If he\nchecked into a\nhotel it would\nsignal a\nflat screen\napocalypse. The\nswimming pool\nwould invariably\ncontain a shoal of\nTVs the following\nmorning.\nRandy also loved');
  const [speed, setSpeed] = useState(50);
  const [effectType, setEffectType] = useState<'typewriter' | 'scroll' | 'timed_chat'>('scroll');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [inputMode, setInputMode] = useState<'monologue' | 'dialogue'>('monologue');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '1', speaker: 'A', text: 'Chào mọi người! Rất vui được gặp các bạn.', duration: 3 },
    { id: '2', speaker: 'B', text: 'Chào A! Chủ đề hôm nay của chúng ta là gì vậy?', duration: 4 },
    { id: '3', speaker: 'A', text: 'Chúng ta sẽ thảo luận về ứng dụng AI trong thực tiễn nhé.', duration: 5 }
  ]);

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handleBack = () => {
    setIsPlaying(false);
  };

  return (
    <div className={`min-h-screen text-foreground flex flex-col font-sans selection:bg-purple-500/30 overflow-hidden relative transition-colors duration-500 ${theme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-gray-100'}`}>
      {isPlaying ? (
        <div className={`relative flex-1 w-full h-full ${theme === 'dark' ? 'bg-black' : 'bg-white'}`}>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleBack}
            className={`absolute top-4 left-4 transition-colors z-50 w-12 h-12 rounded-full ${
              theme === 'dark' 
                ? 'text-white/50 hover:text-white hover:bg-white/10' 
                : 'text-black/50 hover:text-black hover:bg-black/10'
            }`}
          >
            <ArrowLeft className="h-8 w-8" />
          </Button>
          
          <div className="absolute inset-0">
            {inputMode === 'dialogue' ? (
              effectType === 'timed_chat' ? (
                <TimedChatEffect messages={chatMessages} theme={theme} setTheme={setTheme} />
              ) : (
                <ChatScrollEffect messages={chatMessages} speed={speed} setSpeed={setSpeed} theme={theme} setTheme={setTheme} />
              )
            ) : effectType === 'typewriter' ? (
              <div className="flex items-center justify-center w-full h-full p-8 sm:p-24">
                <div className="w-full max-w-5xl mx-auto">
                  <TypewriterEffect text={text} speed={speed} theme={theme} />
                </div>
              </div>
            ) : (
              <ScrollEffect text={text} speed={speed} setSpeed={setSpeed} theme={theme} setTheme={setTheme} />
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative min-h-screen">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none flex justify-center items-center">
            <div className={`absolute top-0 w-full h-[500px] rounded-full mix-blend-screen filter blur-[100px] -translate-y-1/2 ${theme === 'dark' ? 'bg-purple-500/20' : 'bg-purple-500/10'}`}></div>
            <div className={`absolute bottom-0 w-full h-[500px] rounded-full mix-blend-screen filter blur-[100px] translate-y-1/2 ${theme === 'dark' ? 'bg-pink-500/10' : 'bg-pink-500/5'}`}></div>
          </div>
          
          <div className="z-10 w-full animate-in fade-in zoom-in duration-500">
            <ConfigPanel 
              text={text} 
              setText={setText} 
              speed={speed} 
              setSpeed={setSpeed} 
              effectType={effectType}
              setEffectType={setEffectType}
              onPlay={handlePlay} 
              theme={theme}
              setTheme={setTheme}
              inputMode={inputMode}
              setInputMode={setInputMode}
              chatMessages={chatMessages}
              setChatMessages={setChatMessages}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
