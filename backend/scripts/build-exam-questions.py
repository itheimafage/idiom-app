#!/usr/bin/env python3
"""
花生成语800词 - 真题题库构建脚本
基于国考、省考、事业单位联考真实考点生成逻辑填空成语题目
"""
import json
import os
import sys

# 设置标准输出编码
sys.stdout.reconfigure(encoding='utf-8')

data_dir = os.path.join(os.path.dirname(__file__), '..', 'src', 'data')

# 读取已有题目
existing_path = os.path.join(data_dir, 'exam-questions.json')
existing = []
if os.path.exists(existing_path):
    with open(existing_path, 'r', encoding='utf-8') as f:
        existing = json.load(f)

# 新增题目以 JSON 数组形式存放在单独文件中
# 避免 Python 脚本中嵌中文引号的问题
new_questions_path = os.path.join(os.path.dirname(__file__), 'new-questions.json')
if os.path.exists(new_questions_path):
    with open(new_questions_path, 'r', encoding='utf-8') as f:
        new_qs = json.load(f)
    
    # 合并并去重
    existing_stems = {q['stem'] for q in existing}
    added = 0
    for q in new_qs:
        if q['stem'] not in existing_stems:
            existing.append(q)
            existing_stems.add(q['stem'])
            added += 1
    
    print(f"原有题目数: {len(existing) - added}")
    print(f"新增题目数: {added}")
    print(f"合并后总数: {len(existing)}")
    
    # 统计来源
    from collections import Counter
    sources = Counter()
    for q in existing:
        src = q.get('source', '未知')
        if '国考' in src:
            sources['国考'] += 1
        elif '事业单位' in src:
            sources['事业单位联考'] += 1
        elif '省考' in src:
            sources['省考'] += 1
        else:
            sources[src] += 1
    for k, v in sources.most_common():
        print(f"  {k}: {v}题")
    
    # 保存合并后的文件
    with open(existing_path, 'w', encoding='utf-8') as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)
    print(f"\n已保存至: {existing_path}")
else:
    print(f"未找到新增题目文件: {new_questions_path}")
    print("请先创建 new-questions.json")
