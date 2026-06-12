import { Component } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { AtSearchBar, AtTag, AtLoadMore, AtActivityIndicator } from 'taro-ui';
import { apiClient } from '../../services/api-client';
import './index.scss';

interface Idiom {
  id: number;
  name: string;
  pinyin: string;
  meaning: string;
  category: string;
  difficulty: number;
  firstLetter: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface State {
  list: Idiom[];
  pagination: Pagination | null;
  searchValue: string;
  activeCategory: string;
  activeLetter: string;
  activeDifficulty: number;
  loading: boolean;
  loadingMore: boolean;
  showFilters: boolean;
  categories: { name: string; count: number }[];
}

class List extends Component<{}, State> {
  state: State = {
    list: [],
    pagination: null,
    searchValue: '',
    activeCategory: '',
    activeLetter: '',
    activeDifficulty: 0,
    loading: true,
    loadingMore: false,
    showFilters: false,
    categories: [],
  };

  // 从 hash 路由中手动解析参数（Taro H5 模式下 getCurrentInstance().router?.params 可能为空）
  getParamsFromHash(): { keyword?: string; category?: string; letter?: string } {
    try {
      // 小程序环境没有 window，跳过
      if (typeof window === 'undefined') return {};
      const hash = window.location.hash;
      const queryIndex = hash.indexOf('?');
      if (queryIndex === -1) return {};
      const queryStr = hash.substring(queryIndex + 1);
      const params: Record<string, string> = {};
      queryStr.split('&').forEach(pair => {
        const [key, val] = pair.split('=');
        if (key && val) params[key] = decodeURIComponent(val);
      });
      return params;
    } catch {
      return {};
    }
  }

  async componentDidMount() {
    const routerParams = Taro.getCurrentInstance().router?.params || {};
    const hashParams = this.getParamsFromHash();
    // 合并参数，hash 参数优先
    const params = { ...routerParams, ...hashParams };
    const { keyword, category, letter } = params;

    this.setState({
      searchValue: keyword ? decodeURIComponent(keyword) : '',
      activeCategory: category || '',
      activeLetter: letter || '',
    }, () => {
      this.fetchCategories();
      if (keyword) {
        this.doSearch();
      } else {
        this.fetchList();
      }
    });
  }

  fetchCategories = async () => {
    try {
      const res = await apiClient.post<{ success: boolean; data: { categories: { name: string; count: number }[] } }>('/api/idioms/categories');
      if (res.success) {
        this.setState({ categories: res.data.categories });
      }
    } catch (e) {
      console.error('Failed to fetch categories:', e);
    }
  };

  fetchList = async (page = 1, append = false) => {
    const { activeCategory, activeLetter, activeDifficulty } = this.state;
    try {
      const body: any = { page, pageSize: 20 };
      if (activeCategory) body.category = activeCategory;
      if (activeLetter) body.firstLetter = activeLetter;
      if (activeDifficulty > 0) body.difficulty = activeDifficulty;

      const res = await apiClient.post<{ success: boolean; data: { items: Idiom[]; pagination: Pagination } }>(
        '/api/idioms/list',
        body
      );

      if (res.success) {
        this.setState({
          list: append ? [...this.state.list, ...res.data.items] : res.data.items,
          pagination: res.data.pagination,
        });
      }
    } catch (e) {
      console.error('Failed to fetch list:', e);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setState({ loading: false, loadingMore: false });
    }
  };

  doSearch = async (page = 1, append = false) => {
    const { searchValue } = this.state;
    if (!searchValue.trim()) {
      this.fetchList();
      return;
    }

    try {
      const res = await apiClient.post<{ success: boolean; data: { items: Idiom[]; pagination: Pagination } }>(
        '/api/idioms/search',
        { keyword: searchValue.trim(), page, pageSize: 20 }
      );

      if (res.success) {
        this.setState({
          list: append ? [...this.state.list, ...res.data.items] : res.data.items,
          pagination: res.data.pagination,
        });
      }
    } catch (e) {
      console.error('Search failed:', e);
      Taro.showToast({ title: '搜索失败', icon: 'none' });
    } finally {
      this.setState({ loading: false, loadingMore: false });
    }
  };

  handleSearchChange = (value: string) => {
    this.setState({ searchValue: value });
    if (!value.trim()) {
      this.setState({ loading: true }, () => this.fetchList());
    }
  };

  handleSearchConfirm = () => {
    this.setState({ loading: true }, () => this.doSearch());
  };

  handleLoadMore = () => {
    const { pagination, loadingMore, searchValue } = this.state;
    if (loadingMore || !pagination?.hasMore) return;

    this.setState({ loadingMore: true }, () => {
      const nextPage = (pagination?.page || 1) + 1;
      if (searchValue.trim()) {
        this.doSearch(nextPage, true);
      } else {
        this.fetchList(nextPage, true);
      }
    });
  };

  handleRefresh = () => {
    this.setState({ loading: true }, () => {
      if (this.state.searchValue.trim()) {
        this.doSearch();
      } else {
        this.fetchList();
      }
    });
  };

  handleCategorySelect = (cat: string) => {
    this.setState({
      activeCategory: cat === this.state.activeCategory ? '' : cat,
      loading: true,
      showFilters: false,
    }, () => this.fetchList());
  };

  handleLetterSelect = (letter: string) => {
    this.setState({
      activeLetter: letter === this.state.activeLetter ? '' : letter,
      loading: true,
      showFilters: false,
    }, () => this.fetchList());
  };

  handleDifficultySelect = (diff: number) => {
    this.setState({
      activeDifficulty: diff === this.state.activeDifficulty ? 0 : diff,
      loading: true,
      showFilters: false,
    }, () => this.fetchList());
  };

  goToDetail = (id: number) => {
    Taro.navigateTo({
      url: `/pages/detail/index?id=${id}`,
    });
  };

  toggleFilters = () => {
    this.setState({ showFilters: !this.state.showFilters });
  };

  render() {
    const {
      list, pagination, searchValue, loading, loadingMore,
      activeCategory, activeLetter, activeDifficulty, showFilters, categories,
    } = this.state;

    const hasFilters = activeCategory || activeLetter || activeDifficulty > 0;

    return (
      <View className="list-container">
        {/* 搜索栏 */}
        <View className="list-search-bar">
          <AtSearchBar
            value={searchValue}
            onChange={this.handleSearchChange}
            onActionClick={this.handleSearchConfirm}
            placeholder="搜索成语..."
          />
        </View>

        {/* 筛选栏 */}
        <View className="filter-bar">
          <View
            className={`filter-tag ${showFilters ? 'active' : ''}`}
            onClick={this.toggleFilters}
          >
            <Text className="filter-icon">筛选</Text>
            {hasFilters && <Text className="filter-dot" />}
          </View>

          <ScrollView scrollX className="filter-scroll">
            {activeCategory && (
              <View className="active-filter" onClick={() => this.handleCategorySelect(activeCategory)}>
                <Text>{activeCategory} ✕</Text>
              </View>
            )}
            {activeLetter && (
              <View className="active-filter" onClick={() => this.handleLetterSelect(activeLetter)}>
                <Text>{activeLetter} ✕</Text>
              </View>
            )}
            {activeDifficulty > 0 && (
              <View className="active-filter" onClick={() => this.handleDifficultySelect(activeDifficulty)}>
                <Text>{'★'.repeat(activeDifficulty)} ✕</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* 筛选面板 */}
        {showFilters && (
          <View className="filter-panel">
            <View className="filter-group">
              <Text className="filter-group-title">难度</Text>
              <View className="filter-options">
                {[1, 2, 3].map(d => (
                  <View
                    key={d}
                    className={`filter-option ${activeDifficulty === d ? 'selected' : ''}`}
                    onClick={() => this.handleDifficultySelect(d)}
                  >
                    <Text>{'★'.repeat(d)}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View className="filter-group">
              <Text className="filter-group-title">拼音首字母</Text>
              <View className="filter-options letter-options">
                {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l => (
                  <View
                    key={l}
                    className={`filter-option letter-opt ${activeLetter === l ? 'selected' : ''}`}
                    onClick={() => this.handleLetterSelect(l)}
                  >
                    <Text>{l}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View className="filter-group">
              <Text className="filter-group-title">分类</Text>
              <View className="filter-options">
                {categories.map(cat => (
                  <View
                    key={cat.name}
                    className={`filter-option ${activeCategory === cat.name ? 'selected' : ''}`}
                    onClick={() => this.handleCategorySelect(cat.name)}
                  >
                    <Text>{cat.name} ({cat.count})</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* 结果统计 */}
        {pagination && (
          <View className="result-count">
            <Text>共 {pagination.total} 个成语</Text>
          </View>
        )}

        {/* 列表 */}
        {loading ? (
          <View className="loading-container">
            <AtActivityIndicator mode="center" content="加载中..." />
          </View>
        ) : list.length === 0 ? (
          <View className="empty-container">
            <Text className="empty-icon">📭</Text>
            <Text className="empty-text">没有找到相关词条</Text>
            <Text className="empty-hint">换个分类或关键词试试吧</Text>
          </View>
        ) : (
          <ScrollView
            scrollY
            className="list-scroll"
            onScrollToLower={this.handleLoadMore}
            lowerThreshold={100}
          >
            {list.map(item => (
              <View
                key={item.id}
                className="idiom-card"
                onClick={() => this.goToDetail(item.id)}
              >
                <View className="card-left">
                  <View className="card-header">
                    <Text className="card-name">{item.name}</Text>
                    <Text className="card-pinyin">{item.pinyin}</Text>
                  </View>
                  <Text className="card-meaning">{item.meaning}</Text>
                </View>
                <View className="card-right">
                  <Text className="card-category">{item.category}</Text>
                  <Text className="card-difficulty">
                    {'★'.repeat(item.difficulty || 1)}
                  </Text>
                </View>
                <Text className="card-arrow">›</Text>
              </View>
            ))}

            {pagination && (
              <AtLoadMore
                status={loadingMore ? 'loading' : pagination.hasMore ? 'more' : 'noMore'}
                noMoreText="已加载全部成语"
              />
            )}
          </ScrollView>
        )}
      </View>
    );
  }
}

export default List;
