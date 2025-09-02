import Head from 'next/head'

export default function Page() {
  return (
    <>
      <Head>
        <title>SoloLevel - AI Coach</title>
        <meta
          name="description"
          content="AI-powered movement coaching and analysis"
        />
      </Head>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: '#000',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>SoloLevel</h1>
        <p style={{ fontSize: '1.2rem', marginBottom: '2rem', opacity: 0.8 }}>
          AI-powered movement coaching
        </p>
        <a
          href="/camera-recording"
          style={{
            padding: '1rem 2rem',
            backgroundColor: '#0070f3',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '1.1rem',
            fontWeight: '500',
            transition: 'background-color 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#0051cc')}
          onFocus={(e) => (e.currentTarget.style.backgroundColor = '#0051cc')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#0070f3')}
          onBlur={(e) => (e.currentTarget.style.backgroundColor = '#0070f3')}
        >
          Start Recording
        </a>
      </div>
    </>
  )
}
