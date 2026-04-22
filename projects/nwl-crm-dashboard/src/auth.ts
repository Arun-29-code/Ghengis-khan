import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Trust localhost in dev and the Vercel preview/prod host in deploy.
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const validUsername = process.env.DASHBOARD_USERNAME
        const validPassword = process.env.DASHBOARD_PASSWORD
        if (!validUsername || !validPassword) return null

        const username = typeof credentials?.username === 'string' ? credentials.username : ''
        const password = typeof credentials?.password === 'string' ? credentials.password : ''

        if (username === validUsername && password === validPassword) {
          return {
            id: '1',
            name: process.env.PRACTICE_NAME ?? 'Practice',
            email: username,
          }
        }
        return null
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
})
