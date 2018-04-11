// UMD initialization to work with CommonJS, AMD and basic browser script include
(function(factory) {
    var L;
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(['leaflet'], factory);
    } else if (typeof module === 'object' && typeof module.exports === "object") {
        // Node/CommonJS
        L = require('leaflet');
        module.exports = factory(L);
    } else {
        // Browser globals
        if (typeof window.L === 'undefined')
            throw 'Leaflet must be loaded first';
        factory(window.L);
    }
}(function(L) {

    L.Playback = L.Playback || {};

    L.Playback.Util = L.Class.extend({
        statics: {

            DateStr: function(time) {
                var d = new Date(time);
                var y = d.getFullYear();
                var m = d.getMonth();
                var day = d.getDay();
                if(day < 10) day = '0'+day;
                if(m < 10) m = '0'+m;
                return y+'年'+m+'月'+day+'日';
            },

            TimeStr: function(time) {
                var d = new Date(time);
                var h = d.getHours();
                var m = d.getMinutes();
                var s = d.getSeconds();
                var tms = time / 1000;
                var dec = (tms - Math.floor(tms)).toFixed(2).slice(1);
               /* var mer = 'AM';
                if (h > 11) {
                    h %= 12;
                    mer = 'PM';
                }*/
                if (h === 0) h = 12;
                if (m < 10) m = '0' + m;
                if (s < 10) s = '0' + s;
               /* return h + ':' + m + ':' + s + dec + ' ' + mer;*/
                return h + ':' + m + ':' + s + dec;
            },

            ParseGPX: function(gpx) {
                var geojson = {
                    type: 'Feature',
                    geometry: {
                        type: 'MultiPoint',
                        coordinates: []
                    },
                    properties: {
                        time: [],
                        speed: [],
                        altitude: []
                    },
                    bbox: []
                };
                var xml = $.parseXML(gpx);
                var pts = $(xml).find('trkpt');
                for (var i = 0, len = pts.length; i < len; i++) {
                    var p = pts[i];
                    var lat = parseFloat(p.getAttribute('lat'));
                    var lng = parseFloat(p.getAttribute('lon'));
                    var timeStr = $(p).find('time').text();
                    var eleStr = $(p).find('ele').text();
                    var t = new Date(timeStr).getTime();
                    var ele = parseFloat(eleStr);

                    var coords = geojson.geometry.coordinates;
                    var props = geojson.properties;
                    var time = props.time;
                    var altitude = geojson.properties.altitude;

                    coords.push([lng, lat]);
                    time.push(t);
                    altitude.push(ele);
                }
                return geojson;
            }
        }

    });

    L.Playback.MoveableMarker = {
        create: function(startLatLng, options, feature) {
            var label = new MLabel("<div style='color:#aaa;border:1px solid #3e3e3e;background:#FFF;font-size:12px; margin: 0pt; padding: 3px; font-size: 12px; width: auto;'>" + startLatLng[0] + "," + startLatLng[1] + "</div>", {
                enableStyle: false
            })
            if (feature.type in options.types) {
                var marker = new MMarker(
                    new MPoint(startLatLng),
                    options.types[feature.type], null,
                    label
                );
            } else {
                var marker = new MMarker(
                    new MPoint(startLatLng),
                    new MIcon("../examples/images/tb1.gif", 22, 34), null,
                    label
                );
            }

            if (!options.labels) {
                marker.label.setVisible(false)
            }
            maplet.addOverlay(marker);
            return marker;
        },

        getPopupContent: function() {

        },

        move: function(latLng, transitionTime) {
            console.log('move')
        }
    };

    L.Playback.Track = L.Class.extend({

        initialize: function(geoJSON, options) {
            options = options || {};
            var tickLen = options.tickLen || 250;
            this._staleTime = options.staleTime || 60 * 60 * 1000;
            // this._fadeMarkersWhenStale = options.fadeMarkersWhenStale || false;

            this._geoJSON = geoJSON;
            this._tickLen = tickLen;
            this._ticks = [];
            this._marker = null;
            this._orientations = [];
            this._timestamps = [];

            var sampleTimes = geoJSON.properties.time;

            this._orientIcon = options.orientIcons;
            var previousOrientation;

            var samples = geoJSON.geometry.coordinates;
            var currSample = samples[0];
            var nextSample = samples[1];

            var currSampleTime = sampleTimes[0];
            var t = currSampleTime; // t is used to iterate through tick times
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
                this._orientations[t] = this._directionOfPoint(currSample, nextSample);
                previousOrientation = this._orientations[t];
            } else {
                this._ticks[t] = currSample;
                this._orientations[t] = this._directionOfPoint(currSample, nextSample);
                previousOrientation = this._orientations[t];
            }

            this._startTime = t;
            t += tickLen;
            while (t < nextSampleTime) {
                ratio = (t - currSampleTime) / (nextSampleTime - currSampleTime);
                this._ticks[t] = this._interpolatePoint(currSample, nextSample, ratio);
                this._orientations[t] = this._directionOfPoint(currSample, nextSample);
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
                    if (nextSample) {
                        this._orientations[t] = this._directionOfPoint(currSample, nextSample);
                        previousOrientation = this._orientations[t];
                    } else {
                        this._orientations[t] = previousOrientation;
                    }
                } else {
                    this._ticks[t] = currSample;
                    if (nextSample) {
                        this._orientations[t] = this._directionOfPoint(currSample, nextSample);
                        previousOrientation = this._orientations[t];
                    } else {
                        this._orientations[t] = previousOrientation;
                    }
                }

                t += tickLen;
                while (t < nextSampleTime) {
                    ratio = (t - currSampleTime) / (nextSampleTime - currSampleTime);

                    if (nextSampleTime - currSampleTime > options.maxInterpolationTime) {
                        this._ticks[t] = currSample;

                        if (nextSample) {
                            this._orientations[t] = this._directionOfPoint(currSample, nextSample);
                            previousOrientation = this._orientations[t];
                        } else {
                            this._orientations[t] = previousOrientation;
                        }
                    } else {
                        this._ticks[t] = this._interpolatePoint(currSample, nextSample, ratio);
                        if (nextSample) {
                            this._orientations[t] = this._directionOfPoint(currSample, nextSample);
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

        _interpolatePoint: function(start, end, ratio) {
            try {
                var delta = [end[0] - start[0], end[1] - start[1]];
                var offset = [delta[0] * ratio, delta[1] * ratio];
                return [start[0] + offset[0], start[1] + offset[1]];
            } catch (e) {
                console.log('err: cant interpolate a point');
                console.log(['start', start]);
                console.log(['end', end]);
                console.log(['ratio', ratio]);
            }
        },

        _directionOfPoint: function(start, end) {
            return this._getBearing(start[1], start[0], end[1], end[0]);
        },

        _getBearing: function(startLat, startLong, endLat, endLong) {
            startLat = this._radians(startLat);
            startLong = this._radians(startLong);
            endLat = this._radians(endLat);
            endLong = this._radians(endLong);

            var dLong = endLong - startLong;

            var dPhi = Math.log(Math.tan(endLat / 2.0 + Math.PI / 4.0) / Math.tan(startLat / 2.0 + Math.PI / 4.0));
            if (Math.abs(dLong) > Math.PI) {
                if (dLong > 0.0)
                    dLong = -(2.0 * Math.PI - dLong);
                else
                    dLong = (2.0 * Math.PI + dLong);
            }

            return (this._degrees(Math.atan2(dLong, dPhi)) + 360.0) % 360.0;
        },

        _radians: function(n) {
            return n * (Math.PI / 180);
        },
        _degrees: function(n) {
            return n * (180 / Math.PI);
        },

        getFirstTick: function() {
            return this._ticks[this._startTime];
        },

        getLastTick: function() {
            return this._ticks[this._endTime];
        },

        getStartTime: function() {
            return this._startTime;
        },

        getEndTime: function() {
            return this._endTime;
        },

        getTickMultiPoint: function() {
            var t = this.getStartTime();
            var endT = this.getEndTime();
            var coordinates = [];
            var time = [];
            while (t <= endT) {
                time.push(t);
                coordinates.push(this.tick(t));
                t += this._tickLen;
            }

            return {
                type: 'Feature',
                geometry: {
                    type: 'MultiPoint',
                    coordinates: coordinates
                },
                properties: {
                    time: time
                }
            };
        },

        trackPresentAtTick: function(timestamp) {
            return (timestamp >= this._startTime);
        },

        trackStaleAtTick: function(timestamp) {
            return ((this._endTime + this._staleTime) <= timestamp);
        },

        tick: function(timestamp) {
            if (timestamp > this._endTime)
                timestamp = this._endTime;
            if (timestamp < this._startTime)
                timestamp = this._startTime;
            return this._ticks[timestamp];
        },

        courseAtTime: function(timestamp) {
            //return 90;
            if (timestamp > this._endTime)
                timestamp = this._endTime;
            if (timestamp < this._startTime)
                timestamp = this._startTime;
            return this._orientations[timestamp];
        },

        setMarker: function(timestamp, options) {
            var lngLat = null;

            // if time stamp is not set, then get first tick
            if (timestamp) {
                lngLat = this.tick(timestamp);
            } else {
                lngLat = this.getFirstTick();
            }

            if (lngLat) {
                // 创建MMarker Object
                this._marker = new L.Playback.MoveableMarker.create(lngLat, options, this._geoJSON);
                // 注册事件callback
                if (options.mouseOverCallback) {
                    MEvent.addListener(this._marker, "mouseover", options.mouseOverCallback)
                }
                if (options.clickCallback) {
                    MEvent.addListener(this._marker, "click", options.clickCallback)
                }

            }

            return this._marker;
        },

        moveMarker: function(latLng, transitionTime, timestamp, track, options) {
            if (this._marker) {
                this._marker.setPoint(latLng, true);
                var pts = maplet.getViewBound();
                var leftUpPt = pts['LeftUp'].split(','),
                    rightDownPt = pts['RightDown'].split(',');
                if (latLng.lon < leftUpPt[0] || latLng.lon > rightDownPt[0] || latLng.lat > leftUpPt[1] || latLng.lat < rightDownPt[1]) {
                    maplet.setCenter(latLng);
                }
                this._marker.label.resetLabel({
                    content: "<div style='color:#aaa;border:1px solid #3e3e3e;background:#FFF;font-size:12px; margin: 0pt; padding: 3px; font-size: 12px; width: auto;'>" + latLng.lon + "," + latLng.lat + "</div>",
                    enableStyle: false
                })
                this._timestamps.push(timestamp)
                if (this._timestamps[2]) {
                    this._timestamps.shift();
                    var preLngLat = track.tick(this._timestamps[0]);
                    var nextLngLat = track.tick(this._timestamps[1]);
                    if (this._orientIcon) {
                        this._updateAngle(nextLngLat, preLngLat)
                    }
                }
            }
        },

        getMarker: function() {
            return this._marker;
        },
        _updateAngle: function(preLngLat, nextLngLat) {
            var rotate = this._calculateBearing(nextLngLat, preLngLat);
            var markerDiv = document.getElementById(this._marker.id);
            if (markerDiv) {
                markerDiv.style.transform = 'rotate(' + rotate + 'deg)';
            }
        },
        _calculateBearing: function(fir_point, sec_point) {
            //两点构成射线与北向上的夹角，顺时针方向
            var first_second_bearing = 0;
            //参数有效性检查
            if (((fir_point[0] < -180) || (fir_point[0] > 180)) || ((fir_point[0] < -90) || (fir_point[1] > 90))) return first_second_bearing;
            if (((sec_point[0] < -180) || (sec_point[0] > 180)) || ((sec_point[0] < -90) || (sec_point[1] > 90))) return first_second_bearing;
            //第一点的经度坐标(角度)
            var first_longitude = fir_point[0];
            //第一点的纬度坐标(角度)
            var first_latitude = fir_point[1];
            //第二点的经度坐标(角度)
            var second_longitude = sec_point[0];
            //第二点的纬度坐标(角度)
            var second_latitude = sec_point[1];
            //求经度差以判断是否两点连线跨越180经度线
            if (Math.abs(second_longitude - first_longitude) > 180) {
                if (first_longitude < 0) {
                    first_longitude += 360;
                } else {
                    second_longitude += 360;
                }
            }
            //第一点的经度坐标变换(弧度)
            first_longitude = Math.PI / 180 * first_longitude;
            //第一点的纬度坐标变换(弧度)
            first_latitude = Math.PI / 180 * first_latitude;
            //第二点的经度坐标变换(弧度)
            second_longitude = Math.PI / 180 * second_longitude;
            //第二点的纬度坐标变换(弧度)
            second_latitude = Math.PI / 180 * second_latitude;

            var middle_latitude = (first_latitude + second_latitude) * 0.5;
            //两点之间的经度差
            var longitude_diff = second_longitude - first_longitude;
            //lon_lat_radio为经纬度之间的一个比率
            var lon_lat_ratio = longitude_diff * Math.cos(middle_latitude);

            //纬度差特别小
            if (Math.abs(second_latitude - first_latitude) < 0.0000001) {
                //经度差特别小
                if (Math.abs(second_longitude - first_longitude) < 0.0000001) {
                    first_second_bearing = 0;
                } else if (first_longitude > second_longitude) {
                    first_second_bearing = 270.0;
                } else {
                    first_second_bearing = 90.0;
                }
            } else {
                first_second_bearing = Math.atan(lon_lat_ratio / (second_latitude - first_latitude));
                first_second_bearing = first_second_bearing / Math.PI * 180;
                if (second_latitude < first_latitude) {
                    first_second_bearing += 180;
                } else if (sec_point[0] < fir_point[0]) {
                    first_second_bearing += 360;
                }
            }
            if (first_second_bearing < 0) {
                first_second_bearing += 360;
            } else if (first_second_bearing >= 360) {
                first_second_bearing -= 360;
            }
            return first_second_bearing;
        }

    });

    L.Playback.TrackController = L.Class.extend({

        initialize: function(map, tracks, options) {
            this.options = options || {};

            this._map = map;

            this._tracks = [];

            // initialize tick points
            this.setTracks(tracks);
        },

        clearTracks: function() {
            while (this._tracks.length > 0) {
                var track = this._tracks.pop();
                var marker = track.getMarker();

                if (marker) {
                    maplet.clearOverlays(false)
                }
            }
        },

        setTracks: function(tracks) {
            // reset current tracks
            this.clearTracks();

            this.addTracks(tracks);
        },

        addTracks: function(tracks) {
            // return if nothing is set
            if (!tracks) {
                return;
            }

            if (tracks instanceof Array) {
                for (var i = 0, len = tracks.length; i < len; i++) {
                    this.addTrack(tracks[i]);
                }
            } else {
                this.addTrack(tracks);
            }
        },

        // add single track
        addTrack: function(track, timestamp) {
            // return if nothing is set
            if (!track) {
                return;
            }

            var marker = track.setMarker(timestamp, this.options);

            if (marker) {
                //marker.addTo(this._map);

                this._tracks.push(track);
            }
        },

        tock: function(timestamp, transitionTime) {
            for (var i = 0, len = this._tracks.length; i < len; i++) {
                var nextLngLat = this._tracks[i].tick(timestamp);
                //这里是每一帧动作的地方
                var point = new MPoint(nextLngLat[0], nextLngLat[1]);
                this._tracks[i].moveMarker(point, transitionTime, timestamp, this._tracks[i], this.options);
            }
        },

        getStartTime: function() {
            var earliestTime = 0;

            if (this._tracks.length > 0) {
                earliestTime = this._tracks[0].getStartTime();
                for (var i = 1, len = this._tracks.length; i < len; i++) {
                    var t = this._tracks[i].getStartTime();
                    if (t < earliestTime) {
                        earliestTime = t;
                    }
                }
            }

            return earliestTime;
        },

        getEndTime: function() {
            var latestTime = 0;

            if (this._tracks.length > 0) {
                latestTime = this._tracks[0].getEndTime();
                for (var i = 1, len = this._tracks.length; i < len; i++) {
                    var t = this._tracks[i].getEndTime();
                    if (t > latestTime) {
                        latestTime = t;
                    }
                }
            }

            return latestTime;
        },

        getTracks: function() {
            return this._tracks;
        }
    });

    L.Playback.Clock = L.Class.extend({

        initialize: function(trackController, callback, options) {
            this._trackController = trackController;
            this._callbacksArry = [];
            if (callback) this.addCallback(callback);
            L.setOptions(this, options);
            this._speed = this.options.speed;
            this._tickLen = this.options.tickLen;
            this._cursor = trackController.getStartTime();
            this._transitionTime = this._tickLen / this._speed;
        },

        _tick: function(self) {
            if (self._cursor > self._trackController.getEndTime()) {
                clearInterval(self._intervalID);
                return;
            }
            self._trackController.tock(self._cursor, self._transitionTime);
            self._callbacks(self._cursor);
            self._cursor += self._tickLen;
        },

        _callbacks: function(cursor) {
            var arry = this._callbacksArry;
            for (var i = 0, len = arry.length; i < len; i++) {
                arry[i](cursor);
            }
        },

        addCallback: function(fn) {
            this._callbacksArry.push(fn);
        },

        start: function() {
            if (this._intervalID) return;
            this._intervalID = window.setInterval(
                this._tick,
                this._transitionTime,
                this);
        },

        stop: function() {
            if (!this._intervalID) return;
            clearInterval(this._intervalID);
            this._intervalID = null;
        },

        getSpeed: function() {
            return this._speed;
        },

        isPlaying: function() {
            return this._intervalID ? true : false;
        },

        setSpeed: function(speed) {
            this._speed = speed;
            this._transitionTime = this._tickLen / speed;
            if (this._intervalID) {
                this.stop();
                this.start();
            }
        },

        setCursor: function(ms) {
            var time = parseInt(ms);
            if (!time) return;
            var mod = time % this._tickLen;
            if (mod !== 0) {
                time += this._tickLen - mod;
            }
            this._cursor = time;
            this._trackController.tock(this._cursor, 0);
            this._callbacks(this._cursor);
        },

        getTime: function() {
            return this._cursor;
        },

        getStartTime: function() {
            return this._trackController.getStartTime();
        },

        getEndTime: function() {
            return this._trackController.getEndTime();
        },

        getTickLen: function() {
            return this._tickLen;
        }

    });

    L.Playback.TracksLayer = L.Class.extend({
        initialize: function(map, options) {
            this.isDisplay = false;
            this.polyline = [];
            this._options = options;
        },

        // clear all geoJSON layers
        clearLayer: function() {
            this.polyline = [];
        },

        // add new geoJSON layer
        addLayer: function(geoJSON) {
            var lineArray = [];
            for (var i = 0, l = arguments[0].geometry.coordinates.length; i < l; i++) {
                var latLng = arguments[0].geometry.coordinates[i];
                lineArray.push(new MPoint(latLng[0], latLng[1]))
            }
            if (this._options.brush) {
                this.polyline.push(new MPolyline(lineArray, this._options.brush));
            } else {
                this.polyline.push(new MPolyline(lineArray, new MBrush()));
            }
        },
        displayAll: function() {
            for (var i = 0; i < this.polyline.length; i++) {
                window.maplet.addOverlay(this.polyline[i])
                maplet.setAutoZoom();
            }
        },
        displayNone: function() {
            for (var i = 0; i < this.polyline.length; i++) {
                window.maplet.removeOverlay(this.polyline[i], false)
            }
        }

    });

    L.Playback.TrackInfoWindow = L.Class.extend({
        initialize:function (map, options) {
            this.windows = [];
            this._options = options;
        },
        addInfoWindow:function (geoJSON) {

        },
        openInfoWindow:function () {

        },
        closeInfoWindow:function () {

        }

    });

    L.Playback.DateControl = L.Control.extend({
        options: {
            position: 'bottomleft',
            dateFormatFn: L.Playback.Util.DateStr,
            timeFormatFn: L.Playback.Util.TimeStr
        },

        initialize: function(playback, options) {
            L.setOptions(this, options);
            this.playback = playback;
        },

        onAdd: function(map) {
            this._container = L.DomUtil.create('div', 'leaflet-control-layers leaflet-control-layers-expanded');

            var self = this;
            var playback = this.playback;
            var time = playback.getTime();

            var datetime = L.DomUtil.create('div', 'datetimeControl', this._container);

            // date time
            this._date = L.DomUtil.create('p', '', datetime);
            this._time = L.DomUtil.create('p', '', datetime);

            this._date.innerHTML = this.options.dateFormatFn(time);
            this._time.innerHTML = this.options.timeFormatFn(time);

            // setup callback
            playback.addCallback(function(ms) {
                self._date.innerHTML = self.options.dateFormatFn(ms);
                self._time.innerHTML = self.options.timeFormatFn(ms);
            });

            return this._container;
        }
    });

    L.Playback.PlayControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },

        initialize: function(playback) {
            this.playback = playback;
        },

        onAdd: function(map) {
            this._container = L.DomUtil.create('div', 'leaflet-control-layers leaflet-control-layers-expanded');

            var self = this;
            var playback = this.playback;
            playback.setSpeed(100);

            var playControl = L.DomUtil.create('div', 'playControl', this._container);


            this._button = L.DomUtil.create('button', '', playControl);
            this._button.innerHTML = 'Play';


            var stop = L.DomEvent.stopPropagation;

            L.DomEvent
                .on(this._button, 'click', stop)
                .on(this._button, 'mousedown', stop)
                .on(this._button, 'dblclick', stop)
                .on(this._button, 'click', L.DomEvent.preventDefault)
                .on(this._button, 'click', play, this);

            function play() {
                if (playback.isPlaying()) {
                    playback.stop();
                    self._button.innerHTML = 'Play';
                } else {
                    playback.start();
                    self._button.innerHTML = 'Stop';
                }
            }

            return this._container;
        }
    });

    L.Playback.SliderControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        initialize: function(playback) {
            this.playback = playback;
        },

        onAdd: function(map) {
            this._container = L.DomUtil.create('div', 'leaflet-control-layers leaflet-control-layers-expanded');

            var self = this;
            var playback = this.playback;

            // slider
            this._slider = L.DomUtil.create('input', 'slider', this._container);
            this._slider.type = 'range';
            this._slider.min = playback.getStartTime();
            this._slider.max = playback.getEndTime();
            this._slider.value = playback.getTime();

            var stop = L.DomEvent.stopPropagation;

            L.DomEvent
                .on(this._slider, 'click', stop)
                .on(this._slider, 'mousedown', stop)
                .on(this._slider, 'dblclick', stop)
                .on(this._slider, 'click', L.DomEvent.preventDefault)
                //.on(this._slider, 'mousemove', L.DomEvent.preventDefault)
                .on(this._slider, 'change', onSliderChange, this)
                .on(this._slider, 'mousemove', onSliderChange, this);


            function onSliderChange(e) {
                var val = Number(e.target.value);
                playback.setCursor(val);
            }

            playback.addCallback(function(ms) {
                self._slider.value = ms;
            });


            map.on('playback:add_tracks', function() {
                self._slider.min = playback.getStartTime();
                self._slider.max = playback.getEndTime();
                self._slider.value = playback.getTime();
            });

            return this._container;
        }
    });

    L.Playback = L.Playback.Clock.extend({
        statics: {
            MoveableMarker: L.Playback.MoveableMarker,
            Track: L.Playback.Track,
            TrackController: L.Playback.TrackController,
            Clock: L.Playback.Clock,
            Util: L.Playback.Util,

            TracksLayer: L.Playback.TracksLayer,
            TrackInfoWindow: L.Playback.TrackInfoWindow,
            PlayControl: L.Playback.PlayControl,
            DateControl: L.Playback.DateControl,
            SliderControl: L.Playback.SliderControl
        },

        options: {
            tickLen: 250,
            speed: 1,
            maxInterpolationTime: 5 * 60 * 1000, // 5 minutes

            tracksLayer: true,

            playControl: false,
            dateControl: false,
            sliderControl: false,
            mapInfoWindow:true

        },

        initialize: function(map, geoJSON, callback, options) {
            L.setOptions(this, options);

            this._map = map;
            this._trackController = new L.Playback.TrackController(map, null, this.options);
            L.Playback.Clock.prototype.initialize.call(this, this._trackController, callback, this.options);

            if (this.options.tracksLayer) {
                this._tracksLayer = new L.Playback.TracksLayer(map, options);
            }

            //map信息窗体
            if (this.options.mapInfoWindow) {
                this._mapInfoWindow = new L.Playback.TrackInfoWindow(map, options);
            }

            this.setData(geoJSON);


            if (this.options.playControl) {
                this.playControl = new L.Playback.PlayControl(this);
                this.playControl.addTo(map);
            }

            if (this.options.sliderControl) {
                this.sliderControl = new L.Playback.SliderControl(this);
                this.sliderControl.addTo(map);
            }

            if (this.options.dateControl) {
                this.dateControl = new L.Playback.DateControl(this, options);
                this.dateControl.addTo(map);
            }

        },

        clearData: function() {
            this._trackController.clearTracks();

            if (this._tracksLayer) {
                this._tracksLayer.clearLayer();
            }
        },

        setData: function(geoJSON) {
            this.clearData();

            this.addData(geoJSON, this.getTime());

            this.setCursor(this.getStartTime());
        },

        // bad implementation
        addData: function(geoJSON, ms, options) {
            // return if data not set
            if (!geoJSON) {
                return;
            }

            if (geoJSON instanceof Array) {
                for (var i = 0, len = geoJSON.length; i < len; i++) {
                    this._trackController.addTrack(new L.Playback.Track(geoJSON[i], this.options), ms);
                }
            } else {
                this._trackController.addTrack(new L.Playback.Track(geoJSON, this.options), ms);
            }

            this._map.fire('playback:set:data');

            if (this.options.tracksLayer) {
                this._tracksLayer.addLayer(geoJSON);
            }

            if(this.options.mapInfoWindow){
                this._mapInfoWindow.addInfoWindow(geoJSON);
            }

        },

        destroy: function() {
            this.clearData();
            if (this.playControl) {
                this._map.removeControl(this.playControl);
            }
            if (this.sliderControl) {
                this._map.removeControl(this.sliderControl);
            }
            if (this.dateControl) {
                this._map.removeControl(this.dateControl);
            }
        }
    });

    L.Map.addInitHook(function() {
        if (this.options.playback) {
            this.playback = new L.Playback(this);
        }
    });

    L.playback = function(map, geoJSON, callback, options) {
        return new L.Playback(map, geoJSON, callback, options);
    };
    return L.Playback;

}));
L.Playback = L.Playback || {};

L.Playback.Control = L.Control.extend({
    _html: '<footer class="lp">' +
        '  <div class="transport">' +
        '    <div class="navbar">' +
        '      <div class="navbar-inner">' +
        '        <ul class="nav">' +
        '          <li class="ctrl">' +
        '            <a id="play-pause" href="#"><i id="play-pause-icon" class="fa fa-play fa-lg"></i></a>' +
        '          </li>' +
        '          <li class="ctrl dropup">' +
        '            <a id="clock-btn" class="clock" data-toggle="dropdown" href="#">' +
        '              <span id="cursor-date"></span><br/>' +
        '              <span id="cursor-time"></span>' +
        '            </a>' +
        '            <div class="dropdown-menu" role="menu" aria-labelledby="clock-btn">' +
        '              <label>轨迹当前时间</label>' +
        '              <div class="input-append bootstrap-timepicker">' +
        '                <input id="timepicker" type="text" class="input-small span2">' +
        '                <span class="add-on"><i class="fa fa-clock-o"></i></span>' +
        '              </div>' +
        '              <div id="calendar"></div>' +
        '              <div class="input-append">' +
        '                <input id="date-input" type="text" class="input-small">' +
        '                <span class="add-on"><i class="fa fa-calendar"></i></span>' +
        '              </div>' +
        '            </div>' +
        '          </li>' +
        '        </ul>' +
        '        <ul class="nav pull-right">' +
        '          <li>' +
        '            <div id="time-slider"></div>' +
        '          </li>' +
        '          <li class="ctrl dropup">' +
        '            <a id="speed-btn" data-toggle="dropdown" href="#"><i class="fa fa-dashboard fa-lg"></i> <span id="speed-icon-val" class="speed">1</span>x</a>' +
        '            <div class="speed-menu dropdown-menu" role="menu" aria-labelledby="speed-btn">' +
        '              <label>播放速度</label>' +
        '              <input id="speed-input" class="span1 speed" type="text" value="1" />' +
        '              <div id="speed-slider"></div>' +
        '            </div>' +
        '          </li>' +
        '          <li class="ctrl">' +
        '            <a id="display-tracks-btn" href="#"></a>' +
        '          </li>' +
        '        </ul>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '</footer>',

    initialize: function(playback) {
        this.playback = playback;
        playback.addCallback(this._clockCallback);
    },

    onAdd: function(map) {
        var html = this._html;
        $('#map').after(html);
        this._setup();

        // just an empty container
        // TODO: dont do this
        return L.DomUtil.create('div');
    },

    _setup: function() {
        var self = this;
        var playback = this.playback;
        $('#play-pause').click(function() {
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
        $('#cursor-date').html(L.Playback.Util.DateStr(startTime));
        $('#cursor-time').html(L.Playback.Util.TimeStr(startTime));

        $('#time-slider').slider({
            min: playback.getStartTime(),
            max: playback.getEndTime(),
            step: playback.getTickLen(),
            value: playback.getTime(),
            slide: function(event, ui) {
                playback.setCursor(ui.value);
                $('#cursor-time').val(ui.value.toString());
                $('#cursor-time-txt').html(new Date(ui.value).toString());
            }
        });

        $('#speed-slider').slider({
            min: 0,
            max: 500,
            step: 50,
            value: self._speedToSliderVal(this.playback.getSpeed()),
            orientation: 'vertical',
            slide: function(event, ui) {
                var speed = self._sliderValToSpeed(parseFloat(ui.value));
                playback.setSpeed(speed);
                $('.speed').html(speed).val(speed);
            }
        });

        $('#speed-input').on('keyup', function(e) {
            var speed = parseFloat($('#speed-input').val());
            if (!speed) return;
            playback.setSpeed(speed);
            $('#speed-slider').slider('value', speedToSliderVal(speed));
            $('#speed-icon-val').html(speed);
            if (e.keyCode === 13) {
                $('.speed-menu').dropdown('toggle');
            }
        });

        $('#calendar').datepicker({
            changeMonth: true,
            changeYear: true,
            altField: '#date-input',
            altFormat: 'mm/dd/yy',
            defaultDate: new Date(playback.getTime()),
            onSelect: function(date) {
                var date = new Date(date);
                var time = $('#timepicker').data('timepicker');
                var ts = self._combineDateAndTime(date, time);
                playback.setCursor(ts);
                $('#time-slider').slider('value', ts);
            }
        });

        $('#date-input').on('keyup', function(e) {
            $('#calendar').datepicker('setDate', $('#date-input').val());
        });

        $('.dropdown-menu').on('click', function(e) {
            e.stopPropagation();
        });

        $('#timepicker').timepicker({
            showSeconds: true
        });

        $('#timepicker').timepicker('setTime',
            new Date(playback.getTime()).toTimeString());

        $('#timepicker').timepicker().on('changeTime.timepicker', function(e) {
            var date = $('#calendar').datepicker('getDate');
            var ts = self._combineDateAndTime(date, e.time);
            playback.setCursor(ts);
            $('#time-slider').slider('value', ts);
        });

        //$('#load-tracks-btn').on('click', function(e) {
        //  $('#load-tracks-modal').modal();
        //});

        $('#load-tracks-save').on('click', function(e) {
            var file = $('#load-tracks-file').get(0).files[0];
            self._loadTracksFromFile(file);
        });
        $('#display-tracks-btn')[0].innerHTML = '<i class="fa fa-map-marker fa-lg"></i>显示轨迹';
        $('#display-tracks-btn').click(function() {
            if (!playback._tracksLayer.isDisplay) {
                playback._tracksLayer.isDisplay = true;
                playback._tracksLayer.displayAll(false);
                $('#display-tracks-btn')[0].innerHTML = '<i class="fa fa-map-marker fa-lg"></i>隐藏轨迹';
            } else {
                playback._tracksLayer.displayNone();
                playback._tracksLayer.isDisplay = false;
                $('#display-tracks-btn')[0].innerHTML = '<i class="fa fa-map-marker fa-lg"></i>显示轨迹';
            }
        });

    },

    _clockCallback: function(ms) {
        $('#cursor-date').html(L.Playback.Util.DateStr(ms));
        $('#cursor-time').html(L.Playback.Util.TimeStr(ms));
        $('#time-slider').slider('value', ms);
    },

    _speedToSliderVal: function(speed) {
        if (speed < 1) return -10 + speed * 10;
        return speed - 1;
    },

    _sliderValToSpeed: function(val) {
        if (val < 0) return parseFloat((1 + val / 10).toFixed(2));
        return val + 1;
    },

    _combineDateAndTime: function(date, time) {
        var yr = date.getFullYear();
        var mo = date.getMonth();
        var dy = date.getDate();
        // the calendar uses hour and the timepicker uses hours...
        var hr = time.hours || time.hour;
        if (time.meridian === 'PM' && hr !== 12) hr += 12;
        var min = time.minutes || time.minute;
        var sec = time.seconds || time.second;
        return new Date(yr, mo, dy, hr, min, sec).getTime();
    },

    // _loadTracksFromFile: function(file) {
    //     var self = this;
    //     var reader = new FileReader();
    //     reader.readAsText(file);
    //     reader.onload = function(e) {
    //         var fileStr = e.target.result;

    //         /**
    //          * See if we can do GeoJSON...
    //          */
    //         try {
    //             var tracks = JSON.parse(fileStr);
    //         } catch (e) {
    //             *
    //              * See if we can do GPX...

    //             try {
    //                 var tracks = L.Playback.Util.ParseGPX(fileStr);
    //             } catch (e) {
    //                 console.error('Unable to load tracks!');
    //                 return;
    //             }
    //         }

    //         self.playback.addData(tracks);
    //         $('#load-tracks-modal').modal('hide');
    //     };
    // }

});
