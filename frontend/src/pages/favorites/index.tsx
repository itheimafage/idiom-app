import { Component } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { AtActivityIndicator, AtTag } from 'taro-ui';
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
}

class Favorites extends Component<{}, State> {
  state: State = {
    list: [],
    loading: true,
  };

  componentDidShow() {
    this.loadFavorites();
  }

  loadFavorites = async () => {
    try {
      const favoriteIds: number[] = Taro.getStorageSync('favorite_ids') || [];
      if (favoriteIds.length === 0) {
        this.setState({ list: [], loading: false });
        return;
      }

      // Fetch all favorites one by one (simpler approach for mini-program)
      const idioms: Idiom[] = [];
      for (const id of favoriteIds) {
        try {
          const res = await apiClient.post<{ success: boolean; data: Idiom }>(
            '/api/idioms/detail',
            { id }
          );
          if (res.success) {
            idioms.push(res.data);
          }
        } catch (e) {
          // skip failed ones
        }
      }

      this.setState({ list: idioms, loading: false });
    } catch (e) {
      console.error('Failed to load favorites:', e);
      this.setState({ loading: false });
    }
  };

  goToDetail = (id: number) => {
    Taro.navigateTo({
      url: `/pages/detail/index?id=${id}`,
    });
  };

  removeFavorite = (id: number) => {
    try {
      let favorites: number[] = Taro.getStorageSync('favorite_ids') || [];
      favorites = favorites.filter(fid => fid !== id);
      Taro.setStorageSync('favorite_ids', favorites);
      this.setState({
        list: this.state.list.filter(item => item.id !== id),
      });
      Taro.showToast({ title: '已取消收藏', icon: 'none' });
    } catch (e) {
      console.error('Remove favorite failed:', e);
    }
  };

  render() {
    const { list, loading } = this.state;

    if (loading) {
      return (
        <View className="fav-loading">
          <AtActivityIndicator mode="center" content="加载中..." />
        </View>
      );
    }

    return (
      <View className="fav-container">
        {list.length === 0 ? (
          <View className="fav-empty">
            <Text className="empty-icon">📚</Text>
            <Text className="empty-title">还没有收藏成语</Text>
            <Text className="empty-desc">浏览成语时点击收藏按钮即可添加</Text>
            <View className="empty-btn" onClick={() => Taro.navigateTo({ url: '/pages/list/index' })}>
              <Text>去浏览成语</Text>
            </View>
          </View>
        ) : (
          <ScrollView scrollY className="fav-list">
            <View className="fav-count">
              <Text>共收藏 {list.length} 个成语</Text>
            </View>
            {list.map(item => (
              <View key={item.id} className="fav-card">
                <View
                  className="fav-card-main"
                  onClick={() => this.goToDetail(item.id)}
                >
                  <View className="fav-card-left">
                    <Text className="fav-card-name">{item.name}</Text>
                    <Text className="fav-card-pinyin">{item.pinyin}</Text>
                    <Text className="fav-card-meaning" numberOfLines={1}>{item.meaning}</Text>
                  </View>
                  <View className="fav-card-right">
                    <AtTag size="small" customStyle={{ background: '#FDF3E7', color: '#8B6914', borderColor: '#E8D5B7' }}>
                      {item.category}
                    </AtTag>
                    <Text className="fav-card-diff">{'★'.repeat(item.difficulty)}</Text>
                  </View>
                </View>
                <View className="fav-card-action" onClick={() => this.removeFavorite(item.id)}>
                  <Text className="remove-text">取消收藏</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    );
  }
}

export default Favorites;
