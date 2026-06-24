const video =
document.getElementById("video");

const channelList =
document.getElementById("channelList");

fetch("mixiptvchannel.m3u")

.then(r=>r.text())

.then(data=>{

const lines =
data.split("\n");

let channels=[];

for(let i=0;i<lines.length;i++){

if(
lines[i].startsWith("#EXTINF")
){

const name=
lines[i]
.split(",")

.pop();

const url=
lines[i+1];

if(
url &&
url.startsWith("http")
){

channels.push({
name,
url
});

}

}

}

channels.forEach(
(ch,index)=>{

const card=
document.createElement(
"div"
);

card.className=
"card";

card.innerText=
ch.name;

card.onclick=()=>{

play(
ch.url
);

};

channelList
.appendChild(
card
);

if(index===0){

play(
ch.url
);

}

});

});

function play(url){

if(
Hls.isSupported()
){

const hls=
new Hls();

hls.loadSource(
url
);

hls.attachMedia(
video
);

}else{

video.src=url;

}

}
