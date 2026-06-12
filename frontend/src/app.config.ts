export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/list/index',
    'pages/detail/index',
    'pages/favorites/index',
    'pages/learned/index',
    'pages/quiz/index',
    'pages/wrongbook/index',
    'pages/analytics/index',
    'pages/synonym/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#D35400',
    navigationBarTitleText: '花生成语800词',
    navigationBarTextStyle: 'white',
  },
})

function defineAppConfig(config: any) {
  return config
}
