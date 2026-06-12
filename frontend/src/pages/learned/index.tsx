import { Component } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { AtActivityIndicator, AtTag, AtProgress } from 'taro-ui';
import { apiClient } from '../../services/api-client';
import './index.scss';

interface Idiom {
  id: number;
  name: string;
  pinyin: string;
  meaning: string;
  category: string;
  difficulty: number;
}

interface State {
  list: Idiom[];
  loading: boolean;
  totalCount: number;
}

class Learned extends Component<{}, State> {
  state: State = {
    list: [],
    loading: true,
    totalCount: 800,
  };

  componentDidShow() {
    this.loadLearned();
  }

  loadLearned = async () => {
    try {
      const learnedIds: number[] = Taro.getStorageSync('learned_ids') || [];
      if (learnedIds.length === 0) {
        this.setState({ list: [], loading: false });
        return;
      }

      const idioms: Idiom[] = [];
      for (const id of learnedIds) {
        try {
          const res = await apiClient.post<{ success: boolean; data: Idiom }>(
            '/api/idioms/detail',
            { id }
          );
          if (res.success) {
            idioms.push(res.data);
          }
        } catch (e) {
          // skip
        }
      }

      this.setState({ list: idioms, loading: false });
    } catch (e) {
      console.error('Failed to load learned:', e);
      this.setState({ loading: false });
    }
  };

  goToDetail = (id: number) => {
    Taro.navigateTo({
      url: `/pages/detail/index?id=${id}`,
    });
  };

  removeLearned = (id: number) => {
    try {
      let learned: number[] = Taro.getStorageSync('learned_ids') || [];
      learned = learned.filter(lid => lid !== id);
      Taro.setStorageSync('learned_ids', learned);
      this.setState({
        list: this.state.list.filter(item => item.id !== id),
      });
      Taro.showToast({ title: '已取消标记', icon: 'none' });
    } catch (e) {
      console.error('Remove learned failed:', e);
    }
  };

  render() {
    const { list, loading, totalCount } = this.state;
    const percent = Math.round((list.length / totalCount) * 100);

    if (loading) {
      return (
        <View className="learned-loading">
          <AtActivityIndicator mode="center" content="加载中..." />
        </View>
      );
    }

    return (
      <View className="learned-container">
        {list.length === 0 ? (
          <View className="learned-empty">
            <Text className="empty-icon">🎯</Text>
            <Text className="empty-title">还没有已学成语</Text>
            <Text className="empty-desc">在成语详情页点击"标记已学"即可记录</Text>
            <View className="empty-btn" onClick={() => Taro.navigateTo({ url: '/pages/list/index' })}>
              <Text>去学习成语</Text>
            </View>
          </View>
        ) : (
          <ScrollView scrollY className="learned-list">
            {/* 进度卡片 */}
            <View className="progress-card">
              <Text className="progress-title">学习进度</Text>
              <View className="progress-main">
                <View className="progress-circle">
                  <Text className="progress-percent">{percent}%</Text>
                </View>
                <View className="progress-info">
                  <Text className="progress-count">
                    已学 <Text className="highlight">{list.length}</Text> / {totalCount} 个成语
                  </Text>
                  <View className="progress-bar-wrap">
                    <View className="progress-bar-bg">
                      <View className="progress-bar-fill" style={{ width: `${percent}%` }} />
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* 列表 */}
            <View className="learned-count">
              <Text>已学成语列表</Text>
            </View>
            {list.map(item => (
              <View key={item.id} className="learned-card">
                <View
                  className="learned-card-main"
                  onClick={() => this.goToDetail(item.id)}
                >
                  <View className="learned-card-left">
                    <Text className="learned-card-name">{item.name}</Text>
                    <Text className="learned-card-pinyin">{item.pinyin}</Text>
                    <Text className="learned-card-meaning" numberOfLines={1}>{item.meaning}</Text>
                  </View>
                  <View className="learned-card-right">
                    <AtTag size="small" customStyle={{ background: '#FDF3E7', color: '#8B6914', borderColor: '#E8D5B7' }}>
                      {item.category}
                    </AtTag>
                    <Text className="learned-card-diff">{'★'.repeat(item.difficulty)}</Text>
                  </View>
                </View>
                <View className="learned-card-action" onClick={() => this.removeLearned(item.id)}>
                  <Text className="remove-text">取消标记</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    );
  }
}

export default Learned;
