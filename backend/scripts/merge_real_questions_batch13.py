#!/usr/bin/env python3
"""第十三批真题合并 - 2025年10月事业单位联考B类+C类新增"""

import json, os

batch13 = [
    # ========== 2025年10月事业单位联考B类（21-30题答案: C A B D B A B A D C） ==========
    # 新增独有的（与A类不重复的）
    {"stem": "在文学作品中，常有________的文字游乐现象，甚至形成了特殊的文学样式。比如，汉语中的字联、字谜、回文诗、离合诗等，都是中国特有的与汉字游戏相关的文学形式，散发着中华文化的芳香。", "options": ["出其不意", "过目难忘", "别出心裁", "标新立异"], "answer": 2, "year": "2025", "source": "事业单位联考"},
    {"stem": "人形机器人跑「半马」，腿部关节、传动部件在持续的高强度运动中会承受巨大的压力。赛道上，机器人因轴承过热、连杆磨损而摔倒的情况此起彼伏，有的甚至摔得「头身分离」，现场的技术工程师们对此却________。因为只有让它们在真实、复杂的环境中长距离奔跑，才能够充分暴露存在的技术问题，进而倒逼技术创新。", "options": ["见怪不怪", "岿然不动", "众口一词", "默不作声"], "answer": 0, "year": "2025", "source": "事业单位联考"},
    {"stem": "某些植物种子迎风而起、随风而落，________的模式其实历经千万年的自然选择演化——能在无主动驱动力的情况下「与风同行」几公里甚至更远的距离，其中包含着特殊的几何结构与________的力学设计。", "options": ["单一 合理", "简单 精妙", "便捷 神奇", "悠久 完美"], "answer": 1, "year": "2025", "source": "事业单位联考"},
    {"stem": "人力资源社会保障部2024年发布了19个新职业。绿色，是这一批新职业的一大「________」，这些新职业不少源于经济转型和绿色低碳发展的新需要。职业「上新」是社会分工________的体现，有助于推动产业向专业化发展。新职业也为求职者提供了更丰富的就业选择，将吸引更多人才涌入，提升就业市场________。", "options": ["方向 规模化 满意度", "图景 多元化 适配度", "亮点 成熟化 透明度", "标签 精细化 活跃度"], "answer": 3, "year": "2025", "source": "事业单位联考"},
    {"stem": "患者在评价自身的就医体验时，可能并不总是那么________，有时候欠缺专业，甚至难免夹杂着情绪。患者基于________就医体验而发出的抱怨、吐槽乃至于批评，医院应该认真倾听，应抱着有则改之、无则加勉的态度对待各方的声音。即便是一些比较激烈的言辞，只要没有越过法律和道德的底线，也要有倾听的________，这有利于把风险隐患消除于萌芽之中，缓解医患矛盾。", "options": ["理性 真实 雅量", "准确 普遍 胸襟", "清楚 客观 风范", "完整 具体 姿态"], "answer": 0, "year": "2025", "source": "事业单位联考"},

    # ========== 2025年10月事业单位联考C类（21-35题答案）新增独有的 ==========
    {"stem": "生成式AI降低了标题党、「擦边」内容的制作门槛，但技术的加持让AI谣言更具「说服力」、________和强传播性，这使得传统辟谣手段________。可以说，部分生成式AI正在重塑谣言的传播生态，并严重扰乱网络环境。", "options": ["伪装性 难以招架", "普及性 趋于崩溃", "迷惑性 风光不再", "逻辑性 面临危机"], "answer": 0, "year": "2025", "source": "事业单位联考"},
    {"stem": "车联网具有「五危一体」的安全特性，即与人身安全强相关、风险范围异常广泛、数据庞大流通难控、智能联网监督难管、多网融合风险蔓延等特性。有别于传统网络安全「附加性」「________」的技术定位，车联网的安全技术应该处于关键且________的地位。目前，该领域还面临固有网络安全模式风险防范能力不足、法律界定存在真空地带等诸多挑战。", "options": ["防微杜渐 独立", "刻舟求剑 中心", "亡羊补牢 前置", "不拘一格 领先"], "answer": 2, "year": "2025", "source": "事业单位联考"},
]

def main():
    json_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'data', 'exam-questions.json')
    with open(json_path, 'r', encoding='utf-8') as f:
        existing = json.load(f)
    print(f"当前: {len(existing)}")
    existing_stems = set(q['stem'].strip()[:60] for q in existing)
    new_count = 0
    for q in batch13:
        if q['stem'].strip()[:60] not in existing_stems:
            existing.append(q)
            existing_stems.add(q['stem'].strip()[:60])
            new_count += 1
    print(f"新增: {new_count}, 总计: {len(existing)}")
    sources = {}
    for q in existing:
        s = q.get('source', 'unknown')
        sources[s] = sources.get(s, 0) + 1
    for k, v in sorted(sources.items(), key=lambda x: -x[1]):
        print(f"  {k}: {v}")
    years = {}
    for q in existing:
        y = q.get('year', 'unknown')
        years[y] = years.get(y, 0) + 1
    for y in sorted(years.keys()):
        print(f"  {y}: {years[y]}")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)
    print("已保存!")

if __name__ == '__main__':
    main()
