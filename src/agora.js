const AgoraRTC = require('agora-rtc-sdk')

const {RtcTokenBuilder, RtcRole} = require('agora-access-token');

const startVideo = function(agoraKeys,playerNumber,socket, room){
    const appId = agoraKeys.appId
    const appCertificate = agoraKeys.appCertificate
    const channelName = 'deckr';
    const uid = 0;
    const role = RtcRole.PUBLISHER;

    const expirationTimeInSeconds = 3600

    const currentTimestamp = Math.floor(Date.now() / 1000)

    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds

    // Build token with uid
    const token = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, role, privilegeExpiredTs);

    let handleError = function(err){
        console.log("Error: ", err);
    };
    // Query the container to which the remote stream belong.

    let remoteContainer = document.getElementById('game');

    // Add video streams to the container.
    function addVideoStream(elementId){
        // Creates a new div for every stream
        let streamDiv
        if(document.getElementById(elementId)) {
            streamDiv = document.getElementById(elementId)
        } else {
            const streamContainer = document.createElement("div")
            streamDiv = document.createElement("div");
            streamDiv.id = elementId;
            streamContainer.appendChild(streamDiv)
            remoteContainer.appendChild(streamContainer);
        }
    // Assigns the className to the div.

    // Takes care of the lateral inversion
    streamDiv.style.transform = "rotateY(180deg)";
    };

    // Remove the video stream from the container.
    function removeVideoStream(elementId) {
        let remoteDiv = document.getElementById(elementId);
        if (remoteDiv) {
            const container = remoteDiv.parentNode
            while(container.firstChild) {
                container.removeChild(container.lastChild)
            }
            container.remove()
        }
    };


    let client = AgoraRTC.createClient({
        mode: "rtc",
        codec: "vp8",
    });

    client.init(appId);

    // Join a channel
    client.join(token, channelName, null, (uid)=>{
        let localStream = AgoraRTC.createStream({
            audio: true,
            video: true,
        });
        enableUiControls(localStream)
        localStream.setVideoProfile('120p_1')
        socket.emit('joiningAs',{streamId: uid, playerNumber, room, relay:true})
    // Initialize the local stream
        localStream.init(()=>{
            // Play the local stream
            localStream.play('myVideo');
            document.getElementById('myVideo').setAttribute('localId',uid)
            // Publish the local stream
            client.publish(localStream, handleError);
        } , handleError);
    }, handleError);


    // Subscribe to the remote stream when it is published
    client.on("stream-added", function(evt){
        client.subscribe(evt.stream, handleError);
    });
    // Play the remote stream when it is subsribed
    client.on("stream-subscribed", function(evt){
        let stream = evt.stream;
        let streamId = String(stream.getId());
        addVideoStream(streamId);
        stream.play(streamId);
    });

    // Remove the corresponding view when a remote user unpublishes.
    client.on("stream-removed", function(evt){
        let stream = evt.stream;
        let streamId = String(stream.getId());
        stream.close();
        removeVideoStream(streamId);
    });
    // Remove the corresponding view when a remote user leaves the channel.
    client.on("peer-leave", function(evt){
        let stream = evt.stream;
        let streamId = String(stream.getId());
        stream.close();
        removeVideoStream(streamId);
    });



      client.on("mute-audio", function (evt) {
        console.log("Remote stream: " +  evt.uid + "has muted audio");
      });
      
      client.on("unmute-audio", function (evt) {
        console.log("Remote stream: " +  evt.uid + "has muted audio");
      });
      
      // show user icon whenever a remote has disabled their video
      client.on("mute-video", function (evt) {
        console.log("Remote stream: " +  evt.uid + "has muted video");
      });
      
      client.on("unmute-video", function (evt) {
        console.log("Remote stream: " +  evt.uid + "has un-muted video");
      });
}


document.getElementById('mic-btn')
  

  function enableUiControls(localStream) {
    document.getElementById('mic-btn').addEventListener("click",() =>{toggleMic(localStream)})
    document.getElementById('video-btn').addEventListener("click",() =>{toggleVideo(localStream)})
  }
  
  function toggleMic(localStream) {
    let mic = document.getElementById("mic-icon")
    if (mic.className === 'fas fa-microphone'){
      mic.className = 'fas fa-microphone-slash';
    } else {
      mic.className = 'fas fa-microphone';
    }
    // toggle the mic icon
    if (mic.classList.contains('fa-microphone')) {
      localStream.enableAudio(); // enable the local mic
    } else {
      localStream.disableAudio(); // mute the local mic
    }
  }
  
  function toggleVideo(localStream) {
    let video = document.getElementById("video-icon")
    if (video.className === 'fas fa-video'){
      video.className = 'fas fa-video-slash';
    } else {
      video.className = 'fas fa-video';
    }
    // toggle the video icon
    if (video.classList.contains('fa-video')) {
      localStream.enableVideo(); // enable the local video
    } else
    {
      localStream.disableVideo(); // disable the local video
    }
  }


module.exports = startVideo

