const constraints = window.constraints = {
    audio: false,
    video: true
  };
  
  function handleSuccess(stream) {
    const video = document.querySelector('video');
    const videoTracks = stream.getVideoTracks();
    console.log('Got stream with constraints:', constraints);
    console.log(`Using video device: ${videoTracks[0].label}`);
    window.stream = stream; 
    video.srcObject = stream;
  }
    
  async function init(e) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      handleSuccess(stream);
      e.target.disabled = true;
    } catch (e) {
      handleError(e);
    }
  }
  
  document.querySelector('#showVideo').addEventListener('click', e => init(e));