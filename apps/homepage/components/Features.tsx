import React from 'react'

export default function Features() {
    return (
        <div className="features-container">
            <div className="container">
                <h1 className='animate'>Features</h1>
                <div className="content-row">
                    <div className="content">
                        <h2 className='animate'>Talk like a human, work like an AI</h2>
                        <p className='animate'>Take advantage of sub-second response latency with near-human voice mimicry. With built-in API+Vector Search support, we can support state-of-the-art customer resolution for every industry.</p>
                    </div>
                    <div className="img-box"></div>
                </div>
                <div className="content-row">
                    <div className="img-box"></div>
                    <div className="content">
                        <h2 className='animate'>Unlimited voice configurations</h2>
                        <p className='animate'>Want an agent who’s reliable and friendly? Speaks Spanish with an accent? Cracks jokes while helping you out? Deploy at the speed of imagination with SynTag’s voice configuration support.</p>
                    </div>
                </div>
                <div className="content-row">
                    <div className="content">
                        <h2 className='animate'>Infinite scalability</h2>
                        <p className='animate'>Rely on us for high scalability, availability, and overall reliability while keeping your latency (and costs) low.</p>
                    </div>
                    <div className="img-box"></div>
                </div>
            </div>
        </div>
    )
}
