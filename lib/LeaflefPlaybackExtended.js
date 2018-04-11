//下方播放插件
L.Playback = L.Playback || {};
L.Playback.Control = L.Control.extend({
    _html: '<footer class="lp" id="mapController">' +
    '  <div class="transport">' +
    '   <div class="navbar">' +
    '       <div id="speed-slider" class="speed-box">' +
    '           <span value="1">1x</span>'+
    '           <span value="20">20x</span>'+
    '           <span value="30">30x</span>'+
    '           <span value="40">40x</span>'+
    '           <span value="50">50x</span>'+
    '       </div>' +
    '       <div>' +
    '           <div id="time-slider"></div>' +
    '           <div class="ctrl">' +
    '               <a id="play-pause"><i id="play-pause-icon" class="fa fa-play fa-lg"></i></a>' +
    '           </div>' +
    '       </div>'+
    '       <div class="date-panel">' +
    '           <span id="cursor-date"></span>'+
    '           <span id="cursor-time"></span>'+
    '           <span id="direct" class="direction" ></span>'+
    '       </div>'+
    '   </div>'+
    '    <div class="navbar-des-panel">'+
    '       <div class="title">'+
    '           <span class="margin-right">京NGD789</span>'+
    '           <span>申请者：</span>'+
    '           <span class="margin-right">常福鹏</span>'+
    '           <span>用途：</span>'+
    '           <span class="margin-right">接火车</span>'+
    '       </div>'+
    '       <div class="describe ">'+
    '           <p>车辆在12:00从汇众大厦驶出，16:23到达北京站停车场</p>'+
    '           <p>途中13:20分在奥体中心停留25分钟；14:56分在西直门停留30分钟；15:40在菜市口停留15分钟</p>'+
    '           <p>车辆在12:00从汇众大厦驶出，16:23到达北京站停车场</p>'+
    '           <p>途中13:20分在奥体中心停留25分钟；14:56分在西直门停留30分钟；15:40在菜市口停留15分钟</p>'+
    '           <p>车辆在12:00从汇众大厦驶出，16:23到达北京站停车场</p>'+
    '           <p>途中13:20分在奥体中心停留25分钟；14:56分在西直门停留30分钟；15:40在菜市口停留15分钟</p>'+
    '       </div>'+
    '    </div>'+
    '  </div>' +
    '</footer>',
    isDisplay : false ,
    initialize: function (playback) {
        this.playback = playback;
        playback.addCallback(this._clockCallback);
    },

    onAdd: function (map) {
        var html = this._html;
        $('#map').after(html);
        this._setup();
        return L.DomUtil.create('div');
    },
    resetTrackDefault : function() {
        this.isDisplay = false;
        playback._tracksLayer.displayNone();
        $('#display-tracks-btn')[0].innerHTML = '<i class="fa fa-map-marker fa-lg"></i>显示轨迹';
    },
    _setup: function () {
        var self = this;
        var playback = this.playback;
        $('#play-pause').click(function () {
            if (playback.isPlaying() === false) {
                playback.start();
                $('#play-pause-icon').removeClass('fa-play');
                $('#play-pause-icon').addClass('fa-pause');
            } else {
                playback.stop();
                $('#play-pause-icon').removeClass('fa-pause');
                $('#play-pause-icon').addClass('fa-play');
            }
        });

        var startTime = playback.getStartTime();
        $('#cursor-date').html(new Date(startTime).Format("yyyy-MM-dd"));
        $('#cursor-time').html(new Date(startTime).Format("hh:mm:ss"));

        $('#time-slider').slider({
            min: playback.getStartTime(),
            max: playback.getEndTime(),
            step: playback.getTickLen(),
            value: playback.getTime(),
            slide: function (event, ui) {
                playback.setCursor(ui.value);
                //$('#cursor-time').val(ui.value.toString());
                $('#cursor-time').val(new Date(ui.value).Format("hh:mm:ss"));
                $('#cursor-time-txt').html(new Date(ui.value).toString());
            }
        });

        /*$('#speed-slider').slider({
            min: 0,
            max: 500,
            step: 10,
            value: self._speedToSliderVal(this.playback.getSpeed()),
            orientation: 'vertical',
            slide: function (event, ui) {
                var speed = self._sliderValToSpeed(parseFloat(ui.value));
                playback.setSpeed(speed);
                $('.speed').html(speed).val(speed);
            }
        });*/

        $('#speed-slider span').click(function () {
            $(this).addClass("change").siblings().removeClass("change");
            var speed = parseFloat($(this).attr('value'));
            var speed = self._sliderValToSpeed(parseFloat(speed));
            playback.setSpeed(speed);
        });



        $('#speed-input').on('keyup', function (e) {
            var speed = parseFloat($('#speed-input').val());
            if (!speed) return;
            playback.setSpeed(speed);
            $('#speed-slider').slider('value', speedToSliderVal(speed));
            $('#speed-icon-val').html(speed);
            if (e.keyCode === 13) {
                $('.speed-menu').dropdown('toggle');
            }
        });


        $('#date-input').on('keyup', function (e) {
            $('#calendar').datepicker('setDate', $('#date-input').val());
        });

        $('.dropdown-menu').on('click', function (e) {
            e.stopPropagation();
        });


        $('#load-tracks-save').on('click', function (e) {
            var file = $('#load-tracks-file').get(0).files[0];
            self._loadTracksFromFile(file);
        });
        $('#display-tracks-btn')[0].innerHTML = '<i class="fa fa-map-marker fa-lg"></i>显示轨迹';

        $('#display-tracks-btn').click(function () {
            if (!self.isDisplay) {
                self.isDisplay = true;
                playback._tracksLayer.displayAll();
                $('#display-tracks-btn')[0].innerHTML = '<i class="fa fa-map-marker fa-lg"></i>隐藏轨迹';
            } else {
                self.isDisplay = false;
                playback._tracksLayer.displayNone();
                $('#display-tracks-btn')[0].innerHTML = '<i class="fa fa-map-marker fa-lg"></i>显示轨迹';
            }
        });

    },

    _clockCallback: function (ms) {
        $('#cursor-date').html(new Date(ms).Format("yyyy:MM:dd"));
        //$('#cursor-time').html(L.Playback.Util.TimeStr(ms));
        $('#cursor-time').html(new Date(ms).Format("hh:mm:ss"));
        $('#time-slider').slider('value', ms);
    },

    _speedToSliderVal: function (speed) {
        if (speed < 1) return -10 + speed * 10;
        return speed - 1;
    },

    _sliderValToSpeed: function (val) {
        if (val < 0) return parseFloat((1 + val / 10).toFixed(2));
        return val + 1;
    },

    _combineDateAndTime: function (date, time) {
        var yr = date.getFullYear();
        var mo = date.getMonth();
        var dy = date.getDate();
        var hr = time.hours || time.hour;
        if (time.meridian === 'PM' && hr !== 12) hr += 12;
        var min = time.minutes || time.minute;
        var sec = time.seconds || time.second;
        return new Date(yr, mo, dy, hr, min, sec).getTime();
    }
});


L.Playback.MoveableMarker = {
    create: function (latLng, endLnglat, options, feature) {
        var lng = latLng.lng;
        var lat = latLng.lat;
        var marker = null;
        if (feature.icon) {
            marker = new GMap.GMarker(lng , lat , feature.icon);
        } else {
            marker = new GMap.GMarker(lng , lat , "plugins/map/img/carIcon.png");
        }

        //如果起终点有icon 则显示图标
        if(feature.startIcon){
            var startMarker = new GMap.GMarker(lng , lat , feature.startIcon);
            bMap.addOverlay(startMarker);
        }
        if(feature.endIcon){
            var endMarker = new GMap.GMarker(endLnglat.lng , endLnglat.lat , feature.endIcon);
            bMap.addOverlay(endMarker);
        }

        //

        bMap.addOverlay(marker);
        return marker
    },
};

L.Playback.UnMoveableMarker = {
    create: function (latLng,timeType,imgs) {
        var lng = latLng[0];
        var lat = latLng[1];
        var unMoveableMarker = null;
        if (timeType === 1) {
            unMoveableMarker = new GMap.GMarker(lng , lat , imgs[0]);
        } else if(timeType === 2){
            unMoveableMarker = new GMap.GMarker(lng , lat , imgs[1]);
        } else if(timeType === 3){
            unMoveableMarker = new GMap.GMarker(lng , lat , imgs[2]);
        }

        bMap.addOverlay(unMoveableMarker);
        return unMoveableMarker;
    },
}

L.Playback.Track.include({
    initialize : function (geoJSON, options) {
        options = options || {};
        var tickLen = options.tickLen || 250;
        this._staleTime = options.staleTime || 60*60*1000;
        this._fadeMarkersWhenStale = options.fadeMarkersWhenStale || false;

        this._geoJSON = geoJSON;
        this.options = options;
        this._tickLen = tickLen;
        this._ticks = [];
        this._marker = null;
        this._orientations = [];

        var sampleTimes = geoJSON.properties.time;

        this._orientIcon = options.orientIcons;
        var previousOrientation;

        var samples = geoJSON.geometry.coordinates;
        var currSample = samples[0];
        var nextSample = samples[1];

        var currSampleTime = sampleTimes[0];
        var t = currSampleTime;  // t is used to iterate through tick times
        var nextSampleTime = sampleTimes[1];
        var tmod = t % tickLen; // ms past a tick time
        var rem,
            ratio;

        // handle edge case of only one t sample
        if (sampleTimes.length === 1) {
            if (tmod !== 0)
                t += tickLen - tmod;
            this._ticks[t] = samples[0];
            this._orientations[t] = 0;
            this._startTime = t;
            this._endTime = t;
            return;
        }

        // interpolate first tick if t not a tick time
        if (tmod !== 0) {
            rem = tickLen - tmod;
            ratio = rem / (nextSampleTime - currSampleTime);
            t += rem;
            this._ticks[t] = this._interpolatePoint(currSample, nextSample, ratio);
            this._orientations[t] = this._directionOfPoint(currSample,nextSample);
            previousOrientation = this._orientations[t];
        } else {
            this._ticks[t] = currSample;
            this._orientations[t] = this._directionOfPoint(currSample,nextSample);
            previousOrientation = this._orientations[t];
        }

        this._startTime = t;
        t += tickLen;
        while (t < nextSampleTime) {
            ratio = (t - currSampleTime) / (nextSampleTime - currSampleTime);
            this._ticks[t] = this._interpolatePoint(currSample, nextSample, ratio);
            this._orientations[t] = this._directionOfPoint(currSample,nextSample);
            previousOrientation = this._orientations[t];
            t += tickLen;
        }

        // iterating through the rest of the samples
        for (var i = 1, len = samples.length; i < len; i++) {
            currSample = samples[i];
            nextSample = samples[i + 1];
            t = currSampleTime = sampleTimes[i];
            nextSampleTime = sampleTimes[i + 1];

            tmod = t % tickLen;
            if (tmod !== 0 && nextSampleTime) {
                rem = tickLen - tmod;
                ratio = rem / (nextSampleTime - currSampleTime);
                t += rem;
                this._ticks[t] = this._interpolatePoint(currSample, nextSample, ratio);
                if(nextSample){
                    this._orientations[t] = this._directionOfPoint(currSample,nextSample);
                    previousOrientation = this._orientations[t];
                } else {
                    this._orientations[t] = previousOrientation;
                }
            } else {
                this._ticks[t] = currSample;
                if(nextSample){
                    this._orientations[t] = this._directionOfPoint(currSample,nextSample);
                    previousOrientation = this._orientations[t];
                } else {
                    this._orientations[t] = previousOrientation;
                }
            }

            t += tickLen;
            while (t < nextSampleTime) {
                ratio = (t - currSampleTime) / (nextSampleTime - currSampleTime);

                if (nextSampleTime - currSampleTime > options.maxInterpolationTime){
                    this._ticks[t] = currSample;

                    if(nextSample){
                        this._orientations[t] = this._directionOfPoint(currSample,nextSample);
                        previousOrientation = this._orientations[t];
                    } else {
                        this._orientations[t] = previousOrientation;
                    }
                }
                else {
                    this._ticks[t] = this._interpolatePoint(currSample, nextSample, ratio);
                    if(nextSample) {
                        this._orientations[t] = this._directionOfPoint(currSample,nextSample);
                        previousOrientation = this._orientations[t];
                    } else {
                        this._orientations[t] = previousOrientation;
                    }
                }

                t += tickLen;
            }
        }

        // the last t in the while would be past bounds
        this._endTime = t - tickLen;
        this._lastTick = this._ticks[this._endTime];

    },
    setMarker: function (timestamp, options) {
        var lngLat = null;

        // if time stamp is not set, then get first tick
        if (timestamp) {
            lngLat = this.tick(timestamp);
        }
        else {
            lngLat = this.getFirstTick();
        }

        if (lngLat) {

            var endLnglat = this.getLastTick();
            var endlatLng = new L.LatLng(endLnglat[1], endLnglat[0]);

            var latLng = new L.LatLng(lngLat[1], lngLat[0]);
            this._marker = new L.Playback.MoveableMarker.create(latLng, endlatLng,options, this._geoJSON);
            if (options.mouseOverCallback) {
                this._marker.on('mouseover', options.mouseOverCallback);
            }
            if (options.clickCallback) {
                this._marker.on('click', options.clickCallback);
            }

            //hide the marker if its not present yet and fadeMarkersWhenStale is true
            if (this._fadeMarkersWhenStale && !this.trackPresentAtTick(timestamp)) {
                this._marker.setOpacity(0);
            }
        }

        return this._marker;
    },

    setUnMoveableMarker:function () {
        var imgs = this._geoJSON.timeIcon;
        var list = this._geoJSON.properties.remain;
        for (var i=0;i<list.length;i++){
            var latLng = list[i].lnglat;
            var timeType = list[i].type;
            new L.Playback.UnMoveableMarker.create(latLng,timeType,imgs);
        }

    },

    moveMarker: function (lng , lat , transitionTime, timestamp) {
        if (this._marker) {
            if (this._fadeMarkersWhenStale) {
                //show the marker if its now present
                if (this.trackPresentAtTick(timestamp)) {
                    this._marker.setOpacity(1);
                } else {
                    this._marker.setOpacity(0);
                }

                if (this.trackStaleAtTick(timestamp)) {
                    this._marker.setOpacity(0.25);
                }
            }

            if (this._orientIcon) {
                this.setIconAngle(this.courseAtTime(timestamp));
            }

            this.move(lng , lat , transitionTime);
        }
    },
    move: function (lng , lat , transitionTime) {
        // Only if CSS3 transitions are supported

        if (L.DomUtil.TRANSITION) {
            if (this._marker.V) {
                this._marker.V.style[L.DomUtil.TRANSITION] = 'all ' + transitionTime + 'ms linear';
            }
        }


        this._marker.setPosition(lng , lat);
        if (this.options.iconAngle) {
            var direct = getDirct(this.options.iconAngle);
            $("#direct").html(direct);
            //if(this._marker.V){
                // var a = this.options.icon.options.iconAnchor;
                // var s = this.options.icon.options.iconSize;
                var marker=this._marker;
                this._updateImg(marker);
            // }
        }
    },
    _updateImg: function (marker) {
        marker.setRotation(this.options.iconAngle)
    },
    setIconAngle: function (iconAngle) {
        this.options.iconAngle = iconAngle;
    },
});


L.Playback.TrackController.include({
    // add single track
    addTrack: function (track, timestamp) {
        // return if nothing is set
        if (!track) {
            return;
        }

        var marker = track.setMarker(timestamp, this.options);
        track.setUnMoveableMarker(this.options);

        if (marker) {
            // marker.addTo(this._map);

            this._tracks.push(track);
        }
    },
    tock: function (timestamp, transitionTime) {
        for (var i = 0, len = this._tracks.length; i < len; i++) {
            var lngLat = this._tracks[i].tick(timestamp);
            this._tracks[i].moveMarker(lngLat[0], lngLat[1], transitionTime, timestamp);
        }
    },
});

//新增信息窗体功能
L.Playback.TrackInfoWindow.include({
    initialize:function (map, options) {
        this.windows = [];
        this._options = options;
    },
    addInfoWindow:function (geoJSON) {

        //只能显示一个信息窗口
        /*for(var i=0;i<geoJSON.properties.remain.length;i++){
            var obj = {};
            obj.des = new GMap.GInfoWindow(geoJSON.properties.remain[i].time);
            obj.lnglat = [geoJSON.properties.remain[i].lnglat[0],geoJSON.properties.remain[i].lnglat[1]];
            this.windows.push(obj);
        }
        console.log(this.windows);
        //直接显示窗口  只能显示一个
        for (let i = 0; i < this.windows.length; i++) {
            bMap.openInfoWindow(this.windows[i].des,this.windows[i].lnglat[0],this.windows[i].lnglat[1]);
        }*/



    },
    openInfoWindow:function () {

    },
    closeInfoWindow:function () {

    }
});

L.Playback.TracksLayer.include({
    initialize: function(map, options) {
        this.polyline = [];
        this._options = options;
    },

    // clear all geoJSON layers
    clearLayer: function() {
        this.polyline = [];
    },

    // add new geoJSON layer
    addLayer: function(geoJSON) {
        // 大连旧版本：只能划单颜色线段
        /*var lineArray = [];
        for (var i = 0, l =geoJSON.geometry.coordinates.length; i < l; i++) {
            var lnglat = geoJSON.geometry.coordinates[i];
            lineArray.push({lng : lnglat[0], lat : lnglat[1]});
        }
        this.polyline.push(new GMap.GPolyline(lineArray , map));*/

        /*新版*/
        //可以根据服务器返回的颜色画线段
        for(var x=0;x<geoJSON.properties.line.length;x++){
            this.polyline.push(new GMap.GPolyline(geoJSON.properties.line[x] , map));
        }
        //直接显示轨迹
        for (let i = 0; i < this.polyline.length; i++) {
            bMap.addOverlay(this.polyline[i]);
        }
        /* end */
        console.log(this.polyline);

    },

    displayAll: function() {
        for (let i = 0; i < this.polyline.length; i++) {
            bMap.addOverlay(this.polyline[i]);
        }
    },
    displayNone: function() {
        for (let i = 0; i < this.polyline.length; i++) {
            bMap.removeOverlay(this.polyline[i]);
        }
    }

});


Date.prototype.Format = function (fmt) { //author: meizz
    var o = {
        "M+": this.getMonth() + 1, //月份
        "d+": this.getDate(), //日
        "h+": this.getHours(), //小时
        "m+": this.getMinutes(), //分
        "s+": this.getSeconds(), //秒
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度
        "S": this.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
};


var gDirect = "";
function getDirct(direct) {
    if(direct<=15 || direct >= 345) {
        dir = "正北";
    } else if(direct>=15 && direct<=75) {
        dir = "东北";
    } else if(direct>=75 && direct <= 105) {
        dir= "正东";
    } else if(direct >= 105 && direct <= 165) {
        dir = "东南";
    } else if(direct>= 165 && direct <= 195 ) {
        dir = "正南";
    } else if(direct>= 195 && direct <= 255 ) {
        dir = "西南";
    } else if(direct>= 255 && direct <= 285 ) {
        dir = "正西";
    } else if(direct>= 285 && direct <= 345 ) {
        dir = "西北";
    }
    gDirect = dir;
    return dir ;
}
