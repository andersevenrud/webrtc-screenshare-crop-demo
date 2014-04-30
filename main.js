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

  window.navigator = window.navigator || {};
  if ( !navigator.getUserMedia ) {
    navigator.getUserMedia = (navigator.webkitGetUserMedia || navigator.mozGetUserMedia);
  }

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

      document.body.appendChild(_canvas);
    }

    _context.drawImage(video, CROP_X, CROP_Y, CROP_W, CROP_H, 0, 0, CROP_W, CROP_H);

    // !!! You can send the image to other users here
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

  //
  // MAIN
  //
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
