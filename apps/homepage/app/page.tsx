"use client"

import React, { useCallback, useEffect } from 'react';
import Header from '../components/Header';
import Particles from "react-particles";
import { loadSlim } from "tsparticles-slim";
import '../styles/default.css'
import '../styles/responsive.css'
import ShrunkHeroArea from '../components/ShrunkHeroArea';
import Section1 from '../components/Section1';
import FeaturesSection from '../components/FeaturesSection';
import Footer from '../components/Footer';


const activateElementsSequentially = (elements) => {
  document.title = 'SynTag';
  let indexArr = [];

  const callback = (entries, observer) => {
    entries.forEach((entry) => {
      const index = Array.from(elements).indexOf(entry.target);
      if (entry.isIntersecting === true) {
        indexArr.push(index);
      }
    });
    setActive();
  };

  const setActive = () => {
    if(indexArr.length > 0){
      let index = indexArr[0];
      const elm = elements[index];
      elm.classList.add('active');
      indexArr.shift();
  
      elm.addEventListener('transitionend', () => {
        setActive(indexArr);
      }, { once: true });
    }
  };

  const isElementInView = (element) => {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  };
  
  let currentObserver = null;
  window.addEventListener('scroll', () => {
    if(indexArr.length === 0) return;
    const indx = indexArr[0];
    const elm = elements[indx];
    const x = isElementInView(elm);
    if(x && !elm.classList.contains('active')) elm.classList.add('active');
  });

  // Initialize the first observer
  currentObserver = new IntersectionObserver(callback, {
    root: null,
    rootMargin: '0px',
    threshold: [0.75, 0.5, 0.25, 0] // Initial thresholds when scrolling up
  });

  elements.forEach(element => {
    currentObserver.observe(element);
  });
};


export default function Home() {
  const particlesInit = useCallback(async engine => {
    await loadSlim(engine);
  }, []);

  useEffect(() => {
    const animateElements = document.querySelectorAll('.animate');
    activateElementsSequentially(animateElements);
  })
  return (
    <div>
      <Header logowidth={100} />
      <div className="header-and-hero-area">
        <ShrunkHeroArea />
        <Particles
          id="tsparticles"
          init={particlesInit}
          options={{
            style: {
              position: 'absolute'
            },
            background: {
              color: {
                value: "#0000",
              },
            },
            fpsLimit: 120,
            interactivity: {
              events: {
                onClick: {
                  enable: false,
                  mode: "push",
                },
                onHover: {
                  enable: false,
                  mode: "repulse",
                },
                resize: true,
              },
              modes: {
                push: {
                  quantity: 4,
                },
                repulse: {
                  distance: 200,
                  duration: 0.4,
                },
              },
            },
            particles: {
              color: {
                value: "#ffffff",
              },
              links: {
                color: "#ffffff",
                distance: 150,
                enable: true,
                opacity: 0.5,
                width: 1,
              },
              move: {
                direction: "none",
                enable: true,
                outModes: {
                  default: "bounce",
                },
                random: false,
                speed: 1,
                straight: false,
              },
              number: {
                density: {
                  enable: true,
                  area: 800,
                },
                value: 80,
              },
              opacity: {
                value: 0.5,
              },
              shape: {
                type: "circle",
              },
              size: {
                value: { min: 1, max: 5 },
              },
              zIndex: -1
            },
            detectRetina: true
          }}
        />
      </div>
      {/* <Features /> */}
      {/* <Demo /> */}
      <FeaturesSection />
      <Section1 />
      <Footer />
    </div>
  );
};