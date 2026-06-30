'use client'

import { useEffect, useRef } from 'react'

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    YT?: any
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<void> | null = null
function loadYouTubeApi(): Promise<void> {
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve()
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve()
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  })
  return apiPromise
}

// Video de fondo de un ejercicio: autoplay silenciado en loop. Usa la IFrame API
// para forzar mute + play en onReady (mejor autoplay en mobile que el iframe simple).
export default function ExerciseVideo({ videoId, title }: { videoId: string; title?: string }) {
  const holderRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)

  useEffect(() => {
    let cancelled = false
    // iOS suele bloquear el autoplay aun en silencio: al primer toque/click en
    // cualquier parte de la pantalla, forzamos la reproducción (gesto del usuario).
    const kick = () => {
      try {
        playerRef.current?.mute()
        playerRef.current?.playVideo()
      } catch {
        /* noop */
      }
    }
    document.addEventListener('pointerdown', kick, { passive: true })
    loadYouTubeApi().then(() => {
      if (cancelled || !holderRef.current) return
      playerRef.current = new window.YT.Player(holderRef.current, {
        videoId,
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          loop: 1,
          playlist: videoId,
          playsinline: 1,
          modestbranding: 1,
          rel: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
        },
        events: {
          onReady: (e: any) => {
            e.target.mute()
            e.target.playVideo()
          },
          onStateChange: (e: any) => {
            // Re-loopea por las dudas (algunos navegadores ignoran loop).
            if (e.data === window.YT?.PlayerState?.ENDED) {
              e.target.seekTo(0)
              e.target.playVideo()
            }
          },
        },
      })
    })
    return () => {
      cancelled = true
      document.removeEventListener('pointerdown', kick)
      try {
        playerRef.current?.destroy()
      } catch {
        /* noop */
      }
    }
  }, [videoId])

  return <div ref={holderRef} title={title} />
}
