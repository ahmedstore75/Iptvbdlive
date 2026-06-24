const video =
document.getElementById("video");

fetch("mixiptvchannel.m3u")

.then(res=>res.text())

.then(data=>{

const lines =
data.split("\n");

const stream =
lines.find(
x=>x.includes(".m3u8")
);

if(stream){

if(Hls.isSupported()){

const hls =
new Hls();

hls.loadSource(
stream.trim()
);

hls.attachMedia(
video
);

}else{

video.src =
stream.trim();

}

}

});
