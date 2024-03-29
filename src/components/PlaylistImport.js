import "./Playlist.css"
import React, { useEffect, useState } from 'react';
import Spinner from 'react-bootstrap/Spinner';
import propTypes from 'prop-types';
import { useUser } from './UserContext'
import connection from './SignalR';
import Popup from 'reactjs-popup';
import 'reactjs-popup/dist/index.css';
import ProgressBar from 'react-bootstrap/ProgressBar'


const PlaylistImport = ({ playlist }) => {
    const [loading, setLoading] = useState(true);
    const [tracks, setTracks] = useState(null);
    const { user, token } = useUser();
    const [progress, setProgress] = useState({status: '', now: 0});
    const [isImporting, setIsImporting] = useState(false);
    const [abortController, setAbortController] = useState(new AbortController());
    const [importBtnClassName, setImportBtnClassName] = useState('btn btn-primary import');
    const [importBtnInner, setImportBtnInner] = useState('Import');
    const [importBtnDisabled, setImportBtnDisabled] = useState(false);
    const [doneBtnDisplay, setDoneBtnDisplay] = useState('none');
    const [cancelBtnDisplay, setCancelBtnDisplay] = useState('block');
    const [tracksDisplay, setTracksDisplay] = useState('none');


    // Receive messages from the SignalR hub
    connection.on('ReceiveMessage', (playlistId, message) => {
        if (playlistId === playlist.id) {
            setProgress(message);
        }
    });

    useEffect(() => {
        if (progress && progress.status === "done") {
            setDoneBtnDisplay('block');
            setImportBtnClassName('btn btn-success import');
            setImportBtnInner('Done');
            setImportBtnDisabled(true);
            setCancelBtnDisplay('none');
            document.getElementById("bar-" + playlist.id).firstChild.className = "progress-bar bg-success";
        }
    }, [progress, playlist.id]);

    const importPlaylist = async () => {
        setIsImporting(true);
        try {
            const response = await fetch(`/api/playlist/import/${encodeURIComponent(playlist.id)}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                signal: abortController.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            } else {
                setProgress({ status: 'done', now: 100 });
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                setIsImporting(false);
                setProgress({ status: '', now: 0 });
            } else {
                console.error('Error fetching data:', error);
                setProgress({ status: 'error', now: 100 });
                setIsImporting(false);
            }
        } finally {
            setAbortController(new AbortController());
        }
    }

    const cancelImport = () => {
        abortController.abort('Request cancelled by user.');
    };


    const toggleShowHideTracks = async () => {
        if (tracksDisplay === 'none') {
            setTracksDisplay('block');
        } else {
            setTracksDisplay('none');
        }
        if (!tracks && loading) {
            try {
                const response = await fetch(`/api/playlist/${encodeURIComponent(playlist.id)}`, {
                    method: "GET",
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const data = await response.json();
                setTracks(data);
                setLoading(false);
            } catch (error) {
                console.error('error fetching track list:', error);
            }
        }
    }

    const renderTracks = () => {
        if (loading) {
            return (<div className="spinner-div">
                <Spinner animation="border" role="output">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
            </div>);
        } else if (!loading && !tracks) {
            return <span>Something went wrong...</span>
        }

        const trackListItems = tracks.map(track =>
            <div className="row" key={track.id}>
                <span>{track.name}</span>
            </div>
        );

        return <div className="container">{trackListItems}</div>;
    }

    const progressMessage = () => {
        let message = '';
        switch (progress.status) {
            case "started":
                message = `Starting import ${playlist.name} from ${user.source} to ${user.destination}`;
                break;
            case "search":
                message = `Searching tracks on ${user.destination}`;
                break;
            case "import":
                message = `Adding tracks on ${user.destination}`;
                break;
            case "done":
                message = `All done! Check your ${user.destination}`;
                break;
            case "error":
                message = 'Something went wrong...'
                break;
            default:
                message = "Importing playlist...";
                break;
        }

        return message;
    }

    return (
        <div>
            <Popup open={isImporting} modal closeOnDocumentClick={false}>
                <div className="import-popup">
                    <h1>Importing playlist</h1>
                    <h3>{progressMessage()}</h3>
                    <ProgressBar id={"bar-" + playlist.id} animated variant='success' now={progress.now} />
                    <div className="row popup-buttons">
                        <button className="btn btn-danger" style={{ display: cancelBtnDisplay }} onClick={cancelImport}>Cancel</button>
                        <button className="btn btn-success" style={{ display: doneBtnDisplay }} onClick={() => { setIsImporting(false) }}>Done</button>
                    </div>
                </div>
            </Popup>
            <div className="playlist">
                <button className="btn btn-light" onClick={toggleShowHideTracks}>Tracks</button>
                <div className="col-md">
                    <h5>{playlist.name}</h5>
                </div>
                <div className="col-" id="totalItems">
                    <h5>Total Items: {playlist.totalItems}</h5>
                </div>
                <div className="col-">
                    <button className={importBtnClassName} onClick={importPlaylist} disabled={importBtnDisabled}>{importBtnInner}</button>
                </div>
            </div>
            <div id={playlist.id} style={{ display: tracksDisplay }} >
                {renderTracks()}
            </div>
        </div>
    );
};

PlaylistImport.propTypes = {
    playlist: propTypes.object,
};

export default PlaylistImport;