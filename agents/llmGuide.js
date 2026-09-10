/**
 * LLM 引路生成器
 * 用 LLM 为任意话题动态生成定制化学习路径，输出格式与模板模式完全对齐
 */
const llm = require('../lib/llmClient');

const SYSTEM_PROMPT = `你是一位资深的学习路径规划师，同时也是知乎社区的资深答主。
你擅长为刚进入新领域的新人（学生、职场新人、转行人士）制定可执行、可落地的学习计划。
你的风格：务实、具体、不说空话，每个建议都有明确的动作和判断标准。
你输出的内容会被直接渲染到网页上，所以语言要简洁有力，适合阅读。`;

/**
 * 生成完整的引路结果
 * @param {string} topic - 用户输入的话题
 * @param {Object} opts - {audience: 'student'|'professional'|'both'}
 * @returns {Promise<Object>} 与模板模式格式一致的 result
 */
async function generateGuide(topic, opts = {}) {
  const audience = opts.audience || 'both';
  const audienceDesc = {
    student: '主要面向在校学生（时间相对充裕，预算有限，注重考试/升学/技能积累）',
    professional: '主要面向职场新人/转行人士（时间碎片化，注重快速上手、职场应用、投入产出比）',
    both: '同时面向学生和职场新人，内容要兼顾两类人群的需求',
  }[audience];

  const userPrompt = `请为话题「${topic}」生成一份完整的新人学习引路内容。${audienceDesc}。

要求输出严格的 JSON，结构如下（不要输出任何 JSON 之外的文字）：

{
  "materials": {
    "sources": [
      {"title": "资料标题", "author": "作者/来源", "type": "文章/书籍/课程/工具", "reason": "为什么推荐这个资料", "url": ""}
    ],
    "hotTopics": [
      {"rank": 1, "title": "热点标题", "heat": "热度描述", "type": "话题类型", "tag": "热点", "audience": "student/professional/both"}
    ]
  },
  "comparison": {
    "summary": "这个领域的核心争议一句话总结",
    "debates": [
      {
        "topic": "争议话题",
        "sides": [
          {"name": "A派名称", "view": "核心观点", "reason": "理由", "source": "来源/代表"},
          {"name": "B派名称", "view": "核心观点", "reason": "理由", "source": "来源/代表"}
        ],
        "consensus": "双方共识",
        "guidance": "引路人建议：新人应该怎么选"
      }
    ]
  },
  "curated": {
    "stages": [
      {
        "title": "阶段标题",
        "goal": "这个阶段要达到什么目标",
        "actions": ["具体行动1", "具体行动2"],
        "pitfalls": ["避坑1", "避坑2"],
        "milestone": "完成标志",
        "timeHint": "建议用时",
        "skills": ["技能标签1", "技能标签2"]
      }
    ],
    "concepts": [
      {"name": "概念名", "desc": "解释", "example": "一句话例子"}
    ],
    "flashcards": [
      {"type": "concept/action/pitfall/decision", "front": "正面问题", "back": "背面答案"}
    ],
    "timePlan": [
      {"phase": "阶段名", "duration": "时长", "focus": "重点"}
    ]
  }
}

具体要求：
- sources：5-8 条，优先推荐知乎上的优质内容、经典书籍、免费课程、实用工具
- hotTopics：5-8 条，模拟知乎热榜上这个领域的热门话题，热度用"X万热度"格式
- debates：2-3 组，必须是这个领域真实存在的核心分歧，不要编造
- stages：3-4 个阶段，从入门到能独立上手，actions 要具体可执行（不要写"多练习"这种空话），pitfalls 是新人最容易踩的坑
- concepts：5-8 个，是这个领域必须理解的核心概念，example 要用生活化的类比
- flashcards：15-20 张，四类都要有，concept 类考概念定义，action 类考具体怎么做，pitfall 类考避坑，decision 类考场景判断
- timePlan：与 stages 对应，给出整体时间规划
- 所有内容用中文，语言简洁有力，适合网页阅读
- url 字段如果没有确切链接就留空字符串`;

  const cacheKey = `llm_guide_${topic}_${audience}`;
  const t0 = Date.now();

  // 检查缓存
  const cached = require('../lib/cache').get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // 用流式生成（避免 Cloudflare 524 超时），累积完整内容后解析 JSON
  let fullContent = '';
  let lastProgress = 0;
  const onProgress = opts.onProgress;
  await llm.chatStream(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    (chunk) => {
      fullContent += chunk;
      // 每生成约 500 字符推送一次进度
      if (onProgress && fullContent.length - lastProgress > 500) {
        lastProgress = fullContent.length;
        const percent = Math.min(95, Math.round(fullContent.length / 4000 * 100));
        onProgress(`知识梳理官：AI 正在生成学习路径… 已完成约 ${percent}%`);
      }
    },
    { temperature: 0.8, maxTokens: 4096 }
  );

  // 解析 JSON
  let raw;
  try {
    let cleaned = fullContent.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    }
    raw = JSON.parse(cleaned);
  } catch (e) {
    // 尝试提取第一个 JSON 对象
    const match = fullContent.match(/\{[\s\S]*\}/);
    if (match) {
      raw = JSON.parse(match[0]);
    } else {
      throw new Error(`LLM_JSON_PARSE_FAILED: ${e.message}. Content: ${fullContent.slice(0, 500)}`);
    }
  }

  // 写入缓存
  require('../lib/cache').set(cacheKey, JSON.stringify(raw), 3600);

  // timePlan 数组转字符串（对齐模板模式）
  let timePlanStr = '';
  if (Array.isArray(raw.curated?.timePlan) && raw.curated.timePlan.length) {
    timePlanStr = raw.curated.timePlan.map((p) => `${p.phase}（${p.duration}）：${p.focus}`).join(' → ');
  }

  // 补全 meta 信息，输出结构与模板模式完全对齐
  return {
    meta: {
      topic,
      scenarioId: 'llm-custom',
      scenarioName: `AI 定制 · ${topic}`,
      live: true,
      llmGenerated: true,
      audience,
      elapsedMs: Date.now() - t0,
      generatedAt: new Date().toISOString(),
    },
    materials: raw.materials || { sources: [], hotTopics: [] },
    comparison: raw.comparison || { summary: '', debates: [] },
    studyPlan: {
      stages: raw.curated?.stages || [],
      concepts: raw.curated?.concepts || [],
      flashcards: raw.curated?.flashcards || [],
      timePlan: timePlanStr,
    },
  };
}

/**
 * 追问回答
 * @param {string} topic - 当前话题
 * @param {string} question - 用户的追问
 * @param {Object} context - 当前引路结果的摘要（stages 标题、concepts 名称等）
 * @returns {Promise<string>} 回答文本（支持 markdown）
 */
async function askFollowup(topic, question, context = {}) {
  const contextSummary = [];
  if (context.stages?.length) {
    contextSummary.push(`当前学习路径的阶段：${context.stages.map((s, i) => `${i + 1}.${s.title}`).join('；')}`);
  }
  if (context.concepts?.length) {
    contextSummary.push(`已涉及的核心概念：${context.concepts.map(c => c.name).join('、')}`);
  }
  if (context.debates?.length) {
    contextSummary.push(`已讨论的争议：${context.debates.map(d => d.topic).join('；')}`);
  }

  const systemPrompt = `你是「知遇」的 AI 引路人，正在为用户关于「${topic}」的学习路径提供追问解答。
${contextSummary.length ? '上下文：' + contextSummary.join('。') + '。' : ''}
你的回答要：
1. 直接回答问题，不说废话
2. 具体、可执行，给出明确的步骤或判断标准
3. 如果问题与当前学习路径相关，结合上下文回答
4. 用简洁的中文，适当用 markdown 格式（列表、加粗）
5. 回答控制在 300 字以内，除非问题确实需要展开`;

  return await llm.chat(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
    {
      temperature: 0.7,
      maxTokens: 1024,
      cacheKey: `llm_ask_${topic}_${question}`,
    }
  );
}

module.exports = {
  generateGuide,
  askFollowup,
};
