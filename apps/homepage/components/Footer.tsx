import React from 'react'

export default function Footer() {
    return (
        <div className='footer'>
            <div className="container">
                <div className="footer-main">
                    <div className="box">
                        <h2 className='animate'>Try the SynTag demo today and experience a roleplay scenario in real-time</h2>
                        <a href="https://dashboard.syntag.ai/" target="_blank" rel="noreferrer" >
                            <button className='animate'>Go to dashboard</button>
                        </a>
                    </div>
                    <div className="box">
                        <h2 className='animate'>Have any doubts about setting it up?<br />Schedule a call today</h2>
                        <a href="https://calendly.com/vikram-from-syntag" target="_blank" rel="noreferrer" >
                            <button className='animate'>Schedule a call</button>
                        </a>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p><small>Copyright</small></p>
                    <div className="social">
                        <span className="linkedin">
                            <svg width="23" height="23" viewBox="0 0 23 23" fill="none">
                                <a href="https://www.linkedin.com/company/syntag-inc/" target="_blank" rel="noreferrer">
                                    <path fillRule="evenodd" clipRule="evenodd" d="M3.06654 1.5332C2.21971 1.5332 1.5332 2.21971 1.5332 3.06654V19.9332C1.5332 20.7801 2.21971 21.4665 3.06654 21.4665H19.9332C20.7801 21.4665 21.4665 20.7801 21.4665 19.9332V3.06654C21.4665 2.21971 20.7801 1.5332 19.9332 1.5332H3.06654ZM4.67654 9.19987H7.58987V18.3999H4.67654V9.19987ZM7.78154 6.14087C7.78154 7.05123 7.04356 7.7892 6.1332 7.7892C5.22286 7.7892 4.48487 7.05123 4.48487 6.14087C4.48487 5.23051 5.22286 4.49254 6.1332 4.49254C7.04356 4.49254 7.78154 5.23051 7.78154 6.14087ZM18.3999 12.8141C18.3999 10.0464 16.6111 8.97038 14.8341 8.97038C14.2522 8.9417 13.6729 9.06369 13.1539 9.32418C12.7598 9.52198 12.3473 9.97456 12.0291 10.7616H11.9473V9.20054H9.19987V18.4071H12.1226V13.5104C12.0804 13.0089 12.2409 12.3607 12.5692 11.975C12.8976 11.5893 13.3673 11.4972 13.7234 11.4504H13.8345C14.7639 11.4504 15.4537 12.0258 15.4537 13.4758V18.4071H18.3764L18.3999 12.8141Z" fillOpacity="1"/>
                                </a>
                            </svg>
                        </span>
                        
                        <span className="mail">
                            <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon">
                                <a href="mailto:admin@syntag.ai" target="_blank" rel="noreferrer">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"></path>
                                </a>
                            </svg>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
