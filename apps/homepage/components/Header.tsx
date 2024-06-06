import React, { useEffect, useState } from 'react'
import logo from '../assets/logo.svg'
import Image from 'next/image';

export default function Header({ logowidth }) {
    const [menu, setMenu] = useState(false);
    let inp;
    const handleMenuBtn = () => {
        setMenu(inp.checked);
    }

    const viewFeatures = () => {
        document.querySelector('.features-container').scrollIntoView({behavior: 'smooth'});
    }
    const viewDemo = () => {
        document.querySelector('.demo').scrollIntoView({behavior: 'smooth'});
    }
    const viewCRMIntegration = () => {
        document.querySelector('.feature-features').scrollIntoView({behavior: 'smooth'});
    }

    useEffect(() => {
        window.onscroll = () => {
            setMenu(false)
            inp.checked = false;
        }
    })
    return (
        <div className='header-main'>
            <div className="container">
                <div className="header-inner">
                    <div className="logo-container">
                        <Image src={logo} width={logowidth} alt="" />
                    </div>
                    <div className={menu ? "menu-items active" : "menu-items"}>
                        {/* <p onClick={viewFeatures}>Features</p>
                        <p onClick={viewDemo}>Demo</p>
                        <p onClick={viewCRMIntegration}>Future Plans</p> */}
                        <a href="https://dashboard.syntag.ai/" className='create-account'>Create Account</a>
                    </div>
                    <div className="header-menu" onClick={handleMenuBtn}>
                        <input type="checkbox" ref={e => inp = e}/>
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        </div>
    )
}
