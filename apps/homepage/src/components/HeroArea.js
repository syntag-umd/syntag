import React, { useRef, useState } from 'react'
import audio from '../assets/audio/audio.mp3';
import '../styles/play-pause.css'

export default function HeroArea() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const audioRef = useRef(null);

    const handlePlay = () => {
        if (!isPlaying) {
            audioRef.current.play();
        } else {
            audioRef.current.pause();
        }
        setIsPlaying(!isPlaying);
    }

    const handleTimeUpdate = () => {
        const currentTime = audioRef.current.currentTime;
        const duration = audioRef.current.duration;
        const progressPercentage = (currentTime / duration) * 100;
        setProgress(progressPercentage);
    };
    return (
        <div className="hero-area-container">
            <div className='container'>
                <div className="inner-container">
                    <h1 className='animate'>Elevate <span>customer satisfaction</span> and <span>conversion</span></h1>
                    <p className='sub-header animate'>Use Voice + RAG agents accessable through a phone number</p>
                    <div className="cta-buttons animate">
                        {/* <button className="cta">Watch Video</button> */}
                        <button className="cta">Try out now</button>
                    </div>
                    <div className="play-button-container animate">
                        <div className="box-header">
                            <p>...or listen in.</p>
                        </div>
                        <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} style={{ display: 'none' }}>
                            <source src={audio} type="audio/mpeg" />
                        </audio>
                        <div className="play-button-and-bar">
                            <div className="play-button" onClick={handlePlay}>
                                <label htmlFor="checkbox">
                                    <div className={isPlaying ? 'play_pause_icon pause' : 'play_pause_icon play'}></div>
                                </label>
                            </div>
                            <div className="play-bar-container">
                                <span>
                                    <span style={{ width: `${progress}%` }}></span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
