// ============================================================
// English IPA dataset — 44 phonemes of Received Pronunciation.
// Used by the IPA pronunciation-learning pages.
//   - `symbol` is shown wrapped in slashes in the UI (e.g. /ʃ/)
//   - `example` is the headline example word for the sound
//   - `words` are extra words for listening practice (detail page)
//   - `similar` lists ids of easily-confused sounds (compare page)
//   - `tip` is a short Vietnamese pronunciation hint
// ============================================================

export type IpaCategory = 'consonant' | 'monophthong' | 'diphthong';

export interface IpaSound {
  id: string;
  symbol: string;
  example: string;
  category: IpaCategory;
  /** Consonants only: voiced (b, d, g...) vs voiceless (p, t, k...) */
  voiced?: boolean;
  tip: string;
  words: string[];
  similar: string[];
}

export const IPA_SOUNDS: IpaSound[] = [
  // ---------------- Consonants ----------------
  { id: 'p', symbol: 'p', example: 'pea', category: 'consonant', voiced: false,
    tip: 'Bật hai môi, không rung thanh quản, có hơi bật ra.',
    words: ['pea', 'pen', 'apple', 'happy', 'stop', 'paper'], similar: ['b'] },
  { id: 'b', symbol: 'b', example: 'boat', category: 'consonant', voiced: true,
    tip: 'Giống /p/ nhưng rung thanh quản, không bật hơi mạnh.',
    words: ['boat', 'baby', 'job', 'rabbit', 'club', 'table'], similar: ['p'] },
  { id: 't', symbol: 't', example: 'tea', category: 'consonant', voiced: false,
    tip: 'Đầu lưỡi chạm lợi trên rồi bật hơi ra, không rung.',
    words: ['tea', 'time', 'water', 'cat', 'letter', 'start'], similar: ['d'] },
  { id: 'd', symbol: 'd', example: 'dog', category: 'consonant', voiced: true,
    tip: 'Giống /t/ nhưng rung thanh quản.',
    words: ['dog', 'day', 'red', 'ladder', 'bad', 'window'], similar: ['t'] },
  { id: 'ch', symbol: 'tʃ', example: 'church', category: 'consonant', voiced: false,
    tip: 'Âm tắc-xát: /t/ + /ʃ/ ghép nhanh, không rung.',
    words: ['church', 'chair', 'watch', 'teacher', 'match', 'kitchen'], similar: ['dg'] },
  { id: 'dg', symbol: 'dʒ', example: 'judge', category: 'consonant', voiced: true,
    tip: 'Giống /tʃ/ nhưng rung thanh quản.',
    words: ['judge', 'job', 'age', 'bridge', 'jump', 'village'], similar: ['ch'] },
  { id: 'k', symbol: 'k', example: 'key', category: 'consonant', voiced: false,
    tip: 'Cuống lưỡi chạm ngạc mềm rồi bật hơi, không rung.',
    words: ['key', 'cat', 'book', 'school', 'clock', 'black'], similar: ['g'] },
  { id: 'g', symbol: 'g', example: 'go', category: 'consonant', voiced: true,
    tip: 'Giống /k/ nhưng rung thanh quản.',
    words: ['go', 'good', 'big', 'again', 'dog', 'green'], similar: ['k'] },
  { id: 'f', symbol: 'f', example: 'fly', category: 'consonant', voiced: false,
    tip: 'Răng trên chạm nhẹ môi dưới, đẩy hơi ra, không rung.',
    words: ['fly', 'four', 'coffee', 'life', 'phone', 'laugh'], similar: ['v'] },
  { id: 'v', symbol: 'v', example: 'video', category: 'consonant', voiced: true,
    tip: 'Giống /f/ nhưng rung thanh quản.',
    words: ['video', 'very', 'love', 'seven', 'give', 'travel'], similar: ['f'] },
  { id: 'th', symbol: 'θ', example: 'think', category: 'consonant', voiced: false,
    tip: 'Đặt đầu lưỡi giữa hai hàm răng, đẩy hơi, không rung.',
    words: ['think', 'three', 'mouth', 'birthday', 'thank', 'math'], similar: ['dh', 's'] },
  { id: 'dh', symbol: 'ð', example: 'this', category: 'consonant', voiced: true,
    tip: 'Giống /θ/ nhưng rung thanh quản.',
    words: ['this', 'that', 'mother', 'weather', 'they', 'brother'], similar: ['th'] },
  { id: 's', symbol: 's', example: 'see', category: 'consonant', voiced: false,
    tip: 'Đầu lưỡi gần lợi trên, luồng hơi rít nhẹ, không rung.',
    words: ['see', 'sun', 'bus', 'city', 'nice', 'listen'], similar: ['z', 'sh', 'th'] },
  { id: 'z', symbol: 'z', example: 'zoo', category: 'consonant', voiced: true,
    tip: 'Giống /s/ nhưng rung thanh quản.',
    words: ['zoo', 'zero', 'buzz', 'busy', 'nose', 'music'], similar: ['s'] },
  { id: 'sh', symbol: 'ʃ', example: 'shoe', category: 'consonant', voiced: false,
    tip: 'Chu môi tròn, lưỡi lùi hơn /s/, âm "sh".',
    words: ['shoe', 'she', 'fish', 'nation', 'wash', 'special'], similar: ['zh', 's'] },
  { id: 'zh', symbol: 'ʒ', example: 'vision', category: 'consonant', voiced: true,
    tip: 'Giống /ʃ/ nhưng rung thanh quản.',
    words: ['vision', 'measure', 'usual', 'garage', 'pleasure', 'television'], similar: ['sh'] },
  { id: 'm', symbol: 'm', example: 'man', category: 'consonant', voiced: true,
    tip: 'Khép hai môi, hơi thoát qua mũi, rung.',
    words: ['man', 'moon', 'time', 'summer', 'home', 'name'], similar: ['n'] },
  { id: 'n', symbol: 'n', example: 'now', category: 'consonant', voiced: true,
    tip: 'Đầu lưỡi chạm lợi trên, hơi thoát qua mũi.',
    words: ['now', 'no', 'sun', 'dinner', 'run', 'night'], similar: ['m', 'ng'] },
  { id: 'ng', symbol: 'ŋ', example: 'sing', category: 'consonant', voiced: true,
    tip: 'Cuống lưỡi chạm ngạc mềm, hơi thoát qua mũi (âm "ng" cuối).',
    words: ['sing', 'song', 'long', 'thing', 'ring', 'morning'], similar: ['n'] },
  { id: 'h', symbol: 'h', example: 'hat', category: 'consonant', voiced: false,
    tip: 'Chỉ đẩy luồng hơi ra nhẹ, không cản.',
    words: ['hat', 'house', 'happy', 'hello', 'behind', 'perhaps'], similar: [] },
  { id: 'l', symbol: 'l', example: 'love', category: 'consonant', voiced: true,
    tip: 'Đầu lưỡi chạm lợi trên, hơi thoát hai bên lưỡi.',
    words: ['love', 'light', 'yellow', 'call', 'play', 'little'], similar: ['r'] },
  { id: 'r', symbol: 'r', example: 'red', category: 'consonant', voiced: true,
    tip: 'Cuộn nhẹ lưỡi về sau, không chạm, môi hơi tròn.',
    words: ['red', 'run', 'very', 'sorry', 'grow', 'around'], similar: ['l'] },
  { id: 'w', symbol: 'w', example: 'wet', category: 'consonant', voiced: true,
    tip: 'Chu tròn hai môi rồi mở nhanh, như "u" lướt.',
    words: ['wet', 'water', 'we', 'window', 'away', 'quick'], similar: [] },
  { id: 'y', symbol: 'j', example: 'yes', category: 'consonant', voiced: true,
    tip: 'Lưỡi nâng gần ngạc cứng, lướt nhanh như "y".',
    words: ['yes', 'you', 'year', 'yellow', 'music', 'beyond'], similar: [] },

  // ---------------- Monophthongs ----------------
  { id: 'ii', symbol: 'iː', example: 'sheep', category: 'monophthong',
    tip: 'Nguyên âm dài, môi dẹt, lưỡi cao trước — "i" kéo dài.',
    words: ['sheep', 'see', 'green', 'meat', 'key', 'people'], similar: ['i'] },
  { id: 'i', symbol: 'ɪ', example: 'ship', category: 'monophthong',
    tip: 'Nguyên âm ngắn, thả lỏng — giữa "i" và "ê".',
    words: ['ship', 'sit', 'big', 'this', 'city', 'women'], similar: ['ii'] },
  { id: 'u', symbol: 'ʊ', example: 'good', category: 'monophthong',
    tip: 'Nguyên âm ngắn, môi hơi tròn — "u" thả lỏng.',
    words: ['good', 'book', 'put', 'foot', 'could', 'woman'], similar: ['uu'] },
  { id: 'uu', symbol: 'uː', example: 'shoot', category: 'monophthong',
    tip: 'Nguyên âm dài, môi tròn chặt — "u" kéo dài.',
    words: ['shoot', 'food', 'blue', 'moon', 'two', 'group'], similar: ['u'] },
  { id: 'e', symbol: 'e', example: 'bed', category: 'monophthong',
    tip: 'Nguyên âm ngắn, miệng mở vừa — âm "e".',
    words: ['bed', 'red', 'ten', 'head', 'many', 'friend'], similar: ['ae'] },
  { id: 'schwa', symbol: 'ə', example: 'teacher', category: 'monophthong',
    tip: 'Âm "ơ" nhẹ, không nhấn — phổ biến ở âm tiết không trọng âm.',
    words: ['teacher', 'about', 'again', 'banana', 'sofa', 'computer'], similar: ['er', 'uh'] },
  { id: 'er', symbol: 'ɜː', example: 'bird', category: 'monophthong',
    tip: 'Âm "ơ" dài, có trọng âm, lưỡi giữa.',
    words: ['bird', 'word', 'first', 'nurse', 'learn', 'girl'], similar: ['schwa'] },
  { id: 'aw', symbol: 'ɔː', example: 'door', category: 'monophthong',
    tip: 'Nguyên âm dài, môi tròn — âm "o" kéo dài.',
    words: ['door', 'four', 'call', 'law', 'water', 'bought'], similar: ['o'] },
  { id: 'ae', symbol: 'æ', example: 'cat', category: 'monophthong',
    tip: 'Miệng mở rộng, âm giữa "e" và "a".',
    words: ['cat', 'bad', 'apple', 'man', 'happy', 'thank'], similar: ['e', 'uh'] },
  { id: 'uh', symbol: 'ʌ', example: 'up', category: 'monophthong',
    tip: 'Âm "â" ngắn, miệng mở vừa, thả lỏng.',
    words: ['up', 'cup', 'love', 'money', 'young', 'come'], similar: ['aa', 'ae'] },
  { id: 'aa', symbol: 'ɑː', example: 'far', category: 'monophthong',
    tip: 'Nguyên âm dài, miệng mở to — âm "a" kéo dài.',
    words: ['far', 'car', 'father', 'fast', 'heart', 'dance'], similar: ['uh'] },
  { id: 'o', symbol: 'ɒ', example: 'on', category: 'monophthong',
    tip: 'Nguyên âm ngắn, môi tròn — âm "o" ngắn.',
    words: ['on', 'hot', 'dog', 'stop', 'watch', 'want'], similar: ['aw'] },

  // ---------------- Diphthongs ----------------
  { id: 'ia', symbol: 'ɪə', example: 'here', category: 'diphthong',
    tip: 'Lướt từ /ɪ/ sang /ə/.',
    words: ['here', 'near', 'idea', 'beer', 'ear', 'serious'], similar: ['ea'] },
  { id: 'ei', symbol: 'eɪ', example: 'wait', category: 'diphthong',
    tip: 'Lướt từ /e/ sang /ɪ/ — âm "ây".',
    words: ['wait', 'day', 'name', 'eight', 'play', 'great'], similar: ['ai'] },
  { id: 'ua', symbol: 'ʊə', example: 'tourist', category: 'diphthong',
    tip: 'Lướt từ /ʊ/ sang /ə/.',
    words: ['tourist', 'sure', 'pure', 'poor', 'cure', 'Europe'], similar: ['aw'] },
  { id: 'oi', symbol: 'ɔɪ', example: 'boy', category: 'diphthong',
    tip: 'Lướt từ /ɔ/ sang /ɪ/ — âm "oi".',
    words: ['boy', 'coin', 'voice', 'enjoy', 'noise', 'point'], similar: [] },
  { id: 'ou', symbol: 'əʊ', example: 'show', category: 'diphthong',
    tip: 'Lướt từ /ə/ sang /ʊ/ — âm "âu".',
    words: ['show', 'go', 'home', 'boat', 'know', 'phone'], similar: ['au'] },
  { id: 'ea', symbol: 'eə', example: 'hair', category: 'diphthong',
    tip: 'Lướt từ /e/ sang /ə/.',
    words: ['hair', 'care', 'there', 'bear', 'chair', 'where'], similar: ['ia'] },
  { id: 'ai', symbol: 'aɪ', example: 'my', category: 'diphthong',
    tip: 'Lướt từ /a/ sang /ɪ/ — âm "ai".',
    words: ['my', 'time', 'like', 'high', 'buy', 'night'], similar: ['ei', 'oi'] },
  { id: 'au', symbol: 'aʊ', example: 'cow', category: 'diphthong',
    tip: 'Lướt từ /a/ sang /ʊ/ — âm "ao".',
    words: ['cow', 'now', 'house', 'about', 'down', 'mouth'], similar: ['ou'] },
];

export const IPA_CATEGORIES: { key: IpaCategory; label: string }[] = [
  { key: 'consonant', label: 'Consonants' },
  { key: 'monophthong', label: 'Monophthongs' },
  { key: 'diphthong', label: 'Diphthongs' },
];

/** Curated minimal-pair sets for the compare page. */
export interface IpaPair {
  a: string;
  b: string;
  pairs: [string, string][];
}

export const IPA_PAIRS: IpaPair[] = [
  { a: 'ii', b: 'i', pairs: [['sheep', 'ship'], ['seat', 'sit'], ['feel', 'fill'], ['heat', 'hit'], ['green', 'grin'], ['leave', 'live']] },
  { a: 'e', b: 'ae', pairs: [['bed', 'bad'], ['pen', 'pan'], ['men', 'man'], ['said', 'sad'], ['guess', 'gas'], ['head', 'had']] },
  { a: 'u', b: 'uu', pairs: [['full', 'fool'], ['pull', 'pool'], ['look', 'Luke'], ['could', 'cooed'], ['wood', 'wooed'], ['foot', 'food']] },
  { a: 'uh', b: 'aa', pairs: [['cup', 'carp'], ['cut', 'cart'], ['hut', 'heart'], ['come', 'calm'], ['bun', 'barn'], ['fun', 'far']] },
  { a: 'o', b: 'aw', pairs: [['cot', 'caught'], ['spot', 'sport'], ['don', 'dawn'], ['stock', 'stalk'], ['pot', 'port'], ['shot', 'short']] },
  { a: 'p', b: 'b', pairs: [['pea', 'bee'], ['pat', 'bat'], ['pin', 'bin'], ['pack', 'back'], ['cap', 'cab'], ['rope', 'robe']] },
  { a: 't', b: 'd', pairs: [['time', 'dime'], ['town', 'down'], ['ten', 'den'], ['tie', 'die'], ['seat', 'seed'], ['wrote', 'road']] },
  { a: 'k', b: 'g', pairs: [['came', 'game'], ['coat', 'goat'], ['back', 'bag'], ['cap', 'gap'], ['curl', 'girl'], ['lock', 'log']] },
  { a: 'f', b: 'v', pairs: [['fan', 'van'], ['few', 'view'], ['leaf', 'leave'], ['safe', 'save'], ['half', 'have'], ['fine', 'vine']] },
  { a: 's', b: 'z', pairs: [['sip', 'zip'], ['sue', 'zoo'], ['bus', 'buzz'], ['price', 'prize'], ['ice', 'eyes'], ['place', 'plays']] },
  { a: 's', b: 'sh', pairs: [['sea', 'she'], ['sip', 'ship'], ['sew', 'show'], ['save', 'shave'], ['sock', 'shock'], ['mass', 'mash']] },
  { a: 'ch', b: 'dg', pairs: [['chin', 'gin'], ['choke', 'joke'], ['cheap', 'jeep'], ['rich', 'ridge'], ['batch', 'badge'], ['cherry', 'Jerry']] },
  { a: 'l', b: 'r', pairs: [['light', 'right'], ['lead', 'read'], ['glass', 'grass'], ['long', 'wrong'], ['collect', 'correct'], ['alive', 'arrive']] },
  { a: 'n', b: 'ng', pairs: [['sin', 'sing'], ['thin', 'thing'], ['ban', 'bang'], ['ran', 'rang'], ['win', 'wing'], ['run', 'rung']] },
  { a: 'th', b: 'dh', pairs: [['thigh', 'thy'], ['teeth', 'teethe'], ['breath', 'breathe'], ['ether', 'either'], ['cloth', 'clothe'], ['loath', 'loathe']] },
];

export const IPA_SOUND_BY_ID: Record<string, IpaSound> = Object.fromEntries(
  IPA_SOUNDS.map(s => [s.id, s])
);
