import React from 'react';
import { FaUserCheck, FaBrain, FaCogs, FaMicrophoneAlt, FaHeartbeat, FaClock, FaExpandArrowsAlt, FaDatabase, FaPhone, FaCode, FaChartBar, FaGlobe } from 'react-icons/fa'; // Import icons

export default function FeaturesSection() {
    return (
        <div className="feature-features">
            <div className="container">
                <h1 className='animate'>Our Value</h1>
                <div className="content-grid">
                    {/* Second Column */}
                    <div className="content-box">
                        <FaMicrophoneAlt className="icon" /> {/* Add icon */}
                        <h3>Brand-Specific Voice and Personality</h3>
                        <p>Our advanced features allow you to fine-tune the voice and personality of your chatbot, reflecting your brand&apos;s specific tone and style.</p>
                    </div>
                    <div className="content-box">
                        <FaHeartbeat className="icon" /> {/* Add icon */}
                        <h3>Mood Tagging for Empathetic Interactions</h3>
                        <p>Our innovative mood tagging feature enables your chatbot to understand and respond to the emotional tone of your customers, fostering empathetic and personalized interactions.</p>
                    </div>
                    

                    {/* Third Column */}
                    <div className="content-box">
                        <FaGlobe className="icon" /> {/* Add icon */}
                        <h3>Accent Tagging for Inclusivity</h3>
                        <p>Accent tagging ensures your chatbot can communicate effectively with a diverse customer base.</p>
                    </div>
                    <div className="content-box">
                        <FaClock className="icon" /> {/* Add icon */}
                        <h3>24/7 Uptime and Fast Response Times</h3>
                        <p>We prioritize reliability and performance with 24/7 uptime and lightning-fast response times, guaranteeing seamless and uninterrupted communication.</p>
                    </div>
                    <div className="content-box">
                        <FaPhone className="icon" /> {/* Add icon */}
                        <h3>Outbound Call Automation</h3>
                        <p>For outbound calls, SynTag can automate tasks such as appointment reminders, follow-ups, and promotional campaigns, enhancing efficiency and customer engagement.</p>
                    </div>

                    {/* Fourth Column */}
                    <div className="content-box">
                        <FaDatabase className="icon" /> {/* Add icon */}
                        <h3>RAG Support for Knowledge-Based Responses</h3>
                        <p>Furthermore, our RAG (Retrieval-Augmented Generation) support empowers your chatbot to access and leverage relevant information from your knowledge base, ensuring accurate and consistent responses.</p>
                    </div>
                    <div className="content-box">
                        <FaExpandArrowsAlt className="icon" /> {/* Add icon */}
                        <h3>Scalability for Evolving Business Needs</h3>
                        <p>SynTag is built for scalability, handling vast volumes of interactions and adapting to your evolving business needs.</p>
                    </div>

                    {/* Fifth Column */}
                    <div className="content-box">
                        <FaChartBar className="icon" /> {/* Add icon */}
                        <h3>Comprehensive Analytics and Tuning</h3>
                        <p>SynTag provides comprehensive analytics and tuning capabilities, allowing you to monitor performance, identify areas for improvement, and continually refine your chatbot for optimal efficiency and effectiveness.</p>
                    </div>
                    <div className="content-box">
                        <FaDatabase className="icon" /> {/* Add icon */}
                        <h3>CRM Integration for Personalized Interactions</h3>
                        <p>By integrating with your existing CRM systems, SynTag can access and leverage customer data, providing personalized and context-aware interactions.</p>
                    </div>

                </div>
            </div>
        </div>
    )
}