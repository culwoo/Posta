/**
 * Design Template Presets for Plus Pass
 *
 * Each preset is a fully distinct design system, inspired by world-class brands.
 * These are NOT runtime dependencies. Brand names are internal references only.
 * The CSS in templates.css uses data-template="<id>" to apply each system.
 *
 * Each preset provides:
 *   - theme tokens (colors, fonts) matching EventContext CSS variables
 *   - notePalette: 5 hex colors for sticky-note backgrounds on the Board
 */

export const DESIGN_PRESETS = [
  {
    id: 'midnight-terminal',
    label: '미드나잇 터미널',
    subtitle: 'Spotify 감성',
    description: '터미널 다크 테마 · 그린 액센트 · 모노스페이스 타이포 · 필 버튼',
    theme: {
      primary: '#1ed760',
      secondary: '#1db954',
      bgPrimary: '#121212',
      bgSecondary: '#181818',
      textPrimary: '#ffffff',
      accent: '#1ed760',
      fontMain: 'IBM Plex Sans KR',
      fontNote: 'IBM Plex Sans KR',
    },
    notePalette: ['#1f1f1f', '#252525', '#272727', '#1f1f1f', '#252525'],
  },
  {
    id: 'warm-editorial',
    label: '웜 에디토리얼',
    subtitle: 'Notion 감성',
    description: '따뜻한 미니멀리즘 · 세리프 타이틀 · 위스퍼 보더 · 워밍 뉴트럴',
    theme: {
      primary: '#31302e',
      secondary: '#615d59',
      bgPrimary: '#ffffff',
      bgSecondary: '#f6f5f4',
      textPrimary: '#31302e',
      accent: '#31302e',
      fontMain: 'Pretendard',
      fontNote: 'Gowun Batang',
    },
    notePalette: ['#ffffff', '#faf9f7', '#f6f5f4', '#ffffff', '#faf9f7'],
  },
  {
    id: 'neon-pulse',
    label: '이더리얼 웜',
    subtitle: 'ElevenLabs 감성',
    description: '프리미엄 화이트 · 위스퍼 섀도우 · 가벼운 타이포 · 따뜻한 스톤 톤',
    theme: {
      primary: '#000000',
      secondary: '#4e4e4e',
      bgPrimary: '#ffffff',
      bgSecondary: '#f5f5f5',
      textPrimary: '#000000',
      accent: '#000000',
      fontMain: 'Pretendard',
      fontNote: 'Pretendard',
    },
    notePalette: ['#ffffff', '#faf9f7', '#f5f2ef', '#ffffff', '#faf9f7'],
  },
  {
    id: 'stage-noir',
    label: '스테이지 누아르',
    subtitle: 'Lamborghini 감성',
    description: '트루 블랙 · 골드 액센트 · 제로 보더레디우스 · 대문자 타이포',
    theme: {
      primary: '#FFC000',
      secondary: '#917300',
      bgPrimary: '#000000',
      bgSecondary: '#000000',
      textPrimary: '#ffffff',
      accent: '#FFC000',
      fontMain: 'Pretendard',
      fontNote: 'MaruBuri',
    },
    notePalette: ['#202020', '#181818', '#202020', '#181818', '#202020'],
  },
  {
    id: 'apple-cinema',
    label: '시네마틱 미니멀',
    subtitle: 'Apple 감성',
    description: '시네마틱 블랙&화이트 · 블루 액센트 · 타이트 타이포 · 프리미엄 섀도우',
    theme: {
      primary: '#0071e3',
      secondary: '#0066cc',
      bgPrimary: '#000000',
      bgSecondary: '#1d1d1f',
      textPrimary: '#ffffff',
      accent: '#0071e3',
      fontMain: 'Pretendard',
      fontNote: 'Pretendard',
    },
    notePalette: ['#272729', '#262628', '#28282a', '#2a2a2d', '#242426'],
  },
  {
    id: 'airbnb-warmth',
    label: '웜 코랄',
    subtitle: 'Airbnb 감성',
    description: '코랄 핑크 액센트 · 따뜻한 화이트 · 라운드 카드 · 사진 중심 디자인',
    theme: {
      primary: '#ff385c',
      secondary: '#e00b41',
      bgPrimary: '#ffffff',
      bgSecondary: '#ffffff',
      textPrimary: '#222222',
      accent: '#ff385c',
      fontMain: 'Pretendard',
      fontNote: 'Pretendard',
    },
    notePalette: ['#ffffff', '#fff5f7', '#fef0f2', '#fff5f7', '#ffffff'],
  },
  {
    id: 'claude-editorial',
    label: '파치먼트 에디토리얼',
    subtitle: 'Claude 감성',
    description: '파치먼트 캔버스 · 테라코타 액센트 · 세리프 타이포 · 따뜻한 뉴트럴',
    theme: {
      primary: '#c96442',
      secondary: '#d97757',
      bgPrimary: '#f5f4ed',
      bgSecondary: '#faf9f5',
      textPrimary: '#141413',
      accent: '#c96442',
      fontMain: 'Pretendard',
      fontNote: 'Gowun Batang',
    },
    notePalette: ['#faf9f5', '#f5f4ed', '#f0eee6', '#faf9f5', '#f5f4ed'],
  },
  {
    id: 'mistral-golden',
    label: '골든 앰버',
    subtitle: 'Mistral AI 감성',
    description: '골든 앰버 · 오렌지 그래디언트 · 샤프 코너 · 유러피안 포멀리티',
    theme: {
      primary: '#fa520f',
      secondary: '#ff8a00',
      bgPrimary: '#fffaeb',
      bgSecondary: '#fff0c2',
      textPrimary: '#1f1f1f',
      accent: '#fa520f',
      fontMain: 'Pretendard',
      fontNote: 'Pretendard',
    },
    notePalette: ['#fffaeb', '#fff0c2', '#ffe295', '#fff0c2', '#fffaeb'],
  },
  {
    id: 'ollama-mono',
    label: '퓨어 모노크롬',
    subtitle: 'Ollama 감성',
    description: '순수 그레이스케일 · 필 버튼 · 제로 섀도우 · 극한 미니멀리즘',
    theme: {
      primary: '#000000',
      secondary: '#262626',
      bgPrimary: '#ffffff',
      bgSecondary: '#fafafa',
      textPrimary: '#000000',
      accent: '#000000',
      fontMain: 'Pretendard',
      fontNote: 'Pretendard',
    },
    notePalette: ['#ffffff', '#fafafa', '#f5f5f5', '#fafafa', '#ffffff'],
  },
];

/** Default note palette when no preset is applied */
export const DEFAULT_NOTE_PALETTE = [
  '#FFF9B0', // 버터 옐로우
  '#FFC4C4', // 코랄 핑크
  '#C4F0FF', // 스카이 블루
  '#C4FFD6', // 민트 그린
  '#E2C4FF', // 라벤더
];

/** Get a preset by ID, returns undefined if not found */
export function getPresetById(id) {
  return DESIGN_PRESETS.find((p) => p.id === id);
}
