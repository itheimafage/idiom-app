import { Component } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { AtButton, AtTag, AtDivider, AtActivityIndicator } from 'taro-ui';
import { apiClient } from '../../services/api-client';
import './index.scss';

interface Idiom {
  id: number;
  name: string;
  pinyin: string;
  abbr: string;
  meaning: string;
  source: string;
  examples: string[];
  synonyms: string[];
  antonyms: string[];
  category: string;
  difficulty: number;
  firstLetter: string;
  type?: string;
  volume?: string;
}

interface State {
  idiom: Idiom | null;
  nextId: number | null;
  loading: boolean;
  isFavorite: boolean;
  isLearned: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  speakingSection: string;
  speechRate: number;
}

class Detail extends Component<{}, State> {
  state: State = {
    idiom: null,
    nextId: null,
    loading: true,
    isFavorite: false,
    isLearned: false,
    isSpeaking: false,
    isPaused: false,
    speakingSection: '',
    speechRate: 2.0,
  };

  speechSynth: SpeechSynthesis | null = null;
  currentUtterance: SpeechSynthesisUtterance | null = null;
  speechQueue: { text: string; section: string; rate: number; pitch: number }[] = [];
  speechIndex = 0;

  async componentDidMount() {
    const params = Taro.getCurrentInstance().router?.params || {};
    const id = parseInt(params.id || '0', 10);
    if (id) {
      await this.fetchDetail(id);
      this.checkStatus(id);
    }
  }

  fetchDetail = async (id: number) => {
    try {
      const res = await apiClient.post<{ success: boolean; data: Idiom; nextId?: number }>(
        '/api/idioms/detail',
        { id }
      );
      if (res.success) {
        this.setState({ idiom: res.data, nextId: res.nextId ?? null });
      }
    } catch (e) {
      console.error('Failed to fetch detail:', e);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setState({ loading: false });
    }
  };

  checkStatus = (id: number) => {
    try {
      const favorites: number[] = Taro.getStorageSync('favorite_ids') || [];
      const learned: number[] = Taro.getStorageSync('learned_ids') || [];
      this.setState({
        isFavorite: favorites.includes(id),
        isLearned: learned.includes(id),
      });
    } catch (e) {
      // ignore
    }
  };

  toggleFavorite = () => {
    const { idiom, isFavorite } = this.state;
    if (!idiom) return;

    try {
      let favorites: number[] = Taro.getStorageSync('favorite_ids') || [];
      if (isFavorite) {
        favorites = favorites.filter(fid => fid !== idiom.id);
      } else {
        favorites.push(idiom.id);
      }
      Taro.setStorageSync('favorite_ids', favorites);
      this.setState({ isFavorite: !isFavorite });
      Taro.showToast({
        title: isFavorite ? '已取消收藏' : '已收藏',
        icon: 'none',
      });
    } catch (e) {
      console.error('Toggle favorite failed:', e);
    }
  };

  toggleLearned = () => {
    const { idiom, isLearned, nextId } = this.state;
    if (!idiom) return;

    try {
      let learned: number[] = Taro.getStorageSync('learned_ids') || [];
      if (isLearned) {
        learned = learned.filter(lid => lid !== idiom.id);
        Taro.setStorageSync('learned_ids', learned);
        this.setState({ isLearned: !isLearned });
        Taro.showToast({
          title: '已取消已学标记',
          icon: 'none',
        });
      } else {
        learned.push(idiom.id);
        const today = new Date().toISOString().slice(0, 10);
        const learnedDates: string[] = Taro.getStorageSync('learned_dates') || [];
        if (!learnedDates.includes(today)) {
          learnedDates.push(today);
          Taro.setStorageSync('learned_dates', learnedDates);
        }
        Taro.setStorageSync('learned_ids', learned);
        Taro.showToast({
          title: '已标记为已学',
          icon: 'success',
          duration: 800,
        });
        // 自动跳转到下一个成语
        if (nextId) {
          setTimeout(() => {
            Taro.navigateTo({ url: `/pages/detail/index?id=${nextId}` });
          }, 500);
        }
      }
    } catch (e) {
      console.error('Toggle learned failed:', e);
    }
  };

  // ==========================================
  // 朗读功能
  // ==========================================
  buildSpeechQueue = (idiom: Idiom) => {
    const baseRate = this.state.speechRate;
    const queue: { text: string; section: string; rate: number; pitch: number }[] = [];

    // 成语名 — 慢速、稍高音调，庄重
    queue.push({ text: idiom.name, section: 'name', rate: baseRate * 0.75, pitch: 1.15 });
    // 释义 — 慢速，正常音调，便于理解
    queue.push({ text: `释义。${idiom.meaning}`, section: 'meaning', rate: baseRate * 0.85, pitch: 0.95 });
    // 出处 — 稍慢，略带韵味
    if (idiom.source) {
      queue.push({ text: `出处。${idiom.source}`, section: 'source', rate: baseRate * 0.82, pitch: 1.0 });
    }
    // 例句 — 正常语速，自然朗读
    if (idiom.examples && idiom.examples.length > 0) {
      const examplesText = idiom.examples.map((ex, i) => {
        // 在标点处插入短暂停顿（逗号→短停，句号→正常停）
        const withPauses = ex.replace(/，/g, '， ').replace(/。/g, '。 ');
        return i === 0 ? `例句。${withPauses}` : withPauses;
      }).join(' ');
      queue.push({ text: examplesText, section: 'examples', rate: baseRate * 0.9, pitch: 1.0 });
    }
    return queue;
  };

  speak = () => {
    const { idiom, isPaused } = this.state;
    if (!idiom) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (isPaused) {
      // 继续播放
      window.speechSynthesis.resume();
      this.setState({ isPaused: false });
      return;
    }

    // 停止当前播放
    window.speechSynthesis.cancel();
    this.speechQueue = this.buildSpeechQueue(idiom);
    this.speechIndex = 0;
    this.setState({ isSpeaking: true, isPaused: false, speakingSection: '' });
    this.speakNext();
  };

  speakNext = () => {
    if (this.speechIndex >= this.speechQueue.length) {
      this.setState({ isSpeaking: false, speakingSection: '' });
      return;
    }

    // 小程序环境不支持 Web Speech API
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      this.setState({ isSpeaking: false, speakingSection: '' });
      return;
    }

    const item = this.speechQueue[this.speechIndex];

    // 段间停顿：先静默一小段再播下一段
    const delay = this.speechIndex > 0 ? 400 : 0;

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(item.text);
      utterance.lang = 'zh-CN';
      utterance.rate = item.rate;
      utterance.pitch = item.pitch;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        this.setState({ speakingSection: item.section });
      };

      utterance.onend = () => {
        this.speechIndex++;
        this.speakNext();
      };

      utterance.onerror = () => {
        this.speechIndex++;
        this.speakNext();
      };

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    }, delay);
  };

  pause = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.pause();
    this.setState({ isPaused: true });
  };

  stop = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    this.speechQueue = [];
    this.speechIndex = 0;
    this.setState({ isSpeaking: false, isPaused: false, speakingSection: '' });
  };

  setSpeechRate = (rate: number) => {
    this.setState({ speechRate: rate });
  };

  componentWillUnmount() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  render() {
    const { idiom, loading, isFavorite, isLearned, isSpeaking, isPaused, speakingSection, speechRate } = this.state;

    if (loading) {
      return (
        <View className="detail-loading">
          <AtActivityIndicator mode="center" content="加载中..." />
        </View>
      );
    }

    if (!idiom) {
      return (
        <View className="detail-loading">
          <Text>成语不存在</Text>
        </View>
      );
    }

    return (
      <ScrollView className="detail-container" scrollY>
        {/* 成语大字展示 */}
        <View className="detail-hero">
          {(idiom as any).type === 'content_word' && (
            <View className="hero-type-badge">
              <Text>📝 实词 · {(idiom as any).volume || ''}</Text>
            </View>
          )}
          {(idiom as any).type === 'idiom' && (
            <View className="hero-type-badge">
              <Text>📖 成语 · {(idiom as any).volume || ''}</Text>
            </View>
          )}
          <View className={`hero-name-row ${speakingSection === 'name' ? 'speaking' : ''}`}>
            {idiom.name.split('').map((char, i) => (
              <View key={i} className="hero-char-box">
                <Text className="hero-char">{char}</Text>
                <Text className="hero-pinyin">{idiom.pinyin.split(' ')[i] || ''}</Text>
              </View>
            ))}
          </View>
          <Text className="hero-full-pinyin">{idiom.pinyin}</Text>
        </View>

        {/* 操作按钮 */}
        <View className="detail-actions">
          {/* 朗读按钮 */}
          <View className="detail-speak-bar">
            {!isSpeaking && !isPaused ? (
              <View className="speak-btn" onClick={this.speak}>
                <Text className="speak-icon">🔊</Text>
                <Text className="speak-text">朗读</Text>
              </View>
            ) : (
              <View className="speak-controls">
                {isPaused ? (
                  <View className="speak-btn small" onClick={this.speak}>
                    <Text className="speak-icon">▶️</Text>
                    <Text className="speak-text">继续</Text>
                  </View>
                ) : (
                  <View className="speak-btn small" onClick={this.pause}>
                    <Text className="speak-icon">⏸️</Text>
                    <Text className="speak-text">暂停</Text>
                  </View>
                )}
                <View className="speak-btn small stop" onClick={this.stop}>
                  <Text className="speak-icon">⏹️</Text>
                  <Text className="speak-text">停止</Text>
                </View>
              </View>
            )}
            {/* 语速调节 */}
            <View className="speak-rate-bar">
              <Text className="rate-label">语速</Text>
              <Text className="rate-value">{speechRate.toFixed(1)}x</Text>
              <View className="rate-slider-track">
                <View
                  className="rate-slider-fill"
                  style={{ width: `${((speechRate - 0.5) / 2.5) * 100}%` }}
                />
                <View
                  className="rate-slider-thumb"
                  style={{ left: `${((speechRate - 0.5) / 2.5) * 100}%` }}
                />
              </View>
              <View className="rate-presets">
                <Text
                  className={`rate-preset ${speechRate === 1.0 ? 'active' : ''}`}
                  onClick={() => this.setSpeechRate(1.0)}
                >1.0x</Text>
                <Text
                  className={`rate-preset ${speechRate === 1.5 ? 'active' : ''}`}
                  onClick={() => this.setSpeechRate(1.5)}
                >1.5x</Text>
                <Text
                  className={`rate-preset ${speechRate === 2.0 ? 'active' : ''}`}
                  onClick={() => this.setSpeechRate(2.0)}
                >2.0x</Text>
                <Text
                  className={`rate-preset ${speechRate === 2.5 ? 'active' : ''}`}
                  onClick={() => this.setSpeechRate(2.5)}
                >2.5x</Text>
              </View>
            </View>
          </View>
          <View className="detail-actions-row">
            <View
              className={`action-btn ${isFavorite ? 'active' : ''}`}
              onClick={this.toggleFavorite}
            >
              <Text className="action-icon">{isFavorite ? '❤️' : '🤍'}</Text>
              <Text className="action-text">{isFavorite ? '已收藏' : '收藏'}</Text>
            </View>
            <View
              className={`action-btn ${isLearned ? 'active' : ''}`}
              onClick={this.toggleLearned}
            >
              <Text className="action-icon">{isLearned ? '✅' : '☑️'}</Text>
              <Text className="action-text">{isLearned ? '已学' : '标记已学'}</Text>
            </View>
          </View>
        </View>

        {/* 标签 */}
        <View className="detail-tags">
          <AtTag customStyle={{ background: '#FDF3E7', color: '#8B6914', borderColor: '#E8D5B7' }}>
            {idiom.category}
          </AtTag>
          <AtTag customStyle={{ background: '#FDF3E7', color: '#C49A3C', borderColor: '#E8D5B7' }}>
            难度: {'★'.repeat(idiom.difficulty)}
          </AtTag>
        </View>

        <AtDivider />

        {/* 释义 */}
        <View className={`detail-section ${speakingSection === 'meaning' ? 'speaking' : ''}`}>
          <Text className="section-label">释义</Text>
          <Text className="section-content meaning-text">{idiom.meaning}</Text>
        </View>

        {/* 出处 */}
        {idiom.source && (
          <View className={`detail-section ${speakingSection === 'source' ? 'speaking' : ''}`}>
            <Text className="section-label">出处</Text>
            <Text className="section-content source-text">{idiom.source}</Text>
          </View>
        )}

        {/* 例句 */}
        {idiom.examples && idiom.examples.length > 0 && (
          <View className={`detail-section ${speakingSection === 'examples' ? 'speaking' : ''}`}>
            <Text className="section-label">例句</Text>
            {idiom.examples.map((ex, i) => (
              <View key={i} className="example-item">
                <Text className="example-num">{i + 1}.</Text>
                <Text className="example-text">{ex}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 近义词 */}
        {idiom.synonyms && idiom.synonyms.length > 0 && (
          <View className="detail-section">
            <Text className="section-label">近义词</Text>
            <View className="related-words">
              {idiom.synonyms.map((s, i) => (
                <View key={i} className="word-tag synonym-tag">
                  <Text>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 反义词 */}
        {idiom.antonyms && idiom.antonyms.length > 0 && (
          <View className="detail-section">
            <Text className="section-label">反义词</Text>
            <View className="related-words">
              {idiom.antonyms.map((a, i) => (
                <View key={i} className="word-tag antonym-tag">
                  <Text>{a}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View className="detail-footer">
          <Text className="footer-text">fage成语</Text>
        </View>
      </ScrollView>
    );
  }
}

export default Detail;
