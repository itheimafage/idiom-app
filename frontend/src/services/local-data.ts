import idiomsData from '../data/idioms.json';
import examQuestionsData from '../data/exam-questions.json';
import synonymPairsData from '../data/synonym-pairs.json';

const idioms: any[] = idiomsData;
const examQuestions: any[] = examQuestionsData;
const synonymPairs: any[] = synonymPairsData;

// PDF group order
const PDF_GROUP_ORDER = [
  "中华文明传统文化","文化传承","改革创新","做法、构思创新","守旧不创新",
  "按规矩办事","处境困难","形势危险","事物出现、发展、衰落","竞争比较",
  "能力不足","印象和效果","搭档配合","工作开展顺序","错误抉择和方向",
  "错误做法（寓言故事）","教育影响批评","工作学习状态","正确做法","错误做法",
  "某些国家的错误做法","国家安定与动荡","国际国内关系","政府优秀做法",
  "合理规划","政策措施的评价","成功与失败","领导力","正义精神和做法",
  "干部易犯错误","对待错误的态度","改变与不变","顺势造势","自然会发生",
  "提早准备和补救","办公、管理相关","空谈与虚幻","来者众多","人多人少",
  "好坏掺杂","流行与名声","与传播、传闻相关","与消失、重现相关",
  "明显、含糊相关","重视、重要相关","熟悉、了解、知晓相关","很常见不奇怪",
  "看法一致与否","从细节看全貌","看事情透彻","对事情的态度与评价",
  "数量多与少","建筑相关","相同与不同","技艺精湛","与观看欣赏相关",
  "\"说\"相关","\"演\"相关","\"听\"相关","\"写\"相关",
  "\"钱\"相关","\"心态\"相关","顾忌和无所顾忌","调查相关",
  "自我评价不当","近似成语","\"雕刻\"和\"绘画\"",
  "集中到一起","表明两者关系","对外界的反映","两者融合","作用下的结果",
  "动作","事物变化","表示包容","事情不顺利","需要积累的其他词语",
];

// 成语列表（分页）
export function getList(params: { page: number; pageSize: number; category?: string; difficulty?: number; firstLetter?: string; sortBy?: string; sortOrder?: string }) {
  const { page, pageSize, category, difficulty, firstLetter, sortBy = 'id', sortOrder = 'asc' } = params;
  let filtered = [...idioms];
  if (category) filtered = filtered.filter(i => i.category === category);
  if (difficulty) filtered = filtered.filter(i => i.difficulty === difficulty);
  if (firstLetter) filtered = filtered.filter(i => i.firstLetter === firstLetter.toUpperCase());

  filtered.sort((a: any, b: any) => {
    const aVal = a[sortBy] || '';
    const bVal = b[sortBy] || '';
    if (typeof aVal === 'string') return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return { items, pagination: { page, pageSize, total, totalPages, hasMore: page < totalPages } };
}

// 搜索
export function search(params: { keyword: string; page: number; pageSize: number }) {
  const { keyword, page, pageSize } = params;
  const kw = keyword.toLowerCase();
  const filtered = idioms.filter((i: any) =>
    (i.name && i.name.includes(keyword)) ||
    (i.pinyin && i.pinyin.includes(kw)) ||
    (i.meaning && i.meaning.includes(keyword)) ||
    (i.abbr && i.abbr.includes(kw))
  );
  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  return { items: filtered.slice(start, start + pageSize), pagination: { page, pageSize, total, totalPages, hasMore: page < totalPages } };
}

// 详情
export function getDetail(id: number) {
  const idx = idioms.findIndex((i: any) => i.id === id);
  if (idx === -1) return null;
  const nextIdx = (idx + 1) % idioms.length;
  return { data: idioms[idx], nextId: idioms[nextIdx].id };
}

// 随机
export function getRandom() {
  const idx = Math.floor(Math.random() * idioms.length);
  return idioms[idx];
}

// 分类
export function getCategories() {
  const categories = [...new Set(idioms.map((i: any) => i.category))];
  const categoryCounts = categories.map(cat => ({
    name: cat,
    count: idioms.filter((i: any) => i.category === cat).length,
  }));
  const orderMap = new Map(PDF_GROUP_ORDER.map((g, i) => [g, i]));
  categoryCounts.sort((a, b) => {
    const aOrder = orderMap.get(a.name) ?? 999;
    const bOrder = orderMap.get(b.name) ?? 999;
    return aOrder - bOrder;
  });
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => ({
    letter: l,
    count: idioms.filter((i: any) => i.firstLetter === l).length,
  })).filter(l => l.count > 0);
  return { categories: categoryCounts, letters };
}

// 闯关
export function getQuiz(count: number = 10) {
  const shuffled = [...examQuestions].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));
  const questions = selected.map((q: any) => {
    const indices = [0, 1, 2, 3];
    const shuffledIndices = [...indices].sort(() => Math.random() - 0.5);
    const shuffledOptions = shuffledIndices.map(i => q.options[i]);
    const newAnswerIndex = shuffledIndices.findIndex(i => i === q.answer);
    const correctWords = q.options[q.answer].split(/[\s,，、]+/);
    const analysis: { word: string; meaning: string }[] = [];
    for (const word of correctWords) {
      if (word.length >= 2) {
        const matched = idioms.find((i: any) => i.name === word);
        if (matched) analysis.push({ word, meaning: matched.meaning });
      }
    }
    return {
      stem: q.stem, options: shuffledOptions, correctIndex: newAnswerIndex,
      correctAnswer: q.options[q.answer], year: q.year || '', source: q.source || '',
      idioms: q.idioms || [], analysis: analysis.length > 0 ? analysis : undefined,
    };
  });
  return questions;
}

// 近义成语
export function getSynonymPair() {
  const idx = Math.floor(Math.random() * synonymPairs.length);
  return synonymPairs[idx];
}
