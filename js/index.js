var getParam = function (name) {
    var search = document.location.search;
    //alert(search);
    var pattern = new RegExp("[?&]" + name + "\=([^&]+)", "g");
    var matcher = pattern.exec(search);
    var items = null;
    if (null != matcher) {
        try {
            items = decodeURIComponent(decodeURIComponent(matcher[1]));
        } catch (e) {
            try {
                items = decodeURIComponent(matcher[1]);
            } catch (e) {
                items = matcher[1];
            }
        }
    }
    return items;
};

function getQueryStr(str) {
    var rs = new RegExp("(^|)" + str + "=([^&]*)(&|$)", "gi").exec(LocString), tmp;
    if (tmp = rs) {
        return tmp[2];
    }
// parameter cannot be found
    return "";
}

function ready() {
    playback = new L.Playback(map, playbackData, null, playbackOptions);
    control = new L.Playback.Control(playback);//下面控件
    control.addTo(map);
}

function resetPlayBackData(line,stayinfos,html) {
    var playBackLine = [];
    for (let i = 0, len = line.length; i < len; i++) {
        //处理时间戳数据
        let times = line[i].utc_time;
        for(var x=0;x<times.length;x++){
            playbackData.properties.time.push(times[x]);
        }

        //处理坐标点
        let latlng = line[i].latlng;
        for(var z=0;z<latlng.length;z++){
            playbackData.geometry.coordinates.push([latlng[z].lng, latlng[z].lat]);
        }

        //处理线段数据
        var obj={};
        obj.utc_time = line[i].utc_time;
        obj.latlng = line[i].latlng;
        //根据速度区间判断颜色显示
        var speed = line[i].maxspeed - line[i].minspeed;
        if(0<speed && speed <20){
            obj.color = '#cc2a37';
        }else if(20<=speed && speed<60){
            obj.color = '#f2bd00';
        }else if(speed>=60){
            obj.color = '#608008';
        }else {
            obj.color = '#608008';
        }
        playBackLine.push(obj);
    }

    /* 循环结束end */
    playbackData.properties.line = playBackLine;
    playbackData.properties.html = html;
    for(let z = 0,len = stayinfos.length; z < len; z++){
        var obj = {};
        if(stayinfos[z].event === 100){
            obj.lnglat = [stayinfos[z].endpos[0],stayinfos[z].endpos[1]];
        }else {
            obj.lnglat = [stayinfos[z].startpos[0],stayinfos[z].startpos[1]];
        }
        obj.event = stayinfos[z].event;
        obj.text = stayinfos[z].text;
        obj.begintime = stayinfos[z].begintime;
        obj.endtime = stayinfos[z].endtime;
        playbackData.properties.remain.push(obj);
    }
    ready();
}

function getData(deviceId) {
    $.ajax({  //获取轨迹车辆信息
        type : "get", //提交方式
        url : "/carRecords/"+id+"?terminalType=5&serverType=2",//路径
        data : {

        },//数据，这里使用的是Json格式进行传输
        success : function(result) {//返回数据根据结果进行相应的处理
            if(result.code === 0 && result.data){
                playbackData.properties.userInfo.orderNum = result.data.orderNum;
                playbackData.properties.userInfo.carNum = result.data.carNum;
                playbackData.properties.userInfo.applyUserName = result.data.applyUserName;
                playbackData.properties.userInfo.reasion = result.data.reasion;
            }
        }
    });
    if(deviceId){
        $.ajax({
            type : "get", //提交方式
            url : "/device/deviceTrackHistory/analyse/track?startTime="+startTime+"&endTime="+endTime+"&carId="+id+"&deviceId="+deviceId+"&terminalType=5&serverType=1",//路径
            data : {

            },//数据，这里使用的是Json格式进行传输
            success : function(result) {//返回数据根据结果进行相应的处理
                if ( result.status === 0) {
                    var line = result.data.line;
                    var stayinfos = result.data.properties.stayinfos;
                    var html = result.html;
                    bMap.centerAndZoom(line[0].latlng[0].lng, line[0].latlng[0].lat,12);  // 初始化地图,设置中心点坐标和地图级别
                    resetPlayBackData(line,stayinfos,html);
                } else {
                    $('#popup').html(result.message);
                    $('#popup').removeClass('hidden');
                    setTimeout("$('#popup').addClass('hidden')",2000);
                }
            }
        });
    }else {
        $.ajax({
            type : "get", //提交方式
            //url : "/device/deviceTrackHistory/gettrack.do?orderNum="+orderNum+"&terminalType=5&serverType=1",//路径
            url : "res.json",//路径
            data : {

            },//数据，这里使用的是Json格式进行传输
            success : function(result) {//返回数据根据结果进行相应的处理
                if ( result.status === 0) {
                    var line = result.data.line;
                    var stayinfos = result.data.properties.stayinfos;
                    var html = result.html;
                    bMap.centerAndZoom(line[0].latlng[0].lng, line[0].latlng[0].lat,12);  // 初始化地图,设置中心点坐标和地图级别
                    resetPlayBackData(line,stayinfos,html);
                } else {
                    $('#popup').html(result.message);
                    $('#popup').removeClass('hidden');
                    setTimeout("$('#popup').addClass('hidden')",2000);
                }
            }
        });
    }
}

function markerClick(item,marker) {
    if (mapType === 1){
        var opts = {
            width : 200,     // 信息窗口宽度
            height: 100,     // 信息窗口高度
            title : "" , // 信息窗口标题
            enableMessage:true,//设置允许信息窗发送短息
            message:""
        };
        var infoWindow = new BMap.InfoWindow(item.text, opts);  // 创建信息窗口对象
        bMap.$map.$map.openInfoWindow(infoWindow,marker.$marker.$bdMarker.point); //开启信息窗口
    }else if (mapType === 2){
        var infoWindow = new AMap.InfoWindow();
        infoWindow.setContent(item.text);
        infoWindow.open(bMap.$map.$map, [marker.$marker.$gdMarker.Pg.position.lng, marker.$marker.$gdMarker.Pg.position.lat]);
    }else if (mapType === 3){
        //添加到提示窗
        var info = new qq.maps.InfoWindow({
            map: bMap.$map.$txMap
        });
        console.log(info);
        //获取标记的点击事件
        info.open();
        info.setContent("<div>"+item.text+"</div>");
        info.setPosition(marker.$marker.$txMarker.position);
    }else if (mapType === 4){
        bMap.$map.$hdmap.bindPopup("Hello World").openPopup();
    }

    // $('#info').html(item.text);
    // $('#infoTab').show();

    if(item.event === 100){
        $('#time-slider').slider('value', new Date(item.endtime));
        playback.setCursor(Date.parse(new Date(item.endtime)));
    }else {
        $('#time-slider').slider('value', new Date(item.begintime));
        playback.setCursor(Date.parse(new Date(item.begintime)));
    }
    // setTimeout("$('#infoTab').hide()",1500);
}

var mapType = Number(getParam('mapType'));
var id = getParam('id');
var orderNum = getParam('orderNum');
var deviceId = getParam('deviceId');
var startTime = getParam('startTime');
var endTime = getParam('endTime');

//var bMap = new GMap.Map(mapType,"map");    // 创建Map实例,
var bMap = new GMap.Map(2,"map");    // 创建Map实例,
bMap.centerAndZoom(116.301117, 40.046183, 12);
var map = new L.Map('map');

const tickLen = 250;//ms
const speed = 1;
var playbackOptions = {
    tickLen: tickLen,
    speed: speed,
    orientIcons:true,
    unMoveableMarkerClick:markerClick
};

var LocString = String(window.document.location.href);

let playback = null;
let control = null;

playbackData = {
    "type": "Feature",
    "icon":"images/carIcon.png",
    "startIcon":"images/startIcon.png",
    "endIcon":"images/endIcon.png",
    "timeIcon":'images/stop.png',
    "geometry": {
        "type": "LineString",
        "coordinates": [],
    },
    "properties": {
        "time": [],
        'line': [],
        'remain':[],
        'html':'',
        'userInfo':{}
    }
};

getData(deviceId);

console.log(playbackData);


