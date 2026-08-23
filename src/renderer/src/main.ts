import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import '@fontsource/chakra-petch/500.css'
import '@fontsource/chakra-petch/600.css'
import '@fontsource/chakra-petch/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/700.css'
import './assets/styles.css'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
