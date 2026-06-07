import { useEffect, useMemo, useRef, useState } from "react";
import { fetchBackendBlob } from "../api/client";

const FALLBACK_DURATION_MS = 1200;
const MEDIA_FETCH_TIMEOUT_MS = 10000;

type StimulusPlaybackProps = {
  src?: string;
  playing: boolean;
  autoplayToken?: number;
  onEnded?: () => void;
  onError?: (message: string) => void;
};

export default function StimulusPlayback({
  src,
  playing,
  autoplayToken,
  onEnded,
  onError,
}: StimulusPlaybackProps) {
  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null);
  const finishedRef = useRef(false);
  const onEndedRef = useRef(onEnded);
  const onErrorRef = useRef(onError);
  const [loadedMedia, setLoadedMedia] = useState<{
    source?: string;
    objectUrl: string;
    error: string;
  }>({ objectUrl: "", error: "" });
  const [blockedPlayback, setBlockedPlayback] = useState<{
    token?: number;
    message: string;
  }>({ message: "" });
  const isVideo = useMemo(() => /\.(mp4|webm|ogg)$/i.test(src ?? ""), [src]);
  const mediaSrc = loadedMedia.source === src ? loadedMedia.objectUrl : "";
  const mediaLoadError = loadedMedia.source === src ? loadedMedia.error : "";
  const blockedMessage =
    blockedPlayback.token === autoplayToken ? blockedPlayback.message : "";

  useEffect(() => {
    onEndedRef.current = onEnded;
    onErrorRef.current = onError;
  }, [onEnded, onError]);

  useEffect(() => {
    let isMounted = true;
    let objectUrl = "";
    const abortController = new AbortController();

    if (!src) {
      return undefined;
    }

    fetchBackendBlob(src, {
      signal: abortController.signal,
      timeoutMs: MEDIA_FETCH_TIMEOUT_MS,
    })
      .then((blob) => {
        if (!isMounted) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setLoadedMedia({ source: src, objectUrl, error: "" });
      })
      .catch((caught) => {
        if (!isMounted) {
          return;
        }
        setLoadedMedia({
          source: src,
          objectUrl: "",
          error:
            caught instanceof Error
              ? caught.message
              : "Stimulus media failed to load",
        });
      });

    return () => {
      isMounted = false;
      abortController.abort();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  useEffect(() => {
    finishedRef.current = false;

    if (!playing || autoplayToken === undefined) {
      return undefined;
    }

    let fallbackId: number | undefined;

    function finish() {
      if (finishedRef.current) {
        return;
      }
      finishedRef.current = true;
      if (fallbackId !== undefined) {
        window.clearTimeout(fallbackId);
      }
      onEndedRef.current?.();
    }

    function scheduleFallback(message: string) {
      console.warn(message, { src });
      onErrorRef.current?.(message);
      setBlockedPlayback({ token: autoplayToken, message });
      fallbackId = window.setTimeout(finish, FALLBACK_DURATION_MS);
    }

    function blockForManualPlayback(message: string) {
      console.warn(message, { src });
      onErrorRef.current?.(message);
      setBlockedPlayback({ token: autoplayToken, message });
    }

    if (!src) {
      scheduleFallback("No stimulus source was provided");
      return () => window.clearTimeout(fallbackId);
    }

    if (mediaLoadError) {
      scheduleFallback(mediaLoadError);
      return () => window.clearTimeout(fallbackId);
    }

    if (!mediaSrc) {
      return undefined;
    }

    const media = mediaRef.current;
    if (!media) {
      fallbackId = window.setTimeout(finish, FALLBACK_DURATION_MS);
      return () => window.clearTimeout(fallbackId);
    }

    function handleMediaError() {
      scheduleFallback("Stimulus media failed to load");
    }

    media.addEventListener("ended", finish);
    media.addEventListener("error", handleMediaError);
    media.currentTime = 0;
    media.muted = false;
    media.defaultMuted = false;
    media.volume = 1;
    const playPromise = media.play();

    if (playPromise !== undefined) {
      playPromise.catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : "Stimulus playback failed";
        blockForManualPlayback(message);
      });
    }

    return () => {
      if (fallbackId !== undefined) {
        window.clearTimeout(fallbackId);
      }
      media.removeEventListener("ended", finish);
      media.removeEventListener("error", handleMediaError);
      media.pause();
    };
  }, [autoplayToken, mediaLoadError, mediaSrc, src, playing]);

  async function handleManualPlay() {
    const media = mediaRef.current;
    if (!media) {
      return;
    }

    setBlockedPlayback({ token: autoplayToken, message: "" });
    try {
      media.currentTime = 0;
      media.muted = false;
      media.defaultMuted = false;
      media.volume = 1;
      await media.play();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Stimulus playback failed";
      setBlockedPlayback({ token: autoplayToken, message });
      onErrorRef.current?.(message);
    }
  }

  if (!src) {
    return null;
  }

  const fallbackButton = blockedMessage ? (
    <button className="media-play-button" type="button" onClick={handleManualPlay}>
      Play
    </button>
  ) : null;

  if (!mediaSrc) {
    return fallbackButton;
  }

  // These media files may be legacy video derivatives; React owns the visible stimulus display.
  if (isVideo) {
    return (
      <>
        <video
          ref={(node) => {
            mediaRef.current = node;
          }}
          className="stimulus-media stimulus-media-hidden"
          playsInline
          preload="auto"
          src={mediaSrc}
        />
        {fallbackButton}
      </>
    );
  }

  return (
    <>
      <audio
        ref={(node) => {
          mediaRef.current = node;
        }}
        preload="auto"
        src={mediaSrc}
      />
      {fallbackButton}
    </>
  );
}
