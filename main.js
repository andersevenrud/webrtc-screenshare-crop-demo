/**
 * Example on how to crop a video stream using WebRTC screen capture
 *
 * @author Anders Evenrud <andersevenrud@gmail.com>
 */
(function() {

  var CROP_X = 0;
  var CROP_Y = 0;
  var CROP_W = -1;
  var CROP_H = -1;
  var VIDEO_WIDTH = 0;
  var VIDEO_HEIGHT = 0;
  var MAX_VIDEO_WIDTH = 1280;
  var MAX_VIDEO_HEIGHT = 720;
  var _canvas;
  var _context;
  var _preview;

  var remotePeerConnection;
  var localPeerConnection;
  var receiveChannel;
  var sendChannel;
  var sendReady = false;

  window.navigator = window.navigator || {};
  if ( !navigator.getUserMedia ) {
    navigator.getUserMedia = (navigator.webkitGetUserMedia || navigator.mozGetUserMedia);
  }

  /////////////////////////////////////////////////////////////////////////////
  // CONNECTION
  /////////////////////////////////////////////////////////////////////////////


  /**
   * Create RTC Connection for sending/receiving data
   * Kudos to: http://richard.to/projects/datachannel-demo
   */
  function createConnection() {
    var servers = null;

    localPeerConnection = new webkitRTCPeerConnection(servers, {optional: []});
    sendChannel = localPeerConnection.createDataChannel("sendDataChannel", {reliable: true});

    localPeerConnection.onicecandidate = function gotLocalCandidate(event) {
      if ( event.candidate ) {
        remotePeerConnection.addIceCandidate(event.candidate);
      }
    };
    sendChannel.onopen = function() {
      var readyState = sendChannel.readyState;
      sendReady = (readyState == "open");
    };
    sendChannel.onclose = function() {
      var readyState = sendChannel.readyState;
      sendReady = (readyState == "open");
    };

    remotePeerConnection = new webkitRTCPeerConnection(servers, {optional: []});
    remotePeerConnection.onicecandidate = function(event) {
      if ( event.candidate ) {
        localPeerConnection.addIceCandidate(event.candidate);
      }
    };
    remotePeerConnection.ondatachannel = function(event) {
      receiveChannel = event.channel;
      receiveChannel.onopen = function() {};
      receiveChannel.onclose = function() {};
      receiveChannel.onmessage = function(event) {
        if ( event.data.match(/^data/) ) {
          _preview.src = event.data;
        }
      };
    };

    localPeerConnection.createOffer(function(desc) {
      localPeerConnection.setLocalDescription(desc);
      remotePeerConnection.setRemoteDescription(desc);

      remotePeerConnection.createAnswer(function(desc) {
        remotePeerConnection.setLocalDescription(desc);
        localPeerConnection.setRemoteDescription(desc);
      }, null);
    }, null);
  }

  function closeConnection() {
    sendChannel.close();
    receiveChannel.close();
    localPeerConnection.close();
    remotePeerConnection.close();
    localPeerConnection = null;
    remotePeerConnection = null;
  }

  /////////////////////////////////////////////////////////////////////////////
  // SCREEN CAPTURE
  /////////////////////////////////////////////////////////////////////////////

  /**
   * Crops a video frame and shows it to the user
   */
  function CropFrame(ev, stream, video) {
    if ( !_canvas ) {
      if ( CROP_X < 0 ) { CROP_X = 0; }
      if ( CROP_Y < 0 ) { CROP_Y = 0; }
      if ( CROP_W <= 0 ) { CROP_W = VIDEO_WIDTH; }
      if ( CROP_H <= 0 ) { CROP_H = VIDEO_HEIGHT; }
      if ( CROP_W > MAX_VIDEO_WIDTH ) { CROP_W = MAX_VIDEO_WIDTH; }
      if ( CROP_H > MAX_VIDEO_HEIGHT ) { CROP_W = MAX_VIDEO_HEIGHT; }

      _canvas        = document.createElement('canvas');
      _canvas.width  = CROP_W;
      _canvas.height = CROP_H;
      _context       = _canvas.getContext('2d');

      document.getElementById("LocalVideo").appendChild(_canvas);
    }

    _context.drawImage(video, CROP_X, CROP_Y, CROP_W, CROP_H, 0, 0, CROP_W, CROP_H);

    // We need to scale down the image or else we get HTTP 414 Errors
    // Also we scale down because of RTC message length restriction
    if ( sendReady ) {
      var scanvas     = document.createElement('canvas');
      scanvas.width   = _canvas.width;
      scanvas.height  = _canvas.height;

      var wRatio = _canvas.width / 320;
      var hRatio = _canvas.height / 240;
      var maxRatio = Math.max(wRatio, hRatio);
      if ( maxRatio > 1 ) {
        scanvas.width  = _canvas.width / maxRatio;
        scanvas.height = _canvas.height / maxRatio;
      }
      scanvas.getContext('2d').drawImage(_canvas, 0, 0, scanvas.width, scanvas.height);

      sendChannel.send(scanvas.toDataURL("image/jpeg"));
    }
  }

  /**
   * Create Screen Capture
   */
  function CreateCaptureDevice(onSuccess, onError) {
    if ( !navigator.getUserMedia ) {
      throw "CreateScreenCaputre() GetUserMedia not supported";
    }

    onError    = onError   || function() {};
    onSuccess  = onSuccess || function() {};

    var options = {
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'screen',
          maxWidth: MAX_VIDEO_WIDTH,
          maxHeight: MAX_VIDEO_HEIGHT
        },
        optional: []
      }
    };

    var moz = !!navigator.mozGetUserMedia;
    var video = document.createElement('video');
    video.setAttribute('autoplay', true);
    video.setAttribute('controls', false);
    video.setAttribute('muted', true);
    document.body.appendChild(video);

    navigator.getUserMedia(options, function(stream) {
      if ( video ) {
        video[moz ? 'mozSrcObject' : 'src'] = moz ? stream : window.webkitURL.createObjectURL(stream);
        video.play();
      }

      onSuccess(stream, video);
    }, function(error) {
      onError(error, video);
    });

    return video;
  }

  /////////////////////////////////////////////////////////////////////////////
  // MAIN
  /////////////////////////////////////////////////////////////////////////////

  window.onload = function() {
    // Form elements
    document.getElementById("x").value = CROP_X;
    document.getElementById("y").value = CROP_Y;
    document.getElementById("w").value = CROP_W;
    document.getElementById("h").value = CROP_H;

    document.getElementById("update").addEventListener('click', function() {
      var x = document.getElementById("x").value << 0;
      var y = document.getElementById("y").value << 0;
      var w = document.getElementById("w").value << 0;
      var h = document.getElementById("h").value << 0;

      if ( x >= 0 ) {
        CROP_X = x;
      }
      if ( y >= 0 ) {
        CROP_Y = y;
      }

      CROP_W = w || 0;
      CROP_H = h || 0;

      if ( _canvas ) {
        if ( _canvas.parentNode ) {
          _canvas.parentNode.removeChild(_canvas);
        }
        _canvas = null;
        _context = null;
      }
    });

    // Connection
    _preview = document.getElementById("RemoteVideoImage");

    createConnection();

    // Create capture
    CreateCaptureDevice(function(stream, video) {
      var inited = false;

      video.addEventListener('timeupdate', function(ev) {
        if ( !inited ) {
          VIDEO_WIDTH  = video.offsetWidth;
          VIDEO_HEIGHT = video.offsetHeight;

          video.style.display    = 'none';
          video.style.visibility = 'hidden';

          inited = true;
        }

        CropFrame(ev, stream, video);
      });
    });
  };

})();
