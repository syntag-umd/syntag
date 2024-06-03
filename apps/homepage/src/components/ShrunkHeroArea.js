import React, { useState, useEffect } from 'react';
import phone from '../assets/phone.png';
import acceptCall from '../assets/accept-call.json';
import waitForConnection from '../assets/wait-for-connection.json';
import Lottie from 'react-lottie';
import '../styles/play-pause.css';
import { useVapi, CALL_STATUS } from '../UseVapi.ts';

export default function ShrunkHeroArea() {
    const { callStatus, toggleCall } = useVapi();

    const defaultOptions = {
        loop: true,
        autoplay: true,
        animationData: acceptCall,
        rendererSettings: {
            preserveAspectRatio: 'xMidYMid slice',
        },
    };

    const waitForConnectionOptions = {
        loop: true,
        autoplay: true,
        animationData: waitForConnection,
        rendererSettings: {
            preserveAspectRatio: 'xMidYMid slice',
        },
    };

    return (
        <div className="hero-demo-container">
            <div className="container">
                <div className="grid">
                    <div className="hero-content">
                        <h1 className="animate">Elevate <span>customer satisfaction</span> and <span>conversion</span></h1>
                        <p className="sub-header animate">Use Voice + RAG agents accessable through a phone number</p>
                        <div className="cta-buttons animate">
                            {callStatus === CALL_STATUS.INACTIVE && (
                                <button className="cta" onClick={toggleCall}>Try out now</button>
                            )}
                            {callStatus === CALL_STATUS.LOADING && (
                                <button className="cta" disabled>Connecting...</button>
                            )}
                            {callStatus === CALL_STATUS.ACTIVE && (
                                <button className="cta" onClick={toggleCall}>End Call</button>
                            )}
                            <a href="https://dashboard.syntag.ai/" className="cta">Create your own</a>
                        </div>
                    </div>
                    <div className="demo-content">
                        <div className="phone-container">
                            <img src={phone} alt="" />
                            <div className="phone-inner">
                                <h2>Mike Smith</h2>
                                <p>+1 (510) 721 3875</p>
                                <div className="remind-message-container">
                                    <div>
                                        <span>
                                            <svg viewBox="0 0 512 512">
                                                <path d="M381.2 64.1c-1.3-.1-2.6-.1-3.9-.1h-.2c-16.2 0-32 5.4-44.6 15.1-1.6 1.3-2.6 3.2-2.7 5.2-.1 2 .8 4 2.3 5.4l89.8 80.5c1.3 1.1 2.9 1.8 4.6 1.8h.4c1.9-.1 3.6-1 4.8-2.4C440.9 159 448 150.8 448 133c.1-36.4-29.1-66.8-66.8-68.9zM64 133c0 17.8 7.1 26 16.3 36.6 1.2 1.4 2.9 2.3 4.8 2.4h.4c1.7 0 3.3-.6 4.6-1.8L180 89.7c1.5-1.4 2.4-3.3 2.3-5.4-.1-2-1-3.9-2.7-5.2C167 69.4 151.2 64 135 64h-.2c-1.3 0-2.6 0-3.9.1-37.7 2.1-67 32.5-66.9 68.9z" />
                                                <g>
                                                    <path d="M390 386c26.2-30.7 42-70.5 42-114 0-97.2-78.8-176-176-176S80 174.8 80 272c0 43.5 15.8 83.3 42 114l-34.7 35.5c-6.2 6.3-6 15.5.3 21.6 3.1 3 7.4 4.8 11.4 4.8 4.2 0 8.1-1.9 11.2-5.1l34.6-34.5c30.3 24.7 69 39.6 111.2 39.6s80.9-14.8 111.2-39.6l33.6 34.5c3.1 3.2 7.3 5.1 11.5 5.1 4 0 8.1-1.8 11.2-4.8 6.3-6.2 7.5-15.3 1.3-21.6L390 386zM270 274c0 7.7-6.3 14-14 14h-82c-7.7 0-14-6.3-14-14s6.3-14 14-14h68V158c0-7.7 6.3-14 14-14s14 6.3 14 14v116z" />
                                                </g>
                                            </svg>
                                        </span>
                                        <p>Remind Me</p>
                                    </div>
                                    <div>
                                        <span>
                                            <svg viewBox="0 0 1024 1024" version="1.1">
                                                <path d="M512 91.428571C229.302857 91.428571 0 279.588571 0 512a374.674286 374.674286 0 0 0 111.177143 261.302857 470.125714 470.125714 0 0 1-103.497143 118.674286 23.405714 23.405714 0 0 0 18.285714 40.228571c82.285714 3.657143 183.954286-15.542857 272.822857-38.217143A603.428571 603.428571 0 0 0 512 932.571429c282.697143 0 512-188.342857 512-420.571429S794.697143 91.428571 512 91.428571zM274.285714 320.365714a18.285714 18.285714 0 0 1 18.285715-18.285714h219.428571a18.285714 18.285714 0 0 1 18.285714 18.285714v36.571429a18.285714 18.285714 0 0 1-18.285714 18.285714H292.571429a18.285714 18.285714 0 0 1-18.285715-18.285714z m475.428572 347.428572a18.285714 18.285714 0 0 1-18.285715 18.285714H292.571429a18.285714 18.285714 0 0 1-18.285715-18.285714v-36.571429a18.285714 18.285714 0 0 1 18.285715-18.285714h438.857142a18.285714 18.285714 0 0 1 18.285715 18.285714zM749.714286 512a18.285714 18.285714 0 0 1-18.285715 18.285714H292.571429a18.285714 18.285714 0 0 1-18.285715-18.285714v-36.571429a18.285714 18.285714 0 0 1 18.285715-18.285714h438.857142a18.285714 18.285714 0 0 1 18.285715 18.285714z" />
                                            </svg>
                                        </span>
                                        <p>Message</p>
                                    </div>
                                </div>
                                <div className="call-option-button">
                                    {callStatus === CALL_STATUS.INACTIVE && (
                                        <>
                                            <button onClick={toggleCall} className="call-button">
                                                <Lottie options={defaultOptions} height={70} width={70} />
                                            </button>
                                            <p className="call-button-text">Accept Call</p>
                                        </>
                                    )}
                                    {callStatus === CALL_STATUS.LOADING && (
                                        <div className="lottie-container" style={{ width: '100%' }}>
                                            <Lottie options={waitForConnectionOptions} height={40} width={70} />
                                        </div>
                                    )}
                                    {callStatus === CALL_STATUS.ACTIVE && (
                                        <>
                                            <button onClick={toggleCall} className="call-button end-call-button">
                                                <svg fill="#ffffff" xmlns="http://www.w3.org/2000/svg" width="800px" height="800px" viewBox="0 0 52 52" enable-background="new 0 0 52 52" stroke="#ffffff">

                                                    <g id="SVGRepo_bgCarrier" stroke-width="0" />

                                                    <g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round" />

                                                    <g id="SVGRepo_iconCarrier"> <path d="M48.5,5.6l-2.1-2.1C45.8,2.9,44.7,3,44,3.8L20.5,27.3l-5-5.6c-0.6-0.6-0.6-1.4-0.2-2.1l3.8-5.2 c1.1-1.4,1-3.4-0.1-4.8l-4.9-6.1c-1.5-1.8-4.2-2-5.9-0.3L3,8.4c-0.8,0.8-1.2,1.9-1.2,3c0.5,9.2,4.2,18,10,24.6l-8,8 c-0.7,0.7-0.8,1.8-0.3,2.4l2.1,2.1C6.2,49.1,7.3,49,8,48.2L48.2,8C49,7.3,49.1,6.2,48.5,5.6z" /> <path d="M48.5,37.9L42.4,33c-1.4-1.1-3.4-1.2-4.8-0.1l-5.2,3.8c-0.6,0.5-1.5,0.4-2.1-0.2l-2.4-2.2l-8.5,8.5 c6.1,4.1,13.4,6.8,21,7.2c1.1,0.1,2.2-0.4,3-1.2l5.2-5.2C50.5,42.1,50.4,39.3,48.5,37.9z" /> </g>

                                                </svg>
                                            </button>
                                            <p className="call-button-text">End Call</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}