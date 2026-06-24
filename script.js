const video=
document.getElementById("video");

const stream=
"./mixiptvchannel.m3u";

if(Hls.isSupported()){

const hls=
new Hls();

hls.loadSource(stream);

hls.attachMedia(video);

}else{

video.src=stream;

}
