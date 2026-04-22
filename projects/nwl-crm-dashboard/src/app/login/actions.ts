'use server'

import { AuthError } from 'next-auth'
import { signIn } from '@/auth'

export interface LoginState {
  error?: string
}

export async function loginAction(
  _prevState: LoginState | undefined,
  formData: FormData,
): Promise<LoginState> {
  try {
    await signIn('credentials', {
      username: formData.get('username'),
      password: formData.get('password'),
      redirectTo: '/dashboard',
    })
    return {}
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: 'Invalid username or password.' }
    }
    // Re-throw NEXT_REDIRECT so Next.js can perform the post-login redirect.
    throw e
  }
}
