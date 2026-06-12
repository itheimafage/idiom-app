import { Component } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { AtButton } from 'taro-ui';
import { apiClient } from '../../services/api-client';
import './index.scss';

interface IdiomInfo {
  id: number;
  name: string;
  pinyin: string;
  meaning: string;
  category: string;
}

interface AnalysisItem {
  word: string;
  meaning: string;
}

interface Question {
  stem: string;
  options: string[];
  correctIndex: number;
  correctAnswer: string;
  year: string;
  source: string;
  idioms: string[];
  analysis?: AnalysisItem[];
}

interface State {
  questions: Question[];
  currentIndex: number;
  phase: 'loading' | 'ready' | 'playing' | 'result';
  score: number;
  wrongIds: number[];
  selectedOption: number | null;
  showResult: boolean; // 单题答完显示结果
  combo: number; // 连对计数
  maxCombo: number;
  totalQuestions: number;
}

class Quiz extends Component<{}, State> {
  state: State = {
    questions: [],
    currentIndex: 0,
    phase: 'loading',
    score: 0,
    wrongIds: [],
    selectedOption: null,
    showResult: false,
    combo: 0,
    maxCombo: 0,
    totalQuestions: 10,
  };

  async componentDidMount() {
    await this.loadQuestions();
  }

  loadQuestions = async () => {
    try {
      const res = await apiClient.post<{ success: boolean; data: { questions: Question[] } }>(
        '/api/idioms/quiz',
        { count: this.state.totalQuestions }
      );
      if (res.success && res.data.questions.length > 0) {
        this.setState({ questions: res.data.questions, phase: 'ready' });
      } else {
        Taro.showToast({ title: '出题失败', icon: 'none' });
      }
    } catch (e) {
      console.error('Failed to load quiz:', e);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    }
  };

  startQuiz = () => {
    this.setState({ phase: 'playing' });
  };

  handleAnswer = (optionIndex: number) => {
    const { questions, currentIndex, showResult } = this.state;
    if (showResult) return;

    const q = questions[currentIndex];
    const isCorrect = optionIndex === q.correctIndex;

    if (isCorrect) {
      const newCombo = this.state.combo + 1;
      this.setState(prev => ({
        score: prev.score + 10 + Math.floor(newCombo / 3) * 5, // 连对3题以上加分
        combo: newCombo,
        maxCombo: Math.max(prev.maxCombo, newCombo),
        showResult: true,
        selectedOption: optionIndex,
      }));
    } else {
      this.setState(prev => ({
        wrongIds: [...prev.wrongIds, currentIndex],
        combo: 0,
        showResult: true,
        selectedOption: optionIndex,
      }));
    }
  };

  nextQuestion = () => {
    const { currentIndex, questions, wrongIds } = this.state;
    if (currentIndex + 1 >= questions.length) {
      this.saveResult(wrongIds);
      this.setState({ phase: 'result' });
    } else {
      this.setState({
        currentIndex: currentIndex + 1,
        selectedOption: null,
        showResult: false,
      });
    }
  };

  saveResult = (wrongIds: number[]) => {
    try {
      const { questions } = this.state;
      // 保存错题到错题本
      const wrongItems: any[] = Taro.getStorageSync('wrongbook_items') || [];
      wrongIds.forEach(idx => {
        const q = questions[idx];
        if (q) {
          wrongItems.push({
            text: q.stem.slice(0, 50) + '...',
            answer: q.correctAnswer,
            source: `${q.year} ${q.source}`,
            date: new Date().toISOString().slice(0, 10),
            // 保存完整信息以支持重做
            fullStem: q.stem,
            options: q.options,
            correctIndex: q.correctIndex,
          });
        }
      });
      const seen = new Set<string>();
      const uniqueItems = wrongItems.filter((item: any) => {
        const key = item.text;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      Taro.setStorageSync('wrongbook_items', uniqueItems.slice(-50));

      const quizCount = Taro.getStorageSync('quiz_count') || 0;
      Taro.setStorageSync('quiz_count', quizCount + 1);

      const history: any[] = Taro.getStorageSync('quiz_history') || [];
      history.push({
        date: new Date().toISOString().slice(0, 10),
        score: this.state.score,
        total: this.state.totalQuestions,
        correct: this.state.totalQuestions - wrongIds.length,
        wrong: wrongIds.length,
        maxCombo: this.state.maxCombo,
        wrongIds: [],
        timestamp: Date.now(),
      });
      if (history.length > 30) history.splice(0, history.length - 30);
      Taro.setStorageSync('quiz_history', history);

      // 通知其他页面数据已更新
      Taro.eventCenter.trigger('quizDataUpdated');
    } catch (e) {
      // ignore
    }
  };

  restart = () => {
    this.setState({
      questions: [],
      currentIndex: 0,
      phase: 'loading',
      score: 0,
      wrongIds: [],
      selectedOption: null,
      showResult: false,
      combo: 0,
      maxCombo: 0,
    });
    this.loadQuestions();
  };

  goHome = () => Taro.navigateBack();
  goToWrongBook = () => Taro.navigateTo({ url: '/pages/wrongbook/index' });

  render() {
    const { questions, currentIndex, phase, score, selectedOption, showResult, combo, maxCombo, totalQuestions, wrongIds } = this.state;

    // 加载中
    if (phase === 'loading') {
      return (
        <View className="quiz-loading">
          <View className="loading-ring" />
          <Text className="loading-text">正在生成真题...</Text>
        </View>
      );
    }

    // 准备开始
    if (phase === 'ready') {
      return (
        <View className="quiz-ready">
          <View className="ready-hero">
            <Text className="ready-icon">🏆</Text>
            <Text className="ready-title">成语闯关</Text>
            <Text className="ready-subtitle">国考 · 省考 · 事业单位联考真题</Text>
          </View>
          <View className="ready-info">
            <View className="ready-stat">
              <Text className="ready-stat-num">{totalQuestions}</Text>
              <Text className="ready-stat-label">题目数量</Text>
            </View>
            <View className="ready-stat">
              <Text className="ready-stat-num">ABCD</Text>
              <Text className="ready-stat-label">四选一</Text>
            </View>
            <View className="ready-stat">
              <Text className="ready-stat-num">+5</Text>
              <Text className="ready-stat-label">连对加分</Text>
            </View>
          </View>
          <View className="ready-rules">
            <Text className="rules-title">闯关规则</Text>
            <Text className="rules-item">1. 每题10分，从四个成语中选最合适的</Text>
            <Text className="rules-item">2. 连续答对3题以上，每题额外+5分</Text>
            <Text className="rules-item">3. 答错不扣分，连对中断重新计数</Text>
          </View>
          <View className="ready-start">
            <AtButton
              type="primary"
              customStyle={{
                background: 'linear-gradient(135deg, #E67E22, #D35400)',
                border: 'none',
                borderRadius: '20px',
                height: '96px',
                lineHeight: '96px',
                fontSize: '34px',
                fontWeight: '800',
                letterSpacing: '4px',
                boxShadow: '0 8px 24px rgba(211, 84, 0, 0.3)',
              }}
              onClick={this.startQuiz}
            >
              开始闯关
            </AtButton>
          </View>
        </View>
      );
    }

    // 结果页
    if (phase === 'result') {
      const correctCount = totalQuestions - wrongIds.length;
      const passRate = Math.round((correctCount / totalQuestions) * 100);
      const isPerfect = correctCount === totalQuestions;

      return (
        <ScrollView className="quiz-result" scrollY>
          <View className="result-hero">
            <Text className="result-icon-text">{isPerfect ? '👑' : passRate >= 80 ? '🎉' : passRate >= 60 ? '💪' : '📚'}</Text>
            <Text className="result-score">{score} 分</Text>
            <Text className="result-rank">
              {isPerfect ? '完美通关！' : passRate >= 80 ? '优秀！' : passRate >= 60 ? '继续加油！' : '多多练习！'}
            </Text>
            <Text className="result-combo">最高连对: {maxCombo} 题</Text>
          </View>

          <View className="result-stats">
            <View className="stat-item">
              <Text className="stat-num correct">{correctCount}</Text>
              <Text className="stat-label">答对</Text>
            </View>
            <View className="stat-divider" />
            <View className="stat-item">
              <Text className="stat-num wrong">{wrongIds.length}</Text>
              <Text className="stat-label">答错</Text>
            </View>
            <View className="stat-divider" />
            <View className="stat-item">
              <Text className="stat-num rate">{passRate}%</Text>
              <Text className="stat-label">正确率</Text>
            </View>
          </View>

          {wrongIds.length > 0 && (
            <View className="result-wrong-section">
              <Text className="wrong-section-title">错题回顾</Text>
              {wrongIds.map((idx) => {
                const q = questions[idx];
                if (!q) return null;
                return (
                  <View key={idx} className="wrong-item">
                    <View className="wrong-item-header">
                      <Text className="wrong-item-name">{q.correctAnswer}</Text>
                      <Text className="wrong-item-cat">{q.year} {q.source}</Text>
                    </View>
                    <Text className="wrong-item-meaning">{q.stem.slice(0, 60)}...</Text>
                  </View>
                );
              })}
            </View>
          )}

          <View className="result-actions">
            {wrongIds.length > 0 && (
              <AtButton
                type="primary"
                customStyle={{
                  background: '#FFFFFF',
                  color: '#E74C3C',
                  border: '1px solid #FFCDD2',
                  borderRadius: '16px',
                  height: '88px',
                  lineHeight: '88px',
                  fontSize: '30px',
                  fontWeight: '700',
                  marginBottom: '16px',
                }}
                onClick={this.goToWrongBook}
              >
                查看错题本 ({wrongIds.length})
              </AtButton>
            )}
            <AtButton
              type="primary"
              customStyle={{
                background: 'linear-gradient(135deg, #E67E22, #D35400)',
                border: 'none',
                borderRadius: '16px',
                height: '88px',
                lineHeight: '88px',
                fontSize: '30px',
                fontWeight: '700',
                marginBottom: '16px',
              }}
              onClick={this.restart}
            >
              再来一关
            </AtButton>
            <AtButton
              customStyle={{
                background: '#FFF5EB',
                color: '#D35400',
                border: '1px solid #FDEBD0',
                borderRadius: '16px',
                height: '88px',
                lineHeight: '88px',
                fontSize: '28px',
              }}
              onClick={this.goHome}
            >
              返回首页
            </AtButton>
          </View>
        </ScrollView>
      );
    }

    // 答题中
    const q = questions[currentIndex];

    return (
      <View className="quiz-container">
        {/* 顶部信息栏 */}
        <View className="quiz-topbar">
          <View className="topbar-left">
            <Text className="topbar-progress">第 {currentIndex + 1}/{totalQuestions} 题</Text>
            <View className="topbar-bar">
              <View className="topbar-fill" style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }} />
            </View>
          </View>
          <View className="topbar-right">
            <Text className="topbar-score">{score}分</Text>
            {combo >= 3 && (
              <View className="topbar-combo">
                <Text>🔥连对{combo}</Text>
              </View>
            )}
          </View>
        </View>

        {/* 题干 */}
        <ScrollView className="quiz-content" scrollY>
          <View className="question-card">
            <View className="question-badge">
              <Text>{q.year} {q.source} · 真题</Text>
            </View>
            <Text className="question-stem">{q.stem}</Text>

            {/* 选项 */}
            <View className="question-options">
              {q.options.map((opt, idx) => {
                let cls = 'option-item';
                if (showResult) {
                  if (idx === q.correctIndex) cls += ' correct';
                  else if (idx === selectedOption) cls += ' wrong';
                }
                return (
                  <View key={idx} className={cls} onClick={() => this.handleAnswer(idx)}>
                    <View className="option-letter">
                      <Text>{String.fromCharCode(65 + idx)}</Text>
                    </View>
                    <Text className="option-text">{opt}</Text>
                    {showResult && idx === q.correctIndex && <Text className="option-mark">✓</Text>}
                    {showResult && idx === selectedOption && idx !== q.correctIndex && <Text className="option-mark">✗</Text>}
                  </View>
                );
              })}
            </View>

            {/* 答完后的解析 */}
            {showResult && (
              <View className="question-analysis">
                <View className="analysis-header">
                  <Text className="analysis-icon">{selectedOption === q.correctIndex ? '✅' : '❌'}</Text>
                  <Text className="analysis-result">
                    {selectedOption === q.correctIndex ? '回答正确！' : '回答错误'}
                  </Text>
                </View>
                <View className="analysis-detail">
                  <Text className="analysis-label">正确答案：</Text>
                  <Text className="analysis-answer">{q.correctAnswer}</Text>
                </View>
                {q.analysis && q.analysis.length > 0 && (
                  <View className="analysis-idioms-section">
                    <Text className="analysis-idioms-title">成语释义</Text>
                    {q.analysis.map((item, i) => (
                      <View key={i} className="analysis-idiom-item">
                        <Text className="idiom-word">{item.word}</Text>
                        <Text className="idiom-meaning">{item.meaning}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <View className="analysis-source">
                  <Text className="analysis-label">题目来源：</Text>
                  <Text className="analysis-text">{q.year} {q.source}真题</Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* 下一题按钮 */}
        {showResult && (
          <View className="quiz-bottom">
            <AtButton
              type="primary"
              customStyle={{
                background: 'linear-gradient(135deg, #E67E22, #D35400)',
                border: 'none',
                borderRadius: '16px',
                height: '80px',
                lineHeight: '80px',
                fontSize: '30px',
                fontWeight: '700',
              }}
              onClick={this.nextQuestion}
            >
              {currentIndex + 1 >= totalQuestions ? '查看战绩' : '下一题 ›'}
            </AtButton>
          </View>
        )}
      </View>
    );
  }
}

export default Quiz;
