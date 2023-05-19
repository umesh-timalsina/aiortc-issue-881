var pc = null;
let addedTrackIds = []

function negotiate() {
    fetch("/tracks_info")
    .then(function(response) {
        return response.json();
    }).then(function(tracksInfo) {
        for (let j = 0; j < tracksInfo.num_tracks; j++) {
            pc.addTransceiver('video', {
                'direction': 'recvonly'
            });
        }
    }).then(function() {
        pc.createOffer().then(function(offer) {
            return pc.setLocalDescription(offer);
        }).then(function() {
            // wait for ICE gathering to complete
            return new Promise(function(resolve) {
                if (pc.iceGatheringState === 'complete') {
                    resolve();
                } else {
                    function checkState() {
                        if (pc.iceGatheringState === 'complete') {
                            pc.removeEventListener('icegatheringstatechange', checkState);
                            resolve();
                        }
                    }
                    pc.addEventListener('icegatheringstatechange', checkState);
                }
            });
        }).then(function() {
            var offer = pc.localDescription;
            return fetch('/offer', {
                body: JSON.stringify({
                    sdp: offer.sdp,
                    type: offer.type,
                }),
                headers: {
                    'Content-Type': 'application/json'
                },
                method: 'POST'
            });
        }).then(function(response) {
            return response.json();
        }).then(function(answer) {
            return pc.setRemoteDescription(answer);
        }).catch(function(e) {
            alert(e);
        })
    });
}

function start() {
    var config = {
        sdpSemantics: 'unified-plan'
    };

    if (document.getElementById('use-stun').checked) {
        config.iceServers = [{urls: ['stun:stun.l.google.com:19302']}];
    }

    pc = new RTCPeerConnection(config);

    // connect audio / video
    pc.addEventListener('track', function(evt) {
        if (evt.track.kind == 'video') {
            if(!addedTrackIds.includes(evt.track.id)) {
                addedTrackIds.push(evt.track.id)
                const container = document.getElementById('video-container');
                const video = document.createElement('video');
                video.setAttribute('id', evt.track.id);
                video.setAttribute('autoplay', '');
                video.setAttribute('playsinline', '');
                video.srcObject = evt.streams[0];
                container.appendChild(video);
            }
        } else {
            document.getElementById('audio').srcObject = evt.streams[0];
        }
    });

    document.getElementById('start').style.display = 'none';
    negotiate();
    document.getElementById('stop').style.display = 'inline-block';
}

function stop() {
    document.getElementById('stop').style.display = 'none';

    // close peer connection
    setTimeout(function() {
        pc.close();
    }, 500);
}
