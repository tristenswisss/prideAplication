// supabaseConfig.ts
import "react-native-url-polyfill/auto"
import { createClient } from "@supabase/supabase-js"
import AsyncStorage from "@react-native-async-storage/async-storage"
import Constants from "expo-constants"

const fromEnv = (value?: string) => (typeof value === 'string' ? value.trim() : '')

const envUrl = fromEnv(process.env.EXPO_PUBLIC_SUPABASE_URL as string)
const envKey = fromEnv(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string)

// Fallback to expo-constants extra if EXPO_PUBLIC_* are not present (production builds)
const extra = (Constants?.expoConfig as any)?.extra || (Constants?.manifest as any)?.extra || {}
const extraUrl = fromEnv(extra?.supabaseUrl)
const extraKey = fromEnv(extra?.supabaseAnonKey)

const supabaseUrl = envUrl || extraUrl
const supabaseAnonKey = envKey || extraKey

if (!supabaseUrl || !supabaseAnonKey) {
	console.warn(
		"Supabase configuration missing. Ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set or provided in expo.extra."
	)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	auth: {
		storage: AsyncStorage,
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: false,
	},
})

// Proper Supabase authentication functions
export const auth = {
	signUp: async (email: string, password: string, name: string) => {
		try {
			// Sign up with Supabase Auth
			const { data, error } = await supabase.auth.signUp({
				email,
				password,
				options: {
					data: {
						full_name: name, // Store the name in user metadata
					}
				}
			})

			if (error) {
				return { data: null, error }
			}

			return { data, error: null }
		} catch (error) {
			return {
				data: null,
				error: { message: "An unexpected error occurred during sign up" }
			}
		}
	},

	signIn: async (email: string, password: string) => {
		try {
			// First check if user is blocked
			const { data: userData, error: userError } = await supabase
				.from('users')
				.select('is_blocked')
				.eq('email', email)
				.single()

			if (userError && userError.code !== 'PGRST116') { // PGRST116 is "not found"
				return {
					data: null,
					error: { message: "An error occurred while checking account status" }
				}
			}

			if (userData?.is_blocked) {
				return {
					data: null,
					error: { message: "Your account has been blocked. Please contact support for assistance." }
				}
			}

			const { data, error } = await supabase.auth.signInWithPassword({
				email,
				password,
			})

			if (error) {
				return { data: null, error }
			}

			return { data, error: null }
		} catch (error) {
			return {
				data: null,
				error: { message: "An unexpected error occurred during sign in" }
			}
		}
	},

	signOut: async () => {
		try {
			const { error } = await supabase.auth.signOut()
			return { error }
		} catch (error) {
			return { error: { message: "An unexpected error occurred during sign out" } }
		}
	},

	getCurrentUser: async () => {
		try {
			const { data: { user }, error } = await supabase.auth.getUser()
			return { data: { user }, error }
		} catch (error) {
			return {
				data: { user: null },
				error: { message: "Failed to get current user" }
			}
		}
	},

	onAuthStateChange: (callback: (event: string, session: any) => void) => {
		return supabase.auth.onAuthStateChange(callback)
	}
}