import { Component } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { AtButton } from 'taro-ui';
import { apiClient } from '../../services/api-client';
import './index.scss';

interface QuizRecord {
  date: string;
  score: number;
  total: number;
  correct: number;
  wrong: number;
  wrongIds: number[];
  timestamp: number;
}

interface CategoryStat {
  name: string;
  wrongCount: number;
}

interface State {
  quizHistory: QuizRecord[];
  learnedCount: number;
  totalCount: number;
  wrongCount: number;
  studyDays: number;
  consecutiveDays: number;
  avgScore: number;
  bestScore: number;
  totalQuizzes: number;
  weakCategories: CategoryStat[];
  loading: boolean;
}

class Analytics extends Component<{}, State> {
  state: State = {
    quizHistory: [],
    learnedCount: 0,
    totalCount: 805,
    wrongCount: 0,
    studyDays: 0,
    consecutiveDays: 0,
    avgScore: 0,
    bestScore: 0,
    totalQuizzes: 0,
    weakCategories: [],
    loading: true,
  };

  async componentDidMount() {
    await this.loadData();
    // 监听闯关数据更新事件
    Taro.eventCenter.on('quizDataUpdated', this.loadData);
  }

  componentWillUnmount() {
    Taro.eventCenter.off('quizDataUpdated', this.loadData);
  }

  componentDidShow() {
    this.loadData();
  }

  loadData = async () => {
    try {
      const learned: number[] = Taro.getStorageSync('learned_ids') || [];
      const wrongbook: any[] = Taro.getStorageSync('wrongbook_items') || [];
      const history: QuizRecord[] = Taro.getStorageSync('quiz_history') || [];
      const quizCount = Taro.getStorageSync('quiz_count') || 0;

      // 计算测验统计
      let avgScore = 0;
      let bestScore = 0;
      if (history.length > 0) {
        avgScore = Math.round(history.reduce((sum, r) => sum + r.score, 0) / history.length);
        bestScore = Math.max(...history.map(r => r.score));
      }

      // 计算学习天数
      const allDates = new Set<string>();
      history.forEach(r => allDates.add(r.date));
      // 已学操作的日期也计入
      const learnedDates: string[] = Taro.getStorageSync('learned_dates') || [];
      learnedDates.forEach((d: string) => allDates.add(d));

      const studyDays = allDates.size;

      // 计算连续学习天数
      let consecutiveDays = 0;
      if (allDates.size > 0) {
        const sortedDates = [...allDates].sort().reverse();
        const today = new Date().toISOString().slice(0, 10);
        let checkDate = new Date(today);

        for (let i = 0; i < 100; i++) {
          const dateStr = checkDate.toISOString().slice(0, 10);
          if (allDates.has(dateStr)) {
            consecutiveDays++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            if (i === 0) {
              // 今天还没学习，从昨天开始算
              checkDate.setDate(checkDate.getDate() - 1);
              continue;
            }
            break;
          }
        }
      }

      // 分析薄弱分类（简化：按来源统计）
      const weakCategories: CategoryStat[] = [];
      const sourceMap = new Map<string, number>();
      wrongbook.forEach((item: any) => {
        const src = item.source || '未知';
        sourceMap.set(src, (sourceMap.get(src) || 0) + 1);
      });
      sourceMap.forEach((count, name) => {
        weakCategories.push({ name, wrongCount: count });
      });
      weakCategories.sort((a, b) => b.wrongCount - a.wrongCount);

      this.setState({
        quizHistory: history,
        learnedCount: learned.length,
        wrongCount: wrongbook.length,
        studyDays,
        consecutiveDays,
        avgScore,
        bestScore,
        totalQuizzes: quizCount,
        weakCategories,
        loading: false,
      });
    } catch (e) {
      console.error('Failed to load analytics:', e);
      this.setState({ loading: false });
    }
  };

  analyzeWeakCategories = async (wrongIds: number[]): Promise<CategoryStat[]> => {
    if (wrongIds.length === 0) return [];

    try {
      const categoryMap = new Map<string, number>();
      for (const id of wrongIds) {
        const res = await apiClient.post<{ success: boolean; data: { category: string } }>(
          '/api/idioms/detail',
          { id }
        );
        if (res.success && res.data.category) {
          categoryMap.set(res.data.category, (categoryMap.get(res.data.category) || 0) + 1);
        }
      }

      return [...categoryMap.entries()]
        .map(([name, wrongCount]) => ({ name, wrongCount }))
        .sort((a, b) => b.wrongCount - a.wrongCount)
        .slice(0, 6);
    } catch (e) {
      return [];
    }
  };

  goToQuiz = () => {
    Taro.navigateTo({ url: '/pages/quiz/index' });
  };

  goToWrongBook = () => {
    Taro.navigateTo({ url: '/pages/wrongbook/index' });
  };

  render() {
    const {
      quizHistory, learnedCount, totalCount, wrongCount,
      studyDays, consecutiveDays, avgScore, bestScore,
      totalQuizzes, weakCategories, loading,
    } = this.state;

    const progressPct = Math.round((learnedCount / totalCount) * 100);

    // 最近7次测验趋势
    const recentQuizzes = quizHistory.slice(-7);
    const maxScore = recentQuizzes.length > 0 ? Math.max(...recentQuizzes.map(r => r.score), 100) : 100;

    if (loading) {
      return (
        <View className="analytics-loading">
          <View className="loading-dot" />
          <Text className="loading-text">分析中...</Text>
        </View>
      );
    }

    return (
      <ScrollView className="analytics-container" scrollY>
        {/* 头部概览 */}
        <View className="analytics-header">
          <Text className="header-title">学习数据看板</Text>
          <Text className="header-subtitle">掌握你的学习节奏</Text>
        </View>

        {/* 核心指标 */}
        <View className="metrics-row">
          <View className="metric-card primary">
            <Text className="metric-value">{progressPct}%</Text>
            <Text className="metric-label">掌握率</Text>
          </View>
          <View className="metric-card">
            <Text className="metric-value">{studyDays}</Text>
            <Text className="metric-label">学习天数</Text>
          </View>
          <View className="metric-card">
            <Text className="metric-value">{consecutiveDays}</Text>
            <Text className="metric-label">连续天数</Text>
          </View>
        </View>

        {/* 测验数据 */}
        {totalQuizzes > 0 && (
          <View className="metrics-row">
            <View className="metric-card small">
              <Text className="metric-value">{totalQuizzes}</Text>
              <Text className="metric-label">测验次数</Text>
            </View>
            <View className="metric-card small">
              <Text className="metric-value">{avgScore}</Text>
              <Text className="metric-label">平均分</Text>
            </View>
            <View className="metric-card small">
              <Text className="metric-value">{bestScore}</Text>
              <Text className="metric-label">最高分</Text>
            </View>
            <View className="metric-card small">
              <Text className="metric-value">{wrongCount}</Text>
              <Text className="metric-label">错题数</Text>
            </View>
          </View>
        )}

        {/* 测验趋势图 */}
        {recentQuizzes.length > 0 && (
          <View className="chart-section">
            <View className="chart-header">
              <Text className="chart-title">最近测验趋势</Text>
              <Text className="chart-sub">近{recentQuizzes.length}次</Text>
            </View>
            <View className="bar-chart">
              {recentQuizzes.map((q, i) => (
                <View key={i} className="bar-col">
                  <View className="bar-wrapper">
                    <View
                      className={`bar-fill ${q.score >= 80 ? 'good' : q.score >= 60 ? 'ok' : 'bad'}`}
                      style={{ height: `${(q.score / maxScore) * 100}%` }}
                    />
                  </View>
                  <Text className="bar-score">{q.score}</Text>
                  <Text className="bar-date">{q.date.slice(5)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 掌握进度 */}
        <View className="chart-section">
          <View className="chart-header">
            <Text className="chart-title">学习进度</Text>
          </View>
          <View className="progress-card">
            <View className="progress-info">
              <Text className="progress-num">{learnedCount}/{totalCount}</Text>
              <Text className="progress-pct">{progressPct}%</Text>
            </View>
            <View className="progress-bar-large">
              <View className="progress-fill-large" style={{ width: `${progressPct}%` }} />
            </View>
            <Text className="progress-desc">
              {progressPct < 30 ? '刚起步，继续坚持！' :
               progressPct < 60 ? '稳步前进中，保持节奏！' :
               progressPct < 90 ? '接近目标，一鼓作气！' : '即将通关，太厉害了！'}
            </Text>
          </View>
        </View>

        {/* 薄弱分类 */}
        {weakCategories.length > 0 && (
          <View className="chart-section">
            <View className="chart-header">
              <Text className="chart-title">薄弱分类</Text>
              <Text className="chart-sub">需重点复习</Text>
            </View>
            <View className="weak-list">
              {weakCategories.map((cat, i) => (
                <View key={i} className="weak-item">
                  <View className="weak-rank">{i + 1}</View>
                  <View className="weak-info">
                    <Text className="weak-name">{cat.name}</Text>
                    <View className="weak-bar-bg">
                      <View
                        className="weak-bar-fill"
                        style={{ width: `${Math.min(100, (cat.wrongCount / Math.max(...weakCategories.map(c => c.wrongCount))) * 100)}%` }}
                      />
                    </View>
                  </View>
                  <Text className="weak-count">{cat.wrongCount}题</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 空状态提示 */}
        {totalQuizzes === 0 && (
          <View className="empty-hint">
            <View className="empty-icon-large">📊</View>
            <Text className="empty-title">还没有测验数据</Text>
            <Text className="empty-desc">完成一次测验后，这里会展示你的学习数据分析</Text>
          </View>
        )}

        {/* 底部按钮 */}
        <View className="analytics-bottom">
          <AtButton
            type="primary"
            customStyle={{
              background: 'linear-gradient(135deg, #8B6914, #C49A3C)',
              border: 'none',
              borderRadius: '16px',
              height: '88px',
              lineHeight: '88px',
              fontSize: '30px',
              fontWeight: '700',
              marginBottom: '16px',
            }}
            onClick={this.goToQuiz}
          >
            开始测验
          </AtButton>
          {wrongCount > 0 && (
            <AtButton
              customStyle={{
                background: '#FFFFFF',
                color: '#EF5350',
                border: '1px solid #FFCDD2',
                borderRadius: '16px',
                height: '88px',
                lineHeight: '88px',
                fontSize: '28px',
              }}
              onClick={this.goToWrongBook}
            >
              查看错题本 ({wrongCount})
            </AtButton>
          )}
        </View>
      </ScrollView>
    );
  }
}

export default Analytics;
