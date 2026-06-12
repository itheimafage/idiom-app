import { Component } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { AtButton, AtActivityIndicator } from 'taro-ui';
import { apiClient } from '../../services/api-client';
import './index.scss';

interface SynonymPair {
  a: string;
  aMeaning: string;
  b: string;
  bMeaning: string;
  diff: string;
}

interface State {
  pair: SynonymPair | null;
  loading: boolean;
}

class Synonym extends Component<{}, State> {
  state: State = {
    pair: null,
    loading: true,
  };

  componentDidMount() {
    this.loadPair();
  }

  loadPair = async () => {
    this.setState({ loading: true });
    try {
      const res = await apiClient.post<{ success: boolean; data: SynonymPair }>(
        '/api/idioms/synonym-pair'
      );
      if (res.success) {
        this.setState({ pair: res.data, loading: false });
      } else {
        this.setState({ loading: false });
      }
    } catch (e) {
      this.setState({ loading: false });
    }
  };

  render() {
    const { pair, loading } = this.state;

    if (loading) {
      return (
        <View className="synonym-loading">
          <AtActivityIndicator mode="center" content="加载中..." />
        </View>
      );
    }

    if (!pair) {
      return (
        <View className="synonym-empty">
          <Text>加载失败，请重试</Text>
          <AtButton onClick={this.loadPair}>重试</AtButton>
        </View>
      );
    }

    return (
      <ScrollView className="synonym-container" scrollY>
        {/* 头部 */}
        <View className="synonym-header">
          <View className="header-icon-wrap">
            <Text className="header-icon">⚡</Text>
          </View>
          <Text className="header-title">近义成语辨析</Text>
          <Text className="header-subtitle">60组公考高频近义成语，帮你精准辨析</Text>
        </View>

        {/* PK卡片 */}
        <View className="pk-section">
          <View className="pk-card">
            <View className="pk-row">
              <View className="pk-col">
                <View className="pk-label left">成语A</View>
                <Text className="pk-word left">{pair.a}</Text>
                <Text className="pk-meaning">{pair.aMeaning}</Text>
              </View>

              <View className="pk-vs-wrap">
                <View className="pk-vs-circle">
                  <Text className="pk-vs">VS</Text>
                </View>
              </View>

              <View className="pk-col">
                <View className="pk-label right">成语B</View>
                <Text className="pk-word right">{pair.b}</Text>
                <Text className="pk-meaning">{pair.bMeaning}</Text>
              </View>
            </View>

            <View className="pk-diff-section">
              <View className="pk-diff-header">
                <Text className="pk-diff-icon">💡</Text>
                <Text className="pk-diff-title">辨析要点</Text>
              </View>
              <Text className="pk-diff-text">{pair.diff}</Text>
            </View>
          </View>
        </View>

        {/* 底部操作 */}
        <View className="synonym-bottom">
          <AtButton
            type="primary"
            customStyle={{
              background: 'linear-gradient(135deg, #E67E22, #D35400)',
              border: 'none',
              borderRadius: '20px',
              height: '96px',
              lineHeight: '96px',
              fontSize: '32px',
              fontWeight: '800',
              letterSpacing: '4px',
              boxShadow: '0 8px 24px rgba(211, 84, 0, 0.3)',
              marginBottom: '16px',
            }}
            onClick={this.loadPair}
          >
            换一组
          </AtButton>
          <AtButton
            customStyle={{
              background: '#FFF5EB',
              color: '#D35400',
              border: '1px solid #FDEBD0',
              borderRadius: '16px',
              height: '80px',
              lineHeight: '80px',
              fontSize: '28px',
            }}
            onClick={() => Taro.navigateBack()}
          >
            返回首页
          </AtButton>
        </View>
      </ScrollView>
    );
  }
}

export default Synonym;
