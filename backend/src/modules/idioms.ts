import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { validate } from '../middleware/validation'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load idioms data
const idiomsPath = path.join(__dirname, '../data/idioms.json')
const examQuestionsPath = path.join(__dirname, '../data/exam-questions.json')
const synonymPairsPath = path.join(__dirname, '../data/synonym-pairs.json')
let idioms: any[] = []
let examQuestions: any[] = []
let synonymPairs: any[] = []

function loadIdioms() {
  try {
    const data = fs.readFileSync(idiomsPath, 'utf-8')
    idioms = JSON.parse(data)
    const examData = fs.readFileSync(examQuestionsPath, 'utf-8')
    examQuestions = JSON.parse(examData)
    const synonymData = fs.readFileSync(synonymPairsPath, 'utf-8')
    synonymPairs = JSON.parse(synonymData)
    console.log(`Loaded ${idioms.length} idioms, ${examQuestions.length} exam questions, ${synonymPairs.length} synonym pairs`)
  } catch (error) {
    console.error('Failed to load idioms data:', error)
    idioms = []
  }
}

// Load on startup
loadIdioms()

export const idiomsRouter = Router()

// ============================================
// POST /api/idioms/list - Paginated list
// ============================================
const listSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  category: z.string().optional(),
  difficulty: z.number().int().min(1).max(3).optional(),
  firstLetter: z.string().length(1).optional(),
  sortBy: z.enum(['id', 'name', 'pinyin', 'difficulty']).default('id'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

idiomsRouter.post('/list', validate(listSchema), async (req: Request, res: Response) => {
  const { page, pageSize, category, difficulty, firstLetter, sortBy, sortOrder } = req.body

  // Filter
  let filtered = [...idioms]
  if (category) {
    filtered = filtered.filter(i => i.category === category)
  }
  if (difficulty) {
    filtered = filtered.filter(i => i.difficulty === difficulty)
  }
  if (firstLetter) {
    filtered = filtered.filter(i => i.firstLetter === firstLetter.toUpperCase())
  }

  // Sort
  filtered.sort((a, b) => {
    const aVal = a[sortBy] || ''
    const bVal = b[sortBy] || ''
    if (typeof aVal === 'string') {
      return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }
    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
  })

  // Paginate
  const total = filtered.length
  const totalPages = Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize
  const items = filtered.slice(start, start + pageSize)

  res.json({
    success: true,
    data: {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    },
  })
})

// ============================================
// POST /api/idioms/search - Search idioms
// ============================================
const searchSchema = z.object({
  keyword: z.string().min(1),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
})

idiomsRouter.post('/search', validate(searchSchema), async (req: Request, res: Response) => {
  const { keyword, page, pageSize } = req.body
  const kw = keyword.toLowerCase()

  const filtered = idioms.filter(i => {
    return (
      (i.name && i.name.includes(keyword)) ||
      (i.pinyin && i.pinyin.includes(kw)) ||
      (i.meaning && i.meaning.includes(keyword)) ||
      (i.abbr && i.abbr.includes(kw))
    )
  })

  const total = filtered.length
  const totalPages = Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize
  const items = filtered.slice(start, start + pageSize)

  res.json({
    success: true,
    data: {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    },
  })
})

// ============================================
// POST /api/idioms/detail - Get idiom detail
// ============================================
const detailSchema = z.object({
  id: z.number().int().min(1),
})

idiomsRouter.post('/detail', validate(detailSchema), async (req: Request, res: Response) => {
  const { id } = req.body
  const idx = idioms.findIndex(i => i.id === id)

  if (idx === -1) {
    res.status(404).json({
      success: false,
      error: 'Idiom not found',
    })
    return
  }

  const idiom = idioms[idx]
  // 返回下一个成语的 ID（循环到第一个）
  const nextIdx = (idx + 1) % idioms.length
  const nextId = idioms[nextIdx].id

  res.json({
    success: true,
    data: idiom,
    nextId,
  })
})

// ============================================
// POST /api/idioms/random - Get random daily idiom
// ============================================
idiomsRouter.post('/random', async (_req: Request, res: Response) => {
  const randomIndex = Math.floor(Math.random() * idioms.length)
  const idiom = idioms[randomIndex]

  res.json({
    success: true,
    data: idiom,
  })
})

// ============================================
// POST /api/idioms/categories - Get all categories
// ============================================
// PDF group order: maintain the exact sequence from 花生十三's textbook
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
  "\u201c说\u201d相关","\u201c演\u201d相关","\u201c听\u201d相关","\u201c写\u201d相关",
  "\u201c钱\u201d相关","\u201c心态\u201d相关","顾忌和无所顾忌","调查相关",
  "自我评价不当","近似成语","\u201c雕刻\u201d和\u201c绘画\u201d",
  "集中到一起","表明两者关系","对外界的反映","两者融合","作用下的结果",
  "动作","事物变化","表示包容","事情不顺利","需要积累的其他词语",
]

idiomsRouter.post('/categories', async (_req: Request, res: Response) => {
  const categories = [...new Set(idioms.map(i => i.category))]
  const categoryCounts = categories.map(cat => ({
    name: cat,
    count: idioms.filter(i => i.category === cat).length,
  }))

  // Sort by PDF group order
  const orderMap = new Map(PDF_GROUP_ORDER.map((g, i) => [g, i]))
  categoryCounts.sort((a, b) => {
    const aOrder = orderMap.get(a.name) ?? 999
    const bOrder = orderMap.get(b.name) ?? 999
    return aOrder - bOrder
  })

  res.json({
    success: true,
    data: {
      categories: categoryCounts,
      letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => ({
        letter: l,
        count: idioms.filter(i => i.firstLetter === l).length,
      })).filter(l => l.count > 0),
    },
  })
})

// ==========================================
// 真题闯关：从真题题库随机出题
// ==========================================
const quizQuestionSchema = z.object({
  count: z.number().min(1).max(30).default(10),
})

idiomsRouter.post('/quiz', validate(quizQuestionSchema), (req: Request, res: Response) => {
  const { count } = req.body

  if (examQuestions.length === 0) {
    return res.json({ success: false, message: '题库加载失败' })
  }

  // 从真题题库中随机选题
  const shuffled = [...examQuestions].sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, Math.min(count, shuffled.length))

  // 打乱每道题的选项顺序（但保持正确答案映射正确）
  const questions = selected.map((q: any) => {
    // 创建选项索引数组并打乱
    const indices = [0, 1, 2, 3]
    const shuffledIndices = [...indices].sort(() => Math.random() - 0.5)
    const shuffledOptions = shuffledIndices.map(i => q.options[i])
    const newAnswerIndex = shuffledIndices.findIndex(i => i === q.answer)

    // 从正确选项中提取成语/词语，匹配释义作为解析
    const correctWords = q.options[q.answer].split(/[\s,，、]+/)
    const analysis: { word: string; meaning: string }[] = []
    for (const word of correctWords) {
      if (word.length >= 2) {
        const matched = idioms.find(i => i.name === word)
        if (matched) {
          analysis.push({ word, meaning: matched.meaning })
        }
      }
    }

    return {
      stem: q.stem,
      options: shuffledOptions,
      correctIndex: newAnswerIndex,
      correctAnswer: q.options[q.answer],
      year: q.year || '',
      source: q.source || '',
      idioms: q.idioms || [],
      analysis: analysis.length > 0 ? analysis : undefined,
    }
  })

  res.json({
    success: true,
    data: { questions },
  })
})

// ==========================================
// POST /api/idioms/synonym-pair - 随机获取一组近义成语对比
// ==========================================
idiomsRouter.post('/synonym-pair', async (_req: Request, res: Response) => {
  if (synonymPairs.length === 0) {
    return res.json({ success: false, message: '近义成语数据加载失败' })
  }
  const randomIndex = Math.floor(Math.random() * synonymPairs.length)
  const pair = synonymPairs[randomIndex]
  res.json({
    success: true,
    data: pair,
  })
})
