import type { DictationLesson } from '@/types/dictation';

export const SAMPLE_DICTATION_LESSONS: DictationLesson[] = [
  {
    id: 'sample-zoo',
    title: 'Me at the zoo (Video đầu tiên trên YouTube)',
    videoId: 'jNQXAC9IVRw',
    sourceUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    duration: 16,
    segments: [
      {
        id: 'zoo-1',
        start: 1,
        end: 5,
        text: 'All right, so here we are in front of the elephants.',
        translation: 'Được rồi, chúng ta đang ở đây trước những chú voi.',
      },
      {
        id: 'zoo-2',
        start: 5.2,
        end: 11,
        text: 'The cool thing about these guys is that they have really really long trunks.',
        translation: 'Điểm thú vị về những chú voi này là chúng có những chiếc vòi rất dài.',
      },
      {
        id: 'zoo-3',
        start: 11.2,
        end: 16,
        text: "And that's cool, and that's pretty much all there is to say.",
        translation: 'Và điều đó thật tuyệt, đó là tất cả những gì có thể nói.',
      },
    ],
  },
  {
    id: 'sample-steve-jobs',
    title: "Steve Jobs' 2005 Stanford Speech (Đoạn mở đầu)",
    videoId: 'UF8uR6Z6KLc',
    sourceUrl: 'https://www.youtube.com/watch?v=UF8uR6Z6KLc',
    duration: 52,
    segments: [
      {
        id: 'sj-1',
        start: 16.5,
        end: 25,
        text: 'I am honored to be with you today at your commencement from one of the finest universities in the world.',
        translation: 'Tôi rất vinh dự được có mặt cùng các bạn hôm nay trong lễ tốt nghiệp từ một trong những trường đại học xuất sắc nhất thế giới.',
      },
      {
        id: 'sj-2',
        start: 25.5,
        end: 32,
        text: 'Truth be told, I never graduated from college, and this is the closest I have ever gotten to a college graduation.',
        translation: 'Thú thực là tôi chưa từng tốt nghiệp đại học, và đây là lần tôi ở gần nhất với một lễ tốt nghiệp đại học.',
      },
      {
        id: 'sj-3',
        start: 33,
        end: 42,
        text: 'Today I want to tell you three stories from my life. That is it. No big deal. Just three stories.',
        translation: 'Hôm nay tôi muốn kể cho các bạn nghe ba câu chuyện từ cuộc đời tôi. Chỉ vậy thôi. Không có gì to tát. Chỉ ba câu chuyện.',
      },
      {
        id: 'sj-4',
        start: 42.5,
        end: 51,
        text: 'The first story is about connecting the dots. I dropped out of Reed College after the first six months.',
        translation: 'Câu chuyện đầu tiên là về việc kết nối các dấu mốc. Tôi đã bỏ học tại Cao đẳng Reed sau sáu tháng đầu tiên.',
      },
    ],
  },
  {
    id: 'sample-rick-roll',
    title: 'Never Gonna Give You Up - Rick Astley (Luyện nghe bài hát)',
    videoId: 'dQw4w9WgXcQ',
    sourceUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: 45,
    segments: [
      {
        id: 'rr-1',
        start: 18.5,
        end: 24,
        text: "We're no strangers to love. You know the rules and so do I.",
        translation: 'Chúng ta không xa lạ gì với tình yêu. Em biết luật và anh cũng vậy.',
      },
      {
        id: 'rr-2',
        start: 24.5,
        end: 32,
        text: "A full commitment's what I'm thinking of. You wouldn't get this from any other guy.",
        translation: 'Một sự cam kết trọn vẹn là điều anh đang nghĩ tới. Em sẽ không nhận được điều này từ bất kỳ chàng trai nào khác.',
      },
      {
        id: 'rr-3',
        start: 32.5,
        end: 43,
        text: "I just wanna tell you how I'm feeling. Gotta make you understand.",
        translation: 'Anh chỉ muốn nói cho em biết cảm xúc của mình. Phải làm cho em hiểu.',
      },
      {
        id: 'rr-4',
        start: 43.2,
        end: 53,
        text: "Never gonna give you up, never gonna let you down, never gonna run around and desert you.",
        translation: 'Không bao giờ từ bỏ em, không bao giờ làm em thất vọng, không bao giờ bỏ chạy và rời xa em.',
      },
    ],
  },
];
