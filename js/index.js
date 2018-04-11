// 百度地图API功能

let bMap = new GMap.Map(2,"map");    // 创建Map实例,
bMap.centerAndZoom(121.57613, 38.872458, 11);  // 初始化地图,设置中心点坐标和地图级别
     //开启鼠标滚轮缩放
// L地图API
var map = new L.Map('map');

const tickLen = 250;//ms
const speed = 1;
var playbackOptions = {
    tickLen: tickLen,
    speed: speed,
    orientIcons:true,
};
let playback = null;
let control = null;
/*var playbackData = {
    "type": "Feature",
    "icon":"images/normalboat2.png",
    "geometry": {
        "type": "LineString",
        "coordinates": []
    },
    "properties": {
        "time": [],
    }
};*/
resetPlayBackData();
function resetPlayBackData() {
    playbackData = {
        "type": "Feature",
        "icon":"images/normalboat2.png",
        "startIcon":"images/startIcon.png",
        "endIcon":"images/endIcon.png",
        "timeIcon":[
            "images/tenMinutes.png","images/thirtyMinutes.png","images/twentyMinutes.png","images/fiftyMinutes.png",
        ],
        "geometry": {
            "type": "LineString",
            "coordinates": [],

        },
        "properties": {
            "time": [],
            'line': [],
            'remain':[
                        {type:1,lnglat:[121.67613, 38.772458]},
                        {type:2,lnglat:[121.77613,38.372458]},
                        {type:3,lnglat:[121.27613,38.172458]},
                    ]

        }
    };
}


//假数据
/*let demo = [
    {
        utc_time: 1502329141000,
        latlng: [38.872458, 121.57613],
        color:'#000',
    },
    {
        utc_time: 1502329541001,
        latlng: [38.772458, 121.67613],
        color:'#000',
    },
    {
        utc_time: 1502329941002,
        latlng: [38.372458, 121.77613],
        color:'#000',
    },
    {
        utc_time: 1502329961002,
        latlng: [38.172458, 121.27613],
        color:'#ffff66'
    },
    {
        utc_time: 1502329981002,
        latlng: [38.272458, 121.17613],
        color:'#ffff66'
    },
];

for (let i = 0, len = demo.length; i < len; i++) {
    let latlng = demo[i].latlng;
    playbackData.geometry.coordinates.push([latlng[1], latlng[0]]);
    playbackData.properties.time.push(demo[i].utc_time);
}*/

//假数据
let demo = [
    {
        utc_time: [1502329141000,1502329541001,1502329941002],
        latlng: [{lng:121.57613, lat:38.872458},{lng:121.67613, lat:38.772458},{lng:121.77613, lat:38.372458}],
        color:'#000',
    },
    {
        utc_time: [1502329941002,1502329961002,1502329981002],
        latlng: [{lng:121.77613, lat:38.372458},{lng:121.27613, lat:38.172458},{lng:121.17613, lat:38.272458}],
        color:'#ffff66'
    }
];


{

}


for (let i = 0, len = demo.length; i < len; i++) {
    let times = demo[i].utc_time;
    for(var x=0;x<times.length;x++){
        playbackData.properties.time.push(times[x]);
    }
    let latlng = demo[i].latlng;
    for(var z=0;z<latlng.length;z++){
        playbackData.geometry.coordinates.push([latlng[z].lng, latlng[z].lat]);
    }
    playbackData.properties.line = demo;
}


console.log(playbackData);

ready();
function ready() {
    playback = new L.Playback(map, playbackData, null, playbackOptions);
    control = new L.Playback.Control(playback);//下面控件
    control.addTo(map);
}


/*var infoWindow;
var map = new AMap.Map("map",    resizeEnable: true,
    center: [121.57613,38.872458],
    zoom: 13
});

infoWindow = new AMap.InfoWindow({
    content: '30'  //使用默认信息窗体框样式，显示信息内容
});
infoWindow.open(map, new AMap.LngLat(121.57613 , 38.872458));*/
