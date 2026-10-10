import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')
    const token = env.token

    if (!token) {
        throw new Error('Missing token in .env. Add a non-empty token= value.')
    }

    return {
        define: {
            'import.meta.env.VITE_CHICAGO_APP_TOKEN': JSON.stringify(token)
        }
    }
})
