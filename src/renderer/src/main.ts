import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@fontsource/chakra-petch/500.css'
import '@fontsource/chakra-petch/600.css'
import '@fontsource/chakra-petch/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/700.css'
import './assets/styles.css'

if (location.hash === '#guide-panel') {
  // Secondary guide panel window — standalone view, no dashboard
  import('./views/GuidePanelView.vue').then(({ default: GuidePanelView }) => {
    const app = createApp(GuidePanelView)
    app.use(createPinia())
    app.mount('#app')
  })
} else {
  import('./App.vue').then(({ default: App }) => {
    const app = createApp(App)
    app.use(createPinia())
    app.mount('#app')
  })
}
