export interface LiveKitTokenResponse {
  token: string
  url: string
}

export const livekit = {
  getAccessToken: async (): Promise<LiveKitTokenResponse> => {
    throw new Error("LiveKit is disabled in this build.")
  },
}