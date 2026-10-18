function AppleMusicConnect({ connected, isConnecting, error, onConnect }) {
    return (
        <>
            <button onClick={onConnect} disabled={isConnecting || connected}>
                {isConnecting
                    ? "Connecting..."
                    : connected
                        ? "Apple Music Connected"
                        : "Connect Apple Music"}
            </button>
            {error && <p role="alert">{error}</p>}
        </>
    );
}

export default AppleMusicConnect;