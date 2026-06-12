import { Component } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { AtSearchBar, AtButton } from 'taro-ui';
import { apiClient } from '../../services/api-client';
import goldenSentences from '../../data/golden-sentences.json';
import './index.scss';

interface Idiom {
  id: number;
  name: string;
  pinyin: string;
  meaning: string;
  category: string;
  difficulty: number;
  firstLetter: string;
  type?: string;
}

interface CategoryItem {
  name: string;
  count: number;
}

interface GoldenSentence {
  text: string;
  source: string;
  theme: string;
}

interface State {
  dailyIdiom: Idiom | null;
  searchValue: string;
  loading: boolean;
  totalCount: number;
  learnedCount: number;
  favoriteCount: number;
  categories: CategoryItem[];
  wrongCount: number;
  quizCount: number;
  categoryPage: number;
  dailySentence: GoldenSentence | null;
  dailySentenceIndex: number;
}

class Index extends Component<{}, State> {
  state: State = {
    dailyIdiom: null,
    searchValue: '',
    loading: true,
    totalCount: 805,
    learnedCount: 0,
    favoriteCount: 0,
    categories: [],
    wrongCount: 0,
    quizCount: 0,
    categoryPage: 0,
    dailySentence: null,
    dailySentenceIndex: 0,
  };

  async componentDidMount() {
    await Promise.all([
      this.fetchDailyIdiom(),
      this.fetchStats(),
      this.fetchCategories(),
    ]);
    this.pickDailySentence();

    // 监听闯关数据更新事件
    Taro.eventCenter.on('quizDataUpdated', this.fetchStats);
  }

  componentWillUnmount() {
    Taro.eventCenter.off('quizDataUpdated', this.fetchStats);
  }

  async componentDidShow() {
    this.fetchStats();
  }

  fetchStats = () => {
    try {
      const learned = Taro.getStorageSync('learned_ids') || [];
      const favorites = Taro.getStorageSync('favorite_ids') || [];
      const wrongbook = Taro.getStorageSync('wrongbook_items') || [];
      const quizCount = Taro.getStorageSync('quiz_count') || 0;
      this.setState({
        learnedCount: learned.length,
        favoriteCount: favorites.length,
        wrongCount: wrongbook.length,
        quizCount,
      });
    } catch (e) {
      // ignore
    }
  };

  fetchDailyIdiom = async () => {
    try {
      const res = await apiClient.post<{ success: boolean; data: Idiom }>('/api/idioms/random');
      if (res.success) {
        this.setState({ dailyIdiom: res.data });
      }
    } catch (e) {
      console.error('Failed to fetch daily idiom:', e);
    } finally {
      this.setState({ loading: false });
    }
  };

  fetchCategories = async () => {
    try {
      const res = await apiClient.post<{ success: boolean; data: { categories: CategoryItem[] } }>('/api/idioms/categories');
      if (res.success) {
        this.setState({ categories: res.data.categories });
      }
    } catch (e) {
      console.error('Failed to fetch categories:', e);
    }
  };

  pickDailySentence = () => {
    // 根据日期选择金句，确保同一天看到同一条
    const today = new Date().toISOString().slice(0, 10);
    const dayHash = today.split('-').reduce((s, n) => s + parseInt(n, 10), 0);
    const index = dayHash % goldenSentences.length;
    this.setState({ dailySentence: goldenSentences[index], dailySentenceIndex: index });
  };

  switchNextSentence = () => {
    const { dailySentenceIndex } = this.state;
    const nextIndex = (dailySentenceIndex + 1) % goldenSentences.length;
    this.setState({ dailySentence: goldenSentences[nextIndex], dailySentenceIndex: nextIndex });
  };

  handleSearch = (value: string) => {
    this.setState({ searchValue: value });
    if (value.trim()) {
      Taro.navigateTo({
        url: `/pages/list/index?keyword=${encodeURIComponent(value.trim())}`,
      });
    }
  };

  goToList = (params?: string) => {
    Taro.navigateTo({
      url: `/pages/list/index${params || ''}`,
    });
  };

  goToDetail = (id: number) => {
    Taro.navigateTo({
      url: `/pages/detail/index?id=${id}`,
    });
  };

  goToFavorites = () => {
    Taro.navigateTo({ url: '/pages/favorites/index' });
  };

  goToLearned = () => {
    Taro.navigateTo({ url: '/pages/learned/index' });
  };

  goToQuiz = () => {
    Taro.navigateTo({ url: '/pages/quiz/index' });
  };

  goToWrongBook = () => {
    Taro.navigateTo({ url: '/pages/wrongbook/index' });
  };

  goToAnalytics = () => {
    Taro.navigateTo({ url: '/pages/analytics/index' });
  };

  goToSynonym = () => {
    Taro.navigateTo({ url: '/pages/synonym/index' });
  };

  render() {
    const { dailyIdiom, searchValue, totalCount, learnedCount, favoriteCount, categories, wrongCount, quizCount, categoryPage, dailySentence } = this.state;

    // 分类分页：每页10个
    const PAGE_SIZE = 10;
    const totalPages = Math.ceil(categories.length / PAGE_SIZE);
    const pageCategories = categories.slice(categoryPage * PAGE_SIZE, (categoryPage + 1) * PAGE_SIZE);

    return (
      <View className="home-container">
        {/* 顶部品牌区 */}
        <View className="home-header">
          <View className="header-brand">
            <View className="brand-icon">
              <Text>🥜</Text>
            </View>
            <Text className="brand-title">花生成语800词</Text>
          </View>
          <Text className="brand-subtitle">花生老师高频成语 · 公考必备</Text>
        </View>

        {/* 搜索栏 */}
        <View className="search-section">
          <AtSearchBar
            value={searchValue}
            onChange={this.handleSearch}
            placeholder="搜索成语、拼音、释义..."
          />
        </View>

        {/* 快捷入口 */}
        <View className="quick-entries">
          <View className="entry-card" onClick={() => this.goToList()}>
            <Text className="entry-icon">📚</Text>
            <Text className="entry-num">{totalCount}</Text>
            <Text className="entry-label">全部词条</Text>
          </View>
          <View className="entry-card" onClick={this.goToLearned}>
            <Text className="entry-icon">✅</Text>
            <Text className="entry-num">{learnedCount}</Text>
            <Text className="entry-label">已学词条</Text>
          </View>
          <View className="entry-card" onClick={this.goToFavorites}>
            <Text className="entry-icon">⭐</Text>
            <Text className="entry-num">{favoriteCount}</Text>
            <Text className="entry-label">我的收藏</Text>
          </View>
        </View>

        {/* 学习工具 */}
        <View className="quick-entries tools-row">
          <View className="entry-card highlight" onClick={this.goToQuiz}>
            <Text className="entry-icon">🏆</Text>
            <Text className="entry-label-big">成语闯关</Text>
            {quizCount > 0 ? (
              <Text className="entry-sub">已闯{quizCount}关</Text>
            ) : (
              <Text className="entry-sub">真题挑战</Text>
            )}
          </View>
          <View className="entry-card highlight" onClick={this.goToWrongBook}>
            <Text className="entry-icon">📋</Text>
            <Text className="entry-label-big">错题本</Text>
            {wrongCount > 0 ? (
              <Text className="entry-sub accent">{wrongCount}题待复习</Text>
            ) : (
              <Text className="entry-sub">暂无错题</Text>
            )}
          </View>
        </View>
        <View className="quick-entries tools-row" style={{ paddingTop: 0 }}>
          <View className="entry-card highlight synonym-entry" onClick={this.goToSynonym}>
            <Text className="entry-icon">⚡</Text>
            <Text className="entry-label-big">近义成语辨析</Text>
            <Text className="entry-sub">60组高频对比</Text>
          </View>
          <View className="entry-card highlight analytics-entry" onClick={this.goToAnalytics}>
            <Text className="entry-icon">📊</Text>
            <Text className="entry-label-big">学习数据</Text>
            {quizCount > 0 ? (
              <Text className="entry-sub">查看分析</Text>
            ) : (
              <Text className="entry-sub">暂无数据</Text>
            )}
          </View>
        </View>

        {/* 学习进度 */}
        {learnedCount > 0 && (
          <View className="progress-section">
            <View className="progress-header">
              <Text className="progress-label">学习进度</Text>
              <Text className="progress-icon">🎯</Text>
            </View>
            <View className="progress-bar">
              <View
                className="progress-fill"
                style={{ width: `${Math.min(100, Math.round((learnedCount / totalCount) * 100))}%` }}
              />
            </View>
            <Text className="progress-text">
              {Math.round((learnedCount / totalCount) * 100)}%（{learnedCount}/{totalCount}）
            </Text>
          </View>
        )}

        {/* 分类浏览 */}
        <View className="category-section">
          <View className="section-title">
            <View className="section-title-icon">
              <Text>📂</Text>
            </View>
            <Text className="title-text">按分类浏览</Text>
          </View>
          <View className="category-grid">
            <View className="category-page">
              {pageCategories.map(cat => (
                <View
                  key={cat.name}
                  className="category-item"
                  onClick={() => this.goToList(`?category=${encodeURIComponent(cat.name)}`)}
                >
                  <View className="category-dot" />
                  <Text className="category-name">{cat.name}</Text>
                  <Text className="category-count">{cat.count}</Text>
                </View>
              ))}
            </View>
          </View>
          {totalPages > 1 && (
            <View className="category-pager">
              <View
                className={`pager-btn ${categoryPage === 0 ? 'disabled' : ''}`}
                onClick={() => this.setState({ categoryPage: categoryPage - 1 })}
              >
                <Text className="pager-arrow">‹</Text>
              </View>
              <Text className="pager-info">{categoryPage + 1}/{totalPages}</Text>
              <View
                className={`pager-btn ${categoryPage >= totalPages - 1 ? 'disabled' : ''}`}
                onClick={() => this.setState({ categoryPage: categoryPage + 1 })}
              >
                <Text className="pager-arrow">›</Text>
              </View>
            </View>
          )}
        </View>

        {/* 按拼音浏览 */}
        <View className="letter-section">
          <View className="section-title">
            <View className="section-title-icon">
              <Text>🔤</Text>
            </View>
            <Text className="title-text">按拼音首字母</Text>
          </View>
          <View className="letter-grid">
            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => (
              <View
                key={l}
                className="letter-item"
                onClick={() => this.goToList(`?letter=${l}`)}
              >
                <Text className="letter-text">{l}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 每日成语 */}
        <View className="daily-section">
          <View className="section-title">
            <View className="section-title-icon">
              <Text>🔥</Text>
            </View>
            <Text className="title-text">每日成语</Text>
            <Text className="title-desc">积少成多</Text>
          </View>
          {dailyIdiom && (
            <View className="daily-card" onClick={() => this.goToDetail(dailyIdiom.id)}>
              <View className="daily-header">
                <View className="daily-icon">
                  <Text>📖</Text>
                </View>
                <Text className="daily-name">{dailyIdiom.name}</Text>
                <Text className="daily-pinyin">{dailyIdiom.pinyin}</Text>
                <Text className="daily-category">{dailyIdiom.category}</Text>
              </View>
              <Text className="daily-meaning">{dailyIdiom.meaning}</Text>
              <View className="daily-tags">
                <AtButton
                  size="small"
                  customStyle={{
                    fontSize: '20px',
                    background: '#FDF3E7',
                    color: '#8B6914',
                    border: '1px solid #E8D5B7',
                    borderRadius: '16px',
                    height: '44px',
                    lineHeight: '44px',
                    padding: '0 16px',
                  }}
                >
                  难度 {'★'.repeat(dailyIdiom.difficulty || 1)}
                </AtButton>
                {dailyIdiom.type && (
                  <AtButton
                    size="small"
                    customStyle={{
                      fontSize: '20px',
                      background: '#FDF3E7',
                      color: '#8B6914',
                      border: '1px solid #E8D5B7',
                      borderRadius: '16px',
                      height: '44px',
                      lineHeight: '44px',
                      padding: '0 16px',
                    }}
                  >
                    {dailyIdiom.type === 'content_word' ? '实词' : '成语'}
                  </AtButton>
                )}
              </View>
            </View>
          )}
        </View>

        {/* 每日金句 */}
        {dailySentence && (
          <View className="sentence-section">
            <View className="section-title">
              <View className="section-title-icon sentence-icon-bg">
                <Text>📰</Text>
              </View>
              <Text className="title-text">每日金句</Text>
              <Text className="title-desc">{dailySentence.theme}</Text>
              <View className="sentence-switch" onClick={this.switchNextSentence}>
                <Text>换一句</Text>
              </View>
            </View>
            <View className="sentence-card">
              <View className="sentence-quote-mark">"</View>
              <Text className="sentence-text">{dailySentence.text}</Text>
              <View className="sentence-footer">
                <View className="sentence-source-tag">
                  <Text>{dailySentence.source}</Text>
                </View>
                <Text className="sentence-theme">{dailySentence.theme} · 申论必备</Text>
              </View>
            </View>
          </View>
        )}

        <View className="home-footer">
          <Text className="footer-text">花生成语800词 · 花生老师出品</Text>
        </View>
      </View>
    );
  }
}

export default Index;
