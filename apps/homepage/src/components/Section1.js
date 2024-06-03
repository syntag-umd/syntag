import React, { useEffect } from 'react'

import createAgent from '../assets/box-images/create_agent.png';
import multipleLanguages from '../assets/box-images/multiple_languages.png';
import agents from '../assets/box-images/agents.png';

export default function Section1() {
    useEffect(() => {
        const stepItems = document.querySelectorAll('.step-items li');
        const stickies = document.querySelectorAll('.sticky-slider-right .img-container');
        const windowHeight = window.innerHeight;
        let windowCenter = windowHeight / 2, minus = 0;
        if(window.innerWidth < 600){
            minus = windowHeight / 10;
        }

        function checkVisibility() {
            const oldActive = document.querySelector('.step-items .active');
            const oldStickyActive = document.querySelector('.sticky-slider-right .img-container.active');

            stickies.forEach((sticky, i) => {
                const stickyTop = sticky.getBoundingClientRect().top - minus;
                if (stickyTop < windowCenter && stickyTop + sticky.offsetHeight > windowCenter) {
                    if(stepItems[i].classList.contains('active')) return;
                    if(oldActive){
                        oldActive.classList.remove('active');
                    }
                    if(oldStickyActive){
                        oldStickyActive.classList.remove('active');
                    }
                    sticky.classList.add('active');
                    stepItems[i].classList.add('active');
                    return
                }
            });
        }
        window.addEventListener('scroll', checkVisibility);
    })
    return (
        <>
            <div className='section1'>
                <div className="container">
                    <div className="headline">
                        <h1>Deploy Voice Agents With Ease</h1>
                        <p>It only takes three steps</p>
                    </div>
                    <div className="sticky-slider-container">
                        <div className="sticky-slider-left">
                            <div className="content">
                                <h2>Create, program, and deploy voice agents instantly</h2>
                                <ul className='step-items'>
                                    <li>Step 1: Create your voice agent</li>
                                    <li>Step 2: Configure the language, voice, and prompt</li>
                                    <li>Step 3: Deploy with a unique phone number</li>
                                </ul>
                            </div>
                        </div>
                        <div className="sticky-slider-right">
                            <div className="img-container">
                                <img src={createAgent} alt="" />
                            </div>
                            <div className="img-container">
                                <img src={multipleLanguages} alt="" />
                            </div>
                            <div className="img-container">
                                <img src={agents} alt="" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* <div className="create-account-sec">
                <div className="container">
                    <h2 className='create-syntag-account'>Create your SynTag account now, and your first phone number is on us for a year!</h2>
                    <div className="cta-container">
                        <button>Create account</button>
                    </div>
                </div>
            </div> */}
        </>
    )
}
