# WebRTC Screen Sharing with cropping

This is an example on how to crop (select a section) WebRTC screen sharing in Chrome

Live action demo is located [here](https://andersevenrud.github.io/webrtc-screenshare-crop/)

## How to enable screen sharing

You have to enable `Enable screen capture support in getUserMedia` in [chrome://flags/#enable-usermedia-screen-capture](chrome://flags/#enable-usermedia-screen-capture)

## Limitations

Currently images have to be scaled down to 320x240 because of some limitations sending large
messages over RTC. You could get around this by implementing some kind of chunk managment
