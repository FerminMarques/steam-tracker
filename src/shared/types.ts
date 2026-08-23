export interface SteamGame {
  appId: string
  name: string
}

export interface Achievement {
  apiName: string
  displayName: string
  description: string
  icon: string
  iconGray: string
  achieved: boolean
  unlockTime: number
  globalPercent: number
  currentProgress: number | null
  maxProgress: number | null
}

export interface Guide {
  id: string
  title: string
  shortDescription: string
  url: string
  domain: string
  is100Percent?: boolean
  votesUp?: number
  content?: string
}

/** Result of a main-process network call: data on success, human-readable error on failure */
export type ApiResult<T> = { data: T | null; error: string | null }

/** Normal "no game running" case is data:null, error:null */
export const ok = <T>(data: T | null): ApiResult<T> => ({ data, error: null })

export const fail = <T>(error: string): ApiResult<T> => ({ data: null, error })
