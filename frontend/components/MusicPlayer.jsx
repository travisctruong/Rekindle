import { useCallback, useEffect, useState } from 'react'
import './css/music-player.css'

function setMusicVolume(music, volume) {
    music.volume = volume
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) {
        return '0:00'
    }

    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

function getArtworkUrl(artwork) {
    if (typeof artwork !== 'string') {
        return ''
    }

    return artwork.replace('{w}', '96').replace('{h}', '96')
}

function MusicPlayer({ music, isConnected, queue = [], startIndex, playRequest }) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [volume, setVolume] = useState(1)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [isQueueOpen, setIsQueueOpen] = useState(false)

    const song = queue[currentIndex]
    const canPlay = isConnected && Boolean(music) && Boolean(song?.apple_music_id)

    const playQueueTrack = useCallback(async (index) => {
        const selectedSong = queue[index]
        if (!music || !selectedSong?.apple_music_id) {
            setError('This track does not have an Apple Music ID.')
            return
        }

        setError('')
        setIsLoading(true)
        setCurrentIndex(index)

        try {
            await music.setQueue({ song: selectedSong.apple_music_id })
            await music.play()
            setIsPlaying(true)
        } catch (playbackError) {
            setIsPlaying(false)
            setError(playbackError instanceof Error ? playbackError.message : 'Unable to play this track.')
        } finally {
            setIsLoading(false)
        }
    }, [music, queue])

    useEffect(() => {
        if (!playRequest || !isConnected) {
            return undefined
        }

        const timeoutId = window.setTimeout(() => {
            void playQueueTrack(startIndex)
        }, 0)
        return () => window.clearTimeout(timeoutId)
    }, [isConnected, playQueueTrack, playRequest, startIndex])

    useEffect(() => {
        if (!music || !isConnected) {
            return undefined
        }

        const updatePlayback = () => {
            const playbackTime = Number(music.currentPlaybackTime)
            const playbackDuration = Number(music.currentPlaybackDuration)

            if (Number.isFinite(playbackTime)) {
                setCurrentTime(playbackTime)
            }
            if (Number.isFinite(playbackDuration)) {
                setDuration(playbackDuration)
            }

            const playingState = window.MusicKit?.PlaybackStates?.playing
            if (playingState !== undefined && music.playbackState !== undefined) {
                setIsPlaying(music.playbackState === playingState)
            }
        }

        const intervalId = window.setInterval(updatePlayback, 500)
        return () => window.clearInterval(intervalId)
    }, [music, isConnected])

    async function togglePlayback() {
        if (!canPlay || isLoading) {
            return
        }

        setError('')
        setIsLoading(true)
        try {
            if (isPlaying) {
                await music.pause()
                setIsPlaying(false)
            } else {
                await music.setQueue({ song: song.apple_music_id })
                await music.play()
                setIsPlaying(true)
            }
        } catch (playbackError) {
            setError(playbackError instanceof Error ? playbackError.message : 'Unable to control playback.')
        } finally {
            setIsLoading(false)
        }
    }

    function seek(event) {
        const time = Number(event.target.value)
        setCurrentTime(time)
        if (music) {
            music.seekToTime(time).catch((seekError) => {
                setError(seekError instanceof Error ? seekError.message : 'Unable to seek in this track.')
            })
        }
    }

    function changeVolume(event) {
        const nextVolume = Number(event.target.value)
        setVolume(nextVolume)
        if (music) {
            setMusicVolume(music, nextVolume)
        }
    }

    function playNext() {
        if (currentIndex < queue.length - 1) {
            void playQueueTrack(currentIndex + 1)
        }
    }

    function playPrevious() {
        if (currentTime > 3 && song?.apple_music_id) {
            void playQueueTrack(currentIndex)
        } else if (currentIndex > 0) {
            void playQueueTrack(currentIndex - 1)
        }
    }

    return (
        <section className="music-player" aria-label="Apple Music player">
            <div className="music-player__track">
                {song?.artwork && <img src={getArtworkUrl(song.artwork)} alt="" width="56" height="56" />}
                <div className="music-player__track-details">
                    <strong>{song?.title ?? 'No song selected'}</strong>
                    <span>{song?.artist ?? (isConnected ? 'Choose a song to play' : 'Connect Apple Music to listen')}</span>
                </div>
            </div>

            <div className="music-player__center">
                <div className="music-player-actions__container">
                    <button
                        type="button"
                        aria-label="Previous track"
                        onClick={playPrevious}
                        disabled={!canPlay || isLoading}
                        que-icon="fast_rewind"
                    />
                    <button
                        type="button"
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                        onClick={togglePlayback}
                        disabled={!canPlay || isLoading}
                        que-icon={isLoading ? 'hourglass_empty' : isPlaying ? 'pause' : 'play_arrow'}
                    />
                    <button
                        type="button"
                        aria-label="Next track"
                        onClick={playNext}
                        disabled={!canPlay || isLoading || currentIndex >= queue.length - 1}
                        que-icon="fast_forward"
                    />
                </div>

                <div className="music-player-progress__container">
                    <span>{formatTime(currentTime)}</span>
                    <input
                        aria-label="Playback position"
                        type="range"
                        min="0"
                        max={duration || 0}
                        step="1"
                        value={Math.min(currentTime, duration || 0)}
                        onChange={seek}
                        disabled={!canPlay || !duration}
                    />
                    <span>{formatTime(duration)}</span>
                </div>
                {error && <p className="music-player__error" role="alert">{error}</p>}
            </div>

            <div className="music-player-settings__container">
                <button
                    type="button"
                    aria-label={isQueueOpen ? 'Hide queue' : 'Show queue'}
                    aria-expanded={isQueueOpen}
                    onClick={() => setIsQueueOpen((open) => !open)}
                    que-icon="queue_music"
                />
                <label className="music-player__volume">
                    <span className="visually-hidden">Volume</span>
                    <input
                        aria-label="Volume"
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={changeVolume}
                        disabled={!isConnected}
                    />
                </label>
            </div>

            {isQueueOpen && (
                <ol className="music-player__queue" aria-label="Playback queue">
                    {queue.map((queuedSong, index) => (
                        <li key={queuedSong.apple_music_id ?? queuedSong.id}>
                            <button
                                type="button"
                                className={index === currentIndex ? 'is-current' : ''}
                                onClick={() => void playQueueTrack(index)}
                                disabled={!isConnected || isLoading}
                            >
                                <span>{queuedSong.title}</span>
                                <span>{queuedSong.artist}</span>
                            </button>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    )
}

export default MusicPlayer
