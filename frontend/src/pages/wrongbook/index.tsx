import { Component } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { AtButton, AtActivityIndicator } from 'taro-ui';
import './index.scss';

interface WrongItem {
  text: string;
  answer: string;
  source: string;
  date: string;
  fullStem?: string;
  options?: string[];
  correctIndex?: number;
}

interface State {
  items: WrongItem[];
  loading: boolean;
  expandedIndex: number | null;  // 当前展开重做的题目
  selectedOption: number | null; // 重做时选择的选项
  redoResult: 'correct' | 'wrong' | null; // 重做结果
}

class WrongBook extends Component<{}, State> {
  state: State = {
    items: [],
    loading: true,
    expandedIndex: null,
    selectedOption: null,
    redoResult: null,
  };

  componentDidMount() {
    this.loadItems();
  }

  componentDidShow() {
    this.loadItems();
  }

  loadItems = () => {
    try {
      const items: WrongItem[] = Taro.getStorageSync('wrongbook_items') || [];
      this.setState({ items: items.reverse(), loading: false });
    } catch (e) {
      this.setState({ loading: false });
    }
  };

  toggleRedo = (index: number) => {
    const { expandedIndex } = this.state;
    if (expandedIndex === index) {
      this.setState({ expandedIndex: null, selectedOption: null, redoResult: null });
    } else {
      this.setState({ expandedIndex: index, selectedOption: null, redoResult: null });
    }
  };

  handleRedoAnswer = (item: WrongItem, optionIndex: number) => {
    if (this.state.redoResult !== null) return; // 已经回答过
    const isCorrect = optionIndex === item.correctIndex;
    this.setState({
      selectedOption: optionIndex,
      redoResult: isCorrect ? 'correct' : 'wrong',
    });

    // 如果答对了，自动从错题本移除
    if (isCorrect && item.fullStem) {
      setTimeout(() => {
        this.removeItemByStem(item.fullStem!);
      }, 800);
    }
  };

  removeItemByStem = (fullStem: string) => {
    try {
      const items: WrongItem[] = Taro.getStorageSync('wrongbook_items') || [];
      const filtered = items.filter((item: WrongItem) => item.fullStem !== fullStem);
      Taro.setStorageSync('wrongbook_items', filtered);
      this.setState({
        items: filtered.reverse(),
        expandedIndex: null,
        selectedOption: null,
        redoResult: null,
      });
      Taro.showToast({ title: '答对了，已移除！', icon: 'success' });
    } catch (e) {
      // ignore
    }
  };

  removeItem = (index: number) => {
    try {
      const items: WrongItem[] = Taro.getStorageSync('wrongbook_items') || [];
      const realIndex = items.length - 1 - index;
      items.splice(realIndex, 1);
      Taro.setStorageSync('wrongbook_items', items);
      this.setState({ items: items.reverse() });
      Taro.showToast({ title: '已移除', icon: 'none' });
    } catch (e) {
      // ignore
    }
  };

  clearAll = () => {
    Taro.showModal({
      title: '确认清空',
      content: '确定要清空所有错题吗？',
      success: (res) => {
        if (res.confirm) {
          Taro.setStorageSync('wrongbook_items', []);
          this.setState({ items: [] });
          Taro.showToast({ title: '已清空', icon: 'none' });
        }
      },
    });
  };

  goToQuiz = () => {
    Taro.navigateTo({ url: '/pages/quiz/index' });
  };

  render() {
    const { items, loading, expandedIndex, selectedOption, redoResult } = this.state;

    if (loading) {
      return (
        <View className="wrongbook-loading">
          <AtActivityIndicator mode="center" content="加载中..." />
        </View>
      );
    }

    return (
      <ScrollView className="wrongbook-container" scrollY>
        <View className="wrongbook-header">
          <View className="header-card">
            <View className="header-icon">
              <Text>📝</Text>
            </View>
            <View className="header-info">
              <Text className="header-count">{items.length}</Text>
              <Text className="header-label">道错题</Text>
            </View>
            {items.length > 0 && (
              <View className="header-action" onClick={this.clearAll}>
                <Text className="header-action-text">清空</Text>
              </View>
            )}
          </View>
          {items.length > 0 && (
            <View className="header-tip">
              <Text className="tip-text">点击错题可重新作答，答对自动移除 ✨</Text>
            </View>
          )}
        </View>

        {items.length === 0 && (
          <View className="wrongbook-empty">
            <View className="empty-icon"><Text>🎉</Text></View>
            <Text className="empty-title">暂无错题</Text>
            <Text className="empty-desc">太厉害了，继续保持！</Text>
            <AtButton
              type="primary"
              customStyle={{
                background: 'linear-gradient(135deg, #E67E22, #D35400)',
                border: 'none', borderRadius: '16px', height: '80px',
                lineHeight: '80px', fontSize: '28px', fontWeight: '700', marginTop: '32px',
              }}
              onClick={this.goToQuiz}
            >去闯关挑战</AtButton>
          </View>
        )}

        {items.map((item, index) => {
          const isExpanded = expandedIndex === index;
          const canRedo = item.fullStem && item.options && item.correctIndex !== undefined;

          return (
            <View key={index} className={`wrong-item ${isExpanded ? 'expanded' : ''}`}>
              {/* 摘要区：点击展开 */}
              <View className="wrong-item-summary" onClick={() => canRedo && this.toggleRedo(index)}>
                <View className="wrong-item-left">
                  <Text className="wrong-item-text">{item.text}</Text>
                  <View className="wrong-item-meta">
                    <Text className="wrong-item-source">{item.source} · {item.date}</Text>
                  </View>
                </View>
                <View className="wrong-item-actions">
                  {canRedo && (
                    <View className="redo-btn">
                      <Text className="redo-btn-text">{isExpanded ? '收起' : '重做'}</Text>
                    </View>
                  )}
                  <View className="wrong-item-remove" onClick={(e) => { e.stopPropagation(); this.removeItem(index); }}>
                    <Text className="remove-icon">✕</Text>
                  </View>
                </View>
              </View>

              {/* 展开区：重做题目 */}
              {isExpanded && canRedo && (
                <View className="wrong-item-redo">
                  <View className="redo-stem">
                    <Text className="redo-stem-text">{item.fullStem}</Text>
                  </View>
                  <View className="redo-options">
                    {item.options!.map((opt, optIdx) => {
                      let cls = 'redo-option';
                      if (redoResult) {
                        if (optIdx === item.correctIndex) cls += ' redo-correct';
                        else if (optIdx === selectedOption && optIdx !== item.correctIndex) cls += ' redo-wrong';
                      }
                      return (
                        <View
                          key={optIdx}
                          className={cls}
                          onClick={() => this.handleRedoAnswer(item, optIdx)}
                        >
                          <View className="redo-option-letter">
                            <Text>{String.fromCharCode(65 + optIdx)}</Text>
                          </View>
                          <Text className="redo-option-text">{opt}</Text>
                          {redoResult && optIdx === item.correctIndex && (
                            <Text className="redo-mark">✓</Text>
                          )}
                          {redoResult && optIdx === selectedOption && optIdx !== item.correctIndex && (
                            <Text className="redo-mark wrong-mark">✗</Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                  {redoResult && (
                    <View className={`redo-feedback ${redoResult}`}>
                      <Text className="redo-feedback-text">
                        {redoResult === 'correct' ? '✅ 回答正确！已自动移出错题本' : '❌ 回答错误，再想想吧'}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {items.length > 0 && (
          <View className="wrongbook-bottom">
            <AtButton
              type="primary"
              customStyle={{
                background: 'linear-gradient(135deg, #E67E22, #D35400)',
                border: 'none', borderRadius: '16px', height: '88px',
                lineHeight: '88px', fontSize: '30px', fontWeight: '700',
              }}
              onClick={this.goToQuiz}
            >再次闯关</AtButton>
          </View>
        )}
      </ScrollView>
    );
  }
}

export default WrongBook;
