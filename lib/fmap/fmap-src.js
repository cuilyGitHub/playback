/*
 Fmap 1.0-dev, a JS library for interactive maps. http://hdnav.cn
 (c) 2010-2015 Vladimir Agafonkin, (c) 2010-2011 CloudMade
*/
(function (window, document, undefined) {
var FMap = {
	version: '1.0-dev'
};

function expose() {
	var oldL = window.FMap;

	FMap.noConflict = function () {
		window.FMap = oldL;
		return this;
	};

	window.FMap = FMap;
}

// define Fmap for Node module pattern loaders, including Browserify
if (typeof module === 'object' && typeof module.exports === 'object') {
	module.exports = FMap;

// define Fmap as an AMD module
} else if (typeof define === 'function' && define.amd) {
	define(FMap);
}

// define Fmap as a global FMap variable, saving the original FMap to restore later if needed
if (typeof window !== 'undefined') {
	expose();
}



/*
 * FMap.Util contains various utility functions used throughout Fmap code.
 */

FMap.Util = {
	// extend an object with properties of one or more other objects
	extend: function (dest) {
		var i, j, len, src;

		for (j = 1, len = arguments.length; j < len; j++) {
			src = arguments[j];
			for (i in src) {
				dest[i] = src[i];
			}
		}
		return dest;
	},

	// create an object from a given prototype
	create: Object.create || (function () {
		function F() {}
		return function (proto) {
			F.prototype = proto;
			return new F();
		};
	})(),

	// bind a function to be called with a given context
	bind: function (fn, obj) {
		var slice = Array.prototype.slice;

		if (fn.bind) {
			return fn.bind.apply(fn, slice.call(arguments, 1));
		}

		var args = slice.call(arguments, 2);

		return function () {
			return fn.apply(obj, args.length ? args.concat(slice.call(arguments)) : arguments);
		};
	},

	// return unique ID of an object
	stamp: function (obj) {
		/*eslint-disable */
		obj._fmap_id = obj._fmap_id || ++FMap.Util.lastId;
		return obj._fmap_id;
		/*eslint-enable */
	},

	lastId: 0,

	// return a function that won't be called more often than the given interval
	throttle: function (fn, time, context) {
		var lock, args, wrapperFn, later;

		later = function () {
			// reset lock and call if queued
			lock = false;
			if (args) {
				wrapperFn.apply(context, args);
				args = false;
			}
		};

		wrapperFn = function () {
			if (lock) {
				// called too soon, queue to call later
				args = arguments;

			} else {
				// call and lock until later
				fn.apply(context, arguments);
				setTimeout(later, time);
				lock = true;
			}
		};

		return wrapperFn;
	},

	// wrap the given number to lie within a certain range (used for wrapping longitude)
	wrapNum: function (x, range, includeMax) {
		var max = range[1],
		    min = range[0],
		    d = max - min;
		return x === max && includeMax ? x : ((x - min) % d + d) % d + min;
	},

	// do nothing (used as a noop throughout the code)
	falseFn: function () { return false; },

	// round a given number to a given precision
	formatNum: function (num, digits) {
		var pow = Math.pow(10, digits || 5);
		return Math.round(num * pow) / pow;
	},

	// trim whitespace from both sides of a string
	trim: function (str) {
		return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, '');
	},

	// split a string into words
	splitWords: function (str) {
		return FMap.Util.trim(str).split(/\s+/);
	},

	// set options to an object, inheriting parent's options as well
	setOptions: function (obj, options) {
		if (!obj.hasOwnProperty('options')) {
			obj.options = obj.options ? FMap.Util.create(obj.options) : {};
		}
		for (var i in options) {
			obj.options[i] = options[i];
		}
		return obj.options;
	},

	// make a URL with GET parameters out of a set of properties/values
	getParamString: function (obj, existingUrl, uppercase) {
		var params = [];
		for (var i in obj) {
			params.push(encodeURIComponent(uppercase ? i.toUpperCase() : i) + '=' + encodeURIComponent(obj[i]));
		}
		return ((!existingUrl || existingUrl.indexOf('?') === -1) ? '?' : '&') + params.join('&');
	},

	// super-simple templating facility, used for TileLayer URLs
	template: function (str, data) {
		return str.replace(FMap.Util.templateRe, function (str, key) {
			var value = data[key];

			if (value === undefined) {
				throw new Error('No value provided for variable ' + str);

			} else if (typeof value === 'function') {
				value = value(data);
			}
			return value;
		});
	},

	templateRe: /\{ *([\w_]+) *\}/g,

	serviceUrlTemplate: function (str, data) {
		return str.replace(FMap.Util.templateRe, function (str, key) {
			var value = data[key];

			if (value === undefined) {
				value = '';
			} else if (typeof value === 'function') {
				value = value(data);
			} else {
				value = key + '=' + value;
			}
			return value;
		});
	},

	isArray: Array.isArray || function (obj) {
		return (Object.prototype.toString.call(obj) === '[object Array]');
	},

	// minimal image URI, set to an image when disposing to flush memory
	emptyImageUrl: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
};

(function () {
	// inspired by http://paulirish.com/2011/requestanimationframe-for-smart-animating/

	function getPrefixed(name) {
		return window['webkit' + name] || window['moz' + name] || window['ms' + name];
	}

	var lastTime = 0;

	// fallback for IE 7-8
	function timeoutDefer(fn) {
		var time = +new Date(),
		    timeToCall = Math.max(0, 16 - (time - lastTime));

		lastTime = time + timeToCall;
		return window.setTimeout(fn, timeToCall);
	}

	var requestFn = window.requestAnimationFrame || getPrefixed('RequestAnimationFrame') || timeoutDefer,
	    cancelFn = window.cancelAnimationFrame || getPrefixed('CancelAnimationFrame') ||
	               getPrefixed('CancelRequestAnimationFrame') || function (id) { window.clearTimeout(id); };


	FMap.Util.requestAnimFrame = function (fn, context, immediate) {
		if (immediate && requestFn === timeoutDefer) {
			fn.call(context);
		} else {
			return requestFn.call(window, FMap.bind(fn, context));
		}
	};

	FMap.Util.cancelAnimFrame = function (id) {
		if (id) {
			cancelFn.call(window, id);
		}
	};
	FMap.Util.ajax = function (url, cb) {
		// the following is from JavaScript: The Definitive Guide
		// and https://developer.mozilla.org/en-US/docs/DOM/XMLHttpRequest/Using_XMLHttpRequest_in_IE6
		if (window.XMLHttpRequest === undefined) {
			window.XMLHttpRequest = function () {
				/*global ActiveXObject:true */
				try {
					return new ActiveXObject('Microsoft.XMLHTTP');
				}
				catch  (e) {
					throw new Error('XMLHttpRequest is not supported');
				}
			};
		}
		var response, request = new XMLHttpRequest();
		request.open('GET', url);
		request.onreadystatechange = function () {
			/*jshint evil: true */
			if (request.readyState === 4) {
				if (request.status === 200) {
					if (window.JSON) {
						response = JSON.parse(request.responseText);
					} else {
						response = eval('(' + request.responseText + ')');
					}
					cb(response);
				} else {
					cb('error');
				}
			}
		};
		request.send();
		return request;
	};
})();

// shortcuts for most used utility functions
FMap.extend = FMap.Util.extend;
FMap.bind = FMap.Util.bind;
FMap.stamp = FMap.Util.stamp;
FMap.setOptions = FMap.Util.setOptions;



/*
 * FMap.Class powers the OOP facilities of the library.
 * Thanks to John Resig and Dean Edwards for inspiration!
 */

FMap.Class = function () {};

FMap.Class.extend = function (props) {

	// extended class with the new prototype
	var NewClass = function () {

		// call the constructor
		if (this.initialize) {
			this.initialize.apply(this, arguments);
		}

		// call all constructor hooks
		this.callInitHooks();
	};

	var parentProto = NewClass.__super__ = this.prototype;

	var proto = FMap.Util.create(parentProto);
	proto.constructor = NewClass;

	NewClass.prototype = proto;

	// inherit parent's statics
	for (var i in this) {
		if (this.hasOwnProperty(i) && i !== 'prototype') {
			NewClass[i] = this[i];
		}
	}

	// mix static properties into the class
	if (props.statics) {
		FMap.extend(NewClass, props.statics);
		delete props.statics;
	}

	// mix includes into the prototype
	if (props.includes) {
		FMap.Util.extend.apply(null, [proto].concat(props.includes));
		delete props.includes;
	}

	// merge options
	if (proto.options) {
		props.options = FMap.Util.extend(FMap.Util.create(proto.options), props.options);
	}

	// mix given properties into the prototype
	FMap.extend(proto, props);

	proto._initHooks = [];

	// add method for calling all hooks
	proto.callInitHooks = function () {

		if (this._initHooksCalled) { return; }

		if (parentProto.callInitHooks) {
			parentProto.callInitHooks.call(this);
		}

		this._initHooksCalled = true;

		for (var i = 0, len = proto._initHooks.length; i < len; i++) {
			proto._initHooks[i].call(this);
		}
	};

	proto.reInitHooksCalled = function () {
		this._initHooksCalled = false;
	}

	return NewClass;
};


// method for adding properties to prototype
FMap.Class.include = function (props) {
	FMap.extend(this.prototype, props);
};

// merge new default options to the Class
FMap.Class.mergeOptions = function (options) {
	FMap.extend(this.prototype.options, options);
};

// add a constructor hook
FMap.Class.addInitHook = function (fn) { // (Function) || (String, args...)
	var args = Array.prototype.slice.call(arguments, 1);

	var init = typeof fn === 'function' ? fn : function () {
		this[fn].apply(this, args);
	};

	this.prototype._initHooks = this.prototype._initHooks || [];
	this.prototype._initHooks.push(init);
};



/*
 * FMap.Evented is a base class that Fmap classes inherit from to handle custom events.
 */

FMap.Evented = FMap.Class.extend({

	on: function (types, fn, context) {

		// types can be a map of types/handlers
		if (typeof types === 'object') {
			for (var type in types) {
				// we don't process space-separated events here for performance;
				// it's a hot path since Layer uses the on(obj) syntax
				this._on(type, types[type], fn);
			}

		} else {
			// types can be a string of space-separated words
			types = FMap.Util.splitWords(types);

			for (var i = 0, len = types.length; i < len; i++) {
				this._on(types[i], fn, context);
			}
		}

		return this;
	},

	off: function (types, fn, context) {

		if (!types) {
			// clear all listeners if called without arguments
			delete this._events;

		} else if (typeof types === 'object') {
			for (var type in types) {
				this._off(type, types[type], fn);
			}

		} else {
			types = FMap.Util.splitWords(types);

			for (var i = 0, len = types.length; i < len; i++) {
				this._off(types[i], fn, context);
			}
		}

		return this;
	},

	// attach listener (without syntactic sugar now)
	_on: function (type, fn, context) {

		var events = this._events = this._events || {},
		    contextId = context && context !== this && FMap.stamp(context);

		if (contextId) {
			// store listeners with custom context in a separate hash (if it has an id);
			// gives a major performance boost when firing and removing events (e.g. on map object)

			var indexKey = type + '_idx',
			    indexLenKey = type + '_len',
			    typeIndex = events[indexKey] = events[indexKey] || {},
			    id = FMap.stamp(fn) + '_' + contextId;

			if (!typeIndex[id]) {
				typeIndex[id] = {fn: fn, ctx: context};

				// keep track of the number of keys in the index to quickly check if it's empty
				events[indexLenKey] = (events[indexLenKey] || 0) + 1;
			}

		} else {
			// individual layers mostly use "this" for context and don't fire listeners too often
			// so simple array makes the memory footprint better while not degrading performance

			events[type] = events[type] || [];
			events[type].push({fn: fn});
		}
	},

	_off: function (type, fn, context) {
		var events = this._events,
		    indexKey = type + '_idx',
		    indexLenKey = type + '_len';

		if (!events) { return; }

		if (!fn) {
			// clear all listeners for a type if function isn't specified
			delete events[type];
			delete events[indexKey];
			delete events[indexLenKey];
			return;
		}

		var contextId = context && context !== this && FMap.stamp(context),
		    listeners, i, len, listener, id;

		if (contextId) {
			id = FMap.stamp(fn) + '_' + contextId;
			listeners = events[indexKey];

			if (listeners && listeners[id]) {
				listener = listeners[id];
				delete listeners[id];
				events[indexLenKey]--;
			}

		} else {
			listeners = events[type];

			if (listeners) {
				for (i = 0, len = listeners.length; i < len; i++) {
					if (listeners[i].fn === fn) {
						listener = listeners[i];
						listeners.splice(i, 1);
						break;
					}
				}
			}
		}

		// set the removed listener to noop so that's not called if remove happens in fire
		if (listener) {
			listener.fn = FMap.Util.falseFn;
		}
	},

	fire: function (type, data, propagate) {
		if (!this.listens(type, propagate)) { return this; }

		var event = FMap.Util.extend({}, data, {type: type, target: this}),
		    events = this._events;

		if (events) {
			var typeIndex = events[type + '_idx'],
			    i, len, listeners, id;

			if (events[type]) {
				// make sure adding/removing listeners inside other listeners won't cause infinite loop
				listeners = events[type].slice();

				for (i = 0, len = listeners.length; i < len; i++) {
					listeners[i].fn.call(this, event);
				}
			}

			// fire event for the context-indexed listeners as well
			for (id in typeIndex) {
				typeIndex[id].fn.call(typeIndex[id].ctx, event);
			}
		}

		if (propagate) {
			// propagate the event to parents (set with addEventParent)
			this._propagateEvent(event);
		}

		return this;
	},

	listens: function (type, propagate) {
		var events = this._events;

		if (events && (events[type] || events[type + '_len'])) { return true; }

		if (propagate) {
			// also check parents for listeners if event propagates
			for (var id in this._eventParents) {
				if (this._eventParents[id].listens(type, propagate)) { return true; }
			}
		}
		return false;
	},

	once: function (types, fn, context) {

		if (typeof types === 'object') {
			for (var type in types) {
				this.once(type, types[type], fn);
			}
			return this;
		}

		var handler = FMap.bind(function () {
			this
			    .off(types, fn, context)
			    .off(types, handler, context);
		}, this);

		// add a listener that's executed once and removed after that
		return this
		    .on(types, fn, context)
		    .on(types, handler, context);
	},

	// adds a parent to propagate events to (when you fire with true as a 3rd argument)
	addEventParent: function (obj) {
		this._eventParents = this._eventParents || {};
		this._eventParents[FMap.stamp(obj)] = obj;
		return this;
	},

	removeEventParent: function (obj) {
		if (this._eventParents) {
			delete this._eventParents[FMap.stamp(obj)];
		}
		return this;
	},

	_propagateEvent: function (e) {
		for (var id in this._eventParents) {
			this._eventParents[id].fire(e.type, FMap.extend({layer: e.target}, e), true);
		}
	}
});

var proto = FMap.Evented.prototype;

// aliases; we should ditch those eventually
proto.addEventListener = proto.on;
proto.removeEventListener = proto.clearAllEventListeners = proto.off;
proto.addOneTimeEventListener = proto.once;
proto.fireEvent = proto.fire;
proto.hasEventListeners = proto.listens;

FMap.Mixin = {Events: proto};



/*
 * FMap.Browser handles different browser and feature detections for internal Fmap use.
 */

(function () {

	var ua = navigator.userAgent.toLowerCase(),
	    doc = document.documentElement,

	    ie = 'ActiveXObject' in window,

	    webkit    = ua.indexOf('webkit') !== -1,
	    phantomjs = ua.indexOf('phantom') !== -1,
	    android23 = ua.search('android [23]') !== -1,
	    chrome    = ua.indexOf('chrome') !== -1,
	    gecko     = ua.indexOf('gecko') !== -1  && !webkit && !window.opera && !ie,

	    mobile = typeof orientation !== 'undefined' || ua.indexOf('mobile') !== -1,
	    msPointer = navigator.msPointerEnabled && navigator.msMaxTouchPoints && !window.PointerEvent,
	    pointer = (window.PointerEvent && navigator.pointerEnabled && navigator.maxTouchPoints) || msPointer,

	    ie3d = ie && ('transition' in doc.style),
	    webkit3d = ('WebKitCSSMatrix' in window) && ('m11' in new window.WebKitCSSMatrix()) && !android23,
	    gecko3d = 'MozPerspective' in doc.style,
	    opera12 = 'OTransition' in doc.style;

	var touch = !window.L_NO_TOUCH && !phantomjs && (pointer || 'ontouchstart' in window ||
			(window.DocumentTouch && document instanceof window.DocumentTouch));

	FMap.Browser = {
		ie: ie,
		ielt9: ie && !document.addEventListener,
		webkit: webkit,
		gecko: gecko,
		android: ua.indexOf('android') !== -1,
		android23: android23,
		chrome: chrome,
		safari: !chrome && ua.indexOf('safari') !== -1,

		ie3d: ie3d,
		webkit3d: webkit3d,
		gecko3d: gecko3d,
		opera12: opera12,
		any3d: !window.L_DISABLE_3D && (ie3d || webkit3d || gecko3d) && !opera12 && !phantomjs,

		mobile: mobile,
		mobileWebkit: mobile && webkit,
		mobileWebkit3d: mobile && webkit3d,
		mobileOpera: mobile && window.opera,
		mobileGecko: mobile && gecko,

		touch: !!touch,
		msPointer: !!msPointer,
		pointer: !!pointer,

		retina: (window.devicePixelRatio || (window.screen.deviceXDPI / window.screen.logicalXDPI)) > 1
	};

}());



/*
 * FMap.Point represents a point with x and y coordinates.
 */

FMap.Point = function (x, y, round) {
	this.x = (round ? Math.round(x) : x);
	this.y = (round ? Math.round(y) : y);
};

FMap.Point.prototype = {

	clone: function () {
		return new FMap.Point(this.x, this.y);
	},

	// non-destructive, returns a new point
	add: function (point) {
		return this.clone()._add(FMap.point(point));
	},

	// destructive, used directly for performance in situations where it's safe to modify existing point
	_add: function (point) {
		this.x += point.x;
		this.y += point.y;
		return this;
	},

	subtract: function (point) {
		return this.clone()._subtract(FMap.point(point));
	},

	_subtract: function (point) {
		this.x -= point.x;
		this.y -= point.y;
		return this;
	},

	divideBy: function (num) {
		return this.clone()._divideBy(num);
	},

	_divideBy: function (num) {
		this.x /= num;
		this.y /= num;
		return this;
	},

	multiplyBy: function (num) {
		return this.clone()._multiplyBy(num);
	},

	_multiplyBy: function (num) {
		this.x *= num;
		this.y *= num;
		return this;
	},

	round: function () {
		return this.clone()._round();
	},

	_round: function () {
		this.x = Math.round(this.x);
		this.y = Math.round(this.y);
		return this;
	},

	floor: function () {
		return this.clone()._floor();
	},

	_floor: function () {
		this.x = Math.floor(this.x);
		this.y = Math.floor(this.y);
		return this;
	},

	ceil: function () {
		return this.clone()._ceil();
	},

	_ceil: function () {
		this.x = Math.ceil(this.x);
		this.y = Math.ceil(this.y);
		return this;
	},

	distanceTo: function (point) {
		point = FMap.point(point);

		var x = point.x - this.x,
		    y = point.y - this.y;

		return Math.sqrt(x * x + y * y);
	},

	equals: function (point) {
		point = FMap.point(point);

		return point.x === this.x &&
		       point.y === this.y;
	},

	contains: function (point) {
		point = FMap.point(point);

		return Math.abs(point.x) <= Math.abs(this.x) &&
		       Math.abs(point.y) <= Math.abs(this.y);
	},

	toString: function () {
		return 'Point(' +
		        FMap.Util.formatNum(this.x) + ', ' +
		        FMap.Util.formatNum(this.y) + ')';
	}
};

FMap.point = function (x, y, round) {
	if (x instanceof FMap.Point) {
		return x;
	}
	if (FMap.Util.isArray(x)) {
		return new FMap.Point(x[0], x[1]);
	}
	if (x === undefined || x === null) {
		return x;
	}
	return new FMap.Point(x, y, round);
};



/*
 * FMap.Bounds represents a rectangular area on the screen in pixel coordinates.
 */

FMap.Bounds = function (a, b) { //(Point, Point) or Point[]
	if (!a) { return; }

	var points = b ? [a, b] : a;

	for (var i = 0, len = points.length; i < len; i++) {
		this.extend(points[i]);
	}
};

FMap.Bounds.prototype = {
	// extend the bounds to contain the given point
	extend: function (point) { // (Point)
		point = FMap.point(point);

		if (!this.min && !this.max) {
			this.min = point.clone();
			this.max = point.clone();
		} else {
			this.min.x = Math.min(point.x, this.min.x);
			this.max.x = Math.max(point.x, this.max.x);
			this.min.y = Math.min(point.y, this.min.y);
			this.max.y = Math.max(point.y, this.max.y);
		}
		return this;
	},

	getCenter: function (round) { // (Boolean) -> Point
		return new FMap.Point(
		        (this.min.x + this.max.x) / 2,
		        (this.min.y + this.max.y) / 2, round);
	},

	getBottomLeft: function () { // -> Point
		return new FMap.Point(this.min.x, this.max.y);
	},

	getTopRight: function () { // -> Point
		return new FMap.Point(this.max.x, this.min.y);
	},

	getSize: function () {
		return this.max.subtract(this.min);
	},

	contains: function (obj) { // (Bounds) or (Point) -> Boolean
		var min, max;

		if (typeof obj[0] === 'number' || obj instanceof FMap.Point) {
			obj = FMap.point(obj);
		} else {
			obj = FMap.bounds(obj);
		}

		if (obj instanceof FMap.Bounds) {
			min = obj.min;
			max = obj.max;
		} else {
			min = max = obj;
		}

		return (min.x >= this.min.x) &&
		       (max.x <= this.max.x) &&
		       (min.y >= this.min.y) &&
		       (max.y <= this.max.y);
	},

	intersects: function (bounds) { // (Bounds) -> Boolean
		bounds = FMap.bounds(bounds);

		var min = this.min,
		    max = this.max,
		    min2 = bounds.min,
		    max2 = bounds.max,
		    xIntersects = (max2.x >= min.x) && (min2.x <= max.x),
		    yIntersects = (max2.y >= min.y) && (min2.y <= max.y);

		return xIntersects && yIntersects;
	},

	isValid: function () {
		return !!(this.min && this.max);
	}
};

FMap.bounds = function (a, b) { // (Bounds) or (Point, Point) or (Point[])
	if (!a || a instanceof FMap.Bounds) {
		return a;
	}
	return new FMap.Bounds(a, b);
};



/*
 * FMap.Transformation is an utility class to perform simple point transformations through a 2d-matrix.
 */

FMap.Transformation = function (a, b, c, d) {
	this._a = a;
	this._b = b;
	this._c = c;
	this._d = d;
};

FMap.Transformation.prototype = {
	transform: function (point, scale) { // (Point, Number) -> Point
		return this._transform(point.clone(), scale);
	},

	// destructive transform (faster)
	_transform: function (point, scale) {
		scale = scale || 1;
		point.x = scale * (this._a * point.x + this._b);
		point.y = scale * (this._c * point.y + this._d);
		return point;
	},

	untransform: function (point, scale) {
		scale = scale || 1;
		return new FMap.Point(
		        (point.x / scale - this._b) / this._a,
		        (point.y / scale - this._d) / this._c);
	}
};



/*
 * FMap.DomUtil contains various utility functions for working with DOM.
 */

FMap.DomUtil = {
	get: function (id) {
		return typeof id === 'string' ? document.getElementById(id) : id;
	},

	getStyle: function (el, style) {

		var value = el.style[style] || (el.currentStyle && el.currentStyle[style]);

		if ((!value || value === 'auto') && document.defaultView) {
			var css = document.defaultView.getComputedStyle(el, null);
			value = css ? css[style] : null;
		}

		return value === 'auto' ? null : value;
	},

	create: function (tagName, className, container) {

		var el = document.createElement(tagName);
		el.className = className;

		if (container) {
			container.appendChild(el);
		}

		return el;
	},

	remove: function (el) {
		var parent = el.parentNode;
		if (parent) {
			parent.removeChild(el);
		}
	},

	empty: function (el) {
		while (el.firstChild) {
			el.removeChild(el.firstChild);
		}
	},

	toFront: function (el) {
		el.parentNode.appendChild(el);
	},

	toBack: function (el) {
		var parent = el.parentNode;
		parent.insertBefore(el, parent.firstChild);
	},

	hasClass: function (el, name) {
		if (el.classList !== undefined) {
			return el.classList.contains(name);
		}
		var className = FMap.DomUtil.getClass(el);
		return className.length > 0 && new RegExp('(^|\\s)' + name + '(\\s|$)').test(className);
	},

	addClass: function (el, name) {
		if (el.classList !== undefined) {
			var classes = FMap.Util.splitWords(name);
			for (var i = 0, len = classes.length; i < len; i++) {
				el.classList.add(classes[i]);
			}
		} else if (!FMap.DomUtil.hasClass(el, name)) {
			var className = FMap.DomUtil.getClass(el);
			FMap.DomUtil.setClass(el, (className ? className + ' ' : '') + name);
		}
	},

	removeClass: function (el, name) {
		if (el.classList !== undefined) {
			el.classList.remove(name);
		} else {
			FMap.DomUtil.setClass(el, FMap.Util.trim((' ' + FMap.DomUtil.getClass(el) + ' ').replace(' ' + name + ' ', ' ')));
		}
	},

	setClass: function (el, name) {
		if (el.className.baseVal === undefined) {
			el.className = name;
		} else {
			// in case of SVG element
			el.className.baseVal = name;
		}
	},

	getClass: function (el) {
		return el.className.baseVal === undefined ? el.className : el.className.baseVal;
	},

	setOpacity: function (el, value) {

		if ('opacity' in el.style) {
			el.style.opacity = value;

		} else if ('filter' in el.style) {
			FMap.DomUtil._setOpacityIE(el, value);
		}
	},

	_setOpacityIE: function (el, value) {
		var filter = false,
		    filterName = 'DXImageTransform.Microsoft.Alpha';

		// filters collection throws an error if we try to retrieve a filter that doesn't exist
		try {
			filter = el.filters.item(filterName);
		} catch (e) {
			// don't set opacity to 1 if we haven't already set an opacity,
			// it isn't needed and breaks transparent pngs.
			if (value === 1) { return; }
		}

		value = Math.round(value * 100);

		if (filter) {
			filter.Enabled = (value !== 100);
			filter.Opacity = value;
		} else {
			el.style.filter += ' progid:' + filterName + '(opacity=' + value + ')';
		}
	},

	testProp: function (props) {

		var style = document.documentElement.style;

		for (var i = 0; i < props.length; i++) {
			if (props[i] in style) {
				return props[i];
			}
		}
		return false;
	},

	setTransform: function (el, offset, scale) {
		var pos = offset || new FMap.Point(0, 0);

		el.style[FMap.DomUtil.TRANSFORM] =
			'translate3d(' + pos.x + 'px,' + pos.y + 'px' + ',0)' + (scale ? ' scale(' + scale + ')' : '');
	},

	setPosition: function (el, point, no3d) { // (HTMLElement, Point[, Boolean])

		/*eslint-disable */
		el._fmap_pos = point;
		/*eslint-enable */

		if (FMap.Browser.any3d && !no3d) {
			FMap.DomUtil.setTransform(el, point);
		} else {
			el.style.left = point.x + 'px';
			el.style.top = point.y + 'px';
		}
	},

	getPosition: function (el) {
		// this method is only used for elements previously positioned using setPosition,
		// so it's safe to cache the position for performance

		return el._fmap_pos;
	}
};


(function () {
	// prefix style property names

	FMap.DomUtil.TRANSFORM = FMap.DomUtil.testProp(
			['transform', 'WebkitTransform', 'OTransform', 'MozTransform', 'msTransform']);


	// webkitTransition comes first because some browser versions that drop vendor prefix don't do
	// the same for the transitionend event, in particular the Android 4.1 stock browser

	var transition = FMap.DomUtil.TRANSITION = FMap.DomUtil.testProp(
			['webkitTransition', 'transition', 'OTransition', 'MozTransition', 'msTransition']);

	FMap.DomUtil.TRANSITION_END =
			transition === 'webkitTransition' || transition === 'OTransition' ? transition + 'End' : 'transitionend';


	if ('onselectstart' in document) {
		FMap.DomUtil.disableTextSelection = function () {
			FMap.DomEvent.on(window, 'selectstart', FMap.DomEvent.preventDefault);
		};
		FMap.DomUtil.enableTextSelection = function () {
			FMap.DomEvent.off(window, 'selectstart', FMap.DomEvent.preventDefault);
		};

	} else {
		var userSelectProperty = FMap.DomUtil.testProp(
			['userSelect', 'WebkitUserSelect', 'OUserSelect', 'MozUserSelect', 'msUserSelect']);

		FMap.DomUtil.disableTextSelection = function () {
			if (userSelectProperty) {
				var style = document.documentElement.style;
				this._userSelect = style[userSelectProperty];
				style[userSelectProperty] = 'none';
			}
		};
		FMap.DomUtil.enableTextSelection = function () {
			if (userSelectProperty) {
				document.documentElement.style[userSelectProperty] = this._userSelect;
				delete this._userSelect;
			}
		};
	}

	FMap.DomUtil.disableImageDrag = function () {
		FMap.DomEvent.on(window, 'dragstart', FMap.DomEvent.preventDefault);
	};
	FMap.DomUtil.enableImageDrag = function () {
		FMap.DomEvent.off(window, 'dragstart', FMap.DomEvent.preventDefault);
	};

	FMap.DomUtil.preventOutline = function (element) {
		FMap.DomUtil.restoreOutline();
		this._outlineElement = element;
		this._outlineStyle = element.style.outline;
		element.style.outline = 'none';
		FMap.DomEvent.on(window, 'keydown', FMap.DomUtil.restoreOutline, this);
	};
	FMap.DomUtil.restoreOutline = function () {
		if (!this._outlineElement) { return; }
		this._outlineElement.style.outline = this._outlineStyle;
		delete this._outlineElement;
		delete this._outlineStyle;
		FMap.DomEvent.off(window, 'keydown', FMap.DomUtil.restoreOutline, this);
	};
})();



/*
 * FMap.LatLng represents a geographical point with latitude and longitude coordinates.
 */

FMap.LatLng = function (lat, lng, alt) {
	if (isNaN(lat) || isNaN(lng)) {
		throw new Error('Invalid LatLng object: (' + lat + ', ' + lng + ')');
	}

	this.lat = +lat;
	this.lng = +lng;

	if (alt !== undefined) {
		this.alt = +alt;
	}
};

FMap.LatLng.prototype = {
	equals: function (obj, maxMargin) {
		if (!obj) { return false; }

		obj = FMap.latLng(obj);

		var margin = Math.max(
		        Math.abs(this.lat - obj.lat),
		        Math.abs(this.lng - obj.lng));

		return margin <= (maxMargin === undefined ? 1.0E-9 : maxMargin);
	},

	toString: function (precision) {
		return 'LatLng(' +
		        FMap.Util.formatNum(this.lat, precision) + ', ' +
		        FMap.Util.formatNum(this.lng, precision) + ')';
	},

	distanceTo: function (other) {
		return FMap.CRS.Earth.distance(this, FMap.latLng(other));
	},

	wrap: function () {
		return FMap.CRS.Earth.wrapLatLng(this);
	},

	toBounds: function (sizeInMeters) {
		var latAccuracy = 180 * sizeInMeters / 40075017,
				lngAccuracy = latAccuracy / Math.cos((Math.PI / 180) * this.lat);

		return FMap.latLngBounds(
		        [this.lat - latAccuracy, this.lng - lngAccuracy],
		        [this.lat + latAccuracy, this.lng + lngAccuracy]);
	},

	clone: function () {
		return new FMap.LatLng(this.lat, this.lng, this.alt);
	}
};


// constructs LatLng with different signatures
// (LatLng) or ([Number, Number]) or (Number, Number) or (Object)

FMap.latLng = function (a, b, c) {
	if (a instanceof FMap.LatLng) {
		return a;
	}
	if (FMap.Util.isArray(a) && typeof a[0] !== 'object') {
		if (a.length === 3) {
			return new FMap.LatLng(a[0], a[1], a[2]);
		}
		if (a.length === 2) {
			return new FMap.LatLng(a[0], a[1]);
		}
		return null;
	}
	if (a === undefined || a === null) {
		return a;
	}
	if (typeof a === 'object' && 'lat' in a) {
		return new FMap.LatLng(a.lat, 'lng' in a ? a.lng : a.lon, a.alt);
	}
	if (b === undefined) {
		return null;
	}
	return new FMap.LatLng(a, b, c);
};



/*
 * FMap.LatLngBounds represents a rectangular area on the map in geographical coordinates.
 */

FMap.LatLngBounds = function (southWest, northEast) { // (LatLng, LatLng) or (LatLng[])
	if (!southWest) { return; }

	var latlngs = northEast ? [southWest, northEast] : southWest;

	for (var i = 0, len = latlngs.length; i < len; i++) {
		this.extend(latlngs[i]);
	}
};

FMap.LatLngBounds.prototype = {

	// extend the bounds to contain the given point or bounds
	extend: function (obj) { // (LatLng) or (LatLngBounds)
		var sw = this._southWest,
			ne = this._northEast,
			sw2, ne2;

		if (obj instanceof FMap.LatLng) {
			sw2 = obj;
			ne2 = obj;

		} else if (obj instanceof FMap.LatLngBounds) {
			sw2 = obj._southWest;
			ne2 = obj._northEast;

			if (!sw2 || !ne2) { return this; }

		} else {
			return obj ? this.extend(FMap.latLng(obj) || FMap.latLngBounds(obj)) : this;
		}

		if (!sw && !ne) {
			this._southWest = new FMap.LatLng(sw2.lat, sw2.lng);
			this._northEast = new FMap.LatLng(ne2.lat, ne2.lng);
		} else {
			sw.lat = Math.min(sw2.lat, sw.lat);
			sw.lng = Math.min(sw2.lng, sw.lng);
			ne.lat = Math.max(ne2.lat, ne.lat);
			ne.lng = Math.max(ne2.lng, ne.lng);
		}

		return this;
	},

	// extend the bounds by a percentage
	pad: function (bufferRatio) { // (Number) -> LatLngBounds
		var sw = this._southWest,
		    ne = this._northEast,
		    heightBuffer = Math.abs(sw.lat - ne.lat) * bufferRatio,
		    widthBuffer = Math.abs(sw.lng - ne.lng) * bufferRatio;

		return new FMap.LatLngBounds(
		        new FMap.LatLng(sw.lat - heightBuffer, sw.lng - widthBuffer),
		        new FMap.LatLng(ne.lat + heightBuffer, ne.lng + widthBuffer));
	},

	getCenter: function () { // -> LatLng
		return new FMap.LatLng(
		        (this._southWest.lat + this._northEast.lat) / 2,
		        (this._southWest.lng + this._northEast.lng) / 2);
	},

	getSouthWest: function () {
		return this._southWest;
	},

	getNorthEast: function () {
		return this._northEast;
	},

	getNorthWest: function () {
		return new FMap.LatLng(this.getNorth(), this.getWest());
	},

	getSouthEast: function () {
		return new FMap.LatLng(this.getSouth(), this.getEast());
	},

	getWest: function () {
		return this._southWest.lng;
	},

	getSouth: function () {
		return this._southWest.lat;
	},

	getEast: function () {
		return this._northEast.lng;
	},

	getNorth: function () {
		return this._northEast.lat;
	},

	contains: function (obj) { // (LatLngBounds) or (LatLng) -> Boolean
		if (typeof obj[0] === 'number' || obj instanceof FMap.LatLng) {
			obj = FMap.latLng(obj);
		} else {
			obj = FMap.latLngBounds(obj);
		}

		var sw = this._southWest,
		    ne = this._northEast,
		    sw2, ne2;

		if (obj instanceof FMap.LatLngBounds) {
			sw2 = obj.getSouthWest();
			ne2 = obj.getNorthEast();
		} else {
			sw2 = ne2 = obj;
		}

		return (sw2.lat >= sw.lat) && (ne2.lat <= ne.lat) &&
		       (sw2.lng >= sw.lng) && (ne2.lng <= ne.lng);
	},

	intersects: function (bounds) { // (LatLngBounds)
		bounds = FMap.latLngBounds(bounds);

		var sw = this._southWest,
		    ne = this._northEast,
		    sw2 = bounds.getSouthWest(),
		    ne2 = bounds.getNorthEast(),

		    latIntersects = (ne2.lat >= sw.lat) && (sw2.lat <= ne.lat),
		    lngIntersects = (ne2.lng >= sw.lng) && (sw2.lng <= ne.lng);

		return latIntersects && lngIntersects;
	},

	toBBoxString: function () {
		return [this.getWest(), this.getSouth(), this.getEast(), this.getNorth()].join(',');
	},

	equals: function (bounds) { // (LatLngBounds)
		if (!bounds) { return false; }

		bounds = FMap.latLngBounds(bounds);

		return this._southWest.equals(bounds.getSouthWest()) &&
		       this._northEast.equals(bounds.getNorthEast());
	},

	isValid: function () {
		return !!(this._southWest && this._northEast);
	}
};

//TODO International date line?

FMap.latLngBounds = function (a, b) { // (LatLngBounds) or (LatLng, LatLng)
	if (!a || a instanceof FMap.LatLngBounds) {
		return a;
	}
	return new FMap.LatLngBounds(a, b);
};



/*
 * Simple equirectangular (Plate Carree) projection, used by CRS like EPSG:4326 and Simple.
 */

FMap.Projection = {};

FMap.Projection.LonLat = {
	project: function (latlng) {
		return new FMap.Point(latlng.lng, latlng.lat);
	},

	unproject: function (point) {
		return new FMap.LatLng(point.y, point.x);
	},

	bounds: FMap.bounds([-180, -90], [180, 90])
};



/*
 * Spherical Mercator is the most popular map projection, used by EPSG:3857 CRS used by default.
 */

FMap.Projection.SphericalMercator = {

	R: 6378137,

	project: function (latlng) {
		var d = Math.PI / 180,
		    max = 1 - 1E-15,
		    sin = Math.max(Math.min(Math.sin(latlng.lat * d), max), -max);

		return new FMap.Point(
				this.R * latlng.lng * d,
				this.R * Math.log((1 + sin) / (1 - sin)) / 2);
	},

	unproject: function (point) {
		var d = 180 / Math.PI;

		return new FMap.LatLng(
			(2 * Math.atan(Math.exp(point.y / this.R)) - (Math.PI / 2)) * d,
			point.x * d / this.R);
	},

	bounds: (function () {
		var d = 6378137 * Math.PI;
		return FMap.bounds([-d, -d], [d, d]);
	})()
};



/*
 * FMap.CRS is the base object for all defined CRS (Coordinate Reference Systems) in Fmap.
 */

FMap.CRS = {
	// converts geo coords to pixel ones
	latLngToPoint: function (latlng, zoom) {
		var projectedPoint = this.projection.project(latlng),
		    scale = this.scale(zoom);

		return this.transformation._transform(projectedPoint, scale);
	},

	// converts pixel coords to geo coords
	pointToLatLng: function (point, zoom) {
		var scale = this.scale(zoom),
		    untransformedPoint = this.transformation.untransform(point, scale);

		return this.projection.unproject(untransformedPoint);
	},

	// converts geo coords to projection-specific coords (e.g. in meters)
	project: function (latlng) {
		return this.projection.project(latlng);
	},

	// converts projected coords to geo coords
	unproject: function (point) {
		return this.projection.unproject(point);
	},

	// defines how the world scales with zoom
	scale: function (zoom) {
		return 256 * Math.pow(2, zoom);
	},

	// returns the bounds of the world in projected coords if applicable
	getProjectedBounds: function (zoom) {
		if (this.infinite) { return null; }

		var b = this.projection.bounds,
		    s = this.scale(zoom),
		    min = this.transformation.transform(b.min, s),
		    max = this.transformation.transform(b.max, s);

		return FMap.bounds(min, max);
	},

	// whether a coordinate axis wraps in a given range (e.g. longitude from -180 to 180); depends on CRS
	// wrapLng: [min, max],
	// wrapLat: [min, max],

	// if true, the coordinate space will be unbounded (infinite in all directions)
	// infinite: false,

	// wraps geo coords in certain ranges if applicable
	wrapLatLng: function (latlng) {
		var lng = this.wrapLng ? FMap.Util.wrapNum(latlng.lng, this.wrapLng, true) : latlng.lng,
		    lat = this.wrapLat ? FMap.Util.wrapNum(latlng.lat, this.wrapLat, true) : latlng.lat,
		    alt = latlng.alt;

		return FMap.latLng(lat, lng, alt);
	}
};



/*
 * A simple CRS that can be used for flat non-Earth maps like panoramas or game maps.
 */

FMap.CRS.Simple = FMap.extend({}, FMap.CRS, {
	projection: FMap.Projection.LonLat,
	transformation: new FMap.Transformation(1, 0, -1, 0),

	scale: function (zoom) {
		return Math.pow(2, zoom);
	},

	distance: function (latlng1, latlng2) {
		var dx = latlng2.lng - latlng1.lng,
		    dy = latlng2.lat - latlng1.lat;

		return Math.sqrt(dx * dx + dy * dy);
	},

	infinite: true
});



/*
 * FMap.CRS.Earth is the base class for all CRS representing Earth.
 */

FMap.CRS.Earth = FMap.extend({}, FMap.CRS, {
	wrapLng: [-180, 180],

	R: 6378137,

	// distance between two geographical points using spherical law of cosines approximation
	distance: function (latlng1, latlng2) {
		var rad = Math.PI / 180,
		    lat1 = latlng1.lat * rad,
		    lat2 = latlng2.lat * rad,
		    a = Math.sin(lat1) * Math.sin(lat2) +
		        Math.cos(lat1) * Math.cos(lat2) * Math.cos((latlng2.lng - latlng1.lng) * rad);

		return this.R * Math.acos(Math.min(a, 1));
	}
});



/*
 * FMap.CRS.EPSG3857 (Spherical Mercator) is the most common CRS for web mapping and is used by Fmap by default.
 */

FMap.CRS.EPSG3857 = FMap.extend({}, FMap.CRS.Earth, {
	code: 'EPSG:3857',
	projection: FMap.Projection.SphericalMercator,

	transformation: (function () {
		var scale = 0.5 / (Math.PI * FMap.Projection.SphericalMercator.R);
		return new FMap.Transformation(scale, 0.5, -scale, 0.5);
	}())
});

FMap.CRS.EPSG900913 = FMap.extend({}, FMap.CRS.EPSG3857, {
	code: 'EPSG:900913'
});



/*
 * FMap.CRS.EPSG4326 is a CRS popular among advanced GIS specialists.
 */

FMap.CRS.EPSG4326 = FMap.extend({}, FMap.CRS.Earth, {
	code: 'EPSG:4326',
	projection: FMap.Projection.LonLat,
	transformation: new FMap.Transformation(1 / 180, 1, -1 / 180, 0.5)
});



/*
 * FMap.Map is the central class of the API - it is used to create a map.
 */

FMap.Map = FMap.Evented.extend({

	options: {
		crs: FMap.CRS.EPSG3857,

		/*
		center: LatLng,
		zoom: Number,
		layers: Array,
		*/

		fadeAnimation: true,
		trackResize: true,
		markerZoomAnimation: true
	},

	initialize: function (id, options) { // (HTMLElement or String, Object)
		options = FMap.setOptions(this, options);

		this._initContainer(id);
		this._initLayout();

		// hack for https://github.com/Fmap/Fmap/issues/1980
		this._onResize = FMap.bind(this._onResize, this);

		this._initEvents();

		if (options.maxBounds) {
			this.setMaxBounds(options.maxBounds);
		}

		if (options.zoom !== undefined) {
			this._zoom = this._limitZoom(options.zoom);
		}

		if (options.center && options.zoom !== undefined) {
			this.setView(FMap.latLng(options.center), options.zoom, {reset: true});
		}

		this._handlers = [];
		this._layers = {};
		this._zoomBoundLayers = {};
		this._sizeChanged = true;

		this.callInitHooks();

		this._addLayers(this.options.layers);
	},
	setDragging : function(isDragging) {
		var handler = this["dragging"];
		if(handler != undefined && handler!=null) {
			if(isDragging) {
				handler.enable();
			}else {
				handler.disable();
			}
			
			this.options["dragging"] = isDragging;
		}
	},

	// public methods that modify map state

	// replaced by animation-powered implementation in Map.PanAnimation.js
	setView: function (center, zoom) {
		zoom = zoom === undefined ? this.getZoom() : zoom;
		this._resetView(FMap.latLng(center), this._limitZoom(zoom));
		return this;
	},

	setZoom: function (zoom, options) {
		if (!this._loaded) {
			this._zoom = this._limitZoom(zoom);
			return this;
		}
		return this.setView(this.getCenter(), zoom, {zoom: options});
	},

	zoomIn: function (delta, options) {
		return this.setZoom(this._zoom + (delta || 1), options);
	},

	zoomOut: function (delta, options) {
		return this.setZoom(this._zoom - (delta || 1), options);
	},

	setZoomAround: function (latlng, zoom, options) {
		var scale = this.getZoomScale(zoom),
		    viewHalf = this.getSize().divideBy(2),
		    containerPoint = latlng instanceof FMap.Point ? latlng : this.latLngToContainerPoint(latlng),

		    centerOffset = containerPoint.subtract(viewHalf).multiplyBy(1 - 1 / scale),
		    newCenter = this.containerPointToLatLng(viewHalf.add(centerOffset));

		return this.setView(newCenter, zoom, {zoom: options});
	},

	_getBoundsCenterZoom: function (bounds, options) {

		options = options || {};
		bounds = bounds.getBounds ? bounds.getBounds() : FMap.latLngBounds(bounds);

		var paddingTL = FMap.point(options.paddingTopLeft || options.padding || [0, 0]),
		    paddingBR = FMap.point(options.paddingBottomRight || options.padding || [0, 0]),

		    zoom = this.getBoundsZoom(bounds, false, paddingTL.add(paddingBR));

		zoom = options.maxZoom ? Math.min(options.maxZoom, zoom) : zoom;

		var paddingOffset = paddingBR.subtract(paddingTL).divideBy(2),

		    swPoint = this.project(bounds.getSouthWest(), zoom),
		    nePoint = this.project(bounds.getNorthEast(), zoom),
		    center = this.unproject(swPoint.add(nePoint).divideBy(2).add(paddingOffset), zoom);

		return {
			center: center,
			zoom: zoom
		};
	},

	fitBounds: function (bounds, options) {
		var target = this._getBoundsCenterZoom(bounds, options);
		return this.setView(target.center, target.zoom, options);
	},

	fitWorld: function (options) {
		return this.fitBounds([[-90, -180], [90, 180]], options);
	},

	panTo: function (center, options) { // (LatLng)
		return this.setView(center, this._zoom, {pan: options});
	},

	panBy: function (offset) { // (Point)
		// replaced with animated panBy in Map.PanAnimation.js
		this.fire('movestart');

		this._rawPanBy(FMap.point(offset));

		this.fire('move');
		return this.fire('moveend');
	},

	setMaxBounds: function (bounds) {
		bounds = FMap.latLngBounds(bounds);

		if (!bounds) {
			return this.off('moveend', this._panInsideMaxBounds);
		} else if (this.options.maxBounds) {
			this.off('moveend', this._panInsideMaxBounds);
		}

		this.options.maxBounds = bounds;

		if (this._loaded) {
			this._panInsideMaxBounds();
		}

		return this.on('moveend', this._panInsideMaxBounds);
	},

	setMinZoom: function (zoom) {
		this.options.minZoom = zoom;

		if (this._loaded && this.getZoom() < this.options.minZoom) {
			return this.setZoom(zoom);
		}

		return this;
	},

	setMaxZoom: function (zoom) {
		this.options.maxZoom = zoom;

		if (this._loaded && (this.getZoom() > this.options.maxZoom)) {
			return this.setZoom(zoom);
		}

		return this;
	},

	panInsideBounds: function (bounds, options) {
		var center = this.getCenter(),
			newCenter = this._limitCenter(center, this._zoom, bounds);

		if (center.equals(newCenter)) { return this; }

		return this.panTo(newCenter, options);
	},

	invalidateSize: function (options) {
		if (!this._loaded) { return this; }

		options = FMap.extend({
			animate: false,
			pan: true
		}, options === true ? {animate: true} : options);

		var oldSize = this.getSize();
		this._sizeChanged = true;
		this._initialCenter = null;

		var newSize = this.getSize(),
		    oldCenter = oldSize.divideBy(2).round(),
		    newCenter = newSize.divideBy(2).round(),
		    offset = oldCenter.subtract(newCenter);

		if (!offset.x && !offset.y) { return this; }

		if (options.animate && options.pan) {
			this.panBy(offset);

		} else {
			if (options.pan) {
				this._rawPanBy(offset);
			}

			this.fire('move');

			if (options.debounceMoveend) {
				clearTimeout(this._sizeTimer);
				this._sizeTimer = setTimeout(FMap.bind(this.fire, this, 'moveend'), 200);
			} else {
				this.fire('moveend');
			}
		}

		return this.fire('resize', {
			oldSize: oldSize,
			newSize: newSize
		});
	},

	stop: function () {
		FMap.Util.cancelAnimFrame(this._flyToFrame);
		if (this._panAnim) {
			this._panAnim.stop();
		}
		return this;
	},

	// TODO handler.addTo
	addHandler: function (name, HandlerClass) {
		if (!HandlerClass) { return this; }

		var handler = this[name] = new HandlerClass(this);

		this._handlers.push(handler);

		if (this.options[name]) {
			handler.enable();
		}

		return this;
	},

	remove: function () {

		this._initEvents(true);

		try {
			// throws error in IE6-8
			delete this._container._fmap;
		} catch (e) {
			this._container._fmap = undefined;
		}

		FMap.DomUtil.remove(this._mapPane);

		if (this._clearControlPos) {
			this._clearControlPos();
		}

		this._clearHandlers();

		if (this._loaded) {
			this.fire('unload');
		}

		return this;
	},

	createPane: function (name, container) {
		var className = 'fmap-pane' + (name ? ' fmap-' + name.replace('Pane', '') + '-pane' : ''),
		    pane = FMap.DomUtil.create('div', className, container || this._mapPane);

		if (name) {
			this._panes[name] = pane;
		}
		return pane;
	},


	// public methods for getting map state

	getCenter: function () { // (Boolean) -> LatLng
		this._checkIfLoaded();

		if (this._initialCenter && !this._moved()) {
			return this._initialCenter;
		}
		return this.layerPointToLatLng(this._getCenterLayerPoint());
	},

	getZoom: function () {
		return this._zoom;
	},

	getBounds: function () {
		var bounds = this.getPixelBounds(),
		    sw = this.unproject(bounds.getBottomLeft()),
		    ne = this.unproject(bounds.getTopRight());

		return new FMap.LatLngBounds(sw, ne);
	},

	getMinZoom: function () {
		return this.options.minZoom === undefined ? this._layersMinZoom || 0 : this.options.minZoom;
	},

	getMaxZoom: function () {
		return this.options.maxZoom === undefined ?
			(this._layersMaxZoom === undefined ? Infinity : this._layersMaxZoom) :
			this.options.maxZoom;
	},

	getBoundsZoom: function (bounds, inside, padding) { // (LatLngBounds[, Boolean, Point]) -> Number
		bounds = FMap.latLngBounds(bounds);

		var zoom = this.getMinZoom() - (inside ? 1 : 0),
		    maxZoom = this.getMaxZoom(),
		    size = this.getSize(),

		    nw = bounds.getNorthWest(),
		    se = bounds.getSouthEast(),

		    zoomNotFound = true,
		    boundsSize;

		padding = FMap.point(padding || [0, 0]);

		do {
			zoom++;
			boundsSize = this.project(se, zoom).subtract(this.project(nw, zoom)).add(padding).floor();
			zoomNotFound = !inside ? size.contains(boundsSize) : boundsSize.x < size.x || boundsSize.y < size.y;

		} while (zoomNotFound && zoom <= maxZoom);

		if (zoomNotFound && inside) {
			return null;
		}

		return inside ? zoom : zoom - 1;
	},

	getSize: function () {
		if (!this._size || this._sizeChanged) {
			this._size = new FMap.Point(
				this._container.clientWidth,
				this._container.clientHeight);

			this._sizeChanged = false;
		}
		return this._size.clone();
	},

	getPixelBounds: function (center, zoom) {
		var topLeftPoint = this._getTopLeftPoint(center, zoom);
		return new FMap.Bounds(topLeftPoint, topLeftPoint.add(this.getSize()));
	},

	getPixelOrigin: function () {
		this._checkIfLoaded();
		return this._pixelOrigin;
	},

	getPixelWorldBounds: function (zoom) {
		return this.options.crs.getProjectedBounds(zoom === undefined ? this.getZoom() : zoom);
	},

	getPane: function (pane) {
		return typeof pane === 'string' ? this._panes[pane] : pane;
	},

	getPanes: function () {
		return this._panes;
	},

	getContainer: function () {
		return this._container;
	},


	// TODO replace with universal implementation after refactoring projections

	getZoomScale: function (toZoom, fromZoom) {
		var crs = this.options.crs;
		fromZoom = fromZoom === undefined ? this._zoom : fromZoom;
		return crs.scale(toZoom) / crs.scale(fromZoom);
	},

	getScaleZoom: function (scale, fromZoom) {
		fromZoom = fromZoom === undefined ? this._zoom : fromZoom;
		return fromZoom + (Math.log(scale) / Math.LN2);
	},


	// conversion methods

	project: function (latlng, zoom) { // (LatLng[, Number]) -> Point
		zoom = zoom === undefined ? this._zoom : zoom;
		return this.options.crs.latLngToPoint(FMap.latLng(latlng), zoom);
	},

	unproject: function (point, zoom) { // (Point[, Number]) -> LatLng
		zoom = zoom === undefined ? this._zoom : zoom;
		return this.options.crs.pointToLatLng(FMap.point(point), zoom);
	},

	layerPointToLatLng: function (point) { // (Point)
		var projectedPoint = FMap.point(point).add(this.getPixelOrigin());
		return this.unproject(projectedPoint);
	},

	latLngToLayerPoint: function (latlng) { // (LatLng)
		var projectedPoint = this.project(FMap.latLng(latlng))._round();
		return projectedPoint._subtract(this.getPixelOrigin());
	},

	wrapLatLng: function (latlng) {
		return this.options.crs.wrapLatLng(FMap.latLng(latlng));
	},

	distance: function (latlng1, latlng2) {
		return this.options.crs.distance(FMap.latLng(latlng1), FMap.latLng(latlng2));
	},

	containerPointToLayerPoint: function (point) { // (Point)
		return FMap.point(point).subtract(this._getMapPanePos());
	},

	layerPointToContainerPoint: function (point) { // (Point)
		return FMap.point(point).add(this._getMapPanePos());
	},

	containerPointToLatLng: function (point) {
		var layerPoint = this.containerPointToLayerPoint(FMap.point(point));
		return this.layerPointToLatLng(layerPoint);
	},

	latLngToContainerPoint: function (latlng) {
		return this.layerPointToContainerPoint(this.latLngToLayerPoint(FMap.latLng(latlng)));
	},

	mouseEventToContainerPoint: function (e) { // (MouseEvent)
		return FMap.DomEvent.getMousePosition(e, this._container);
	},

	mouseEventToLayerPoint: function (e) { // (MouseEvent)
		return this.containerPointToLayerPoint(this.mouseEventToContainerPoint(e));
	},

	mouseEventToLatLng: function (e) { // (MouseEvent)
		return this.layerPointToLatLng(this.mouseEventToLayerPoint(e));
	},


	// map initialization methods

	_initContainer: function (id) {
		var container = this._container = FMap.DomUtil.get(id);

		if (!container) {
			throw new Error('Map container not found.');
		} else if (container._fmap) {
			throw new Error('Map container is already initialized.');
		}

		FMap.DomEvent.addListener(container, 'scroll', this._onScroll, this);
		container._fmap = true;
	},

	_initLayout: function () {
		var container = this._container;

		this._fadeAnimated = this.options.fadeAnimation && FMap.Browser.any3d;

		FMap.DomUtil.addClass(container, 'fmap-container' +
			//(FMap.Browser.touch ? ' fmap-touch' : '') +
			(FMap.Browser.retina ? ' fmap-retina' : '') +
			(FMap.Browser.ielt9 ? ' fmap-oldie' : '') +
			(FMap.Browser.safari ? ' fmap-safari' : '') +
			(this._fadeAnimated ? ' fmap-fade-anim' : ''));

		var position = FMap.DomUtil.getStyle(container, 'position');

		if (position !== 'absolute' && position !== 'relative' && position !== 'fixed') {
			container.style.position = 'relative';
		}

		this._initPanes();

		if (this._initControlPos) {
			this._initControlPos();
		}
	},

	_initPanes: function () {
		var panes = this._panes = {};
		this._paneRenderers = {};

		this._mapPane = this.createPane('mapPane', this._container);

		this.createPane('tilePane');
		this.createPane('shadowPane');
		this.createPane('overlayPane');
		this.createPane('markerPane');
		this.createPane('popupPane');

		if (!this.options.markerZoomAnimation) {
			FMap.DomUtil.addClass(panes.markerPane, 'fmap-zoom-hide');
			FMap.DomUtil.addClass(panes.shadowPane, 'fmap-zoom-hide');
		}
	},


	// private methods that modify map state

	_resetView: function (center, zoom, preserveMapOffset, afterZoomAnim) {

		var zoomChanged = (this._zoom !== zoom);

		if (!afterZoomAnim) {
			this.fire('movestart');

			if (zoomChanged) {
				this.fire('zoomstart');
			}
		}

		this._zoom = zoom;
		this._initialCenter = center;

		if (!preserveMapOffset) {
			FMap.DomUtil.setPosition(this._mapPane, new FMap.Point(0, 0));
		}

		this._pixelOrigin = this._getNewPixelOrigin(center);

		var loading = !this._loaded;
		this._loaded = true;

		this.fire('viewreset', {hard: !preserveMapOffset});

		if (loading) {
			this.fire('load');
		}

		this.fire('move');

		if (zoomChanged || afterZoomAnim) {
			this.fire('zoomend');
		}

		this.fire('moveend', {hard: !preserveMapOffset});
	},

	_rawPanBy: function (offset) {
		FMap.DomUtil.setPosition(this._mapPane, this._getMapPanePos().subtract(offset));
	},

	_getZoomSpan: function () {
		return this.getMaxZoom() - this.getMinZoom();
	},

	_panInsideMaxBounds: function () {
		this.panInsideBounds(this.options.maxBounds);
	},

	_checkIfLoaded: function () {
		if (!this._loaded) {
			throw new Error('Set map center and zoom first.');
		}
	},

	// DOM event handling

	_initEvents: function (remove) {
		if (!FMap.DomEvent) { return; }

		this._targets = {};

		var onOff = remove ? 'off' : 'on';

		FMap.DomEvent[onOff](this._container, 'click dblclick mousedown mouseup ' +
			'mouseover mouseout mousemove keypress', this._handleDOMEvent, this);

		if (this.options.trackResize) {
			FMap.DomEvent[onOff](window, 'resize', this._onResize, this);
		}
	},

	_onResize: function () {
		FMap.Util.cancelAnimFrame(this._resizeRequest);
		this._resizeRequest = FMap.Util.requestAnimFrame(
		        function () { this.invalidateSize({debounceMoveend: true}); }, this, false, this._container);
	},

	_onScroll: function () {
		this._container.scrollTop  = 0;
		this._container.scrollLeft = 0;
	},

	//_findEventTarget: function (src) {
	//	while (src) {
	//		var target = this._targets[FMap.stamp(src)];
	//		if (target) {
	//			return target;
	//		}
	//		if (src === this._container) {
	//			break;
	//		}
	//		src = src.parentNode;
	//	}
	//	return null;
	//},
	_findEventTargets: function (src, type, bubble) {
		var targets = [], target;
		while (src) {
			target = this._targets[FMap.stamp(src)];
			if (target && target.listens(type, true)) {
				targets.push(target);
				if (!bubble) { break; }
			}
			if (src === this._container) {
				break;
			}
			src = src.parentNode;
		}
		return targets;
	},
	_handleDOMEvent: function (e) {
		if (!this._loaded || FMap.DomEvent._skipped(e)) { return; }

		// find the layer the event is propagating from and its parents
		var type = e.type === 'keypress' && e.keyCode === 13 ? 'click' : e.type;

		if (e.type === 'click') {
			// Fire a synthetic 'preclick' event which propagates up (mainly for closing popups).
			var synth = FMap.Util.extend({}, e);
			synth.type = 'preclick';
			this._handleDOMEvent(synth);
		}

		if (type === 'mousedown') {
			// prevents outline when clicking on keyboard-focusable element
			FMap.DomUtil.preventOutline(e.target || e.srcElement);
		}

		this._fireDOMEvent(e, type);
	},

	_fireDOMEvent: function (e, type, targets) {

		if (type === 'contextmenu') {
			FMap.DomEvent.preventDefault(e);
		}

		var isHover = type === 'mouseover' || type === 'mouseout';
		targets = (targets || []).concat(this._findEventTargets(e.target || e.srcElement, type, !isHover));

		if (!targets.length) {
			targets = [this];

			// special case for map mouseover/mouseout events so that they're actually mouseenter/mouseleave
			if (isHover && !FMap.DomEvent._checkMouse(this._container, e)) { return; }
		}

		var target = targets[0];

		// prevents firing click after you just dragged an object
		if (e.type === 'click' && !e._simulated && this._draggableMoved(target)) { return; }

		var data = {
			originalEvent: e
		};

		if (e.type !== 'keypress') {
			var isMarker = target instanceof FMap.Marker;
			data.containerPoint = isMarker ?
				this.latLngToContainerPoint(target.getLatLng()) : this.mouseEventToContainerPoint(e);
			data.layerPoint = this.containerPointToLayerPoint(data.containerPoint);
			data.latlng = isMarker ? target.getLatLng() : this.layerPointToLatLng(data.layerPoint);
		}

		for (var i = 0; i < targets.length; i++) {
			targets[i].fire(type, data, true);
			if (data.originalEvent._stopped
				|| (targets[i].options.nonBubblingEvents && FMap.Util.indexOf(targets[i].options.nonBubblingEvents, type) !== -1)) { return; }
		}

	},
	//_handleDOMEvent: function (e) {
	//	if (!this._loaded || FMap.DomEvent._skipped(e)) { return; }
	//
	//	// find the layer the event is propagating from
	//	var target = this._findEventTarget(e.target || e.srcElement),
	//		type = e.type === 'keypress' && e.keyCode === 13 ? 'click' : e.type;
	//
	//	// special case for map mouseover/mouseout events so that they're actually mouseenter/mouseleave
	//	if (!target && (type === 'mouseover' || type === 'mouseout') &&
	//			!FMap.DomEvent._checkMouse(this._container, e)) { return; }
	//
	//	// prevents outline when clicking on keyboard-focusable element
	//	if (type === 'mousedown') {
	//		FMap.DomUtil.preventOutline(e.target || e.srcElement);
	//	}
	//
	//	this._fireDOMEvent(target || this, e, type);
	//},
	//
	//_fireDOMEvent: function (target, e, type) {
	//	if (!target.listens(type, true) && (type !== 'click' || !target.listens('preclick', true))) { return; }
	//
	//	if (type === 'contextmenu') {
	//		FMap.DomEvent.preventDefault(e);
	//	}
	//
	//	// prevents firing click after you just dragged an object
	//	if (e.type === 'click' && !e._simulated && this._draggableMoved(target)) { return; }
	//
	//	var data = {
	//		originalEvent: e
	//	};
	//	if (e.type !== 'keypress') {
	//		data.containerPoint = target instanceof FMap.Marker ?
	//				this.latLngToContainerPoint(target.getLatLng()) : this.mouseEventToContainerPoint(e);
	//		data.layerPoint = this.containerPointToLayerPoint(data.containerPoint);
	//		data.latlng = this.layerPointToLatLng(data.layerPoint);
	//	}
	//	if (type === 'click') {
	//		target.fire('preclick', data, true);
	//	}
	//	target.fire(type, data, true);
	//},
	_draggableMoved: function (obj) {
		obj = obj.options.draggable ? obj : this;
		return (obj.dragging && obj.dragging.moved()) || (this.boxZoom && this.boxZoom.moved());
	},

	_clearHandlers: function () {
		for (var i = 0, len = this._handlers.length; i < len; i++) {
			this._handlers[i].disable();
		}
	},

	whenReady: function (callback, context) {
		if (this._loaded) {
			callback.call(context || this, {target: this});
		} else {
			this.on('load', callback, context);
		}
		return this;
	},


	// private methods for getting map state

	_getMapPanePos: function () {
		return FMap.DomUtil.getPosition(this._mapPane) || new FMap.Point(0, 0);
	},

	_moved: function () {
		var pos = this._getMapPanePos();
		return pos && !pos.equals([0, 0]);
	},

	_getTopLeftPoint: function (center, zoom) {
		var pixelOrigin = center && zoom !== undefined ?
			this._getNewPixelOrigin(center, zoom) :
			this.getPixelOrigin();
		return pixelOrigin.subtract(this._getMapPanePos());
	},

	_getNewPixelOrigin: function (center, zoom) {
		var viewHalf = this.getSize()._divideBy(2);
		// TODO round on display, not calculation to increase precision?
		return this.project(center, zoom)._subtract(viewHalf)._add(this._getMapPanePos())._round();
	},

	_latLngToNewLayerPoint: function (latlng, zoom, center) {
		var topLeft = this._getNewPixelOrigin(center, zoom);
		return this.project(latlng, zoom)._subtract(topLeft);
	},

	// layer point of the current center
	_getCenterLayerPoint: function () {
		return this.containerPointToLayerPoint(this.getSize()._divideBy(2));
	},

	// offset of the specified place to the current center in pixels
	_getCenterOffset: function (latlng) {
		return this.latLngToLayerPoint(latlng).subtract(this._getCenterLayerPoint());
	},

	// adjust center for view to get inside bounds
	_limitCenter: function (center, zoom, bounds) {

		if (!bounds) { return center; }

		var centerPoint = this.project(center, zoom),
		    viewHalf = this.getSize().divideBy(2),
		    viewBounds = new FMap.Bounds(centerPoint.subtract(viewHalf), centerPoint.add(viewHalf)),
		    offset = this._getBoundsOffset(viewBounds, bounds, zoom);

		return this.unproject(centerPoint.add(offset), zoom);
	},

	// adjust offset for view to get inside bounds
	_limitOffset: function (offset, bounds) {
		if (!bounds) { return offset; }

		var viewBounds = this.getPixelBounds(),
		    newBounds = new FMap.Bounds(viewBounds.min.add(offset), viewBounds.max.add(offset));

		return offset.add(this._getBoundsOffset(newBounds, bounds));
	},

	// returns offset needed for pxBounds to get inside maxBounds at a specified zoom
	_getBoundsOffset: function (pxBounds, maxBounds, zoom) {
		var nwOffset = this.project(maxBounds.getNorthWest(), zoom).subtract(pxBounds.min),
		    seOffset = this.project(maxBounds.getSouthEast(), zoom).subtract(pxBounds.max),

		    dx = this._rebound(nwOffset.x, -seOffset.x),
		    dy = this._rebound(nwOffset.y, -seOffset.y);

		return new FMap.Point(dx, dy);
	},

	_rebound: function (left, right) {
		return left + right > 0 ?
			Math.round(left - right) / 2 :
			Math.max(0, Math.ceil(left)) - Math.max(0, Math.floor(right));
	},

	_limitZoom: function (zoom) {
		var min = this.getMinZoom(),
		    max = this.getMaxZoom();
		if (!FMap.Browser.any3d) { zoom = Math.round(zoom); }

		return Math.max(min, Math.min(max, zoom));
	}
});

FMap.map = function (id, options) {
	return new FMap.Map(id, options);
};




FMap.Layer = FMap.Evented.extend({

	options: {
		pane: 'overlayPane'
	},

	addTo: function (map) {
		map.addLayer(this);
		return this;
	},

	remove: function () {
		return this.removeFrom(this._map || this._mapToAdd);
	},

	removeFrom: function (obj) {
		if (obj) {
			obj.removeLayer(this);
		}
		return this;
	},

	getPane: function (name) {
		return this._map.getPane(name ? (this.options[name] || name) : this.options.pane);
	},

	addInteractiveTarget: function (targetEl) {
		this._map._targets[FMap.stamp(targetEl)] = this;
		return this;
	},

	removeInteractiveTarget: function (targetEl) {
		delete this._map._targets[FMap.stamp(targetEl)];
		return this;
	},

	_layerAdd: function (e) {
		var map = e.target;

		// check in case layer gets added and then removed before the map is ready
		if (!map.hasLayer(this)) { return; }

		this._map = map;
		this._zoomAnimated = map._zoomAnimated;

		this.onAdd(map);

		if (this.getAttribution && this._map.attributionControl) {
			this._map.attributionControl.addAttribution(this.getAttribution());
		}

		if (this.getEvents) {
			map.on(this.getEvents(), this);
		}

		this.fire('add');
		map.fire('layeradd', {layer: this});
	}
});


FMap.Map.include({
	addLayer: function (layer) {
		var id = FMap.stamp(layer);
		if (this._layers[id]) { return layer; }
		this._layers[id] = layer;

		layer._mapToAdd = this;

		if (layer.beforeAdd) {
			layer.beforeAdd(this);
		}

		this.whenReady(layer._layerAdd, layer);

		return this;
	},

	removeLayer: function (layer) {
		var id = FMap.stamp(layer);

		if (!this._layers[id]) { return this; }

		if (this._loaded) {
			layer.onRemove(this);
		}

		if (layer.getAttribution && this.attributionControl) {
			this.attributionControl.removeAttribution(layer.getAttribution());
		}

		if (layer.getEvents) {
			this.off(layer.getEvents(), layer);
		}

		delete this._layers[id];

		if (this._loaded) {
			this.fire('layerremove', {layer: layer});
			layer.fire('remove');
		}

		layer._map = layer._mapToAdd = null;

		return this;
	},

	hasLayer: function (layer) {
		return !!layer && (FMap.stamp(layer) in this._layers);
	},

	eachLayer: function (method, context) {
		for (var i in this._layers) {
			method.call(context, this._layers[i]);
		}
		return this;
	},

	_addLayers: function (layers) {
		layers = layers ? (FMap.Util.isArray(layers) ? layers : [layers]) : [];

		for (var i = 0, len = layers.length; i < len; i++) {
			this.addLayer(layers[i]);
		}
	},

	_addZoomLimit: function (layer) {
		if (isNaN(layer.options.maxZoom) || !isNaN(layer.options.minZoom)) {
			this._zoomBoundLayers[FMap.stamp(layer)] = layer;
			this._updateZoomLevels();
		}
	},

	_removeZoomLimit: function (layer) {
		var id = FMap.stamp(layer);

		if (this._zoomBoundLayers[id]) {
			delete this._zoomBoundLayers[id];
			this._updateZoomLevels();
		}
	},

	_updateZoomLevels: function () {
		var minZoom = Infinity,
			maxZoom = -Infinity,
			oldZoomSpan = this._getZoomSpan();

		for (var i in this._zoomBoundLayers) {
			var options = this._zoomBoundLayers[i].options;

			minZoom = options.minZoom === undefined ? minZoom : Math.min(minZoom, options.minZoom);
			maxZoom = options.maxZoom === undefined ? maxZoom : Math.max(maxZoom, options.maxZoom);
		}

		this._layersMaxZoom = maxZoom === -Infinity ? undefined : maxZoom;
		this._layersMinZoom = minZoom === Infinity ? undefined : minZoom;

		if (oldZoomSpan !== this._getZoomSpan()) {
			this.fire('zoomlevelschange');
		}
	}
});



/*
 * Mercator projection that takes into account that the Earth is not a perfect sphere.
 * Less popular than spherical mercator; used by projections like EPSG:3395.
 */

FMap.Projection.Mercator = {
	R: 6378137,
	R_MINOR: 6356752.314245179,

	bounds: FMap.bounds([-20037508.34279, -15496570.73972], [20037508.34279, 18764656.23138]),

	project: function (latlng) {
		var d = Math.PI / 180,
		    r = this.R,
		    y = latlng.lat * d,
		    tmp = this.R_MINOR / r,
		    e = Math.sqrt(1 - tmp * tmp),
		    con = e * Math.sin(y);

		var ts = Math.tan(Math.PI / 4 - y / 2) / Math.pow((1 - con) / (1 + con), e / 2);
		y = -r * Math.log(Math.max(ts, 1E-10));

		return new FMap.Point(latlng.lng * d * r, y);
	},

	unproject: function (point) {
		var d = 180 / Math.PI,
		    r = this.R,
		    tmp = this.R_MINOR / r,
		    e = Math.sqrt(1 - tmp * tmp),
		    ts = Math.exp(-point.y / r),
		    phi = Math.PI / 2 - 2 * Math.atan(ts);

		for (var i = 0, dphi = 0.1, con; i < 15 && Math.abs(dphi) > 1e-7; i++) {
			con = e * Math.sin(phi);
			con = Math.pow((1 - con) / (1 + con), e / 2);
			dphi = Math.PI / 2 - 2 * Math.atan(ts * con) - phi;
			phi += dphi;
		}

		return new FMap.LatLng(phi * d, point.x * d / r);
	}
};



/*
 * FMap.CRS.EPSG3857 (World Mercator) CRS implementation.
 */

FMap.CRS.EPSG3395 = FMap.extend({}, FMap.CRS.Earth, {
	code: 'EPSG:3395',
	projection: FMap.Projection.Mercator,

	transformation: (function () {
		var scale = 0.5 / (Math.PI * FMap.Projection.Mercator.R);
		return new FMap.Transformation(scale, 0.5, -scale, 0.5);
	}())
});



/*
 * FMap.GridLayer is used as base class for grid-like layers like TileLayer.
 */

FMap.GridLayer = FMap.Layer.extend({

	options: {
		pane: 'tilePane',

		tileSize: 256,
		opacity: 1,

		updateWhenIdle: FMap.Browser.mobile,
		updateInterval: 200,

		attribution: null,
		zIndex: null,
		bounds: null,

		minZoom: 0
		// maxZoom: <Number>
	},

	initialize: function (options) {
		options = FMap.setOptions(this, options);
	},

	onAdd: function () {
		this._initContainer();

		this._levels = {};
		this._tiles = {};

		this._viewReset();
		this._update();
	},

	beforeAdd: function (map) {
		map._addZoomLimit(this);
	},

	onRemove: function (map) {
		FMap.DomUtil.remove(this._container);
		map._removeZoomLimit(this);
		this._container = null;
		this._tileZoom = null;
	},

	bringToFront: function () {
		if (this._map) {
			FMap.DomUtil.toFront(this._container);
			this._setAutoZIndex(Math.max);
		}
		return this;
	},

	bringToBack: function () {
		if (this._map) {
			FMap.DomUtil.toBack(this._container);
			this._setAutoZIndex(Math.min);
		}
		return this;
	},

	getAttribution: function () {
		return this.options.attribution;
	},

	getContainer: function () {
		return this._container;
	},

	setOpacity: function (opacity) {
		this.options.opacity = opacity;
		this._updateOpacity();
		return this;
	},

	setZIndex: function (zIndex) {
		this.options.zIndex = zIndex;
		this._updateZIndex();

		return this;
	},

	isLoading: function () {
		return this._loading;
	},

	redraw: function () {
		if (this._map) {
			this._removeAllTiles();
			this._update();
		}
		return this;
	},

	getEvents: function () {
		var events = {
			viewreset: this._viewReset,
			moveend: this._move
		};

		if (!this.options.updateWhenIdle) {
			// update tiles on move, but not more often than once per given interval
			events.move = FMap.Util.throttle(this._move, this.options.updateInterval, this);
		}

		if (this._zoomAnimated) {
			events.zoomanim = this._animateZoom;
		}

		return events;
	},

	createTile: function () {
		return document.createElement('div');
	},

	_updateZIndex: function () {
		if (this._container && this.options.zIndex !== undefined && this.options.zIndex !== null) {
			this._container.style.zIndex = this.options.zIndex;
		}
	},

	_setAutoZIndex: function (compare) {
		// go through all other layers of the same pane, set zIndex to max + 1 (front) or min - 1 (back)

		var layers = this.getPane().children,
		    edgeZIndex = -compare(-Infinity, Infinity); // -Infinity for max, Infinity for min

		for (var i = 0, len = layers.length, zIndex; i < len; i++) {

			zIndex = layers[i].style.zIndex;

			if (layers[i] !== this._container && zIndex) {
				edgeZIndex = compare(edgeZIndex, +zIndex);
			}
		}

		if (isFinite(edgeZIndex)) {
			this.options.zIndex = edgeZIndex + compare(-1, 1);
			this._updateZIndex();
		}
	},

	_updateOpacity: function () {
		if (!this._map) { return; }
		var opacity = this.options.opacity;

		// IE doesn't inherit filter opacity properly, so we're forced to set it on tiles
		if (!FMap.Browser.ielt9 && !this._map._fadeAnimated) {
			FMap.DomUtil.setOpacity(this._container, opacity);
			return;
		}

		var now = +new Date(),
			nextFrame = false;

		for (var key in this._tiles) {
			var tile = this._tiles[key];
			if (!tile.current || !tile.loaded || tile.active) { continue; }

			var fade = Math.min(1, (now - tile.loaded) / 200);
			if (fade < 1) {
				FMap.DomUtil.setOpacity(tile.el, opacity * fade);
				nextFrame = true;
			} else {
				FMap.DomUtil.setOpacity(tile.el, opacity);
				tile.active = true;
				this._pruneTiles();
			}
		}

		if (nextFrame) {
			FMap.Util.cancelAnimFrame(this._fadeFrame);
			this._fadeFrame = FMap.Util.requestAnimFrame(this._updateOpacity, this);
		}
	},

	_initContainer: function () {
		if (this._container) { return; }

		this._container = FMap.DomUtil.create('div', 'fmap-layer');
		this._updateZIndex();

		if (this.options.opacity < 1) {
			this._updateOpacity();
		}

		this.getPane().appendChild(this._container);
	},

	_updateLevels: function () {
		var zoom = this._tileZoom,
			maxZoom = this.options.maxZoom;

		for (var z in this._levels) {
			if (this._levels[z].el.children.length || z === zoom) {
				this._levels[z].el.style.zIndex = maxZoom - Math.abs(zoom - z);
			} else {
				FMap.DomUtil.remove(this._levels[z].el);
				delete this._levels[z];
			}
		}

		var level = this._levels[zoom],
		    map = this._map;

		if (!level) {
			level = this._levels[zoom] = {};

			level.el = FMap.DomUtil.create('div', 'fmap-tile-container fmap-zoom-animated', this._container);
			level.el.style.zIndex = maxZoom;

			level.origin = map.project(map.unproject(map.getPixelOrigin()), zoom).round();
			level.zoom = zoom;

			this._setZoomTransform(level, map.getCenter(), map.getZoom());

			// force the browser to consider the newly added element for transition
			FMap.Util.falseFn(level.el.offsetWidth);
		}

		this._level = level;

		return level;
	},

	_pruneTiles: function () {
		var key, tile;

		for (key in this._tiles) {
			tile = this._tiles[key];
			tile.retain = tile.current;
		}

		for (key in this._tiles) {
			tile = this._tiles[key];
			if (tile.current && !tile.active) {
				var coords = tile.coords;
				if (!this._retainParent(coords.x, coords.y, coords.z, coords.z - 5)) {
					this._retainChildren(coords.x, coords.y, coords.z, coords.z + 2);
				}
			}
		}

		for (key in this._tiles) {
			if (!this._tiles[key].retain) {
				this._removeTile(key);
			}
		}
	},

	_removeAllTiles: function () {
		for (var key in this._tiles) {
			this._removeTile(key);
		}
	},

	_retainParent: function (x, y, z, minZoom) {
		var x2 = Math.floor(x / 2),
			y2 = Math.floor(y / 2),
			z2 = z - 1;

		var key = x2 + ':' + y2 + ':' + z2,
			tile = this._tiles[key];

		if (tile && tile.active) {
			tile.retain = true;
			return true;

		} else if (tile && tile.loaded) {
			tile.retain = true;
		}

		if (z2 > minZoom) {
			return this._retainParent(x2, y2, z2, minZoom);
		}

		return false;
	},

	_retainChildren: function (x, y, z, maxZoom) {

		for (var i = 2 * x; i < 2 * x + 2; i++) {
			for (var j = 2 * y; j < 2 * y + 2; j++) {

				var key = i + ':' + j + ':' + (z + 1),
					tile = this._tiles[key];

				if (tile && tile.active) {
					tile.retain = true;
					continue;

				} else if (tile && tile.loaded) {
					tile.retain = true;
				}

				if (z + 1 < maxZoom) {
					this._retainChildren(i, j, z + 1, maxZoom);
				}
			}
		}
	},

	_viewReset: function (e) {
		this._reset(this._map.getCenter(), this._map.getZoom(), e && e.hard);
	},

	_animateZoom: function (e) {
		this._reset(e.center, e.zoom, false, true, e.noUpdate);
	},

	_reset: function (center, zoom, hard, noPrune, noUpdate) {
		var tileZoom = Math.round(zoom),
			tileZoomChanged = this._tileZoom !== tileZoom;

		if (!noUpdate && (hard || tileZoomChanged)) {

			if (this._abortLoading) {
				this._abortLoading();
			}

			this._tileZoom = tileZoom;
			this._updateLevels();
			this._resetGrid();

			if (!FMap.Browser.mobileWebkit) {
				this._update(center, tileZoom);
			}

			if (!noPrune) {
				this._pruneTiles();
			}
		}

		this._setZoomTransforms(center, zoom);
	},

	_setZoomTransforms: function (center, zoom) {
		for (var i in this._levels) {
			this._setZoomTransform(this._levels[i], center, zoom);
		}
	},

	_setZoomTransform: function (level, center, zoom) {
		var scale = this._map.getZoomScale(zoom, level.zoom),
		    translate = level.origin.multiplyBy(scale)
		        .subtract(this._map._getNewPixelOrigin(center, zoom)).round();

		if (FMap.Browser.any3d) {
			FMap.DomUtil.setTransform(level.el, translate, scale);
		} else {
			FMap.DomUtil.setPosition(level.el, translate);
		}
	},

	_resetGrid: function () {
		var map = this._map,
		    crs = map.options.crs,
		    tileSize = this._tileSize = this._getTileSize(),
		    tileZoom = this._tileZoom;

		var bounds = this._map.getPixelWorldBounds(this._tileZoom);
		if (bounds) {
			this._globalTileRange = this._pxBoundsToTileRange(bounds);
		}

		this._wrapX = crs.wrapLng && [
			Math.floor(map.project([0, crs.wrapLng[0]], tileZoom).x / tileSize),
			Math.ceil(map.project([0, crs.wrapLng[1]], tileZoom).x / tileSize)
		];
		this._wrapY = crs.wrapLat && [
			Math.floor(map.project([crs.wrapLat[0], 0], tileZoom).y / tileSize),
			Math.ceil(map.project([crs.wrapLat[1], 0], tileZoom).y / tileSize)
		];
	},

	_getTileSize: function () {
		return this.options.tileSize;
	},

	_move: function () {
		this._update();
		this._pruneTiles();
	},

	_update: function (center, zoom) {
		var map = this._map;
		if (!map) { return; }

		// TODO move to reset
		// var zoom = this._map.getZoom();

		// if (zoom > this.options.maxZoom ||
		//     zoom < this.options.minZoom) { return; }

		if (center === undefined) { center = map.getCenter(); }
		if (zoom === undefined) { zoom = Math.round(map.getZoom()); }

		var pixelBounds = map.getPixelBounds(center, zoom),
			tileRange = this._pxBoundsToTileRange(pixelBounds),
			tileCenter = tileRange.getCenter(),
			queue = [];

		for (var key in this._tiles) {
			this._tiles[key].current = false;
		}

		// create a queue of coordinates to load tiles from
		for (var j = tileRange.min.y; j <= tileRange.max.y; j++) {
			for (var i = tileRange.min.x; i <= tileRange.max.x; i++) {
				var coords = new FMap.Point(i, j);
				coords.z = zoom;

				if (!this._isValidTile(coords)) { continue; }

				var tile = this._tiles[this._tileCoordsToKey(coords)];
				if (tile) {
					tile.current = true;
				} else {
					queue.push(coords);
				}
			}
		}

		// sort tile queue to load tiles in order of their distance to center
		queue.sort(function (a, b) {
			return a.distanceTo(tileCenter) - b.distanceTo(tileCenter);
		});

		if (queue.length !== 0) {
			// if its the first batch of tiles to load
			if (!this._loading) {
				this._loading = true;
				this.fire('loading');
			}

			// create DOM fragment to append tiles in one batch
			var fragment = document.createDocumentFragment();

			for (i = 0; i < queue.length; i++) {
				this._addTile(queue[i], fragment);
			}

			this._level.el.appendChild(fragment);
		}
	},

	_isValidTile: function (coords) {
		var crs = this._map.options.crs;

		if (!crs.infinite) {
			// don't load tile if it's out of bounds and not wrapped
			var bounds = this._globalTileRange;
			if ((!crs.wrapLng && (coords.x < bounds.min.x || coords.x > bounds.max.x)) ||
			    (!crs.wrapLat && (coords.y < bounds.min.y || coords.y > bounds.max.y))) { return false; }
		}

		if (!this.options.bounds) { return true; }

		// don't load tile if it doesn't intersect the bounds in options
		var tileBounds = this._tileCoordsToBounds(coords);
		return FMap.latLngBounds(this.options.bounds).intersects(tileBounds);
	},

	_keyToBounds: function (key) {
		return this._tileCoordsToBounds(this._keyToTileCoords(key));
	},

	// converts tile coordinates to its geographical bounds
	_tileCoordsToBounds: function (coords) {

		var map = this._map,
		    tileSize = this._getTileSize(),

		    nwPoint = coords.multiplyBy(tileSize),
		    sePoint = nwPoint.add([tileSize, tileSize]),

		    nw = map.wrapLatLng(map.unproject(nwPoint, coords.z)),
		    se = map.wrapLatLng(map.unproject(sePoint, coords.z));

		return new FMap.LatLngBounds(nw, se);
	},

	// converts tile coordinates to key for the tile cache
	_tileCoordsToKey: function (coords) {
		return coords.x + ':' + coords.y + ':' + coords.z;
	},

	// converts tile cache key to coordinates
	_keyToTileCoords: function (key) {
		var k = key.split(':'),
			coords = new FMap.Point(+k[0], +k[1]);
		coords.z = +k[2];
		return coords;
	},

	_removeTile: function (key) {
		var tile = this._tiles[key];
		if (!tile) { return; }

		FMap.DomUtil.remove(tile.el);

		delete this._tiles[key];

		this.fire('tileunload', {
			tile: tile.el,
			coords: this._keyToTileCoords(key)
		});
	},

	_initTile: function (tile) {
		FMap.DomUtil.addClass(tile, 'fmap-tile');

		tile.style.width = this._tileSize + 'px';
		tile.style.height = this._tileSize + 'px';

		tile.onselectstart = FMap.Util.falseFn;
		tile.onmousemove = FMap.Util.falseFn;

		// update opacity on tiles in IE7-8 because of filter inheritance problems
		if (FMap.Browser.ielt9 && this.options.opacity < 1) {
			FMap.DomUtil.setOpacity(tile, this.options.opacity);
		}

		// without this hack, tiles disappear after zoom on Chrome for Android
		// https://github.com/Fmap/Fmap/issues/2078
		if (FMap.Browser.android && !FMap.Browser.android23) {
			tile.style.WebkitBackfaceVisibility = 'hidden';
		}
	},

	_addTile: function (coords, container) {
		var tilePos = this._getTilePos(coords),
		    key = this._tileCoordsToKey(coords);

		var tile = this.createTile(this._wrapCoords(coords), FMap.bind(this._tileReady, this, coords));

		this._initTile(tile);

		// if createTile is defined with a second argument ("done" callback),
		// we know that tile is async and will be ready later; otherwise
		if (this.createTile.length < 2) {
			// mark tile as ready, but delay one frame for opacity animation to happen
			setTimeout(FMap.bind(this._tileReady, this, coords, null, tile), 0);
		}

		// we prefer top/left over translate3d so that we don't create a HW-accelerated layer from each tile
		// which is slow, and it also fixes gaps between tiles in Safari
		FMap.DomUtil.setPosition(tile, tilePos, true);

		// save tile in cache
		this._tiles[key] = {
			el: tile,
			coords: coords,
			current: true
		};

		container.appendChild(tile);
		this.fire('tileloadstart', {
			tile: tile,
			coords: coords
		});
	},

	_tileReady: function (coords, err, tile) {
		if (!this._map) { return; }

		if (err) {
			this.fire('tileerror', {
				error: err,
				tile: tile,
				coords: coords
			});
		}

		var key = this._tileCoordsToKey(coords);

		tile = this._tiles[key];
		if (!tile) { return; }

		tile.loaded = +new Date();
		if (this._map._fadeAnimated) {
			FMap.DomUtil.setOpacity(tile.el, 0);
			FMap.Util.cancelAnimFrame(this._fadeFrame);
			this._fadeFrame = FMap.Util.requestAnimFrame(this._updateOpacity, this);
		} else {
			tile.active = true;
			this._pruneTiles();
		}

		FMap.DomUtil.addClass(tile.el, 'fmap-tile-loaded');

		this.fire('tileload', {
			tile: tile.el,
			coords: coords
		});

		if (this._noTilesToLoad()) {
			this._loading = false;
			this.fire('load');
		}
	},

	_getTilePos: function (coords) {
		return coords.multiplyBy(this._tileSize).subtract(this._level.origin);
	},

	_wrapCoords: function (coords) {
		var newCoords = new FMap.Point(
			this._wrapX ? FMap.Util.wrapNum(coords.x, this._wrapX) : coords.x,
			this._wrapY ? FMap.Util.wrapNum(coords.y, this._wrapY) : coords.y);
		newCoords.z = coords.z;
		return newCoords;
	},

	_pxBoundsToTileRange: function (bounds) {
		return new FMap.Bounds(
			bounds.min.divideBy(this._tileSize).floor(),
			bounds.max.divideBy(this._tileSize).ceil().subtract([1, 1]));
	},

	_noTilesToLoad: function () {
		for (var key in this._tiles) {
			if (!this._tiles[key].loaded) { return false; }
		}
		return true;
	}
});

FMap.gridLayer = function (options) {
	return new FMap.GridLayer(options);
};



FMap.UtfGridLayer = (FMap.Layer || FMap.Class).extend({
	includes: FMap.Mixin.Events,
	options: {
		subdomains: 'abc',

		minZoom: 0,
		maxZoom: 18,
		tileSize: 256,

		resolution: 4,

		useJsonP: false,
		pointerCursor: true,

		maxRequests: 4,
		requestTimeout: 60000
	},

	//The thing the mouse is currently on
	_mouseOn: null,

	initialize: function (url, options) {
		FMap.Util.setOptions(this, options);

		// The requests
		this._requests = {};
		this._requestQueue = [];
		this._requestsInProcess = [];

		this._url = url;
		this._cache = {};

		//Find a unique id in window we can use for our callbacks
		//Required for jsonP
		var i = 0;
		while (window['lu' + i]) {
			i++;
		}
		this._windowKey = 'lu' + i;
		window[this._windowKey] = {};

		var subdomains = this.options.subdomains;
		if (typeof this.options.subdomains === 'string') {
			this.options.subdomains = subdomains.split('');
		}
	},

	onAdd: function (map) {
		this._map = map;
		this._container = this._map._container;

		this._update();

		var zoom = this._map.getZoom();

		if (zoom > this.options.maxZoom || zoom < this.options.minZoom) {
			return;
		}

		map.on('click', this._click, this);
		map.on('mousemove', this._move, this);
		map.on('moveend', this._update, this);
	},

	onRemove: function () {
		var map = this._map;
		map.off('click', this._click, this);
		map.off('mousemove', this._move, this);
		map.off('moveend', this._update, this);
		if (this.options.pointerCursor) {
			this._container.style.cursor = '';
		}
	},

	setUrl: function (url, noRedraw) {
		this._url = url;
		if (!noRedraw) {
			this.redraw();
		}
		return this;
	},

	redraw: function () {
		// Clear cache to force all tiles to reload
		this._requestQueue = [];
		for (var reqKey in this._requests) {
			if (this._requests.hasOwnProperty(reqKey)) {
				this._abortRequest(reqKey);
			}
		}
		this._cache = {};
		this._update();
	},

	_click: function (e) {
		this.fire('click', this._objectForEvent(e));
	},
	_move: function (e) {
		var on = this._objectForEvent(e);
		if (on.data !== this._mouseOn) {
			if (this._mouseOn) {
				this.fire('mouseout', {latlng: e.latlng, data: this._mouseOn});
				if (this.options.pointerCursor) {
					this._container.style.cursor = '';
				}
			}
			if (on.data) {
				this.fire('mouseover', on);
				if (this.options.pointerCursor) {
					this._container.style.cursor = 'pointer';
				}
			}
			this._mouseOn = on.data;
		} else if (on.data) {
			this.fire('mousemove', on);
		}
	},

	_objectForEvent: function (e) {
		var map = this._map,
		    point = map.project(e.latlng),
		    tileSize = this.options.tileSize,
		    resolution = this.options.resolution,
		    x = Math.floor(point.x / tileSize),
		    y = Math.floor(point.y / tileSize),
		    gridX = Math.floor((point.x - (x * tileSize)) / resolution),
		    gridY = Math.floor((point.y - (y * tileSize)) / resolution),
			max = map.options.crs.scale(map.getZoom()) / tileSize;

		x = (x + max) % max;
		y = (y + max) % max;

		var data = this._cache[map.getZoom() + '_' + x + '_' + y];
		var result = null;
		if (data && data.grid) {
			var idx = this._utfDecode(data.grid[gridY].charCodeAt(gridX)),
				key = data.keys[idx];

			if (data.data.hasOwnProperty(key)) {
				result = data.data[key];
			}
		}

		return FMap.extend({latlng: e.latlng, data: result}, e);
	},

	//Load up all required json grid files
	//TODO: Load from center etc
	_update: function () {

		var bounds = this._map.getPixelBounds(),
		    zoom = this._map.getZoom(),
		    tileSize = this.options.tileSize;

		if (zoom > this.options.maxZoom || zoom < this.options.minZoom) {
			return;
		}

		var nwTilePoint = new FMap.Point(
				Math.floor(bounds.min.x / tileSize),
				Math.floor(bounds.min.y / tileSize)),
			seTilePoint = new FMap.Point(
				Math.floor(bounds.max.x / tileSize),
				Math.floor(bounds.max.y / tileSize)),
				max = this._map.options.crs.scale(zoom) / tileSize;

		//Load all required ones
		var visibleTiles = [];
		for (var x = nwTilePoint.x; x <= seTilePoint.x; x++) {
			for (var y = nwTilePoint.y; y <= seTilePoint.y; y++) {

				var xw = (x + max) % max, yw = (y + max) % max;
				var key = zoom + '_' + xw + '_' + yw;
				visibleTiles.push(key);

				if (!this._cache.hasOwnProperty(key)) {
					this._cache[key] = null;

					if (this.options.useJsonP) {
						this._loadTileP(zoom, xw, yw);
					} else {
						this._loadTile(zoom, xw, yw);
					}
				}
			}
		}
		// If we still have requests for tiles that have now gone out of sight, attempt to abort them.
		for (var reqKey in this._requests) {
			if (visibleTiles.indexOf(reqKey) < 0) {
				this._abortRequest(reqKey);
			}
		}
	},

	_loadTileP: function (zoom, x, y) {
		var head = document.getElementsByTagName('head')[0],
		    key = zoom + '_' + x + '_' + y,
		    functionName = 'lu_' + key,
		    wk = this._windowKey,
		    self = this;

		var url = FMap.Util.template(this._url, FMap.Util.extend({
			s: FMap.TileLayer.prototype._getSubdomain.call(this, {x: x, y: y}),
			z: zoom,
			x: x,
			y: y,
			cb: wk + '.' + functionName
		}, this.options));

		var script = document.createElement('script');
		script.setAttribute('type', 'text/javascript');
		script.setAttribute('src', url);

		window[wk][functionName] = function (data) {
			self._cache[key] = data;
			delete window[wk][functionName];
			head.removeChild(script);
			self._finishRequest(key);
		};

		this._queueRequest(key, function () {
			head.appendChild(script);
			return {
				abort: function () {
					head.removeChild(script);
				}
			};
		});
	},

	_loadTile: function (zoom, x, y) {
		var url = FMap.Util.template(this._url, FMap.Util.extend({
			s: FMap.TileLayer.prototype._getSubdomain.call(this, {x: x, y: y}),
			z: zoom,
			x: x,
			y: y
		}, this.options));

		var key = zoom + '_' + x + '_' + y;
		var self = this;
		this._queueRequest(key, function () {
			return FMap.Util.ajax(url, function (data) {
				if (data !== 'error') {
					self._cache[key] = data;
				}
				self._finishRequest(key);
			});
		});
	},

	_queueRequest: function (key, callback) {
		this._requests[key] = {
			callback: callback,
			timeout: null,
			handler: null
		};
		this._requestQueue.push(key);
		this._processQueuedRequests();
	},

	_finishRequest: function (key) {
		// Remove from requests in process
		var pos = this._requestsInProcess.indexOf(key);
		if (pos >= 0) {
			this._requestsInProcess.splice(pos, 1);
		}
		// Remove from request queue
		pos = this._requestQueue.indexOf(key);
		if (pos >= 0) {
			this._requestQueue.splice(pos, 1);
		}
		// Remove the request entry
		if (this._requests[key]) {
			if (this._requests[key].timeout) {
				window.clearTimeout(this._requests[key].timeout);
			}
			delete this._requests[key];
		}
		// Recurse
		this._processQueuedRequests();
		// Fire 'load' event if all tiles have been loaded
		if (this._requestsInProcess.length === 0) {
			this.fire('load');
		}
	},

	_abortRequest: function (key) {
		// Abort the request if possible
		if (this._requests[key] && this._requests[key].handler) {
			if (typeof this._requests[key].handler.abort === 'function') {
				this._requests[key].handler.abort();
			}
		}
		// Ensure we don't keep a false copy of the data in the cache
		if (this._cache[key] === null) {
			delete this._cache[key];
		}
		// And remove the request
		this._finishRequest(key);
	},

	_processQueuedRequests: function () {
		while (this._requestQueue.length > 0 && (this.options.maxRequests === 0 ||
		       this._requestsInProcess.length < this.options.maxRequests)) {
			this._processRequest(this._requestQueue.pop());
		}
	},

	_processRequest: function (key) {
		var self = this;
		this._requests[key].timeout = window.setTimeout(function () {
			self._abortRequest(key);
		}, this.options.requestTimeout);
		this._requestsInProcess.push(key);
		// The callback might call _finishRequest, so don't assume _requests[key] still exists.
		var handler = this._requests[key].callback();
		if (this._requests[key]) {
			this._requests[key].handler = handler;
		}
	},

	_utfDecode: function (c) {
		if (c >= 93) {
			c--;
		}
		if (c >= 35) {
			c--;
		}
		return c - 32;
	}
});

FMap.utfgridLayer = function (url, options) {
	return new FMap.UtfGridLayer(url, options);
};



/*
 * FMap.TileLayer is used for standard xyz-numbered tile layers.
 */

FMap.TileLayer = FMap.GridLayer.extend({

	options: {
		maxZoom: 18,

		subdomains: 'abc',
		errorTileUrl: '',
		zoomOffset: 0,

		maxNativeZoom: null, // Number
		tms: false,
		zoomReverse: false,
		detectRetina: false,
		crossOrigin: false
	},

	initialize: function (url, options) {

		this._url = url;

		options = FMap.setOptions(this, options);

		// detecting retina displays, adjusting tileSize and zoom levels
		if (options.detectRetina && FMap.Browser.retina && options.maxZoom > 0) {

			options.tileSize = Math.floor(options.tileSize / 2);
			options.zoomOffset++;

			options.minZoom = Math.max(0, options.minZoom);
			options.maxZoom--;
		}

		if (typeof options.subdomains === 'string') {
			options.subdomains = options.subdomains.split('');
		}

		// for https://github.com/Fmap/Fmap/issues/137
		if (!FMap.Browser.android) {
			this.on('tileunload', this._onTileRemove);
		}
	},

	setUrl: function (url, noRedraw) {
		this._url = url;

		if (!noRedraw) {
			this.redraw();
		}
		return this;
	},

	createTile: function (coords, done) {
		var tile = document.createElement('img');

		tile.onload = FMap.bind(this._tileOnLoad, this, done, tile);
		tile.onerror = FMap.bind(this._tileOnError, this, done, tile);

		if (this.options.crossOrigin) {
			tile.crossOrigin = '';
		}

		/*
		 Alt tag is set to empty string to keep screen readers from reading URL and for compliance reasons
		 http://www.w3.org/TR/WCAG20-TECHS/H67
		*/
		tile.alt = '';

		tile.src = this.getTileUrl(coords);

		return tile;
	},

	getTileUrl: function (coords) {
		return FMap.Util.template(this._url, FMap.extend({
			r: this.options.detectRetina && FMap.Browser.retina && this.options.maxZoom > 0 ? '@2x' : '',
			s: this._getSubdomain(coords),
			x: coords.x,
			y: this.options.tms ? this._globalTileRange.max.y - coords.y : coords.y,
			z: this._getZoomForUrl()
		}, this.options));
	},

	_tileOnLoad: function (done, tile) {
		// For https://github.com/Fmap/Fmap/issues/3332
		if (FMap.Browser.ielt9) {
			setTimeout(FMap.bind(done, this, null, tile), 0);
		} else {
			done(null, tile);
		}
	},

	_tileOnError: function (done, tile, e) {
		var errorUrl = this.options.errorTileUrl;
		if (errorUrl) {
			tile.src = errorUrl;
		}
		done(e, tile);
	},

	_getTileSize: function () {
		var map = this._map,
		    options = this.options,
		    zoom = this._tileZoom + options.zoomOffset,
		    zoomN = options.maxNativeZoom;

		// increase tile size when overscaling
		return zoomN !== null && zoom > zoomN ?
				Math.round(options.tileSize / map.getZoomScale(zoomN, zoom)) :
				options.tileSize;
	},

	_onTileRemove: function (e) {
		e.tile.onload = null;
	},

	_getZoomForUrl: function () {

		var options = this.options,
		    zoom = this._tileZoom;

		if (options.zoomReverse) {
			zoom = options.maxZoom - zoom;
		}

		zoom += options.zoomOffset;

		return options.maxNativeZoom ? Math.min(zoom, options.maxNativeZoom) : zoom;
	},

	_getSubdomain: function (tilePoint) {
		var index = Math.abs(tilePoint.x + tilePoint.y) % this.options.subdomains.length;
		return this.options.subdomains[index];
	},

	// stops loading all tiles in the background layer
	_abortLoading: function () {
		var i, tile;
		for (i in this._tiles) {
			tile = this._tiles[i].el;

			tile.onload = FMap.Util.falseFn;
			tile.onerror = FMap.Util.falseFn;

			if (!tile.complete) {
				tile.src = FMap.Util.emptyImageUrl;
				FMap.DomUtil.remove(tile);
			}
		}
	}
});

FMap.tileLayer = function (url, options) {
	return new FMap.TileLayer(url, options);
};



/*
 * FMap.TileLayer.WMS is used for WMS tile layers.
 */

FMap.TileLayer.WMS = FMap.TileLayer.extend({

	defaultWmsParams: {
		service: 'WMS',
		request: 'GetMap',
		version: '1.1.1',
		layers: '',
		styles: '',
		format: 'image/jpeg',
		transparent: false
	},

	options: {
		crs: null,
		uppercase: false
	},

	initialize: function (url, options) {

		this._url = url;

		var wmsParams = FMap.extend({}, this.defaultWmsParams);

		// all keys that are not TileLayer options go to WMS params
		for (var i in options) {
			if (!(i in this.options)) {
				wmsParams[i] = options[i];
			}
		}

		options = FMap.setOptions(this, options);

		wmsParams.width = wmsParams.height = options.tileSize * (options.detectRetina && FMap.Browser.retina ? 2 : 1);

		this.wmsParams = wmsParams;
	},

	onAdd: function (map) {

		this._crs = this.options.crs || map.options.crs;
		this._wmsVersion = parseFloat(this.wmsParams.version);

		var projectionKey = this._wmsVersion >= 1.3 ? 'crs' : 'srs';
		this.wmsParams[projectionKey] = this._crs.code;

		FMap.TileLayer.prototype.onAdd.call(this, map);
	},

	getTileUrl: function (coords) {

		var tileBounds = this._tileCoordsToBounds(coords),
		    nw = this._crs.project(tileBounds.getNorthWest()),
		    se = this._crs.project(tileBounds.getSouthEast()),

		    bbox = (this._wmsVersion >= 1.3 && this._crs === FMap.CRS.EPSG4326 ?
			    [se.y, nw.x, nw.y, se.x] :
			    [nw.x, se.y, se.x, nw.y]).join(','),

		    url = FMap.TileLayer.prototype.getTileUrl.call(this, coords);

		return url +
			FMap.Util.getParamString(this.wmsParams, url, this.options.uppercase) +
			(this.options.uppercase ? '&BBOX=' : '&bbox=') + bbox;
	},

	setParams: function (params, noRedraw) {

		FMap.extend(this.wmsParams, params);

		if (!noRedraw) {
			this.redraw();
		}

		return this;
	}
});

FMap.tileLayer.wms = function (url, options) {
	return new FMap.TileLayer.WMS(url, options);
};



/*
 * FMap.ImageOverlay is used to overlay images over the map (to specific geographical bounds).
 */

FMap.ImageOverlay = FMap.Layer.extend({

	options: {
		opacity: 1,
		alt: '',
		interactive: false
	},

	initialize: function (url, bounds, options) { // (String, LatLngBounds, Object)
		this._url = url;
		this._bounds = FMap.latLngBounds(bounds);

		FMap.setOptions(this, options);
	},

	onAdd: function () {
		if (!this._image) {
			this._initImage();

			if (this.options.opacity < 1) {
				this._updateOpacity();
			}
		}

		if (this.options.interactive) {
			FMap.DomUtil.addClass(this._image, 'fmap-interactive');
			this.addInteractiveTarget(this._image);
		}

		this.getPane().appendChild(this._image);
		this._reset();
	},

	onRemove: function () {
		FMap.DomUtil.remove(this._image);
		if (this.options.interactive) {
			this.removeInteractiveTarget(this._image);
		}
	},

	setOpacity: function (opacity) {
		this.options.opacity = opacity;

		if (this._image) {
			this._updateOpacity();
		}
		return this;
	},

	setStyle: function (styleOpts) {
		if (styleOpts.opacity) {
			this.setOpacity(styleOpts.opacity);
		}
		return this;
	},

	bringToFront: function () {
		if (this._map) {
			FMap.DomUtil.toFront(this._image);
		}
		return this;
	},

	bringToBack: function () {
		if (this._map) {
			FMap.DomUtil.toBack(this._image);
		}
		return this;
	},

	setUrl: function (url) {
		this._url = url;

		if (this._image) {
			this._image.src = url;
		}
		return this;
	},

	getAttribution: function () {
		return this.options.attribution;
	},

	getEvents: function () {
		var events = {
			viewreset: this._reset
		};

		if (this._zoomAnimated) {
			events.zoomanim = this._animateZoom;
		}

		return events;
	},

	getBounds: function () {
		return this._bounds;
	},

	_initImage: function () {
		var img = this._image = FMap.DomUtil.create('img',
				'fmap-image-layer ' + (this._zoomAnimated ? 'fmap-zoom-animated' : ''));

		img.onselectstart = FMap.Util.falseFn;
		img.onmousemove = FMap.Util.falseFn;

		img.onload = FMap.bind(this.fire, this, 'load');
		img.src = this._url;
		img.alt = this.options.alt;
	},

	_animateZoom: function (e) {
		var bounds = new FMap.Bounds(
			this._map._latLngToNewLayerPoint(this._bounds.getNorthWest(), e.zoom, e.center),
		    this._map._latLngToNewLayerPoint(this._bounds.getSouthEast(), e.zoom, e.center));

		var offset = bounds.min.add(bounds.getSize()._multiplyBy((1 - 1 / e.scale) / 2));

		FMap.DomUtil.setTransform(this._image, offset, e.scale);
	},

	_reset: function () {
		var image = this._image,
		    bounds = new FMap.Bounds(
		        this._map.latLngToLayerPoint(this._bounds.getNorthWest()),
		        this._map.latLngToLayerPoint(this._bounds.getSouthEast())),
		    size = bounds.getSize();

		FMap.DomUtil.setPosition(image, bounds.min);

		image.style.width  = size.x + 'px';
		image.style.height = size.y + 'px';
	},

	_updateOpacity: function () {
		FMap.DomUtil.setOpacity(this._image, this.options.opacity);
	}
});

FMap.imageOverlay = function (url, bounds, options) {
	return new FMap.ImageOverlay(url, bounds, options);
};



/*
 * FMap.Icon is an image-based icon class that you can use with FMap.Marker for custom markers.
 */

FMap.Icon = FMap.Class.extend({
	/*
	options: {
		iconUrl: (String) (required)
		iconRetinaUrl: (String) (optional, used for retina devices if detected)
		iconSize: (Point) (can be set through CSS)
		iconAnchor: (Point) (centered by default, can be set in CSS with negative margins)
		popupAnchor: (Point) (if not specified, popup opens in the anchor point)
		shadowUrl: (String) (no shadow by default)
		shadowRetinaUrl: (String) (optional, used for retina devices if detected)
		shadowSize: (Point)
		shadowAnchor: (Point)
		className: (String)
	},
	*/

	initialize: function (options) {
		FMap.setOptions(this, options);
	},

	createIcon: function (oldIcon) {
		var img = this._createIcon('icon', oldIcon);
		return img;
	},

	createShadow: function (oldIcon) {
		return this._createIcon('shadow', oldIcon);
	},

	_createIcon: function (name, oldIcon) {
		var src = this._getIconUrl(name);

		if (!src) {
			if (name === 'icon') {
				throw new Error('iconUrl not set in Icon options (see the docs).');
			}
			return null;
		}

		var img = this._createImg(src, oldIcon && oldIcon.tagName === 'IMG' ? oldIcon : null);
		this._setIconStyles(img, name);
		return img;
	},

	_setIconStyles: function (img, name) {
		var options = this.options,
		    size = FMap.point(options[name + 'Size']),
		    anchor = FMap.point(name === 'shadow' && options.shadowAnchor || options.iconAnchor ||
		            size && size.divideBy(2, true));

		img.className = 'fmap-marker-' + name + ' ' + (options.className || '');

		if (anchor) {
			img.style.marginLeft = (-anchor.x) + 'px';
			img.style.marginTop  = (-anchor.y) + 'px';
		}

		if (size) {
			img.style.width  = size.x + 'px';
			img.style.height = size.y + 'px';
		}
	},

	_createImg: function (src, el) {
		el = el || document.createElement('img');
		el.src = src;
		return el;
	},

	_getIconUrl: function (name) {
		return FMap.Browser.retina && this.options[name + 'RetinaUrl'] || this.options[name + 'Url'];
	}
});

FMap.icon = function (options) {
	return new FMap.Icon(options);
};



/*
 * FMap.Icon.Default is the blue marker icon used by default in Fmap.
 */

FMap.Icon.Default = FMap.Icon.extend({

	options: {
		iconSize:    [25, 41],
		iconAnchor:  [12, 41],
		popupAnchor: [1, -34],
		shadowSize:  [41, 41]
	},

	_getIconUrl: function (name) {
		var key = name + 'Url';

		if (this.options[key]) {
			return this.options[key];
		}

		var path = FMap.Icon.Default.imagePath;

		if (!path) {
			throw new Error('Couldn\'t autodetect FMap.Icon.Default.imagePath, set it manually.');
		}

		return path + '/marker-' + name + (FMap.Browser.retina && name === 'icon' ? '-2x' : '') + '.png';
	}
});

FMap.Icon.Default.imagePath = (function () {
	var scripts = document.getElementsByTagName('script'),
	    fmapRe = /[\/^]fmap[\-\._]?([\w\-\._]*)\.js\??/;

	var i, len, src, path;

	for (i = 0, len = scripts.length; i < len; i++) {
		src = scripts[i].src;

		if (src.match(fmapRe)) {
			path = src.split(fmapRe)[0];
			return (path ? path + '/' : '') + 'images';
		}
	}
}());



/*
 * FMap.Marker is used to display clickable/draggable icons on the map.
 */

FMap.Marker = FMap.Layer.extend({

	options: {
		pane: 'markerPane',

		icon: new FMap.Icon.Default(),
		// title: '',
		// alt: '',
		interactive: true,
		// draggable: false,
		keyboard: true,
		zIndexOffset: 0,
		opacity: 1,
		// riseOnHover: false,
		riseOffset: 250
	},

	initialize: function (latlng, options) {
		FMap.setOptions(this, options);
		this._latlng = FMap.latLng(latlng);
	},

	onAdd: function (map) {
		this._zoomAnimated = this._zoomAnimated && map.options.markerZoomAnimation;

		this._initIcon();
		this.update();
	},

	onRemove: function () {
		if (this.dragging && this.dragging.enabled()) {
			this.dragging.removeHooks();
		}

		this._removeIcon();
		this._removeShadow();
	},

	getEvents: function () {
		var events = {viewreset: this.update};

		if (this._zoomAnimated) {
			events.zoomanim = this._animateZoom;
		}

		return events;
	},

	getLatLng: function () {
		return this._latlng;
	},

	setLatLng: function (latlng) {
		var oldLatLng = this._latlng;
		this._latlng = FMap.latLng(latlng);
		this.update();
		return this.fire('move', {oldLatLng: oldLatLng, latlng: this._latlng});
	},

	setZIndexOffset: function (offset) {
		this.options.zIndexOffset = offset;
		return this.update();
	},

	setIcon: function (icon) {

		this.options.icon = icon;

		if (this._map) {
			this._initIcon();
			this.update();
		}

		if (this._popup) {
			this.bindPopup(this._popup, this._popup.options);
		}

		return this;
	},

	update: function () {

		if (this._icon) {
			var pos = this._map.latLngToLayerPoint(this._latlng).round();
			this._setPos(pos);
		}

		return this;
	},
    setRotation : function(angle) {
        if(this._icon) {
        	var pos = this._icon._fmap_pos;
            var transformStr = (pos ? 'translate3d(' + pos.x + 'px,' + pos.y + 'px' + ',0)':'') +(angle?'rotate('+angle+'deg)':'');
            this._icon.style[FMap.DomUtil.TRANSFORM] = transformStr;
        }
    }
    ,
	_initIcon: function () {
		var options = this.options,
		    classToAdd = 'fmap-zoom-' + (this._zoomAnimated ? 'animated' : 'hide');

		var icon = options.icon.createIcon(this._icon),
			addIcon = false;

		// if we're not reusing the icon, remove the old one and init new one
		if (icon !== this._icon) {
			if (this._icon) {
				this._removeIcon();
			}
			addIcon = true;

			if (options.title) {
				icon.title = options.title;
			}
			if (options.alt) {
				icon.alt = options.alt;
			}
		}

		FMap.DomUtil.addClass(icon, classToAdd);

		if (options.keyboard) {
			icon.tabIndex = '0';
		}

		this._icon = icon;


		this._initInteraction();

		if (options.riseOnHover) {
			this.on({
				mouseover: this._bringToFront,
				mouseout: this._resetZIndex
			});
		}

		var newShadow = options.icon.createShadow(this._shadow),
			addShadow = false;

		if (newShadow !== this._shadow) {
			this._removeShadow();
			addShadow = true;
		}

		if (newShadow) {
			FMap.DomUtil.addClass(newShadow, classToAdd);
		}
		this._shadow = newShadow;


		if (options.opacity < 1) {
			this._updateOpacity();
		}


		if (addIcon) {
			this.getPane().appendChild(this._icon);
		}
		if (newShadow && addShadow) {
			this.getPane('shadowPane').appendChild(this._shadow);
		}
	},

	_removeIcon: function () {
		if (this.options.riseOnHover) {
			this.off({
				mouseover: this._bringToFront,
			    mouseout: this._resetZIndex
			});
		}

		FMap.DomUtil.remove(this._icon);
		this.removeInteractiveTarget(this._icon);

		this._icon = null;
	},

	_removeShadow: function () {
		if (this._shadow) {
			FMap.DomUtil.remove(this._shadow);
		}
		this._shadow = null;
	},

	_setPos: function (pos) {
		FMap.DomUtil.setPosition(this._icon, pos);

		if (this._shadow) {
			FMap.DomUtil.setPosition(this._shadow, pos);
		}

		this._zIndex = pos.y + this.options.zIndexOffset;

		this._resetZIndex();
	},

	_updateZIndex: function (offset) {
		this._icon.style.zIndex = this._zIndex + offset;
	},

	_animateZoom: function (opt) {
		var pos = this._map._latLngToNewLayerPoint(this._latlng, opt.zoom, opt.center).round();

		this._setPos(pos);
	},

	_initInteraction: function () {

		if (!this.options.interactive) { return; }

		FMap.DomUtil.addClass(this._icon, 'fmap-interactive');

		this.addInteractiveTarget(this._icon);

		if (FMap.Handler.MarkerDrag) {
			var draggable = this.options.draggable;
			if (this.dragging) {
				draggable = this.dragging.enabled();
				this.dragging.disable();
			}

			this.dragging = new FMap.Handler.MarkerDrag(this);

			if (draggable) {
				this.dragging.enable();
			}
		}
	},

	setOpacity: function (opacity) {
		this.options.opacity = opacity;
		if (this._map) {
			this._updateOpacity();
		}

		return this;
	},

	_updateOpacity: function () {
		var opacity = this.options.opacity;

		FMap.DomUtil.setOpacity(this._icon, opacity);

		if (this._shadow) {
			FMap.DomUtil.setOpacity(this._shadow, opacity);
		}
	},

	_bringToFront: function () {
		this._updateZIndex(this.options.riseOffset);
	},

	_resetZIndex: function () {
		this._updateZIndex(0);
	}
});

FMap.marker = function (latlng, options) {
	return new FMap.Marker(latlng, options);
};



/*
 * FMap.DivIcon is a lightweight HTML-based icon class (as opposed to the image-based FMap.Icon)
 * to use with FMap.Marker.
 */

FMap.DivIcon = FMap.Icon.extend({
	options: {
		iconSize: [12, 12], // also can be set through CSS
		/*
		iconAnchor: (Point)
		popupAnchor: (Point)
		html: (String)
		bgPos: (Point)
		*/
		className: 'fmap-div-icon',
		html: false
	},

	createIcon: function (oldIcon) {
		var div = (oldIcon && oldIcon.tagName === 'DIV') ? oldIcon : document.createElement('div'),
		    options = this.options;

		div.innerHTML = options.html !== false ? options.html : '';

		if (options.bgPos) {
			div.style.backgroundPosition = (-options.bgPos.x) + 'px ' + (-options.bgPos.y) + 'px';
		}
		this._setIconStyles(div, 'icon');

		return div;
	},

	createShadow: function () {
		return null;
	}
});

FMap.divIcon = function (options) {
	return new FMap.DivIcon(options);
};



/*
 * FMap.Popup is used for displaying popups on the map.
 */

FMap.Map.mergeOptions({
	closePopupOnClick: true
});

FMap.Popup = FMap.Layer.extend({

	options: {
		pane: 'popupPane',

		minWidth: 50,
		maxWidth: 300,
		// maxHeight: <Number>,
		offset: [0, 7],

		autoPan: true,
		autoPanPadding: [5, 5],
		// autoPanPaddingTopLeft: <Point>,
		// autoPanPaddingBottomRight: <Point>,

		closeButton: true,
		autoClose: true,
		// keepInView: false,
		// className: '',
		zoomAnimation: true
	},

	initialize: function (options, source) {
		FMap.setOptions(this, options);

		this._source = source;
	},

	onAdd: function (map) {
		this._zoomAnimated = this._zoomAnimated && this.options.zoomAnimation;

		if (!this._container) {
			this._initLayout();
		}

		if (map._fadeAnimated) {
			FMap.DomUtil.setOpacity(this._container, 0);
		}

		clearTimeout(this._removeTimeout);
		this.getPane().appendChild(this._container);
		this.update();

		if (map._fadeAnimated) {
			FMap.DomUtil.setOpacity(this._container, 1);
		}

		map.fire('popupopen', {popup: this});

		if (this._source) {
			this._source.fire('popupopen', {popup: this}, true);
		}
	},

	openOn: function (map) {
		map.openPopup(this);
		return this;
	},

	onRemove: function (map) {
		if (map._fadeAnimated) {
			FMap.DomUtil.setOpacity(this._container, 0);
			this._removeTimeout = setTimeout(FMap.bind(FMap.DomUtil.remove, FMap.DomUtil, this._container), 200);
		} else {
			FMap.DomUtil.remove(this._container);
		}

		map.fire('popupclose', {popup: this});

		if (this._source) {
			this._source.fire('popupclose', {popup: this}, true);
		}
	},

	getLatLng: function () {
		return this._latlng;
	},

	setLatLng: function (latlng) {
		this._latlng = FMap.latLng(latlng);
		if (this._map) {
			this._updatePosition();
			this._adjustPan();
		}
		return this;
	},

	getContent: function () {
		return this._content;
	},

	setContent: function (content) {
		this._content = content;
		this.update();
		return this;
	},

	update: function () {
		if (!this._map) { return; }

		this._container.style.visibility = 'hidden';

		this._updateContent();
		this._updateLayout();
		this._updatePosition();

		this._container.style.visibility = '';

		this._adjustPan();
	},

	getEvents: function () {
		var events = {viewreset: this._updatePosition},
		    options = this.options;

		if (this._zoomAnimated) {
			events.zoomanim = this._animateZoom;
		}
		if ('closeOnClick' in options ? options.closeOnClick : this._map.options.closePopupOnClick) {
			events.preclick = this._close;
		}
		if (options.keepInView) {
			events.moveend = this._adjustPan;
		}
		return events;
	},

	isOpen: function () {
		return !!this._map && this._map.hasLayer(this);
	},

	_close: function () {
		if (this._map) {
			this._map.closePopup(this);
		}
	},

	_initLayout: function () {
		var prefix = 'fmap-popup',
		    container = this._container = FMap.DomUtil.create('div',
			prefix + ' ' + (this.options.className || '') +
			' fmap-zoom-' + (this._zoomAnimated ? 'animated' : 'hide'));

		if (this.options.closeButton) {
			var closeButton = this._closeButton = FMap.DomUtil.create('a', prefix + '-close-button', container);
			closeButton.href = '#close';
			closeButton.innerHTML = '&#215;';

			FMap.DomEvent.on(closeButton, 'click', this._onCloseButtonClick, this);
		}

		var wrapper = this._wrapper = FMap.DomUtil.create('div', prefix + '-content-wrapper', container);
		this._contentNode = FMap.DomUtil.create('div', prefix + '-content', wrapper);

		FMap.DomEvent
			.disableClickPropagation(wrapper)
			.disableScrollPropagation(this._contentNode)
			.on(wrapper, 'contextmenu', FMap.DomEvent.stopPropagation);

		this._tipContainer = FMap.DomUtil.create('div', prefix + '-tip-container', container);
		this._tip = FMap.DomUtil.create('div', prefix + '-tip', this._tipContainer);
	},

	_updateContent: function () {
		if (!this._content) { return; }

		var node = this._contentNode;
		var content = (typeof this._content === 'function') ? this._content(this._source || this) : this._content;

		if (typeof content === 'string') {
			node.innerHTML = content;
		} else {
			while (node.hasChildNodes()) {
				node.removeChild(node.firstChild);
			}
			node.appendChild(content);
		}
		this.fire('contentupdate');
	},

	_updateLayout: function () {
		var container = this._contentNode,
		    style = container.style;

		style.width = '';
		style.whiteSpace = 'nowrap';

		var width = container.offsetWidth;
		width = Math.min(width, this.options.maxWidth);
		width = Math.max(width, this.options.minWidth);

		style.width = (width + 1) + 'px';
		style.whiteSpace = '';

		style.height = '';

		var height = container.offsetHeight,
		    maxHeight = this.options.maxHeight,
		    scrolledClass = 'fmap-popup-scrolled';

		if (maxHeight && height > maxHeight) {
			style.height = maxHeight + 'px';
			FMap.DomUtil.addClass(container, scrolledClass);
		} else {
			FMap.DomUtil.removeClass(container, scrolledClass);
		}

		this._containerWidth = this._container.offsetWidth;
	},

	_updatePosition: function () {
		if (!this._map) { return; }

		var pos = this._map.latLngToLayerPoint(this._latlng),
		    offset = FMap.point(this.options.offset);

		if (this._zoomAnimated) {
			FMap.DomUtil.setPosition(this._container, pos);
		} else {
			offset = offset.add(pos);
		}

		var bottom = this._containerBottom = -offset.y,
		    left = this._containerLeft = -Math.round(this._containerWidth / 2) + offset.x;

		// bottom position the popup in case the height of the popup changes (images loading etc)
		this._container.style.bottom = bottom + 'px';
		this._container.style.left = left + 'px';
	},

	_animateZoom: function (e) {
		var pos = this._map._latLngToNewLayerPoint(this._latlng, e.zoom, e.center);
		FMap.DomUtil.setPosition(this._container, pos);
	},

	_adjustPan: function () {
		if (!this.options.autoPan) { return; }

		var map = this._map,
		    containerHeight = this._container.offsetHeight,
		    containerWidth = this._containerWidth,
		    layerPos = new FMap.Point(this._containerLeft, -containerHeight - this._containerBottom);

		if (this._zoomAnimated) {
			layerPos._add(FMap.DomUtil.getPosition(this._container));
		}

		var containerPos = map.layerPointToContainerPoint(layerPos),
		    padding = FMap.point(this.options.autoPanPadding),
		    paddingTL = FMap.point(this.options.autoPanPaddingTopLeft || padding),
		    paddingBR = FMap.point(this.options.autoPanPaddingBottomRight || padding),
		    size = map.getSize(),
		    dx = 0,
		    dy = 0;

		if (containerPos.x + containerWidth + paddingBR.x > size.x) { // right
			dx = containerPos.x + containerWidth - size.x + paddingBR.x;
		}
		if (containerPos.x - dx - paddingTL.x < 0) { // left
			dx = containerPos.x - paddingTL.x;
		}
		if (containerPos.y + containerHeight + paddingBR.y > size.y) { // bottom
			dy = containerPos.y + containerHeight - size.y + paddingBR.y;
		}
		if (containerPos.y - dy - paddingTL.y < 0) { // top
			dy = containerPos.y - paddingTL.y;
		}

		if (dx || dy) {
			map
			    .fire('autopanstart')
			    .panBy([dx, dy]);
		}
	},

	_onCloseButtonClick: function (e) {
		this._close();
		FMap.DomEvent.stop(e);
	}
});

FMap.popup = function (options, source) {
	return new FMap.Popup(options, source);
};


FMap.Map.include({
	openPopup: function (popup, latlng, options) { // (Popup) or (String || HTMLElement, LatLng[, Object])
		if (!(popup instanceof FMap.Popup)) {
			popup = new FMap.Popup(options).setContent(popup);
		}

		if (latlng) {
			popup.setLatLng(latlng);
		}

		if (this.hasLayer(popup)) {
			return this;
		}

		if (this._popup && this._popup.options.autoClose) {
			this.closePopup();
		}

		this._popup = popup;
		return this.addLayer(popup);
	},

	closePopup: function (popup) {
		if (!popup || popup === this._popup) {
			popup = this._popup;
			this._popup = null;
		}
		if (popup) {
			this.removeLayer(popup);
		}
		return this;
	}
});



/*
 * Adds popup-related methods to all layers.
 */

FMap.Layer.include({

	bindPopup: function (content, options) {

		if (content instanceof FMap.Popup) {
			FMap.setOptions(content, options);
			this._popup = content;
			content._source = this;
		} else {
			if (!this._popup || options) {
				this._popup = new FMap.Popup(options, this);
			}
			this._popup.setContent(content);
		}

		if (!this._popupHandlersAdded) {
			this.on({
				click: this._openPopup,
				remove: this.closePopup,
				move: this._movePopup
			});
			this._popupHandlersAdded = true;
		}

		return this;
	},

	unbindPopup: function () {
		if (this._popup) {
			this.off({
				click: this._openPopup,
				remove: this.closePopup,
				move: this._movePopup
			});
			this._popupHandlersAdded = false;
			this._popup = null;
		}
		return this;
	},

	openPopup: function (layer, latlng) {
		if (!(layer instanceof FMap.Layer)) {
			latlng = layer;
			layer = this;
		}

		if (layer instanceof FMap.FeatureGroup) {
			for (var id in this._layers) {
				layer = this._layers[id];
				break;
			}
		}

		if (!latlng) {
			latlng = layer.getCenter ? layer.getCenter() : layer.getLatLng();
		}

		if (this._popup && this._map) {
			this._popup.options.offset = this._popupAnchor(layer);
			this._popup._source = layer;
			this._popup.update();
			this._map.openPopup(this._popup, latlng);
		}

		return this;
	},

	closePopup: function () {
		if (this._popup) {
			this._popup._close();
		}
		return this;
	},

	togglePopup: function (target) {
		if (this._popup) {
			if (this._popup._map) {
				this.closePopup();
			} else {
				this.openPopup(target);
			}
		}
		return this;
	},

	setPopupContent: function (content) {
		if (this._popup) {
			this._popup.setContent(content);
		}
		return this;
	},

	getPopup: function () {
		return this._popup;
	},

	_openPopup: function (e) {
		var layer = e.layer || e.target;

		if (!this._popup) {
			return;
		}

		if (!this._map) {
			return;
		}

		// if this inherits from Path its a vector and we can just
		// open the popup at the new location
		if (layer instanceof FMap.Path) {
			this.openPopup(e.layer || e.target, e.latlng);
			return;
		}

		// otherwise treat it like a marker and figure out
		// if we should toggle it open/closed
		if (this._map.hasLayer(this._popup) && this._popup._source === layer) {
			this.closePopup();
		} else {
			this.openPopup(layer, e.latlng);
		}
	},

	_popupAnchor: function (layer) {
		var anchor = layer._getPopupAnchor ? layer._getPopupAnchor() : [0, 0];
		return FMap.point(anchor).add(FMap.Popup.prototype.options.offset);
	},

	_movePopup: function (e) {
		this._popup.setLatLng(e.latlng);
	}
});



/*
 * Popup extension to FMap.Marker, adding popup-related methods.
 */

FMap.Marker.include({
	_getPopupAnchor: function() {
		return this.options.icon.options.popupAnchor || [0, 0];
	}
});



/*
 * FMap.LayerGroup is a class to combine several layers into one so that
 * you can manipulate the group (e.g. add/remove it) as one layer.
 */

FMap.LayerGroup = FMap.Layer.extend({

	initialize: function (layers) {
		this._layers = {};

		var i, len;

		if (layers) {
			for (i = 0, len = layers.length; i < len; i++) {
				this.addLayer(layers[i]);
			}
		}
	},

	addLayer: function (layer) {
		var id = this.getLayerId(layer);

		this._layers[id] = layer;

		if (this._map) {
			this._map.addLayer(layer);
		}

		return this;
	},

	removeLayer: function (layer) {
		var id = layer in this._layers ? layer : this.getLayerId(layer);

		if (this._map && this._layers[id]) {
			this._map.removeLayer(this._layers[id]);
		}

		delete this._layers[id];

		return this;
	},

	hasLayer: function (layer) {
		return !!layer && (layer in this._layers || this.getLayerId(layer) in this._layers);
	},

	clearLayers: function () {
		for (var i in this._layers) {
			this.removeLayer(this._layers[i]);
		}
		return this;
	},

	invoke: function (methodName) {
		var args = Array.prototype.slice.call(arguments, 1),
		    i, layer;

		for (i in this._layers) {
			layer = this._layers[i];

			if (layer[methodName]) {
				layer[methodName].apply(layer, args);
			}
		}

		return this;
	},

	onAdd: function (map) {
		for (var i in this._layers) {
			map.addLayer(this._layers[i]);
		}
	},

	onRemove: function (map) {
		for (var i in this._layers) {
			map.removeLayer(this._layers[i]);
		}
	},

	eachLayer: function (method, context) {
		for (var i in this._layers) {
			method.call(context, this._layers[i]);
		}
		return this;
	},

	getLayer: function (id) {
		return this._layers[id];
	},

	getLayers: function () {
		var layers = [];

		for (var i in this._layers) {
			layers.push(this._layers[i]);
		}
		return layers;
	},

	setZIndex: function (zIndex) {
		return this.invoke('setZIndex', zIndex);
	},

	getLayerId: function (layer) {
		return FMap.stamp(layer);
	}
});

FMap.layerGroup = function (layers) {
	return new FMap.LayerGroup(layers);
};



/*
 * FMap.FeatureGroup extends FMap.LayerGroup by introducing mouse events and additional methods
 * shared between a group of interactive layers (like vectors or markers).
 */

FMap.FeatureGroup = FMap.LayerGroup.extend({

	addLayer: function (layer) {
		if (this.hasLayer(layer)) {
			return this;
		}

		layer.addEventParent(this);

		FMap.LayerGroup.prototype.addLayer.call(this, layer);

		return this.fire('layeradd', {layer: layer});
	},

	removeLayer: function (layer) {
		if (!this.hasLayer(layer)) {
			return this;
		}
		if (layer in this._layers) {
			layer = this._layers[layer];
		}

		layer.removeEventParent(this);

		FMap.LayerGroup.prototype.removeLayer.call(this, layer);

		return this.fire('layerremove', {layer: layer});
	},

	setStyle: function (style) {
		return this.invoke('setStyle', style);
	},

	bringToFront: function () {
		return this.invoke('bringToFront');
	},

	bringToBack: function () {
		return this.invoke('bringToBack');
	},

	getBounds: function () {
		var bounds = new FMap.LatLngBounds();

		for (var id in this._layers) {
			var layer = this._layers[id];
			bounds.extend(layer.getBounds ? layer.getBounds() : layer.getLatLng());
		}
		return bounds;
	}
});

FMap.featureGroup = function (layers) {
	return new FMap.FeatureGroup(layers);
};



/*
 * FMap.Renderer is a base class for renderer implementations (SVG, Canvas);
 * handles renderer container, bounds and zoom animation.
 */

FMap.Renderer = FMap.Layer.extend({

	options: {
		// how much to extend the clip area around the map view (relative to its size)
		// e.g. 0.1 would be 10% of map view in each direction; defaults to clip with the map view
		padding: 0
	},

	initialize: function (options) {
		FMap.setOptions(this, options);
		FMap.stamp(this);
	},

	onAdd: function () {
		if (!this._container) {
			this._initContainer(); // defined by renderer implementations

			if (this._zoomAnimated) {
				FMap.DomUtil.addClass(this._container, 'fmap-zoom-animated');
			}
		}

		this.getPane().appendChild(this._container);
		this._update();
	},

	onRemove: function () {
		FMap.DomUtil.remove(this._container);
	},

	getEvents: function () {
		var events = {
			moveend: this._update
		};
		if (this._zoomAnimated) {
			events.zoomanim = this._animateZoom;
		}
		return events;
	},

	_animateZoom: function (e) {
		var origin = e.origin.subtract(this._map._getCenterLayerPoint()),
		    offset = this._bounds.min.add(origin.multiplyBy(1 - e.scale)).add(e.offset).round();

		FMap.DomUtil.setTransform(this._container, offset, e.scale);
	},

	_update: function () {
		// update pixel bounds of renderer container (for positioning/sizing/clipping later)
		var p = this.options.padding,
		    size = this._map.getSize(),
		    min = this._map.containerPointToLayerPoint(size.multiplyBy(-p)).round();

		this._bounds = new FMap.Bounds(min, min.add(size.multiplyBy(1 + p * 2)).round());
	}
});


FMap.Map.include({
	// used by each vector layer to decide which renderer to use
	getRenderer: function (layer) {
		var renderer = layer.options.renderer || this._getPaneRenderer(layer.options.pane) || this.options.renderer || this._renderer;

		if (!renderer) {
			renderer = this._renderer = (FMap.SVG && FMap.svg()) || (FMap.Canvas && FMap.canvas());
		}

		if (!this.hasLayer(renderer)) {
			this.addLayer(renderer);
		}
		return renderer;
	},

	_getPaneRenderer: function (name) {
		if (name === 'overlayPane' || name === undefined) {
			return false;
		}

		var renderer = this._paneRenderers[name];
		if (renderer === undefined) {
			renderer = (FMap.SVG && FMap.svg({pane: name})) || (FMap.Canvas && FMap.canvas({pane: name}));
			this._paneRenderers[name] = renderer;
		}
		return renderer;
	}
});



/*
 * FMap.Path is the base class for all Fmap vector layers like polygons and circles.
 */

FMap.Path = FMap.Layer.extend({

	options: {
		stroke: true,
		color: '#3388ff',
		weight: 3,
		opacity: 1,
		lineCap: 'round',
		lineJoin: 'round',
		// dashArray: null
		// dashOffset: null

		// fill: false
		// fillColor: same as color by default
		fillOpacity: 0.2,
		fillRule: 'evenodd',

		// className: ''
		interactive: true
	},

	onAdd: function () {
		this._renderer = this._map.getRenderer(this);
		this._renderer._initPath(this);

		// defined in children classes
		this._project();
		this._update();

		this._renderer._addPath(this);
	},

	onRemove: function () {
		this._renderer._removePath(this);
	},

	getEvents: function () {
		return {
			viewreset: this._project,
			moveend: this._update
		};
	},

	redraw: function () {
		if (this._map) {
			this._renderer._updatePath(this);
		}
		return this;
	},

	setStyle: function (style) {
		FMap.setOptions(this, style);
		if (this._renderer) {
			this._renderer._updateStyle(this);
		}
		return this;
	},

	bringToFront: function () {
		if (this._renderer) {
			this._renderer._bringToFront(this);
		}
		return this;
	},

	bringToBack: function () {
		if (this._renderer) {
			this._renderer._bringToBack(this);
		}
		return this;
	},

	_clickTolerance: function () {
		// used when doing hit detection for Canvas layers
		return (this.options.stroke ? this.options.weight / 2 : 0) + (FMap.Browser.touch ? 10 : 0);
	}
});



/*
 * FMap.LineUtil contains different utility functions for line segments
 * and polylines (clipping, simplification, distances, etc.)
 */

FMap.LineUtil = {

	// Simplify polyline with vertex reduction and Douglas-Peucker simplification.
	// Improves rendering performance dramatically by lessening the number of points to draw.

	simplify: function (points, tolerance) {
		if (!tolerance || !points.length) {
			return points.slice();
		}

		var sqTolerance = tolerance * tolerance;

		// stage 1: vertex reduction
		points = this._reducePoints(points, sqTolerance);

		// stage 2: Douglas-Peucker simplification
		points = this._simplifyDP(points, sqTolerance);

		return points;
	},

	// distance from a point to a segment between two points
	pointToSegmentDistance:  function (p, p1, p2) {
		return Math.sqrt(this._sqClosestPointOnSegment(p, p1, p2, true));
	},

	closestPointOnSegment: function (p, p1, p2) {
		return this._sqClosestPointOnSegment(p, p1, p2);
	},

	// Douglas-Peucker simplification, see http://en.wikipedia.org/wiki/Douglas-Peucker_algorithm
	_simplifyDP: function (points, sqTolerance) {

		var len = points.length,
		    ArrayConstructor = typeof Uint8Array !== undefined + '' ? Uint8Array : Array,
		    markers = new ArrayConstructor(len);

		markers[0] = markers[len - 1] = 1;

		this._simplifyDPStep(points, markers, sqTolerance, 0, len - 1);

		var i,
		    newPoints = [];

		for (i = 0; i < len; i++) {
			if (markers[i]) {
				newPoints.push(points[i]);
			}
		}

		return newPoints;
	},

	_simplifyDPStep: function (points, markers, sqTolerance, first, last) {

		var maxSqDist = 0,
		    index, i, sqDist;

		for (i = first + 1; i <= last - 1; i++) {
			sqDist = this._sqClosestPointOnSegment(points[i], points[first], points[last], true);

			if (sqDist > maxSqDist) {
				index = i;
				maxSqDist = sqDist;
			}
		}

		if (maxSqDist > sqTolerance) {
			markers[index] = 1;

			this._simplifyDPStep(points, markers, sqTolerance, first, index);
			this._simplifyDPStep(points, markers, sqTolerance, index, last);
		}
	},

	// reduce points that are too close to each other to a single point
	_reducePoints: function (points, sqTolerance) {
		var reducedPoints = [points[0]];

		for (var i = 1, prev = 0, len = points.length; i < len; i++) {
			if (this._sqDist(points[i], points[prev]) > sqTolerance) {
				reducedPoints.push(points[i]);
				prev = i;
			}
		}
		if (prev < len - 1) {
			reducedPoints.push(points[len - 1]);
		}
		return reducedPoints;
	},

	// Cohen-Sutherland line clipping algorithm.
	// Used to avoid rendering parts of a polyline that are not currently visible.

	clipSegment: function (a, b, bounds, useLastCode, round) {
		var codeA = useLastCode ? this._lastCode : this._getBitCode(a, bounds),
		    codeB = this._getBitCode(b, bounds),

		    codeOut, p, newCode;

		// save 2nd code to avoid calculating it on the next segment
		this._lastCode = codeB;

		while (true) {
			// if a,b is inside the clip window (trivial accept)
			if (!(codeA | codeB)) {
				return [a, b];
			// if a,b is outside the clip window (trivial reject)
			} else if (codeA & codeB) {
				return false;
			// other cases
			} else {
				codeOut = codeA || codeB;
				p = this._getEdgeIntersection(a, b, codeOut, bounds, round);
				newCode = this._getBitCode(p, bounds);

				if (codeOut === codeA) {
					a = p;
					codeA = newCode;
				} else {
					b = p;
					codeB = newCode;
				}
			}
		}
	},

	_getEdgeIntersection: function (a, b, code, bounds, round) {
		var dx = b.x - a.x,
		    dy = b.y - a.y,
		    min = bounds.min,
		    max = bounds.max,
		    x, y;

		if (code & 8) { // top
			x = a.x + dx * (max.y - a.y) / dy;
			y = max.y;

		} else if (code & 4) { // bottom
			x = a.x + dx * (min.y - a.y) / dy;
			y = min.y;

		} else if (code & 2) { // right
			x = max.x;
			y = a.y + dy * (max.x - a.x) / dx;

		} else if (code & 1) { // left
			x = min.x;
			y = a.y + dy * (min.x - a.x) / dx;
		}

		return new FMap.Point(x, y, round);
	},

	_getBitCode: function (/*Point*/ p, bounds) {
		var code = 0;

		if (p.x < bounds.min.x) { // left
			code |= 1;
		} else if (p.x > bounds.max.x) { // right
			code |= 2;
		}

		if (p.y < bounds.min.y) { // bottom
			code |= 4;
		} else if (p.y > bounds.max.y) { // top
			code |= 8;
		}

		return code;
	},

	// square distance (to avoid unnecessary Math.sqrt calls)
	_sqDist: function (p1, p2) {
		var dx = p2.x - p1.x,
		    dy = p2.y - p1.y;
		return dx * dx + dy * dy;
	},

	// return closest point on segment or distance to that point
	_sqClosestPointOnSegment: function (p, p1, p2, sqDist) {
		var x = p1.x,
		    y = p1.y,
		    dx = p2.x - x,
		    dy = p2.y - y,
		    dot = dx * dx + dy * dy,
		    t;

		if (dot > 0) {
			t = ((p.x - x) * dx + (p.y - y) * dy) / dot;

			if (t > 1) {
				x = p2.x;
				y = p2.y;
			} else if (t > 0) {
				x += dx * t;
				y += dy * t;
			}
		}

		dx = p.x - x;
		dy = p.y - y;

		return sqDist ? dx * dx + dy * dy : new FMap.Point(x, y);
	}
};



/*
 * FMap.Polyline implements polyline vector layer (a set of points connected with lines)
 */

FMap.Polyline = FMap.Path.extend({

	options: {
		// how much to simplify the polyline on each zoom level
		// more = better performance and smoother look, less = more accurate
		smoothFactor: 1.0
		// noClip: false
	},

	initialize: function (latlngs, options) {
		FMap.setOptions(this, options);
		this._setLatLngs(latlngs);
	},

	getLatLngs: function () {
		return this._latlngs;
	},

	setLatLngs: function (latlngs) {
		this._setLatLngs(latlngs);
		return this.redraw();
	},

	isEmpty: function () {
		return !this._latlngs.length;
	},

	closestLayerPoint: function (p) {
		var minDistance = Infinity,
		    minPoint = null,
		    closest = FMap.LineUtil._sqClosestPointOnSegment,
		    p1, p2;

		for (var j = 0, jLen = this._parts.length; j < jLen; j++) {
			var points = this._parts[j];

			for (var i = 1, len = points.length; i < len; i++) {
				p1 = points[i - 1];
				p2 = points[i];

				var sqDist = closest(p, p1, p2, true);

				if (sqDist < minDistance) {
					minDistance = sqDist;
					minPoint = closest(p, p1, p2);
				}
			}
		}
		if (minPoint) {
			minPoint.distance = Math.sqrt(minDistance);
		}
		return minPoint;
	},

	getCenter: function () {
		var i, halfDist, segDist, dist, p1, p2, ratio,
		    points = this._rings[0],
		    len = points.length;

		if (!len) { return null; }

		// polyline centroid algorithm; only uses the first ring if there are multiple

		for (i = 0, halfDist = 0; i < len - 1; i++) {
			halfDist += points[i].distanceTo(points[i + 1]) / 2;
		}

		// The line is so small in the current view that all points are on the same pixel.
		if (halfDist === 0) {
			return this._map.layerPointToLatLng(points[0]);
		}

		for (i = 0, dist = 0; i < len - 1; i++) {
			p1 = points[i];
			p2 = points[i + 1];
			segDist = p1.distanceTo(p2);
			dist += segDist;

			if (dist > halfDist) {
				ratio = (dist - halfDist) / segDist;
				return this._map.layerPointToLatLng([
					p2.x - ratio * (p2.x - p1.x),
					p2.y - ratio * (p2.y - p1.y)
				]);
			}
		}
	},

	getBounds: function () {
		return this._bounds;
	},

	addLatLng: function (latlng, latlngs) {
		latlngs = latlngs || this._defaultShape();
		latlng = FMap.latLng(latlng);
		latlngs.push(latlng);
		this._bounds.extend(latlng);
		return this.redraw();
	},

	_setLatLngs: function (latlngs) {
		this._bounds = new FMap.LatLngBounds();
		this._latlngs = this._convertLatLngs(latlngs);
	},

	_defaultShape: function () {
		return FMap.Polyline._flat(this._latlngs) ? this._latlngs : this._latlngs[0];
	},

	// recursively convert latlngs input into actual LatLng instances; calculate bounds along the way
	_convertLatLngs: function (latlngs) {
		var result = [],
		    flat = FMap.Polyline._flat(latlngs);

		for (var i = 0, len = latlngs.length; i < len; i++) {
			if (flat) {
				result[i] = FMap.latLng(latlngs[i]);
				this._bounds.extend(result[i]);
			} else {
				result[i] = this._convertLatLngs(latlngs[i]);
			}
		}

		return result;
	},

	_project: function () {
		this._rings = [];
		this._projectLatlngs(this._latlngs, this._rings);

		// project bounds as well to use later for Canvas hit detection/etc.
		var w = this._clickTolerance(),
			p = new FMap.Point(w, -w);

		if (this._bounds.isValid()) {
			this._pxBounds = new FMap.Bounds(
				this._map.latLngToLayerPoint(this._bounds.getSouthWest())._subtract(p),
				this._map.latLngToLayerPoint(this._bounds.getNorthEast())._add(p));
		}
	},

	// recursively turns latlngs into a set of rings with projected coordinates
	_projectLatlngs: function (latlngs, result) {

		var flat = latlngs[0] instanceof FMap.LatLng,
		    len = latlngs.length,
		    i, ring;

		if (flat) {
			ring = [];
			for (i = 0; i < len; i++) {
				ring[i] = this._map.latLngToLayerPoint(latlngs[i]);
			}
			result.push(ring);
		} else {
			for (i = 0; i < len; i++) {
				this._projectLatlngs(latlngs[i], result);
			}
		}
	},

	// clip polyline by renderer bounds so that we have less to render for performance
	_clipPoints: function () {
		if (this.options.noClip) {
			this._parts = this._rings;
			return;
		}

		this._parts = [];

		var parts = this._parts,
		    bounds = this._renderer._bounds,
		    i, j, k, len, len2, segment, points;

		for (i = 0, k = 0, len = this._rings.length; i < len; i++) {
			points = this._rings[i];

			for (j = 0, len2 = points.length; j < len2 - 1; j++) {
				segment = FMap.LineUtil.clipSegment(points[j], points[j + 1], bounds, j, true);

				if (!segment) { continue; }

				parts[k] = parts[k] || [];
				parts[k].push(segment[0]);

				// if segment goes out of screen, or it's the last one, it's the end of the line part
				if ((segment[1] !== points[j + 1]) || (j === len2 - 2)) {
					parts[k].push(segment[1]);
					k++;
				}
			}
		}
	},

	// simplify each clipped part of the polyline for performance
	_simplifyPoints: function () {
		var parts = this._parts,
			tolerance = this.options.smoothFactor;

		for (var i = 0, len = parts.length; i < len; i++) {
			parts[i] = FMap.LineUtil.simplify(parts[i], tolerance);
		}
	},

	_update: function () {
		if (!this._map) { return; }

		this._clipPoints();
		this._simplifyPoints();
		this._updatePath();
	},

	_updatePath: function () {
		this._renderer._updatePoly(this);
	}
});

FMap.polyline = function (latlngs, options) {
	return new FMap.Polyline(latlngs, options);
};

FMap.Polyline._flat = function (latlngs) {
	// true if it's a flat array of latlngs; false if nested
	return !FMap.Util.isArray(latlngs[0]) || (typeof latlngs[0][0] !== 'object' && typeof latlngs[0][0] !== 'undefined');
};



/*
 * FMap.PolyUtil contains utility functions for polygons (clipping, etc.).
 */

FMap.PolyUtil = {};

/*
 * Sutherland-Hodgeman polygon clipping algorithm.
 * Used to avoid rendering parts of a polygon that are not currently visible.
 */
FMap.PolyUtil.clipPolygon = function (points, bounds, round) {
	var clippedPoints,
	    edges = [1, 4, 2, 8],
	    i, j, k,
	    a, b,
	    len, edge, p,
	    lu = FMap.LineUtil;

	for (i = 0, len = points.length; i < len; i++) {
		points[i]._code = lu._getBitCode(points[i], bounds);
	}

	// for each edge (left, bottom, right, top)
	for (k = 0; k < 4; k++) {
		edge = edges[k];
		clippedPoints = [];

		for (i = 0, len = points.length, j = len - 1; i < len; j = i++) {
			a = points[i];
			b = points[j];

			// if a is inside the clip window
			if (!(a._code & edge)) {
				// if b is outside the clip window (a->b goes out of screen)
				if (b._code & edge) {
					p = lu._getEdgeIntersection(b, a, edge, bounds, round);
					p._code = lu._getBitCode(p, bounds);
					clippedPoints.push(p);
				}
				clippedPoints.push(a);

			// else if b is inside the clip window (a->b enters the screen)
			} else if (!(b._code & edge)) {
				p = lu._getEdgeIntersection(b, a, edge, bounds, round);
				p._code = lu._getBitCode(p, bounds);
				clippedPoints.push(p);
			}
		}
		points = clippedPoints;
	}

	return points;
};



/*
 * FMap.Polygon implements polygon vector layer (closed polyline with a fill inside).
 */

FMap.Polygon = FMap.Polyline.extend({

	options: {
		fill: true
	},

	isEmpty: function () {
		return !this._latlngs.length || !this._latlngs[0].length;
	},

	getCenter: function () {
		var i, j, p1, p2, f, area, x, y, center,
		    points = this._rings[0],
		    len = points.length;

		if (!len) { return null; }

		// polygon centroid algorithm; only uses the first ring if there are multiple

		area = x = y = 0;

		for (i = 0, j = len - 1; i < len; j = i++) {
			p1 = points[i];
			p2 = points[j];

			f = p1.y * p2.x - p2.y * p1.x;
			x += (p1.x + p2.x) * f;
			y += (p1.y + p2.y) * f;
			area += f * 3;
		}

		if (area === 0) {
			// Polygon is so small that all points are on same pixel.
			center = points[0];
		} else {
			center = [x / area, y / area];
		}
		return this._map.layerPointToLatLng(center);
	},

	_convertLatLngs: function (latlngs) {
		var result = FMap.Polyline.prototype._convertLatLngs.call(this, latlngs),
		    len = result.length;

		// remove last point if it equals first one
		if (len >= 2 && result[0] instanceof FMap.LatLng && result[0].equals(result[len - 1])) {
			result.pop();
		}
		return result;
	},

	_setLatLngs: function (latlngs) {
		FMap.Polyline.prototype._setLatLngs.call(this, latlngs);
		if (FMap.Polyline._flat(this._latlngs)) {
			this._latlngs = [this._latlngs];
		}
	},

	_defaultShape: function () {
		return FMap.Polyline._flat(this._latlngs[0]) ? this._latlngs[0] : this._latlngs[0][0];
	},

	_clipPoints: function () {
		if (this.options.noClip) {
			this._parts = this._rings;
			return;
		}

		// polygons need a different clipping algorithm so we redefine that

		var bounds = this._renderer._bounds,
		    w = this.options.weight,
		    p = new FMap.Point(w, w);

		// increase clip padding by stroke width to avoid stroke on clip edges
		bounds = new FMap.Bounds(bounds.min.subtract(p), bounds.max.add(p));

		this._parts = [];

		for (var i = 0, len = this._rings.length, clipped; i < len; i++) {
			clipped = FMap.PolyUtil.clipPolygon(this._rings[i], bounds, true);
			if (clipped.length) {
				this._parts.push(clipped);
			}
		}
	},

	_updatePath: function () {
		this._renderer._updatePoly(this, true);
	}
});

FMap.polygon = function (latlngs, options) {
	return new FMap.Polygon(latlngs, options);
};



/*
 * FMap.Rectangle extends Polygon and creates a rectangle when passed a LatLngBounds object.
 */

FMap.Rectangle = FMap.Polygon.extend({
	initialize: function (latLngBounds, options) {
		FMap.Polygon.prototype.initialize.call(this, this._boundsToLatLngs(latLngBounds), options);
	},

	setBounds: function (latLngBounds) {
		this.setLatLngs(this._boundsToLatLngs(latLngBounds));
	},

	_boundsToLatLngs: function (latLngBounds) {
		latLngBounds = FMap.latLngBounds(latLngBounds);
		return [
			latLngBounds.getSouthWest(),
			latLngBounds.getNorthWest(),
			latLngBounds.getNorthEast(),
			latLngBounds.getSouthEast()
		];
	}
});

FMap.rectangle = function (latLngBounds, options) {
	return new FMap.Rectangle(latLngBounds, options);
};



/*
 * FMap.CircleMarker is a circle overlay with a permanent pixel radius.
 */

FMap.CircleMarker = FMap.Path.extend({

	options: {
		fill: true,
		radius: 10
	},

	initialize: function (latlng, options) {
		FMap.setOptions(this, options);
		this._latlng = FMap.latLng(latlng);
		this._radius = this.options.radius;
	},

	setLatLng: function (latlng) {
		this._latlng = FMap.latLng(latlng);
		this.redraw();
		return this.fire('move', {latlng: this._latlng});
	},

	getLatLng: function () {
		return this._latlng;
	},

	setRadius: function (radius) {
		this.options.radius = this._radius = radius;
		return this.redraw();
	},

	getRadius: function () {
		return this._radius;
	},

	setStyle : function (options) {
		var radius = options && options.radius || this._radius;
		FMap.Path.prototype.setStyle.call(this, options);
		this.setRadius(radius);
		return this;
	},

	_project: function () {
		this._point = this._map.latLngToLayerPoint(this._latlng);
		this._updateBounds();
	},

	_updateBounds: function () {
		var r = this._radius,
		    r2 = this._radiusY || r,
		    w = this._clickTolerance(),
		    p = [r + w, r2 + w];
		this._pxBounds = new FMap.Bounds(this._point.subtract(p), this._point.add(p));
	},

	_update: function () {
		if (this._map) {
			this._updatePath();
		}
	},

	_updatePath: function () {
		this._renderer._updateCircle(this);
	},

	_empty: function () {
		return this._radius && !this._renderer._bounds.intersects(this._pxBounds);
	}
});

FMap.circleMarker = function (latlng, options) {
	return new FMap.CircleMarker(latlng, options);
};



/*
 * FMap.Circle is a circle overlay (with a certain radius in meters).
 * It's an approximation and starts to diverge from a real circle closer to poles (due to projection distortion)
 */

FMap.Circle = FMap.CircleMarker.extend({

	initialize: function (latlng, radius, options) {
		FMap.setOptions(this, options);
		this._latlng = FMap.latLng(latlng);
		this._mRadius = radius;
	},

	setRadius: function (radius) {
		this._mRadius = radius;
		return this.redraw();
	},

	getRadius: function () {
		return this._mRadius;
	},

	getBounds: function () {
		var half = [this._radius, this._radiusY];

		return new FMap.LatLngBounds(
			this._map.layerPointToLatLng(this._point.subtract(half)),
			this._map.layerPointToLatLng(this._point.add(half)));
	},

	setStyle: FMap.Path.prototype.setStyle,

	_project: function () {

		var lng = this._latlng.lng,
		    lat = this._latlng.lat,
		    map = this._map,
		    crs = map.options.crs;

		if (crs.distance === FMap.CRS.Earth.distance) {
			var d = Math.PI / 180,
			    latR = (this._mRadius / FMap.CRS.Earth.R) / d,
			    top = map.project([lat + latR, lng]),
			    bottom = map.project([lat - latR, lng]),
			    p = top.add(bottom).divideBy(2),
			    lat2 = map.unproject(p).lat,
			    lngR = Math.acos((Math.cos(latR * d) - Math.sin(lat * d) * Math.sin(lat2 * d)) /
			            (Math.cos(lat * d) * Math.cos(lat2 * d))) / d;

			this._point = p.subtract(map.getPixelOrigin());
			this._radius = isNaN(lngR) ? 0 : Math.max(Math.round(p.x - map.project([lat2, lng - lngR]).x), 1);
			this._radiusY = Math.max(Math.round(p.y - top.y), 1);

		} else {
			var latlng2 = crs.unproject(crs.project(this._latlng).subtract([this._mRadius, 0]));

			this._point = map.latLngToLayerPoint(this._latlng);
			this._radius = this._point.x - map.latLngToLayerPoint(latlng2).x;
		}

		this._updateBounds();
	}
});

FMap.circle = function (latlng, radius, options) {
	return new FMap.Circle(latlng, radius, options);
};



/*
 * FMap.SVG renders vector layers with SVG. All SVG-specific code goes here.
 */

FMap.SVG = FMap.Renderer.extend({

	_initContainer: function () {
		this._container = FMap.SVG.create('svg');

		// makes it possible to click through svg root; we'll reset it back in individual paths
		this._container.setAttribute('pointer-events', 'none');

		this._rootGroup = FMap.SVG.create('g');
		this._container.appendChild(this._rootGroup);
	},

	_update: function () {
		if (this._map._animatingZoom && this._bounds) { return; }

		FMap.Renderer.prototype._update.call(this);

		var b = this._bounds,
		    size = b.getSize(),
		    container = this._container;

		FMap.DomUtil.setPosition(container, b.min);

		// set size of svg-container if changed
		if (!this._svgSize || !this._svgSize.equals(size)) {
			this._svgSize = size;
			container.setAttribute('width', size.x);
			container.setAttribute('height', size.y);
		}

		// movement: update container viewBox so that we don't have to change coordinates of individual layers
		FMap.DomUtil.setPosition(container, b.min);
		container.setAttribute('viewBox', [b.min.x, b.min.y, size.x, size.y].join(' '));
	},

	// methods below are called by vector layers implementations

	_initPath: function (layer) {
		var path = layer._path = FMap.SVG.create('path');

		if (layer.options.className) {
			FMap.DomUtil.addClass(path, layer.options.className);
		}

		if (layer.options.interactive) {
			FMap.DomUtil.addClass(path, 'fmap-interactive');
		}

		this._updateStyle(layer);
	},

	_addPath: function (layer) {
		this._rootGroup.appendChild(layer._path);
		layer.addInteractiveTarget(layer._path);
	},

	_removePath: function (layer) {
		FMap.DomUtil.remove(layer._path);
		layer.removeInteractiveTarget(layer._path);
	},

	_updatePath: function (layer) {
		layer._project();
		layer._update();
	},

	_updateStyle: function (layer) {
		var path = layer._path,
			options = layer.options;

		if (!path) { return; }

		if (options.stroke) {
			path.setAttribute('stroke', options.color);
			path.setAttribute('stroke-opacity', options.opacity);
			path.setAttribute('stroke-width', options.weight);
			path.setAttribute('stroke-linecap', options.lineCap);
			path.setAttribute('stroke-linejoin', options.lineJoin);

			if (options.dashArray) {
				path.setAttribute('stroke-dasharray', options.dashArray);
			} else {
				path.removeAttribute('stroke-dasharray');
			}

			if (options.dashOffset) {
				path.setAttribute('stroke-dashoffset', options.dashOffset);
			} else {
				path.removeAttribute('stroke-dashoffset');
			}
		} else {
			path.setAttribute('stroke', 'none');
		}

		if (options.fill) {
			path.setAttribute('fill', options.fillColor || options.color);
			path.setAttribute('fill-opacity', options.fillOpacity);
			path.setAttribute('fill-rule', options.fillRule || 'evenodd');
		} else {
			path.setAttribute('fill', 'none');
		}

		path.setAttribute('pointer-events', options.pointerEvents || (options.interactive ? 'visiblePainted' : 'none'));
	},

	_updatePoly: function (layer, closed) {
		this._setPath(layer, FMap.SVG.pointsToPath(layer._parts, closed));
	},

	_updateCircle: function (layer) {
		var p = layer._point,
		    r = layer._radius,
		    r2 = layer._radiusY || r,
		    arc = 'a' + r + ',' + r2 + ' 0 1,0 ';

		// drawing a circle with two half-arcs
		var d = layer._empty() ? 'M0 0' :
				'M' + (p.x - r) + ',' + p.y +
				arc + (r * 2) + ',0 ' +
				arc + (-r * 2) + ',0 ';

		this._setPath(layer, d);
	},

	_setPath: function (layer, path) {
		layer._path.setAttribute('d', path);
	},

	// SVG does not have the concept of zIndex so we resort to changing the DOM order of elements
	_bringToFront: function (layer) {
		FMap.DomUtil.toFront(layer._path);
	},

	_bringToBack: function (layer) {
		FMap.DomUtil.toBack(layer._path);
	}
});


FMap.extend(FMap.SVG, {
	create: function (name) {
		return document.createElementNS('http://www.w3.org/2000/svg', name);
	},

	// generates SVG path string for multiple rings, with each ring turning into "M..FMap..FMap.." instructions
	pointsToPath: function (rings, closed) {
		var str = '',
			i, j, len, len2, points, p;

		for (i = 0, len = rings.length; i < len; i++) {
			points = rings[i];

			for (j = 0, len2 = points.length; j < len2; j++) {
				p = points[j];
				str += (j ? 'L' : 'M') + p.x + ' ' + p.y;
			}

			// closes the ring for polygons; "x" is VML syntax
			str += closed ? (FMap.Browser.svg ? 'z' : 'x') : '';
		}

		// SVG complains about empty path strings
		return str || 'M0 0';
	}
});

FMap.Browser.svg = !!(document.createElementNS && FMap.SVG.create('svg').createSVGRect);

FMap.svg = function (options) {
	return FMap.Browser.svg || FMap.Browser.vml ? new FMap.SVG(options) : null;
};



/*
 * Vector rendering for IE7-8 through VML.
 * Thanks to Dmitry Baranovsky and his Raphael library for inspiration!
 */

FMap.Browser.vml = !FMap.Browser.svg && (function () {
	try {
		var div = document.createElement('div');
		div.innerHTML = '<v:shape adj="1"/>';

		var shape = div.firstChild;
		shape.style.behavior = 'url(#default#VML)';

		return shape && (typeof shape.adj === 'object');

	} catch (e) {
		return false;
	}
}());

// redefine some SVG methods to handle VML syntax which is similar but with some differences
FMap.SVG.include(!FMap.Browser.vml ? {} : {

	_initContainer: function () {
		this._container = FMap.DomUtil.create('div', 'fmap-vml-container');
	},

	_update: function () {
		if (this._map._animatingZoom) { return; }
		FMap.Renderer.prototype._update.call(this);
	},

	_initPath: function (layer) {
		var container = layer._container = FMap.SVG.create('shape');

		FMap.DomUtil.addClass(container, 'fmap-vml-shape ' + (this.options.className || ''));

		container.coordsize = '1 1';

		layer._path = FMap.SVG.create('path');
		container.appendChild(layer._path);

		this._updateStyle(layer);
	},

	_addPath: function (layer) {
		var container = layer._container;
		this._container.appendChild(container);
		layer.addInteractiveTarget(container);
	},

	_removePath: function (layer) {
		var container = layer._container;
		FMap.DomUtil.remove(container);
		layer.removeInteractiveTarget(container);
	},

	_updateStyle: function (layer) {
		var stroke = layer._stroke,
		    fill = layer._fill,
		    options = layer.options,
		    container = layer._container;

		container.stroked = !!options.stroke;
		container.filled = !!options.fill;

		if (options.stroke) {
			if (!stroke) {
				stroke = layer._stroke = FMap.SVG.create('stroke');
				container.appendChild(stroke);
			}
			stroke.weight = options.weight + 'px';
			stroke.color = options.color;
			stroke.opacity = options.opacity;

			if (options.dashArray) {
				stroke.dashStyle = FMap.Util.isArray(options.dashArray) ?
				    options.dashArray.join(' ') :
				    options.dashArray.replace(/( *, *)/g, ' ');
			} else {
				stroke.dashStyle = '';
			}
			stroke.endcap = options.lineCap.replace('butt', 'flat');
			stroke.joinstyle = options.lineJoin;

		} else if (stroke) {
			container.removeChild(stroke);
			layer._stroke = null;
		}

		if (options.fill) {
			if (!fill) {
				fill = layer._fill = FMap.SVG.create('fill');
				container.appendChild(fill);
			}
			fill.color = options.fillColor || options.color;
			fill.opacity = options.fillOpacity;

		} else if (fill) {
			container.removeChild(fill);
			layer._fill = null;
		}
	},

	_updateCircle: function (layer) {
		var p = layer._point.round(),
		    r = Math.round(layer._radius),
		    r2 = Math.round(layer._radiusY || r);

		this._setPath(layer, layer._empty() ? 'M0 0' :
				'AL ' + p.x + ',' + p.y + ' ' + r + ',' + r2 + ' 0,' + (65535 * 360));
	},

	_setPath: function (layer, path) {
		layer._path.v = path;
	},

	_bringToFront: function (layer) {
		FMap.DomUtil.toFront(layer._container);
	},

	_bringToBack: function (layer) {
		FMap.DomUtil.toBack(layer._container);
	}
});

if (FMap.Browser.vml) {
	FMap.SVG.create = (function () {
		try {
			document.namespaces.add('lvml', 'urn:schemas-microsoft-com:vml');
			return function (name) {
				return document.createElement('<lvml:' + name + ' class="lvml">');
			};
		} catch (e) {
			return function (name) {
				return document.createElement('<' + name + ' xmlns="urn:schemas-microsoft.com:vml" class="lvml">');
			};
		}
	})();
}



/*
 * FMap.Canvas handles Canvas vector layers rendering and mouse events handling. All Canvas-specific code goes here.
 */

FMap.Canvas = FMap.Renderer.extend({

	onAdd: function () {
		FMap.Renderer.prototype.onAdd.call(this);

		this._layers = this._layers || {};

		// redraw vectors since canvas is cleared upon removal
		this._draw();
	},

	_initContainer: function () {
		var container = this._container = document.createElement('canvas');

		FMap.DomEvent
			.on(container, 'mousemove', this._onMouseMove, this)
			.on(container, 'click dblclick mousedown mouseup contextmenu', this._onClick, this);

		this._ctx = container.getContext('2d');
	},

	_update: function () {
		if (this._map._animatingZoom && this._bounds) { return; }

		FMap.Renderer.prototype._update.call(this);

		var b = this._bounds,
		    container = this._container,
		    size = b.getSize(),
		    m = FMap.Browser.retina ? 2 : 1;

		FMap.DomUtil.setPosition(container, b.min);

		// set canvas size (also clearing it); use double size on retina
		container.width = m * size.x;
		container.height = m * size.y;
		container.style.width = size.x + 'px';
		container.style.height = size.y + 'px';

		if (FMap.Browser.retina) {
			this._ctx.scale(2, 2);
		}

		// translate so we use the same path coordinates after canvas element moves
		this._ctx.translate(-b.min.x, -b.min.y);
	},

	_initPath: function (layer) {
		this._layers[FMap.stamp(layer)] = layer;
	},

	_addPath: FMap.Util.falseFn,

	_removePath: function (layer) {
		layer._removed = true;
		this._requestRedraw(layer);
	},

	_updatePath: function (layer) {
		this._redrawBounds = layer._pxBounds;
		this._draw(true);
		layer._project();
		layer._update();
		this._draw();
		this._redrawBounds = null;
	},

	_updateStyle: function (layer) {
		this._requestRedraw(layer);
	},

	_requestRedraw: function (layer) {
		if (!this._map) { return; }

		this._redrawBounds = this._redrawBounds || new FMap.Bounds();
		this._redrawBounds.extend(layer._pxBounds.min).extend(layer._pxBounds.max);

		this._redrawRequest = this._redrawRequest || FMap.Util.requestAnimFrame(this._redraw, this);
	},

	_redraw: function () {
		this._redrawRequest = null;

		this._draw(true); // clear layers in redraw bounds
		this._draw(); // draw layers

		this._redrawBounds = null;
	},

	_draw: function (clear) {
		this._clear = clear;
		var layer;

		for (var id in this._layers) {
			layer = this._layers[id];
			if (!this._redrawBounds || layer._pxBounds.intersects(this._redrawBounds)) {
				layer._updatePath();
			}
			if (clear && layer._removed) {
				delete layer._removed;
				delete this._layers[id];
			}
		}
	},

	_updatePoly: function (layer, closed) {

		var i, j, len2, p,
		    parts = layer._parts,
		    len = parts.length,
		    ctx = this._ctx;

		if (!len) { return; }

		ctx.beginPath();

		for (i = 0; i < len; i++) {
			for (j = 0, len2 = parts[i].length; j < len2; j++) {
				p = parts[i][j];
				ctx[j ? 'lineTo' : 'moveTo'](p.x, p.y);
			}
			if (closed) {
				ctx.closePath();
			}
		}

		this._fillStroke(ctx, layer);

		// TODO optimization: 1 fill/stroke for all features with equal style instead of 1 for each feature
	},

	_updateCircle: function (layer) {

		if (layer._empty()) { return; }

		var p = layer._point,
		    ctx = this._ctx,
		    r = layer._radius,
		    s = (layer._radiusY || r) / r;

		if (s !== 1) {
			ctx.save();
			ctx.scale(1, s);
		}

		ctx.beginPath();
		ctx.arc(p.x, p.y / s, r, 0, Math.PI * 2, false);

		if (s !== 1) {
			ctx.restore();
		}

		this._fillStroke(ctx, layer);
	},

	_fillStroke: function (ctx, layer) {
		var clear = this._clear,
		    options = layer.options;

		ctx.globalCompositeOperation = clear ? 'destination-out' : 'source-over';

		if (options.fill) {
			ctx.globalAlpha = clear ? 1 : options.fillOpacity;
			ctx.fillStyle = options.fillColor || options.color;
			ctx.fill(options.fillRule || 'evenodd');
		}

		if (options.stroke && options.weight !== 0) {
			ctx.globalAlpha = clear ? 1 : options.opacity;

			// if clearing shape, do it with the previously drawn line width
			layer._prevWeight = ctx.lineWidth = clear ? layer._prevWeight + 1 : options.weight;

			ctx.strokeStyle = options.color;
			ctx.lineCap = options.lineCap;
			ctx.lineJoin = options.lineJoin;
			ctx.stroke();
		}
	},

	// Canvas obviously doesn't have mouse events for individual drawn objects,
	// so we emulate that by calculating what's under the mouse on mousemove/click manually

	_onClick: function (e) {
		var point = this._map.mouseEventToLayerPoint(e);

		for (var id in this._layers) {
			if (this._layers[id]._containsPoint(point)) {
				FMap.DomEvent._fakeStop(e);
				this._fireEvent(this._layers[id], e);
			}
		}
	},

	_onMouseMove: function (e) {
		if (!this._map || this._map._animatingZoom) { return; }

		var point = this._map.mouseEventToLayerPoint(e);

		// TODO don't do on each move event, throttle since it's expensive
		for (var id in this._layers) {
			this._handleHover(this._layers[id], e, point);
		}
	},

	_handleHover: function (layer, e, point) {
		if (!layer.options.interactive) { return; }

		if (layer._containsPoint(point)) {
			// if we just got inside the layer, fire mouseover
			if (!layer._mouseInside) {
				FMap.DomUtil.addClass(this._container, 'fmap-interactive'); // change cursor
				this._fireEvent(layer, e, 'mouseover');
				layer._mouseInside = true;
			}
			// fire mousemove
			this._fireEvent(layer, e);

		} else if (layer._mouseInside) {
			// if we're leaving the layer, fire mouseout
			FMap.DomUtil.removeClass(this._container, 'fmap-interactive');
			this._fireEvent(layer, e, 'mouseout');
			layer._mouseInside = false;
		}
	},

	_fireEvent: function (layer, e, type) {
		this._map._fireDOMEvent(layer, e, type || e.type);
	},

	// TODO _bringToFront & _bringToBack, pretty tricky

	_bringToFront: FMap.Util.falseFn,
	_bringToBack: FMap.Util.falseFn
});

FMap.Browser.canvas = (function () {
	return !!document.createElement('canvas').getContext;
}());

FMap.canvas = function (options) {
	return FMap.Browser.canvas ? new FMap.Canvas(options) : null;
};

FMap.Polyline.prototype._containsPoint = function (p, closed) {
	var i, j, k, len, len2, part,
	    w = this._clickTolerance();

	if (!this._pxBounds.contains(p)) { return false; }

	// hit detection for polylines
	for (i = 0, len = this._parts.length; i < len; i++) {
		part = this._parts[i];

		for (j = 0, len2 = part.length, k = len2 - 1; j < len2; k = j++) {
			if (!closed && (j === 0)) { continue; }

			if (FMap.LineUtil.pointToSegmentDistance(p, part[k], part[j]) <= w) {
				return true;
			}
		}
	}
	return false;
};

FMap.Polygon.prototype._containsPoint = function (p) {
	var inside = false,
	    part, p1, p2, i, j, k, len, len2;

	if (!this._pxBounds.contains(p)) { return false; }

	// ray casting algorithm for detecting if point is in polygon
	for (i = 0, len = this._parts.length; i < len; i++) {
		part = this._parts[i];

		for (j = 0, len2 = part.length, k = len2 - 1; j < len2; k = j++) {
			p1 = part[j];
			p2 = part[k];

			if (((p1.y > p.y) !== (p2.y > p.y)) && (p.x < (p2.x - p1.x) * (p.y - p1.y) / (p2.y - p1.y) + p1.x)) {
				inside = !inside;
			}
		}
	}

	// also check if it's on polygon stroke
	return inside || FMap.Polyline.prototype._containsPoint.call(this, p, true);
};

FMap.CircleMarker.prototype._containsPoint = function (p) {
	return p.distanceTo(this._point) <= this._radius + this._clickTolerance();
};



/*
 * FMap.GeoJSON turns any GeoJSON data into a Fmap layer.
 */

FMap.GeoJSON = FMap.FeatureGroup.extend({

	initialize: function (geojson, options) {
		FMap.setOptions(this, options);

		this._layers = {};

		if (geojson) {
			this.addData(geojson);
		}
	},

	addData: function (geojson) {
		var features = FMap.Util.isArray(geojson) ? geojson : geojson.features,
		    i, len, feature;

		if (features) {
			for (i = 0, len = features.length; i < len; i++) {
				// only add this if geometry or geometries are set and not null
				feature = features[i];
				if (feature.geometries || feature.geometry || feature.features || feature.coordinates) {
					this.addData(feature);
				}
			}
			return this;
		}

		var options = this.options;

		if (options.filter && !options.filter(geojson)) { return this; }

		var layer = FMap.GeoJSON.geometryToLayer(geojson, options);
		layer.feature = FMap.GeoJSON.asFeature(geojson);

		layer.defaultOptions = layer.options;
		this.resetStyle(layer);

		if (options.onEachFeature) {
			options.onEachFeature(geojson, layer);
		}

		return this.addLayer(layer);
	},

	resetStyle: function (layer) {
		// reset any custom styles
		layer.options = layer.defaultOptions;
		this._setLayerStyle(layer, this.options.style);
		return this;
	},

	setStyle: function (style) {
		return this.eachLayer(function (layer) {
			this._setLayerStyle(layer, style);
		}, this);
	},

	_setLayerStyle: function (layer, style) {
		if (typeof style === 'function') {
			style = style(layer.feature);
		}
		if (layer.setStyle) {
			layer.setStyle(style);
		}
	}
});

FMap.extend(FMap.GeoJSON, {
	geometryToLayer: function (geojson, options) {

		var geometry = geojson.type === 'Feature' ? geojson.geometry : geojson,
		    coords = geometry.coordinates,
		    layers = [],
		    pointToLayer = options && options.pointToLayer,
		    coordsToLatLng = options && options.coordsToLatLng || this.coordsToLatLng,
		    latlng, latlngs, i, len;

		switch (geometry.type) {
		case 'Point':
			latlng = coordsToLatLng(coords);
			return pointToLayer ? pointToLayer(geojson, latlng) : new FMap.Marker(latlng);

		case 'MultiPoint':
			for (i = 0, len = coords.length; i < len; i++) {
				latlng = coordsToLatLng(coords[i]);
				layers.push(pointToLayer ? pointToLayer(geojson, latlng) : new FMap.Marker(latlng));
			}
			return new FMap.FeatureGroup(layers);

		case 'LineString':
		case 'MultiLineString':
			latlngs = this.coordsToLatLngs(coords, geometry.type === 'LineString' ? 0 : 1, coordsToLatLng);
			return new FMap.Polyline(latlngs, options);

		case 'Polygon':
		case 'MultiPolygon':
			latlngs = this.coordsToLatLngs(coords, geometry.type === 'Polygon' ? 1 : 2, coordsToLatLng);
			return new FMap.Polygon(latlngs, options);

		case 'GeometryCollection':
			for (i = 0, len = geometry.geometries.length; i < len; i++) {

				layers.push(this.geometryToLayer({
					geometry: geometry.geometries[i],
					type: 'Feature',
					properties: geojson.properties
				}, options));
			}
			return new FMap.FeatureGroup(layers);

		default:
			throw new Error('Invalid GeoJSON object.');
		}
	},

	coordsToLatLng: function (coords) {
		return new FMap.LatLng(coords[1], coords[0], coords[2]);
	},

	coordsToLatLngs: function (coords, levelsDeep, coordsToLatLng) {
		var latlngs = [];

		for (var i = 0, len = coords.length, latlng; i < len; i++) {
			latlng = levelsDeep ?
			        this.coordsToLatLngs(coords[i], levelsDeep - 1, coordsToLatLng) :
			        (coordsToLatLng || this.coordsToLatLng)(coords[i]);

			latlngs.push(latlng);
		}

		return latlngs;
	},

	latLngToCoords: function (latlng) {
		return latlng.alt !== undefined ?
				[latlng.lng, latlng.lat, latlng.alt] :
				[latlng.lng, latlng.lat];
	},

	latLngsToCoords: function (latlngs, levelsDeep, closed) {
		var coords = [];

		for (var i = 0, len = latlngs.length; i < len; i++) {
			coords.push(levelsDeep ?
				FMap.GeoJSON.latLngsToCoords(latlngs[i], levelsDeep - 1, closed) :
				FMap.GeoJSON.latLngToCoords(latlngs[i]));
		}

		if (!levelsDeep && closed) {
			coords.push(coords[0]);
		}

		return coords;
	},

	getFeature: function (layer, newGeometry) {
		return layer.feature ?
				FMap.extend({}, layer.feature, {geometry: newGeometry}) :
				FMap.GeoJSON.asFeature(newGeometry);
	},

	asFeature: function (geoJSON) {
		if (geoJSON.type === 'Feature') {
			return geoJSON;
		}

		return {
			type: 'Feature',
			properties: {},
			geometry: geoJSON
		};
	}
});

var PointToGeoJSON = {
	toGeoJSON: function () {
		return FMap.GeoJSON.getFeature(this, {
			type: 'Point',
			coordinates: FMap.GeoJSON.latLngToCoords(this.getLatLng())
		});
	}
};

FMap.Marker.include(PointToGeoJSON);
FMap.Circle.include(PointToGeoJSON);
FMap.CircleMarker.include(PointToGeoJSON);

FMap.Polyline.prototype.toGeoJSON = function () {
	var multi = !FMap.Polyline._flat(this._latlngs);

	var coords = FMap.GeoJSON.latLngsToCoords(this._latlngs, multi ? 1 : 0);

	return FMap.GeoJSON.getFeature(this, {
		type: (multi ? 'Multi' : '') + 'LineString',
		coordinates: coords
	});
};

FMap.Polygon.prototype.toGeoJSON = function () {
	var holes = !FMap.Polyline._flat(this._latlngs),
	    multi = holes && !FMap.Polyline._flat(this._latlngs[0]);

	var coords = FMap.GeoJSON.latLngsToCoords(this._latlngs, multi ? 2 : holes ? 1 : 0, true);

	if (!holes) {
		coords = [coords];
	}

	return FMap.GeoJSON.getFeature(this, {
		type: (multi ? 'Multi' : '') + 'Polygon',
		coordinates: coords
	});
};


FMap.LayerGroup.include({
	toMultiPoint: function () {
		var coords = [];

		this.eachLayer(function (layer) {
			coords.push(layer.toGeoJSON().geometry.coordinates);
		});

		return FMap.GeoJSON.getFeature(this, {
			type: 'MultiPoint',
			coordinates: coords
		});
	},

	toGeoJSON: function () {

		var type = this.feature && this.feature.geometry && this.feature.geometry.type;

		if (type === 'MultiPoint') {
			return this.toMultiPoint();
		}

		var isGeometryCollection = type === 'GeometryCollection',
			jsons = [];

		this.eachLayer(function (layer) {
			if (layer.toGeoJSON) {
				var json = layer.toGeoJSON();
				jsons.push(isGeometryCollection ? json.geometry : FMap.GeoJSON.asFeature(json));
			}
		});

		if (isGeometryCollection) {
			return FMap.GeoJSON.getFeature(this, {
				geometries: jsons,
				type: 'GeometryCollection'
			});
		}

		return {
			type: 'FeatureCollection',
			features: jsons
		};
	}
});

FMap.geoJson = function (geojson, options) {
	return new FMap.GeoJSON(geojson, options);
};



/*
 * FMap.DomEvent contains functions for working with DOM events.
 * Inspired by John Resig, Dean Edwards and YUI addEvent implementations.
 */

var eventsKey = '_fmap_events';

FMap.DomEvent = {

	on: function (obj, types, fn, context) {

		if (typeof types === 'object') {
			for (var type in types) {
				this._on(obj, type, types[type], fn);
			}
		} else {
			types = FMap.Util.splitWords(types);

			for (var i = 0, len = types.length; i < len; i++) {
				this._on(obj, types[i], fn, context);
			}
		}

		return this;
	},

	off: function (obj, types, fn, context) {

		if (typeof types === 'object') {
			for (var type in types) {
				this._off(obj, type, types[type], fn);
			}
		} else {
			types = FMap.Util.splitWords(types);

			for (var i = 0, len = types.length; i < len; i++) {
				this._off(obj, types[i], fn, context);
			}
		}

		return this;
	},

	_on: function (obj, type, fn, context) {
		var id = type + FMap.stamp(fn) + (context ? '_' + FMap.stamp(context) : '');

		if (obj[eventsKey] && obj[eventsKey][id]) { return this; }

		var handler = function (e) {
			return fn.call(context || obj, e || window.event);
		};

		var originalHandler = handler;

		if (FMap.Browser.pointer && type.indexOf('touch') === 0) {
			this.addPointerListener(obj, type, handler, id);

		} else if (FMap.Browser.touch && (type === 'dblclick') && this.addDoubleTapListener) {
			this.addDoubleTapListener(obj, handler, id);

		} else if ('addEventListener' in obj) {

			if (type === 'mousewheel') {
				obj.addEventListener('DOMMouseScroll', handler, false);
				obj.addEventListener(type, handler, false);

			} else if ((type === 'mouseenter') || (type === 'mouseleave')) {
				handler = function (e) {
					e = e || window.event;
					if (FMap.DomEvent._checkMouse(obj, e)) {
						originalHandler(e);
					}
				};
				obj.addEventListener(type === 'mouseenter' ? 'mouseover' : 'mouseout', handler, false);

			} else {
				if (type === 'click' && FMap.Browser.android) {
					handler = function (e) {
						return FMap.DomEvent._filterClick(e, originalHandler);
					};
				}
				obj.addEventListener(type, handler, false);
			}

		} else if ('attachEvent' in obj) {
			obj.attachEvent('on' + type, handler);
		}

		obj[eventsKey] = obj[eventsKey] || {};
		obj[eventsKey][id] = handler;

		return this;
	},

	_off: function (obj, type, fn, context) {

		var id = type + FMap.stamp(fn) + (context ? '_' + FMap.stamp(context) : ''),
		    handler = obj[eventsKey] && obj[eventsKey][id];

		if (!handler) { return this; }

		if (FMap.Browser.pointer && type.indexOf('touch') === 0) {
			this.removePointerListener(obj, type, id);

		} else if (FMap.Browser.touch && (type === 'dblclick') && this.removeDoubleTapListener) {
			this.removeDoubleTapListener(obj, id);

		} else if ('removeEventListener' in obj) {

			if (type === 'mousewheel') {
				obj.removeEventListener('DOMMouseScroll', handler, false);
				obj.removeEventListener(type, handler, false);

			} else {
				obj.removeEventListener(
					type === 'mouseenter' ? 'mouseover' :
					type === 'mouseleave' ? 'mouseout' : type, handler, false);
			}

		} else if ('detachEvent' in obj) {
			obj.detachEvent('on' + type, handler);
		}

		obj[eventsKey][id] = null;

		return this;
	},

	stopPropagation: function (e) {

		if (e.stopPropagation) {
			e.stopPropagation();
		} else {
			e.cancelBubble = true;
		}
		FMap.DomEvent._skipped(e);

		return this;
	},

	disableScrollPropagation: function (el) {
		return FMap.DomEvent.on(el, 'mousewheel MozMousePixelScroll', FMap.DomEvent.stopPropagation);
	},

	disableClickPropagation: function (el) {
		var stop = FMap.DomEvent.stopPropagation;

		FMap.DomEvent.on(el, FMap.Draggable.START.join(' '), stop);

		return FMap.DomEvent.on(el, {
			click: FMap.DomEvent._fakeStop,
			dblclick: stop
		});
	},

	preventDefault: function (e) {

		if (e.preventDefault) {
			e.preventDefault();
		} else {
			e.returnValue = false;
		}
		return this;
	},

	stop: function (e) {
		return FMap.DomEvent
			.preventDefault(e)
			.stopPropagation(e);
	},

	getMousePosition: function (e, container) {
		if (!container) {
			return new FMap.Point(e.clientX, e.clientY);
		}

		var rect = container.getBoundingClientRect();

		return new FMap.Point(
			e.clientX - rect.left - container.clientLeft,
			e.clientY - rect.top - container.clientTop);
	},

	getWheelDelta: function (e) {

		var delta = 0;

		if (e.wheelDelta) {
			delta = e.wheelDelta / 120;
		}
		if (e.detail) {
			delta = -e.detail / 3;
		}
		return delta;
	},

	_skipEvents: {},

	_fakeStop: function (e) {
		// fakes stopPropagation by setting a special event flag, checked/reset with FMap.DomEvent._skipped(e)
		FMap.DomEvent._skipEvents[e.type] = true;
	},

	_skipped: function (e) {
		var skipped = this._skipEvents[e.type];
		// reset when checking, as it's only used in map container and propagates outside of the map
		this._skipEvents[e.type] = false;
		return skipped;
	},

	// check if element really left/entered the event target (for mouseenter/mouseleave)
	_checkMouse: function (el, e) {

		var related = e.relatedTarget;

		if (!related) { return true; }

		try {
			while (related && (related !== el)) {
				related = related.parentNode;
			}
		} catch (err) {
			return false;
		}
		return (related !== el);
	},

	// this is a horrible workaround for a bug in Android where a single touch triggers two click events
	_filterClick: function (e, handler) {
		var timeStamp = (e.timeStamp || e.originalEvent.timeStamp),
			elapsed = FMap.DomEvent._lastClick && (timeStamp - FMap.DomEvent._lastClick);

		// are they closer together than 500ms yet more than 100ms?
		// Android typically triggers them ~300ms apart while multiple listeners
		// on the same event should be triggered far faster;
		// or check if click is simulated on the element, and if it is, reject any non-simulated events

		if ((elapsed && elapsed > 100 && elapsed < 500) || (e.target._simulatedClick && !e._simulated)) {
			FMap.DomEvent.stop(e);
			return;
		}
		FMap.DomEvent._lastClick = timeStamp;

		handler(e);
	}
};

FMap.DomEvent.addListener = FMap.DomEvent.on;
FMap.DomEvent.removeListener = FMap.DomEvent.off;



/*
 * FMap.Draggable allows you to add dragging capabilities to any element. Supports mobile devices too.
 */

FMap.Draggable = FMap.Evented.extend({

	statics: {
		START: FMap.Browser.touch ? ['touchstart', 'mousedown'] : ['mousedown'],
		END: {
			mousedown: 'mouseup',
			touchstart: 'touchend',
			pointerdown: 'touchend',
			MSPointerDown: 'touchend'
		},
		MOVE: {
			mousedown: 'mousemove',
			touchstart: 'touchmove',
			pointerdown: 'touchmove',
			MSPointerDown: 'touchmove'
		}
	},

	initialize: function (element, dragStartTarget, preventOutline) {
		this._element = element;
		this._dragStartTarget = dragStartTarget || element;
		this._preventOutline = preventOutline;
	},

	enable: function () {
		if (this._enabled) { return; }

		FMap.DomEvent.on(this._dragStartTarget, FMap.Draggable.START.join(' '), this._onDown, this);

		this._enabled = true;
	},

	disable: function () {
		if (!this._enabled) { return; }

		FMap.DomEvent.off(this._dragStartTarget, FMap.Draggable.START.join(' '), this._onDown, this);

		this._enabled = false;
		this._moved = false;
	},

	_onDown: function (e) {
		this._moved = false;

		if (e.shiftKey || ((e.which !== 1) && (e.button !== 1) && !e.touches)) { return; }

		FMap.DomEvent.stopPropagation(e);

		if (this._preventOutline) {
			FMap.DomUtil.preventOutline(this._element);
		}

		if (FMap.DomUtil.hasClass(this._element, 'fmap-zoom-anim')) { return; }

		FMap.DomUtil.disableImageDrag();
		FMap.DomUtil.disableTextSelection();

		if (this._moving) { return; }

		this.fire('down');

		var first = e.touches ? e.touches[0] : e;

		this._startPoint = new FMap.Point(first.clientX, first.clientY);
		this._startPos = this._newPos = FMap.DomUtil.getPosition(this._element);

		FMap.DomEvent
		    .on(document, FMap.Draggable.MOVE[e.type], this._onMove, this)
		    .on(document, FMap.Draggable.END[e.type], this._onUp, this);
	},

	_onMove: function (e) {
		if (e.touches && e.touches.length > 1) {
			this._moved = true;
			return;
		}

		var first = (e.touches && e.touches.length === 1 ? e.touches[0] : e),
		    newPoint = new FMap.Point(first.clientX, first.clientY),
		    offset = newPoint.subtract(this._startPoint);

		if (!offset.x && !offset.y) { return; }
		if (FMap.Browser.touch && Math.abs(offset.x) + Math.abs(offset.y) < 3) { return; }

		FMap.DomEvent.preventDefault(e);

		if (!this._moved) {
			this.fire('dragstart');

			this._moved = true;
			this._startPos = FMap.DomUtil.getPosition(this._element).subtract(offset);

			FMap.DomUtil.addClass(document.body, 'fmap-dragging');

			this._lastTarget = e.target || e.srcElement;
			FMap.DomUtil.addClass(this._lastTarget, 'fmap-drag-target');
		}

		this._newPos = this._startPos.add(offset);
		this._moving = true;

		FMap.Util.cancelAnimFrame(this._animRequest);
		this._lastEvent = e;
		this._animRequest = FMap.Util.requestAnimFrame(this._updatePosition, this, true, this._dragStartTarget);
	},

	_updatePosition: function () {
		var e = {originalEvent: this._lastEvent};
		this.fire('predrag', e);
		FMap.DomUtil.setPosition(this._element, this._newPos);
		this.fire('drag', e);
	},

	_onUp: function () {
		FMap.DomUtil.removeClass(document.body, 'fmap-dragging');

		if (this._lastTarget) {
			FMap.DomUtil.removeClass(this._lastTarget, 'fmap-drag-target');
			this._lastTarget = null;
		}

		for (var i in FMap.Draggable.MOVE) {
			FMap.DomEvent
			    .off(document, FMap.Draggable.MOVE[i], this._onMove, this)
			    .off(document, FMap.Draggable.END[i], this._onUp, this);
		}

		FMap.DomUtil.enableImageDrag();
		FMap.DomUtil.enableTextSelection();

		if (this._moved && this._moving) {
			// ensure drag is not fired after dragend
			FMap.Util.cancelAnimFrame(this._animRequest);

			this.fire('dragend', {
				distance: this._newPos.distanceTo(this._startPos)
			});
		}

		this._moving = false;
	}
});



/*
	FMap.Handler is a base class for handler classes that are used internally to inject
	interaction features like dragging to classes like Map and Marker.
*/

FMap.Handler = FMap.Class.extend({
	initialize: function (map) {
		this._map = map;
	},

	enable: function () {
		if (this._enabled) { return; }

		this._enabled = true;
		this.addHooks();
	},

	disable: function () {
		if (!this._enabled) { return; }

		this._enabled = false;
		this.removeHooks();
	},

	enabled: function () {
		return !!this._enabled;
	}
});



/*
 * FMap.Handler.MapDrag is used to make the map draggable (with panning inertia), enabled by default.
 */

FMap.Map.mergeOptions({
	dragging: true,

	inertia: !FMap.Browser.android23,
	inertiaDeceleration: 3400, // px/s^2
	inertiaMaxSpeed: Infinity, // px/s
	easeLinearity: 0.2,

	// TODO refactor, move to CRS
	worldCopyJump: false
});

FMap.Map.Drag = FMap.Handler.extend({
	addHooks: function () {
		if (!this._draggable) {
			var map = this._map;

			this._draggable = new FMap.Draggable(map._mapPane, map._container);

			this._draggable.on({
				down: this._onDown,
				dragstart: this._onDragStart,
				drag: this._onDrag,
				dragend: this._onDragEnd
			}, this);

			if (map.options.worldCopyJump) {
				this._draggable.on('predrag', this._onPreDrag, this);
				map.on('viewreset', this._onViewReset, this);

				map.whenReady(this._onViewReset, this);
			}
		}
		FMap.DomUtil.addClass(this._map._container, 'fmap-grab');
		this._draggable.enable();
	},

	removeHooks: function () {
		FMap.DomUtil.removeClass(this._map._container, 'fmap-grab');
		this._draggable.disable();
	},

	moved: function () {
		return this._draggable && this._draggable._moved;
	},

	_onDown: function () {
		this._map.stop();
	},

	_onDragStart: function () {
		var map = this._map;

		map
		    .fire('movestart')
		    .fire('dragstart');

		if (map.options.inertia) {
			this._positions = [];
			this._times = [];
		}
	},

	_onDrag: function (e) {
		if (this._map.options.inertia) {
			var time = this._lastTime = +new Date(),
			    pos = this._lastPos = this._draggable._absPos || this._draggable._newPos;

			this._positions.push(pos);
			this._times.push(time);

			if (time - this._times[0] > 50) {
				this._positions.shift();
				this._times.shift();
			}
		}

		this._map
		    .fire('move', e)
		    .fire('drag', e);
	},

	_onViewReset: function () {
		var pxCenter = this._map.getSize().divideBy(2),
		    pxWorldCenter = this._map.latLngToLayerPoint([0, 0]);

		this._initialWorldOffset = pxWorldCenter.subtract(pxCenter).x;
		this._worldWidth = this._map.getPixelWorldBounds().getSize().x;
	},

	_onPreDrag: function () {
		// TODO refactor to be able to adjust map pane position after zoom
		var worldWidth = this._worldWidth,
		    halfWidth = Math.round(worldWidth / 2),
		    dx = this._initialWorldOffset,
		    x = this._draggable._newPos.x,
		    newX1 = (x - halfWidth + dx) % worldWidth + halfWidth - dx,
		    newX2 = (x + halfWidth + dx) % worldWidth - halfWidth - dx,
		    newX = Math.abs(newX1 + dx) < Math.abs(newX2 + dx) ? newX1 : newX2;

		this._draggable._absPos = this._draggable._newPos.clone();
		this._draggable._newPos.x = newX;
	},

	_onDragEnd: function (e) {
		var map = this._map,
		    options = map.options,

		    noInertia = !options.inertia || this._times.length < 2;

		map.fire('dragend', e);

		if (noInertia) {
			map.fire('moveend');

		} else {

			var direction = this._lastPos.subtract(this._positions[0]),
			    duration = (this._lastTime - this._times[0]) / 1000,
			    ease = options.easeLinearity,

			    speedVector = direction.multiplyBy(ease / duration),
			    speed = speedVector.distanceTo([0, 0]),

			    limitedSpeed = Math.min(options.inertiaMaxSpeed, speed),
			    limitedSpeedVector = speedVector.multiplyBy(limitedSpeed / speed),

			    decelerationDuration = limitedSpeed / (options.inertiaDeceleration * ease),
			    offset = limitedSpeedVector.multiplyBy(-decelerationDuration / 2).round();

			if (!offset.x || !offset.y) {
				map.fire('moveend');

			} else {
				offset = map._limitOffset(offset, map.options.maxBounds);

				FMap.Util.requestAnimFrame(function () {
					map.panBy(offset, {
						duration: decelerationDuration,
						easeLinearity: ease,
						noMoveStart: true,
						animate: true
					});
				});
			}
		}
	}
});

FMap.Map.addInitHook('addHandler', 'dragging', FMap.Map.Drag);



/*
 * FMap.Handler.DoubleClickZoom is used to handle double-click zoom on the map, enabled by default.
 */

FMap.Map.mergeOptions({
	doubleClickZoom: true
});

FMap.Map.DoubleClickZoom = FMap.Handler.extend({
	addHooks: function () {
		this._map.on('dblclick', this._onDoubleClick, this);
	},

	removeHooks: function () {
		this._map.off('dblclick', this._onDoubleClick, this);
	},

	_onDoubleClick: function (e) {
		var map = this._map,
		    oldZoom = map.getZoom(),
		    zoom = e.originalEvent.shiftKey ? Math.ceil(oldZoom) - 1 : Math.floor(oldZoom) + 1;

		if (map.options.doubleClickZoom === 'center') {
			map.setZoom(zoom);
		} else {
			map.setZoomAround(e.containerPoint, zoom);
		}
	}
});

FMap.Map.addInitHook('addHandler', 'doubleClickZoom', FMap.Map.DoubleClickZoom);



/*
 * FMap.Handler.ScrollWheelZoom is used by FMap.Map to enable mouse scroll wheel zoom on the map.
 */

FMap.Map.mergeOptions({
	scrollWheelZoom: true,
	wheelDebounceTime: 40
});

FMap.Map.ScrollWheelZoom = FMap.Handler.extend({
	addHooks: function () {
		FMap.DomEvent.on(this._map._container, {
			mousewheel: this._onWheelScroll,
			MozMousePixelScroll: FMap.DomEvent.preventDefault
		}, this);

		this._delta = 0;
	},

	removeHooks: function () {
		FMap.DomEvent.off(this._map._container, {
			mousewheel: this._onWheelScroll,
			MozMousePixelScroll: FMap.DomEvent.preventDefault
		}, this);
	},

	_onWheelScroll: function (e) {
		var delta = FMap.DomEvent.getWheelDelta(e);
		var debounce = this._map.options.wheelDebounceTime;

		this._delta += delta;
		this._lastMousePos = this._map.mouseEventToContainerPoint(e);

		if (!this._startTime) {
			this._startTime = +new Date();
		}

		var left = Math.max(debounce - (+new Date() - this._startTime), 0);

		clearTimeout(this._timer);
		this._timer = setTimeout(FMap.bind(this._performZoom, this), left);

		FMap.DomEvent.stop(e);
	},

	_performZoom: function () {
		var map = this._map,
		    delta = this._delta,
		    zoom = map.getZoom();

		map.stop(); // stop panning and fly animations if any

		delta = delta > 0 ? Math.ceil(delta) : Math.floor(delta);
		delta = Math.max(Math.min(delta, 4), -4);
		delta = map._limitZoom(zoom + delta) - zoom;

		this._delta = 0;
		this._startTime = null;

		if (!delta) { return; }

		if (map.options.scrollWheelZoom === 'center') {
			map.setZoom(zoom + delta);
		} else {
			map.setZoomAround(this._lastMousePos, zoom + delta);
		}
	}
});

FMap.Map.addInitHook('addHandler', 'scrollWheelZoom', FMap.Map.ScrollWheelZoom);



/*
 * Extends the event handling code with double tap support for mobile browsers.
 */

FMap.extend(FMap.DomEvent, {

	_touchstart: FMap.Browser.msPointer ? 'MSPointerDown' : FMap.Browser.pointer ? 'pointerdown' : 'touchstart',
	_touchend: FMap.Browser.msPointer ? 'MSPointerUp' : FMap.Browser.pointer ? 'pointerup' : 'touchend',

	// inspired by Zepto touch code by Thomas Fuchs
	addDoubleTapListener: function (obj, handler, id) {
		var last, touch,
		    doubleTap = false,
		    delay = 250;

		function onTouchStart(e) {
			var count;

			if (FMap.Browser.pointer) {
				count = FMap.DomEvent._pointersCount;
			} else {
				count = e.touches.length;
			}

			if (count > 1) { return; }

			var now = Date.now(),
			    delta = now - (last || now);

			touch = e.touches ? e.touches[0] : e;
			doubleTap = (delta > 0 && delta <= delay);
			last = now;
		}

		function onTouchEnd() {
			if (doubleTap) {
				if (FMap.Browser.pointer) {
					// work around .type being readonly with MSPointer* events
					var newTouch = {},
						prop, i;

					for (i in touch) {
						prop = touch[i];
						newTouch[i] = prop && prop.bind ? prop.bind(touch) : prop;
					}
					touch = newTouch;
				}
				touch.type = 'dblclick';
				handler(touch);
				last = null;
			}
		}

		var pre = '_fmap_',
		    touchstart = this._touchstart,
		    touchend = this._touchend;

		obj[pre + touchstart + id] = onTouchStart;
		obj[pre + touchend + id] = onTouchEnd;

		obj.addEventListener(touchstart, onTouchStart, false);
		obj.addEventListener(touchend, onTouchEnd, false);
		return this;
	},

	removeDoubleTapListener: function (obj, id) {
		var pre = '_fmap_',
		    touchend = obj[pre + this._touchend + id];

		obj.removeEventListener(this._touchstart, obj[pre + this._touchstart + id], false);
		obj.removeEventListener(this._touchend, touchend, false);

		return this;
	}
});



/*
 * Extends FMap.DomEvent to provide touch support for Internet Explorer and Windows-based devices.
 */

FMap.extend(FMap.DomEvent, {

	POINTER_DOWN:   FMap.Browser.msPointer ? 'MSPointerDown'   : 'pointerdown',
	POINTER_MOVE:   FMap.Browser.msPointer ? 'MSPointerMove'   : 'pointermove',
	POINTER_UP:     FMap.Browser.msPointer ? 'MSPointerUp'     : 'pointerup',
	POINTER_CANCEL: FMap.Browser.msPointer ? 'MSPointerCancel' : 'pointercancel',

	_pointers: {},
	_pointersCount: 0,

	// Provides a touch events wrapper for (ms)pointer events.
	// ref http://www.w3.org/TR/pointerevents/ https://www.w3.org/Bugs/Public/show_bug.cgi?id=22890

	addPointerListener: function (obj, type, handler, id) {

		if (type === 'touchstart') {
			this._addPointerStart(obj, handler, id);

		} else if (type === 'touchmove') {
			this._addPointerMove(obj, handler, id);

		} else if (type === 'touchend') {
			this._addPointerEnd(obj, handler, id);
		}

		return this;
	},

	removePointerListener: function (obj, type, id) {
		var handler = obj['_fmap_' + type + id];

		if (type === 'touchstart') {
			obj.removeEventListener(this.POINTER_DOWN, handler, false);

		} else if (type === 'touchmove') {
			obj.removeEventListener(this.POINTER_MOVE, handler, false);

		} else if (type === 'touchend') {
			obj.removeEventListener(this.POINTER_UP, handler, false);
			obj.removeEventListener(this.POINTER_CANCEL, handler, false);
		}

		return this;
	},

	_addPointerStart: function (obj, handler, id) {
		var onDown = FMap.bind(function (e) {
			FMap.DomEvent.preventDefault(e);

			this._handlePointer(e, handler);
		}, this);

		obj['_fmap_touchstart' + id] = onDown;
		obj.addEventListener(this.POINTER_DOWN, onDown, false);

		// need to keep track of what pointers and how many are active to provide e.touches emulation
		if (!this._pointerDocListener) {
			var pointerUp = FMap.bind(this._globalPointerUp, this);

			// we listen documentElement as any drags that end by moving the touch off the screen get fired there
			document.documentElement.addEventListener(this.POINTER_DOWN, FMap.bind(this._globalPointerDown, this), true);
			document.documentElement.addEventListener(this.POINTER_MOVE, FMap.bind(this._globalPointerMove, this), true);
			document.documentElement.addEventListener(this.POINTER_UP, pointerUp, true);
			document.documentElement.addEventListener(this.POINTER_CANCEL, pointerUp, true);

			this._pointerDocListener = true;
		}
	},

	_globalPointerDown: function (e) {
		this._pointers[e.pointerId] = e;
		this._pointersCount++;
	},

	_globalPointerMove: function (e) {
		if (this._pointers[e.pointerId]) {
			this._pointers[e.pointerId] = e;
		}
	},

	_globalPointerUp: function (e) {
		delete this._pointers[e.pointerId];
		this._pointersCount--;
	},

	_handlePointer: function (e, handler) {
		e.touches = [];
		for (var i in this._pointers) {
			e.touches.push(this._pointers[i]);
		}
		e.changedTouches = [e];

		handler(e);
	},

	_addPointerMove: function (obj, handler, id) {
		var onMove = FMap.bind(function (e) {
			// don't fire touch moves when mouse isn't down
			if ((e.pointerType === e.MSPOINTER_TYPE_MOUSE || e.pointerType === 'mouse') && e.buttons === 0) { return; }

			this._handlePointer(e, handler);
		}, this);

		obj['_fmap_touchmove' + id] = onMove;
		obj.addEventListener(this.POINTER_MOVE, onMove, false);
	},

	_addPointerEnd: function (obj, handler, id) {
		var onUp = FMap.bind(function (e) {
			this._handlePointer(e, handler);
		}, this);

		obj['_fmap_touchend' + id] = onUp;
		obj.addEventListener(this.POINTER_UP, onUp, false);
		obj.addEventListener(this.POINTER_CANCEL, onUp, false);
	}
});



/*
 * FMap.Handler.TouchZoom is used by FMap.Map to add pinch zoom on supported mobile browsers.
 */

FMap.Map.mergeOptions({
	touchZoom: FMap.Browser.touch && !FMap.Browser.android23,
	bounceAtZoomLimits: true
});

FMap.Map.TouchZoom = FMap.Handler.extend({
	addHooks: function () {
		FMap.DomEvent.on(this._map._container, 'touchstart', this._onTouchStart, this);
	},

	removeHooks: function () {
		FMap.DomEvent.off(this._map._container, 'touchstart', this._onTouchStart, this);
	},

	_onTouchStart: function (e) {
		var map = this._map;

		if (!e.touches || e.touches.length !== 2 || map._animatingZoom || this._zooming) { return; }

		var p1 = map.mouseEventToLayerPoint(e.touches[0]),
		    p2 = map.mouseEventToLayerPoint(e.touches[1]),
		    viewCenter = map._getCenterLayerPoint();

		this._startCenter = p1.add(p2)._divideBy(2);
		this._startDist = p1.distanceTo(p2);

		this._moved = false;
		this._zooming = true;

		this._centerOffset = viewCenter.subtract(this._startCenter);

		map.stop();

		FMap.DomEvent
		    .on(document, 'touchmove', this._onTouchMove, this)
		    .on(document, 'touchend', this._onTouchEnd, this);

		FMap.DomEvent.preventDefault(e);
	},

	_onTouchMove: function (e) {
		if (!e.touches || e.touches.length !== 2 || !this._zooming) { return; }

		var map = this._map,
		    p1 = map.mouseEventToLayerPoint(e.touches[0]),
		    p2 = map.mouseEventToLayerPoint(e.touches[1]);

		this._scale = p1.distanceTo(p2) / this._startDist;
		this._delta = p1._add(p2)._divideBy(2)._subtract(this._startCenter);

		if (!map.options.bounceAtZoomLimits) {
			var currentZoom = map.getScaleZoom(this._scale);
			if ((currentZoom <= map.getMinZoom() && this._scale < 1) ||
		     (currentZoom >= map.getMaxZoom() && this._scale > 1)) { return; }
		}

		if (!this._moved) {
			map
			    .fire('movestart')
			    .fire('zoomstart');

			this._moved = true;
		}

		FMap.Util.cancelAnimFrame(this._animRequest);
		this._animRequest = FMap.Util.requestAnimFrame(this._updateOnMove, this, true, this._map._container);

		FMap.DomEvent.preventDefault(e);
	},

	_updateOnMove: function () {
		var map = this._map;

		if (map.options.touchZoom === 'center') {
			this._center = map.getCenter();
		} else {
			this._center = map.layerPointToLatLng(this._getTargetCenter());
		}

		this._zoom = map.getScaleZoom(this._scale);

		if (this._scale !== 1 || this._delta.x !== 0 || this._delta.y !== 0) {
			map._animateZoom(this._center, this._zoom, false, true);
		}
	},

	_onTouchEnd: function () {
		if (!this._moved || !this._zooming) {
			this._zooming = false;
			return;
		}

		this._zooming = false;
		FMap.Util.cancelAnimFrame(this._animRequest);

		FMap.DomEvent
		    .off(document, 'touchmove', this._onTouchMove)
		    .off(document, 'touchend', this._onTouchEnd);

		var map = this._map,
		    oldZoom = map.getZoom(),
		    zoomDelta = this._zoom - oldZoom,
		    finalZoom = map._limitZoom(zoomDelta > 0 ? Math.ceil(this._zoom) : Math.floor(this._zoom));

		map._animateZoom(this._center, finalZoom, true, true);
	},

	_getTargetCenter: function () {
		var centerOffset = this._centerOffset.subtract(this._delta).divideBy(this._scale);
		return this._startCenter.add(centerOffset);
	}
});

FMap.Map.addInitHook('addHandler', 'touchZoom', FMap.Map.TouchZoom);



/*
 * FMap.Map.Tap is used to enable mobile hacks like quick taps and long hold.
 */

FMap.Map.mergeOptions({
	tap: true,
	tapTolerance: 15
});

FMap.Map.Tap = FMap.Handler.extend({
	addHooks: function () {
		FMap.DomEvent.on(this._map._container, 'touchstart', this._onDown, this);
	},

	removeHooks: function () {
		FMap.DomEvent.off(this._map._container, 'touchstart', this._onDown, this);
	},

	_onDown: function (e) {
		if (!e.touches) { return; }

		FMap.DomEvent.preventDefault(e);

		this._fireClick = true;

		// don't simulate click or track longpress if more than 1 touch
		if (e.touches.length > 1) {
			this._fireClick = false;
			clearTimeout(this._holdTimeout);
			return;
		}

		var first = e.touches[0],
		    el = first.target;

		this._startPos = this._newPos = new FMap.Point(first.clientX, first.clientY);

		// if touching a link, highlight it
		if (el.tagName && el.tagName.toLowerCase() === 'a') {
			FMap.DomUtil.addClass(el, 'fmap-active');
		}

		// simulate long hold but setting a timeout
		this._holdTimeout = setTimeout(FMap.bind(function () {
			if (this._isTapValid()) {
				this._fireClick = false;
				this._onUp();
				this._simulateEvent('contextmenu', first);
			}
		}, this), 1000);

		this._simulateEvent('mousedown', first);

		FMap.DomEvent.on(document, {
			touchmove: this._onMove,
			touchend: this._onUp
		}, this);
	},

	_onUp: function (e) {
		clearTimeout(this._holdTimeout);

		FMap.DomEvent.off(document, {
			touchmove: this._onMove,
			touchend: this._onUp
		}, this);

		if (this._fireClick && e && e.changedTouches) {

			var first = e.changedTouches[0],
			    el = first.target;

			if (el && el.tagName && el.tagName.toLowerCase() === 'a') {
				FMap.DomUtil.removeClass(el, 'fmap-active');
			}

			this._simulateEvent('mouseup', first);

			// simulate click if the touch didn't move too much
			if (this._isTapValid()) {
				this._simulateEvent('click', first);
			}
		}
	},

	_isTapValid: function () {
		return this._newPos.distanceTo(this._startPos) <= this._map.options.tapTolerance;
	},

	_onMove: function (e) {
		var first = e.touches[0];
		this._newPos = new FMap.Point(first.clientX, first.clientY);
	},

	_simulateEvent: function (type, e) {
		var simulatedEvent = document.createEvent('MouseEvents');

		simulatedEvent._simulated = true;
		e.target._simulatedClick = true;

		simulatedEvent.initMouseEvent(
		        type, true, true, window, 1,
		        e.screenX, e.screenY,
		        e.clientX, e.clientY,
		        false, false, false, false, 0, null);

		e.target.dispatchEvent(simulatedEvent);
	}
});

if (FMap.Browser.touch && !FMap.Browser.pointer) {
	FMap.Map.addInitHook('addHandler', 'tap', FMap.Map.Tap);
}



/*
 * FMap.Handler.ShiftDragZoom is used to add shift-drag zoom interaction to the map
  * (zoom to a selected bounding box), enabled by default.
 */

FMap.Map.mergeOptions({
	boxZoom: true
});

FMap.Map.BoxZoom = FMap.Handler.extend({
	initialize: function (map) {
		this._map = map;
		this._container = map._container;
		this._pane = map._panes.overlayPane;
	},

	addHooks: function () {
		FMap.DomEvent.on(this._container, 'mousedown', this._onMouseDown, this);
	},

	removeHooks: function () {
		FMap.DomEvent.off(this._container, 'mousedown', this._onMouseDown, this);
	},

	moved: function () {
		return this._moved;
	},

	_onMouseDown: function (e) {
		if (!e.shiftKey || ((e.which !== 1) && (e.button !== 1))) { return false; }

		this._moved = false;

		FMap.DomUtil.disableTextSelection();
		FMap.DomUtil.disableImageDrag();

		this._startPoint = this._map.mouseEventToContainerPoint(e);

		FMap.DomEvent.on(document, {
			contextmenu: FMap.DomEvent.stop,
			mousemove: this._onMouseMove,
			mouseup: this._onMouseUp,
			keydown: this._onKeyDown
		}, this);
	},

	_onMouseMove: function (e) {
		if (!this._moved) {
			this._moved = true;

			this._box = FMap.DomUtil.create('div', 'fmap-zoom-box', this._container);
			FMap.DomUtil.addClass(this._container, 'fmap-crosshair');

			this._map.fire('boxzoomstart');
		}

		this._point = this._map.mouseEventToContainerPoint(e);

		var bounds = new FMap.Bounds(this._point, this._startPoint),
		    size = bounds.getSize();

		FMap.DomUtil.setPosition(this._box, bounds.min);

		this._box.style.width  = size.x + 'px';
		this._box.style.height = size.y + 'px';
	},

	_finish: function () {
		if (this._moved) {
			FMap.DomUtil.remove(this._box);
			FMap.DomUtil.removeClass(this._container, 'fmap-crosshair');
		}

		FMap.DomUtil.enableTextSelection();
		FMap.DomUtil.enableImageDrag();

		FMap.DomEvent.off(document, {
			contextmenu: FMap.DomEvent.stop,
			mousemove: this._onMouseMove,
			mouseup: this._onMouseUp,
			keydown: this._onKeyDown
		}, this);
	},

	_onMouseUp: function (e) {
		if ((e.which !== 1) && (e.button !== 1)) { return; }

		this._finish();

		if (!this._moved) { return; }

		var bounds = new FMap.LatLngBounds(
		        this._map.containerPointToLatLng(this._startPoint),
		        this._map.containerPointToLatLng(this._point));

		this._map
			.fitBounds(bounds)
			.fire('boxzoomend', {boxZoomBounds: bounds});
	},

	_onKeyDown: function (e) {
		if (e.keyCode === 27) {
			this._finish();
		}
	}
});

FMap.Map.addInitHook('addHandler', 'boxZoom', FMap.Map.BoxZoom);



/*
 * FMap.Map.Keyboard is handling keyboard interaction with the map, enabled by default.
 */

FMap.Map.mergeOptions({
	keyboard: true,
	keyboardPanOffset: 80,
	keyboardZoomOffset: 1
});

FMap.Map.Keyboard = FMap.Handler.extend({

	keyCodes: {
		left:    [37],
		right:   [39],
		down:    [40],
		up:      [38],
		zoomIn:  [187, 107, 61, 171],
		zoomOut: [189, 109, 54, 173]
	},

	initialize: function (map) {
		this._map = map;

		this._setPanOffset(map.options.keyboardPanOffset);
		this._setZoomOffset(map.options.keyboardZoomOffset);
	},

	addHooks: function () {
		var container = this._map._container;

		// make the container focusable by tabbing
		if (container.tabIndex === -1) {
			container.tabIndex = '0';
		}

		FMap.DomEvent.on(container, {
			focus: this._onFocus,
			blur: this._onBlur,
			mousedown: this._onMouseDown
		}, this);

		this._map.on({
			focus: this._addHooks,
			blur: this._removeHooks
		}, this);
	},

	removeHooks: function () {
		this._removeHooks();

		FMap.DomEvent.off(this._map._container, {
			focus: this._onFocus,
			blur: this._onBlur,
			mousedown: this._onMouseDown
		}, this);

		this._map.off({
			focus: this._addHooks,
			blur: this._removeHooks
		}, this);
	},

	_onMouseDown: function () {
		if (this._focused) { return; }

		var body = document.body,
		    docEl = document.documentElement,
		    top = body.scrollTop || docEl.scrollTop,
		    left = body.scrollLeft || docEl.scrollLeft;

		this._map._container.focus();

		window.scrollTo(left, top);
	},

	_onFocus: function () {
		this._focused = true;
		this._map.fire('focus');
	},

	_onBlur: function () {
		this._focused = false;
		this._map.fire('blur');
	},

	_setPanOffset: function (pan) {
		var keys = this._panKeys = {},
		    codes = this.keyCodes,
		    i, len;

		for (i = 0, len = codes.left.length; i < len; i++) {
			keys[codes.left[i]] = [-1 * pan, 0];
		}
		for (i = 0, len = codes.right.length; i < len; i++) {
			keys[codes.right[i]] = [pan, 0];
		}
		for (i = 0, len = codes.down.length; i < len; i++) {
			keys[codes.down[i]] = [0, pan];
		}
		for (i = 0, len = codes.up.length; i < len; i++) {
			keys[codes.up[i]] = [0, -1 * pan];
		}
	},

	_setZoomOffset: function (zoom) {
		var keys = this._zoomKeys = {},
		    codes = this.keyCodes,
		    i, len;

		for (i = 0, len = codes.zoomIn.length; i < len; i++) {
			keys[codes.zoomIn[i]] = zoom;
		}
		for (i = 0, len = codes.zoomOut.length; i < len; i++) {
			keys[codes.zoomOut[i]] = -zoom;
		}
	},

	_addHooks: function () {
		FMap.DomEvent.on(document, 'keydown', this._onKeyDown, this);
	},

	_removeHooks: function () {
		FMap.DomEvent.off(document, 'keydown', this._onKeyDown, this);
	},

	_onKeyDown: function (e) {
		if (e.altKey || e.ctrlKey || e.metaKey) { return; }

		var key = e.keyCode,
		    map = this._map;

		if (key in this._panKeys) {

			if (map._panAnim && map._panAnim._inProgress) { return; }

			map.panBy(this._panKeys[key]);

			if (map.options.maxBounds) {
				map.panInsideBounds(map.options.maxBounds);
			}

		} else if (key in this._zoomKeys) {
			map.setZoom(map.getZoom() + (e.shiftKey ? 3 : 1) * this._zoomKeys[key]);

		} else if (key === 27) {
			map.closePopup();

		} else {
			return;
		}

		FMap.DomEvent.stop(e);
	}
});

FMap.Map.addInitHook('addHandler', 'keyboard', FMap.Map.Keyboard);



/*
 * FMap.Handler.MarkerDrag is used internally by FMap.Marker to make the markers draggable.
 */

FMap.Handler.MarkerDrag = FMap.Handler.extend({
	initialize: function (marker) {
		this._marker = marker;
	},

	addHooks: function () {
		var icon = this._marker._icon;

		if (!this._draggable) {
			this._draggable = new FMap.Draggable(icon, icon, true);
		}

		this._draggable.on({
			dragstart: this._onDragStart,
			drag: this._onDrag,
			dragend: this._onDragEnd
		}, this).enable();

		FMap.DomUtil.addClass(icon, 'fmap-marker-draggable');
	},

	removeHooks: function () {
		this._draggable.off({
			dragstart: this._onDragStart,
			drag: this._onDrag,
			dragend: this._onDragEnd
		}, this).disable();

		if (this._marker._icon) {
			FMap.DomUtil.removeClass(this._marker._icon, 'fmap-marker-draggable');
		}
	},

	moved: function () {
		return this._draggable && this._draggable._moved;
	},

	_onDragStart: function () {
		this._marker
		    .closePopup()
		    .fire('movestart')
		    .fire('dragstart');
	},

	_onDrag: function (e) {
		var marker = this._marker,
		    shadow = marker._shadow,
		    iconPos = FMap.DomUtil.getPosition(marker._icon),
		    latlng = marker._map.layerPointToLatLng(iconPos);

		// update shadow position
		if (shadow) {
			FMap.DomUtil.setPosition(shadow, iconPos);
		}

		marker._latlng = latlng;
		e.latlng = latlng;

		marker
		    .fire('move', e)
		    .fire('drag', e);
	},

	_onDragEnd: function (e) {
		this._marker
		    .fire('moveend')
		    .fire('dragend', e);
	}
});



/*
 * FMap.Control is a base class for implementing map controls. Handles positioning.
 * All other controls extend from this class.
 */

FMap.Control = FMap.Class.extend({
	options: {
		position: 'topright'
	},

	initialize: function (options) {
		FMap.setOptions(this, options);
	},

	getPosition: function () {
		return this.options.position;
	},

	setPosition: function (position) {
		var map = this._map;

		if (map) {
			map.removeControl(this);
		}

		this.options.position = position;

		if (map) {
			map.addControl(this);
		}

		return this;
	},

	getContainer: function () {
		return this._container;
	},

	addTo: function (map) {
		this.remove();
		this._map = map;

		var container = this._container = this.onAdd(map),
		    pos = this.getPosition(),
		    corner = map._controlCorners[pos];

		FMap.DomUtil.addClass(container, 'fmap-control');

		if (pos.indexOf('bottom') !== -1) {
			corner.insertBefore(container, corner.firstChild);
		} else {
			corner.appendChild(container);
		}

		return this;
	},

	remove: function () {
		if (!this._map) {
			return this;
		}

		FMap.DomUtil.remove(this._container);

		if (this.onRemove) {
			this.onRemove(this._map);
		}

		this._map = null;

		return this;
	},

	_refocusOnMap: function (e) {
		// if map exists and event is not a keyboard event
		if (this._map && e && e.screenX > 0 && e.screenY > 0) {
			this._map.getContainer().focus();
		}
	}
});

FMap.control = function (options) {
	return new FMap.Control(options);
};


// adds control-related methods to FMap.Map

FMap.Map.include({
	addControl: function (control) {
		control.addTo(this);
		return this;
	},

	removeControl: function (control) {
		control.remove();
		return this;
	},

	_initControlPos: function () {
		var corners = this._controlCorners = {},
		    l = 'fmap-',
		    container = this._controlContainer =
		            FMap.DomUtil.create('div', l + 'control-container', this._container);

		function createCorner(vSide, hSide) {
			var className = l + vSide + ' ' + l + hSide;

			corners[vSide + hSide] = FMap.DomUtil.create('div', className, container);
		}

		createCorner('top', 'left');
		createCorner('top', 'right');
		createCorner('bottom', 'left');
		createCorner('bottom', 'right');
	},

	_clearControlPos: function () {
		FMap.DomUtil.remove(this._controlContainer);
	}
});



/*
 * FMap.Control.Zoom is used for the default zoom buttons on the map.
 */

FMap.Control.Zoom = FMap.Control.extend({
	options: {
		position: 'topleft',
		zoomInText: '+',
		zoomInTitle: 'Zoom in',
		zoomOutText: '-',
		zoomOutTitle: 'Zoom out'
	},

	onAdd: function (map) {
		var zoomName = 'fmap-control-zoom',
		    container = FMap.DomUtil.create('div', zoomName + ' fmap-bar'),
		    options = this.options;

		this._zoomInButton  = this._createButton(options.zoomInText, options.zoomInTitle,
		        zoomName + '-in',  container, this._zoomIn);
		this._zoomOutButton = this._createButton(options.zoomOutText, options.zoomOutTitle,
		        zoomName + '-out', container, this._zoomOut);

		this._updateDisabled();
		map.on('zoomend zoomlevelschange', this._updateDisabled, this);

		return container;
	},

	onRemove: function (map) {
		map.off('zoomend zoomlevelschange', this._updateDisabled, this);
	},

	disable: function () {
		this._disabled = true;
		this._updateDisabled();
		return this;
	},

	enable: function () {
		this._disabled = false;
		this._updateDisabled();
		return this;
	},

	_zoomIn: function (e) {
		if (!this._disabled) {
			this._map.zoomIn(e.shiftKey ? 3 : 1);
		}
	},

	_zoomOut: function (e) {
		if (!this._disabled) {
			this._map.zoomOut(e.shiftKey ? 3 : 1);
		}
	},

	_createButton: function (html, title, className, container, fn) {
		var link = FMap.DomUtil.create('a', className, container);
		link.innerHTML = html;
		link.href = '#';
		link.title = title;

		FMap.DomEvent
		    .on(link, 'mousedown dblclick', FMap.DomEvent.stopPropagation)
		    .on(link, 'click', FMap.DomEvent.stop)
		    .on(link, 'click', fn, this)
		    .on(link, 'click', this._refocusOnMap, this);

		return link;
	},

	_updateDisabled: function () {
		var map = this._map,
			className = 'fmap-disabled';

		FMap.DomUtil.removeClass(this._zoomInButton, className);
		FMap.DomUtil.removeClass(this._zoomOutButton, className);

		if (this._disabled || map._zoom === map.getMinZoom()) {
			FMap.DomUtil.addClass(this._zoomOutButton, className);
		}
		if (this._disabled || map._zoom === map.getMaxZoom()) {
			FMap.DomUtil.addClass(this._zoomInButton, className);
		}
	}
});

FMap.Map.mergeOptions({
	zoomControl: true
});

FMap.Map.addInitHook(function () {
	if (this.options.zoomControl) {
		this.zoomControl = new FMap.Control.Zoom();
		this.addControl(this.zoomControl);
	}
});

FMap.control.zoom = function (options) {
	return new FMap.Control.Zoom(options);
};



/*
 * FMap.Control.Attribution is used for displaying attribution on the map (added by default).
 */

FMap.Control.Attribution = FMap.Control.extend({
	options: {
		position: 'bottomright',
		//edit by lilong 20150609
		// prefix: '<a href="http://hdnav.cn" title="A JS library for interactive maps">Fmap</a>'
		prefix: ''
	},

	initialize: function (options) {
		FMap.setOptions(this, options);

		this._attributions = {};
	},

	onAdd: function (map) {
		this._container = FMap.DomUtil.create('div', 'fmap-control-attribution');
		if (FMap.DomEvent) {
			FMap.DomEvent.disableClickPropagation(this._container);
		}

		// TODO ugly, refactor
		for (var i in map._layers) {
			if (map._layers[i].getAttribution) {
				this.addAttribution(map._layers[i].getAttribution());
			}
		}

		this._update();

		return this._container;
	},

	setPrefix: function (prefix) {
		this.options.prefix = prefix;
		this._update();
		return this;
	},

	addAttribution: function (text) {
		if (!text) { return this; }

		if (!this._attributions[text]) {
			this._attributions[text] = 0;
		}
		this._attributions[text]++;

		this._update();

		return this;
	},

	removeAttribution: function (text) {
		if (!text) { return this; }

		if (this._attributions[text]) {
			this._attributions[text]--;
			this._update();
		}

		return this;
	},

	_update: function () {
		if (!this._map) { return; }

		var attribs = [];

		for (var i in this._attributions) {
			if (this._attributions[i]) {
				attribs.push(i);
			}
		}

		var prefixAndAttribs = [];

		if (this.options.prefix) {
			prefixAndAttribs.push(this.options.prefix);
		}
		if (attribs.length) {
			prefixAndAttribs.push(attribs.join(', '));
		}

		this._container.innerHTML = prefixAndAttribs.join(' | ');
	}
});

FMap.Map.mergeOptions({
	attributionControl: true
});

FMap.Map.addInitHook(function () {
	if (this.options.attributionControl) {
		this.attributionControl = (new FMap.Control.Attribution()).addTo(this);
	}
});

FMap.control.attribution = function (options) {
	return new FMap.Control.Attribution(options);
};



/*
 * FMap.Control.Scale is used for displaying metric/imperial scale on the map.
 */

FMap.Control.Scale = FMap.Control.extend({
	options: {
		position: 'bottomleft',
		maxWidth: 100,
		metric: true,
		imperial: true
		// updateWhenIdle: false
	},

	onAdd: function (map) {
		var className = 'fmap-control-scale',
		    container = FMap.DomUtil.create('div', className),
		    options = this.options;

		this._addScales(options, className + '-line', container);

		map.on(options.updateWhenIdle ? 'moveend' : 'move', this._update, this);
		map.whenReady(this._update, this);

		return container;
	},

	onRemove: function (map) {
		map.off(this.options.updateWhenIdle ? 'moveend' : 'move', this._update, this);
	},

	_addScales: function (options, className, container) {
		if (options.metric) {
			this._mScale = FMap.DomUtil.create('div', className, container);
		}
		if (options.imperial) {
			this._iScale = FMap.DomUtil.create('div', className, container);
		}
	},

	_update: function () {
		var map = this._map,
		    y = map.getSize().y / 2;

		var maxMeters = FMap.CRS.Earth.distance(
				map.containerPointToLatLng([0, y]),
				map.containerPointToLatLng([this.options.maxWidth, y]));

		this._updateScales(maxMeters);
	},

	_updateScales: function (maxMeters) {
		if (this.options.metric && maxMeters) {
			this._updateMetric(maxMeters);
		}
		if (this.options.imperial && maxMeters) {
			this._updateImperial(maxMeters);
		}
	},

	_updateMetric: function (maxMeters) {
		var meters = this._getRoundNum(maxMeters),
			//edit by lilong 20150609
		    //label = meters < 1000 ? meters + ' m' : (meters / 1000) + ' km';
			label = meters < 1000 ? meters + ' 米' : (meters / 1000) + ' 公里';
		this._updateScale(this._mScale, label, meters / maxMeters);
	},

	_updateImperial: function (maxMeters) {
		var maxFeet = maxMeters * 3.2808399,
		    maxMiles, miles, feet;

		if (maxFeet > 5280) {
			maxMiles = maxFeet / 5280;
			miles = this._getRoundNum(maxMiles);
			//edit by lilong 20150609
			//this._updateScale(this._iScale, miles + ' mi', miles / maxMiles);
			this._updateScale(this._iScale, miles + ' 英里', miles / maxMiles);

		} else {
			feet = this._getRoundNum(maxFeet);
			//edit by lilong 20150609
			//this._updateScale(this._iScale, feet + ' ft', feet / maxFeet);
			this._updateScale(this._iScale, feet + ' 英尺', feet / maxFeet);
		}
	},

	_updateScale: function (scale, text, ratio) {
		scale.style.width = Math.round(this.options.maxWidth * ratio) + 'px';
		scale.innerHTML = text;
	},

	_getRoundNum: function (num) {
		var pow10 = Math.pow(10, (Math.floor(num) + '').length - 1),
		    d = num / pow10;

		d = d >= 10 ? 10 :
		    d >= 5 ? 5 :
		    d >= 3 ? 3 :
		    d >= 2 ? 2 : 1;

		return pow10 * d;
	}
});

FMap.control.scale = function (options) {
	return new FMap.Control.Scale(options);
};



/*
 * FMap.Control.Layers is a control to allow users to switch between different layers on the map.
 */

FMap.Control.Layers = FMap.Control.extend({
	options: {
		collapsed: true,
		position: 'topright',
		autoZIndex: true,
		hideSingleBase: false
	},

	initialize: function (baseLayers, overlays, options) {
		FMap.setOptions(this, options);

		this._layers = {};
		this._lastZIndex = 0;
		this._handlingClick = false;

		for (var i in baseLayers) {
			this._addLayer(baseLayers[i], i);
		}

		for (i in overlays) {
			this._addLayer(overlays[i], i, true);
		}
	},

	onAdd: function () {
		this._initLayout();
		this._update();

		return this._container;
	},

	addBaseLayer: function (layer, name) {
		this._addLayer(layer, name);
		return this._update();
	},

	addOverlay: function (layer, name) {
		this._addLayer(layer, name, true);
		return this._update();
	},

	removeLayer: function (layer) {
		layer.off('add remove', this._onLayerChange, this);

		delete this._layers[FMap.stamp(layer)];
		return this._update();
	},

	_initLayout: function () {
		var className = 'fmap-control-layers',
		    container = this._container = FMap.DomUtil.create('div', className);

		// makes this work on IE touch devices by stopping it from firing a mouseout event when the touch is released
		container.setAttribute('aria-haspopup', true);

		if (!FMap.Browser.touch) {
			FMap.DomEvent
				.disableClickPropagation(container)
				.disableScrollPropagation(container);
		} else {
			FMap.DomEvent.on(container, 'click', FMap.DomEvent.stopPropagation);
		}

		var form = this._form = FMap.DomUtil.create('form', className + '-list');

		if (this.options.collapsed) {
			if (!FMap.Browser.android) {
				FMap.DomEvent.on(container, {
					mouseenter: this._expand,
					mouseleave: this._collapse
				}, this);
			}

			var link = this._layersLink = FMap.DomUtil.create('a', className + '-toggle', container);
			link.href = '#';
			link.title = 'Layers';

			if (FMap.Browser.touch) {
				FMap.DomEvent
				    .on(link, 'click', FMap.DomEvent.stop)
				    .on(link, 'click', this._expand, this);
			} else {
				FMap.DomEvent.on(link, 'focus', this._expand, this);
			}

			// work around for Firefox Android issue https://github.com/Fmap/Fmap/issues/2033
			FMap.DomEvent.on(form, 'click', function () {
				setTimeout(FMap.bind(this._onInputClick, this), 0);
			}, this);

			this._map.on('click', this._collapse, this);
			// TODO keyboard accessibility
		} else {
			this._expand();
		}

		this._baseLayersList = FMap.DomUtil.create('div', className + '-base', form);
		this._separator = FMap.DomUtil.create('div', className + '-separator', form);
		this._overlaysList = FMap.DomUtil.create('div', className + '-overlays', form);

		container.appendChild(form);
	},

	_addLayer: function (layer, name, overlay) {
		layer.on('add remove', this._onLayerChange, this);

		var id = FMap.stamp(layer);

		this._layers[id] = {
			layer: layer,
			name: name,
			overlay: overlay
		};

		if (this.options.autoZIndex && layer.setZIndex) {
			this._lastZIndex++;
			layer.setZIndex(this._lastZIndex);
		}
	},

	_update: function () {
		if (!this._container) { return this; }

		FMap.DomUtil.empty(this._baseLayersList);
		FMap.DomUtil.empty(this._overlaysList);

		var baseLayersPresent, overlaysPresent, i, obj, baseLayersCount = 0;

		for (i in this._layers) {
			obj = this._layers[i];
			this._addItem(obj);
			overlaysPresent = overlaysPresent || obj.overlay;
			baseLayersPresent = baseLayersPresent || !obj.overlay;
			baseLayersCount += !obj.overlay ? 1 : 0;
		}

		// Hide base layers section if there's only one layer.
		if (this.options.hideSingleBase) {
			baseLayersPresent = baseLayersPresent && baseLayersCount > 1;
			this._baseLayersList.style.display = baseLayersPresent ? '' : 'none';
		}

		this._separator.style.display = overlaysPresent && baseLayersPresent ? '' : 'none';

		return this;
	},

	_onLayerChange: function (e) {
		if (!this._handlingClick) {
			this._update();
		}

		var overlay = this._layers[FMap.stamp(e.target)].overlay;

		var type = overlay ?
			(e.type === 'add' ? 'overlayadd' : 'overlayremove') :
			(e.type === 'add' ? 'baselayerchange' : null);

		if (type) {
			this._map.fire(type, e.target);
		}
	},

	// IE7 bugs out if you create a radio dynamically, so you have to do it this hacky way (see http://bit.ly/PqYLBe)
	_createRadioElement: function (name, checked) {

		var radioHtml = '<input type="radio" class="fmap-control-layers-selector" name="' +
				name + '"' + (checked ? ' checked="checked"' : '') + '/>';

		var radioFragment = document.createElement('div');
		radioFragment.innerHTML = radioHtml;

		return radioFragment.firstChild;
	},

	_addItem: function (obj) {
		var label = document.createElement('label'),
		    checked = this._map.hasLayer(obj.layer),
		    input;

		if (obj.overlay) {
			input = document.createElement('input');
			input.type = 'checkbox';
			input.className = 'fmap-control-layers-selector';
			input.defaultChecked = checked;
		} else {
			input = this._createRadioElement('fmap-base-layers', checked);
		}

		input.layerId = FMap.stamp(obj.layer);

		FMap.DomEvent.on(input, 'click', this._onInputClick, this);

		var name = document.createElement('span');
		name.innerHTML = ' ' + obj.name;

		label.appendChild(input);
		label.appendChild(name);

		var container = obj.overlay ? this._overlaysList : this._baseLayersList;
		container.appendChild(label);

		return label;
	},

	_onInputClick: function () {
		var inputs = this._form.getElementsByTagName('input'),
		    input, layer, hasLayer;
		var addedLayers = [],
		    removedLayers = [];

		this._handlingClick = true;

		for (var i = 0, len = inputs.length; i < len; i++) {
			input = inputs[i];
			layer = this._layers[input.layerId].layer;
			hasLayer = this._map.hasLayer(layer);

			if (input.checked && !hasLayer) {
				addedLayers.push(layer);

			} else if (!input.checked && hasLayer) {
				removedLayers.push(layer);
			}
		}

		// Bugfix issue 2318: Should remove all old layers before readding new ones
		for (i = 0; i < removedLayers.length; i++) {
			this._map.removeLayer(removedLayers[i]);
		}
		for (i = 0; i < addedLayers.length; i++) {
			this._map.addLayer(addedLayers[i]);
		}

		this._handlingClick = false;

		this._refocusOnMap();
	},

	_expand: function () {
		FMap.DomUtil.addClass(this._container, 'fmap-control-layers-expanded');
	},

	_collapse: function () {
		FMap.DomUtil.removeClass(this._container, 'fmap-control-layers-expanded');
	}
});

FMap.control.layers = function (baseLayers, overlays, options) {
	return new FMap.Control.Layers(baseLayers, overlays, options);
};



var Knob = FMap.Draggable.extend({
			initialize: function (element, stepHeight, knobHeight) {
				FMap.Draggable.prototype.initialize.call(this, element, element);
				this._element = element;

				this._stepHeight = stepHeight;
				this._knobHeight = knobHeight;

				this.on('predrag', function () {
					this._newPos.x = 0;
					this._newPos.y = this._adjust(this._newPos.y);
				}, this);
			},

			_adjust: function (y) {
				var value = Math.round(this._toValue(y));
				value = Math.max(0, Math.min(this._maxValue, value));
				return this._toY(value);
			},

			// y = k*v + m
			_toY: function (value) {
				return this._k * value + this._m;
			},
			// v = (y - m) / k
			_toValue: function (y) {
				return (y - this._m) / this._k;
			},

			setSteps: function (steps) {
				var sliderHeight = steps * this._stepHeight;
				this._maxValue = steps - 1;

				// conversion parameters
				// the conversion is just a common linear function.
				this._k = -this._stepHeight;
				this._m = sliderHeight - (this._stepHeight + this._knobHeight) / 2;
			},

			setPosition: function (y) {
				FMap.DomUtil.setPosition(this._element,
									  FMap.point(0, this._adjust(y)));
			},

			setValue: function (v) {
				this.setPosition(this._toY(v));
			},

			getValue: function () {
				return this._toValue(FMap.DomUtil.getPosition(this._element).y);
			}
		});

FMap.Control.Zoomslider = FMap.Control.extend({
			options: {
				position: 'topleft',
				// Height of zoom-slider.png in px
				stepHeight: 8,
				// Height of the knob div in px (including border)
				knobHeight: 6,
				styleNS: 'fmap-control-zoomslider'
			},

			onAdd: function (map) {
				this._map = map;
				this._ui = this._createUI();
				this._knob = new Knob(this._ui.knob,
									  this.options.stepHeight,
									  this.options.knobHeight);

				map.whenReady(this._initKnob,        this)
					.whenReady(this._initEvents,      this)
					.whenReady(this._updateSize,      this)
					.whenReady(this._updateKnobValue, this)
					.whenReady(this._updateDisabled,  this);
				return this._ui.bar;
			},

			onRemove: function (map) {
				map.off('zoomlevelschange',         this._updateSize,      this)
					.off('zoomend zoomlevelschange', this._updateKnobValue, this)
					.off('zoomend zoomlevelschange', this._updateDisabled,  this);
			},

			_createUI: function () {
				var ui = {},
					ns = this.options.styleNS;

				ui.bar     = FMap.DomUtil.create('div', ns + ' fmap-bar');
				ui.zoomIn  = this._createZoomBtn('in', 'top', ui.bar);
				ui.wrap    = FMap.DomUtil.create('div', ns + '-wrap fmap-bar-part', ui.bar);
				ui.zoomOut = this._createZoomBtn('out', 'bottom', ui.bar);
				ui.body    = FMap.DomUtil.create('div', ns + '-body', ui.wrap);
				ui.knob    = FMap.DomUtil.create('div', ns + '-knob');

				FMap.DomEvent.disableClickPropagation(ui.bar);
				FMap.DomEvent.disableClickPropagation(ui.knob);

				return ui;
			},
			_createZoomBtn: function (zoomDir, end, container) {
				var classDef = this.options.styleNS + '-' + zoomDir +
						' fmap-bar-part' +
						' fmap-bar-part-' + end,
					link = FMap.DomUtil.create('a', classDef, container);

				link.href = '#';
				link.title = 'Zoom ' + zoomDir;

				FMap.DomEvent.on(link, 'click', FMap.DomEvent.preventDefault);

				return link;
			},

			_initKnob: function () {
				this._knob.enable();
				this._ui.body.appendChild(this._ui.knob);
			},
			_initEvents: function () {
				this._map
					.on('zoomlevelschange',         this._updateSize,      this)
					.on('zoomend zoomlevelschange', this._updateKnobValue, this)
					.on('zoomend zoomlevelschange', this._updateDisabled,  this);

				FMap.DomEvent.on(this._ui.body,    'click', this._onSliderClick, this);
				FMap.DomEvent.on(this._ui.zoomIn,  'click', this._zoomIn,        this);
				FMap.DomEvent.on(this._ui.zoomOut, 'click', this._zoomOut,       this);

				this._knob.on('dragend', this._updateMapZoom, this);
			},

			_onSliderClick: function (e) {
				var first = (e.touches && e.touches.length === 1 ? e.touches[0] : e),
					y = FMap.DomEvent.getMousePosition(first, this._ui.body).y;

				this._knob.setPosition(y);
				this._updateMapZoom();
			},

			_zoomIn: function (e) {
				this._map.zoomIn(e.shiftKey ? 3 : 1);
			},
			_zoomOut: function (e) {
				this._map.zoomOut(e.shiftKey ? 3 : 1);
			},

			_zoomLevels: function () {
				var zoomLevels = this._map.getMaxZoom() - this._map.getMinZoom() + 1;
				return zoomLevels < Infinity ? zoomLevels : 0;
			},
			_toZoomLevel: function (value) {
				return value + this._map.getMinZoom();
			},
			_toValue: function (zoomLevel) {
				return zoomLevel - this._map.getMinZoom();
			},

			_updateSize: function () {
				var steps = this._zoomLevels();

				this._ui.body.style.height = this.options.stepHeight * steps + 'px';
				this._knob.setSteps(steps);
			},
			_updateMapZoom: function () {
				this._map.setZoom(this._toZoomLevel(this._knob.getValue()));
			},
			_updateKnobValue: function () {
				this._knob.setValue(this._toValue(this._map.getZoom()));
			},
			_updateDisabled: function () {
				var zoomLevel = this._map.getZoom(),
					className = this.options.styleNS + '-disabled';

				FMap.DomUtil.removeClass(this._ui.zoomIn,  className);
				FMap.DomUtil.removeClass(this._ui.zoomOut, className);

				if (zoomLevel === this._map.getMinZoom()) {
					FMap.DomUtil.addClass(this._ui.zoomOut, className);
				}
				if (zoomLevel === this._map.getMaxZoom()) {
					FMap.DomUtil.addClass(this._ui.zoomIn, className);
				}
			}
		});

FMap.Map.addInitHook(function () {
		if (this.options.zoomsliderControl) {
			this.zoomsliderControl = new FMap.Control.Zoomslider();
			this.addControl(this.zoomsliderControl);
		}
	});

FMap.Map.mergeOptions({
	zoomControl: false,
	zoomsliderControl: false
});

FMap.control.zoomslider = function (options) {
		return new FMap.Control.Zoomslider(options);
	};



FMap.Control.Search = FMap.Control.extend({
	includes: FMap.Mixin.Events,
	//
	//	Name					Data passed			   Description
	//
	//Managed Events:
	//	search_locationfound	{latlng, title, layer} fired after moved and show markerLocation
	//	search_expanded			{}					   fired after control was expanded
	//  search_collapsed		{}					   fired after control was collapsed
	//
	//Public methods:
	//  setLayer()				FMap.LayerGroup()         set layer search at runtime
	//  showAlert()             'Text message'         show alert message
	//  searchText()			'Text searched'        search text by external code
	//
	options: {
		layer: null,				//layer where search markers(is a FMap.LayerGroup)
		sourceData: null,			//function that fill _recordsCache, passed searching text by first param and callback in second
		url: '',					//url for search by ajax request, ex: "search.php?q={s}". Can be function that returns string for dynamic parameter setting
		jsonpParam: null,			//jsonp param name for search by jsonp service, ex: "callback"
		//TODO implements uniq option 'sourceData' that recognizes source type: url,array,callback or layer
		//TODO implement can do research on multiple sources layers and remote
		propertyName: 'title',		//property in marker.options(or feature.properties for vector layer) trough filter elements in layer,
		propertyLoc: 'loc',			//field for remapping location, using array: ['latname','lonname'] for select double fields(ex. ['lat','lon'] )
		formatData: null,			//callback for reformat all data from source to indexed data object
		filterData: null,			//callback for filtering data from text searched, params: textSearch, allRecords									// support dotted format: 'prop.subprop.title'
		callTip: null,				//function that return row tip html node(or html string), receive text tooltip in first param
		container: '',				//container id to insert Search Control
		minLength: 1,				//minimal text length for autocomplete
		initial: true,				//search elements only by initial text
		casesesitive: false,		//search elements in case sensitive text
		autoType: true,				//complete input with first suggested result and select this filled-in text.
		delayType: 400,				//delay while typing for show tooltip
		tooltipLimit: -1,			//limit max results to show in tooltip. -1 for no limit.
		tipAutoSubmit: true,		//auto map panTo when click on tooltip
		autoResize: true,			//autoresize on input change
		collapsed: true,			//collapse search control at startup
		autoCollapse: false,		//collapse search control after submit(on button or on tips if enabled tipAutoSubmit)
		//TODO add option for persist markerLoc after collapse!
		autoCollapseTime: 1200,		//delay for autoclosing alert and collapse after blur
		zoom: null,					//zoom after pan to location found, default: map.getZoom()
		position: 'topleft',
		textErr: 'Location not found',	//error message
		textCancel: 'Cancel',		//title in cancel button
		textPlaceholder: 'Search...',//placeholder value
		animateLocation: true,		//animate a circle over location found
		circleLocation: true,		//draw a circle in location found
		markerLocation: false,		//draw a marker in location found
		markerIcon: new FMap.Icon.Default()//custom icon for maker location
		//TODO history: false,		//show latest searches in tooltip
	},
//FIXME option condition problem {autoCollapse: true, markerLocation: true} not show location
//FIXME option condition problem {autoCollapse: false }
//
//TODO important optimization!!! always append data in this._recordsCache
//  now _recordsCache content is emptied and replaced with new data founded
//  always appending data on _recordsCache give the possibility of caching ajax, jsonp and layersearch!
//
//TODO here insert function that search inputText FIRST in _recordsCache keys and if not find results..
//  run one of callbacks search(sourceData,jsonpUrl or options.layer) and run this.showTooltip
//
//TODO change structure of _recordsCache
//	like this: _recordsCache = {"text-key1": {loc:[lat,lng], ..other attributes.. }, {"text-key2": {loc:[lat,lng]}...}, ...}
//	in this mode every record can have a free structure of attributes, only 'loc' is required

	initialize: function(options) {
		FMap.Util.setOptions(this, options || {});
		this._inputMinSize = this.options.textPlaceholder ? this.options.textPlaceholder.length : 10;
		this._layer = this.options.layer || new FMap.LayerGroup();
		this._filterData = this.options.filterData || this._defaultFilterData;
		this._formatData = this.options.formatData || this._defaultFormatData;
		this._autoTypeTmp = this.options.autoType;	//useful for disable autoType temporarily in delete/backspace keydown
		this._countertips = 0;		//number of tips items
		this._recordsCache = {};	//key,value table! that store locations! format: key,latlng
		this._curReq = null;
	},

	onAdd: function (map) {
		this._map = map;
		this._container = FMap.DomUtil.create('div', 'fmap-control-search');
		this._input = this._createInput(this.options.textPlaceholder, 'search-input');
		this._tooltip = this._createTooltip('search-tooltip');
		this._cancel = this._createCancel(this.options.textCancel, 'search-cancel');
		this._button = this._createButton(this.options.textPlaceholder, 'search-button');
		this._alert = this._createAlert('search-alert');

		if (this.options.collapsed === false) {
			this.expand(this.options.collapsed);
		}

		if (this.options.circleLocation || this.options.markerLocation || this.options.markerIcon) {
			this._markerLoc = new FMap.Control.Search.Marker([0, 0], {
				showCircle: this.options.circleLocation,
				showMarker: this.options.markerLocation,
				icon: this.options.markerIcon
			});//see below
		}

		this.setLayer(this._layer);
		 map.on({
		// 		'layeradd': this._onLayerAddRemove,
		// 		'layerremove': this._onLayerAddRemove
		     'resize': this._handleAutoresize
			}, this);
		return this._container;
	},
	addTo: function (map) {

		if (this.options.container) {
			this._container = this.onAdd(map);
			this._wrapper = FMap.DomUtil.get(this.options.container);
			this._wrapper.style.position = 'relative';
			this._wrapper.appendChild(this._container);
		} else {
			FMap.Control.prototype.addTo.call(this, map);
		}
		return this;
	},
	/*eslint-disable */
	onRemove: function(map) {
		this._recordsCache = {};

		// map.off({
		// 		'layeradd': this._onLayerAddRemove,
		// 		'layerremove': this._onLayerAddRemove
		// 	}, this);
	},
	/*eslint-enable */

	// _onLayerAddRemove: function(e) {
	// 	//console.info('_onLayerAddRemove');
	// 	//without this, run setLayer also for each Markers!! to optimize!
	// 	if (e.layer instanceof FMap.LayerGroup)
	// 		if ( FMap.stamp(e.layer) != FMap.stamp(this._layer) )
	// 			this.setLayer(e.layer);
	// },

	_getPath: function(obj, prop) {
		var parts = prop.split('.'),
			last = parts.pop(),
			len = parts.length,
			cur = parts[0],
			i = 1;

		if (len > 0) {
			while ((obj = obj[cur]) && i < len)
			{
				cur = parts[i++];
			}
		}

		if (obj) {
			return obj[last];
		}
	},

	setLayer: function(layer) {	//set search layer at runtime
		//this.options.layer = layer; //setting this, run only this._recordsFromLayer()
		this._layer = layer;
		this._layer.addTo(this._map);
		if (this._markerLoc) {
			this._layer.addLayer(this._markerLoc);
		}
		return this;
	},

	showAlert: function(text) {
		text = text || this.options.textErr;
		this._alert.style.display = 'block';
		this._alert.innerHTML = text;
		clearTimeout(this.timerAlert);
		var that = this;
		this.timerAlert = setTimeout(function() {
			that.hideAlert();
		}, this.options.autoCollapseTime);
		return this;
	},

	hideAlert: function() {
		this._alert.style.display = 'none';
		return this;
	},

	cancel: function() {
		this._input.value = '';
		this._handleKeypress({keyCode:8});//simulate backspace keypress
		this._input.size = this._inputMinSize;
		this._input.focus();
		this._cancel.style.display = 'none';
		this._hideTooltip();
		return this;
	},

	expand: function(toggle) {
		toggle = toggle || true;
		this._input.style.display = 'block';
		FMap.DomUtil.addClass(this._container, 'search-exp');
		if (toggle !== false) {
			this._input.focus();
			this._map.on('dragstart click', this.collapse, this);
		}
		this.fire('search_expanded');
		return this;
	},

	collapse: function() {
		this._hideTooltip();
		this.cancel();
		this._alert.style.display = 'none';
		this._input.blur();
		if (this.options.collapsed) {
			this._input.style.display = 'none';
			this._cancel.style.display = 'none';
			FMap.DomUtil.removeClass(this._container, 'search-exp');
			//this._markerLoc.hide();//maybe unuseful
			this._map.off('dragstart click', this.collapse, this);
		}
		this.fire('search_collapsed');
		return this;
	},

	collapseDelayed: function() {	//collapse after delay, used on_input blur
		if (!this.options.autoCollapse) {
			return this;
		}
		var that = this;
		clearTimeout(this.timerCollapse);
		this.timerCollapse = setTimeout(function() {
			that.collapse();
		}, this.options.autoCollapseTime);
		return this;
	},

	collapseDelayedStop: function() {
		clearTimeout(this.timerCollapse);
		return this;
	},

////start DOM creations
	_createAlert: function(className) {
		var alert = FMap.DomUtil.create('div', className, this._container);
		alert.style.display = 'none';

		FMap.DomEvent
			.on(alert, 'click', FMap.DomEvent.stop, this)
			.on(alert, 'click', this.hideAlert, this);

		return alert;
	},

	_createInput: function (text, className) {
		var label = FMap.DomUtil.create('label', className, this._container);
		var input = FMap.DomUtil.create('input', className, this._container);
		input.type = 'text';
		input.size = this._inputMinSize;
		input.value = '';
		input.autocomplete = 'off';
		input.autocorrect = 'off';
		input.autocapitalize = 'off';
		input.placeholder = text;
		input.style.display = 'none';
		input.role = 'search';
		input.id = input.role + input.type + input.size;
		label.htmlFor = input.id;
		label.style.display = 'none';
		label.value = text;

		FMap.DomEvent
			.disableClickPropagation(input)
			.on(input, 'keyup', this._handleKeypress, this)
			.on(input, 'keydown', this._handleAutoresize, this)
			.on(input, 'blur', this.collapseDelayed, this)
			.on(input, 'focus', this.collapseDelayedStop, this);
		return input;
	},

	_createCancel: function (title, className) {
		var cancel = FMap.DomUtil.create('a', className, this._container);
		cancel.href = '#';
		cancel.title = title;
		cancel.style.display = 'none';
		cancel.innerHTML = '<span>&otimes;</span>';//imageless(see css)

		FMap.DomEvent
			.on(cancel, 'click', FMap.DomEvent.stop, this)
			.on(cancel, 'click', this.cancel, this);

		return cancel;
	},

	_createButton: function (title, className) {
		var button = FMap.DomUtil.create('a', className, this._container);
		button.href = '#';
		button.title = title;

		FMap.DomEvent
			.on(button, 'click', FMap.DomEvent.stop, this)
			.on(button, 'click', this._handleSubmit, this)
			.on(button, 'focus', this.collapseDelayedStop, this)
			.on(button, 'blur', this.collapseDelayed, this);

		return button;
	},

	_createTooltip: function(className) {
		var tool = FMap.DomUtil.create('ul', className, this._container);
		tool.style.display = 'none';
		var that = this;

		FMap.DomEvent
			.disableClickPropagation(tool)
			.on(tool, 'blur', this.collapseDelayed, this)
			.on(tool, 'mousewheel', function(e) {
				that.collapseDelayedStop();
				FMap.DomEvent.stopPropagation(e);//disable zoom map
			}, this)
			/*eslint-disable */
			.on(tool, 'mouseover', function(e) {
				that.collapseDelayedStop();
			}, this);
			/*eslint-enable */
		return tool;
	},

	_createTip: function(text, val) {//val is object in recordCache, usually is Latlng
		var tip;

		if (this.options.callTip) {
			tip = this.options.callTip(text, val); //custom tip node or html string
			if (typeof tip === 'string') {
				var tmpNode = FMap.DomUtil.create('div');
				tmpNode.innerHTML = tip;
				tip = tmpNode.firstChild;
			}
		}
		else
		{
			tip = FMap.DomUtil.create('li', '');
			tip.innerHTML = text;
		}

		FMap.DomUtil.addClass(tip, 'search-tip');
		tip._text = text; //value replaced in this._input and used by _autoType

		FMap.DomEvent
			.disableClickPropagation(tip)
			.on(tip, 'click', FMap.DomEvent.stop, this)
			/*eslint-disable */
			.on(tip, 'click', function(e) {
				this._input.value = text;
				this._handleAutoresize();
				this._input.focus();
				this._hideTooltip();
				if (this.options.tipAutoSubmit)//go to location at once
				{
					this._handleSubmit();
				}
			}, this);
			/*eslint-enable */
		return tip;
	},

//////end DOM creations

	_getUrl: function(text) {
		return (typeof this.options.url === 'function') ? this.options.url(text) : this.options.url;
	},

	_defaultFilterData: function(text, records) {
		var regFilter = new RegExp('\^[.]$|[\[\]|()*]', 'g'),//remove . * | ( ) ] [
			I, regSearch,
			frecords = {};

		text = text.replace(regFilter, '');	  //sanitize text
		I = this.options.initial ? '^' : '';  //search only initial text

		regSearch = new RegExp(I + text, !this.options.casesesitive ? 'i' : undefined);

		//TODO use .filter or .map
		for (var key in records)
			if (regSearch.test(key)) {
				frecords[key] = records[key];
			}

		return frecords;
	},

	showTooltip: function(records) {
		var tip;
		this._countertips = 0;
		this._tooltip.innerHTML = '';
		this._tooltip.currentSelection = -1;  //inizialized for _handleArrowSelect()

		for (var key in records)//fill tooltip
		{
			if (++this._countertips === this.options.tooltipLimit)
			{
				break;
			}
			tip = this._createTip(key, records[key]);
			this._tooltip.appendChild(tip);
		}

		if (this._countertips > 0)
		{
			this._tooltip.style.display = 'block';
			if (this._autoTypeTmp)
			{
				this._autoType();
			}
			this._autoTypeTmp = this.options.autoType;//reset default value
		}
		else
		{
			this._hideTooltip();
		}
		this._tooltip.scrollTop = 0;
		return this._countertips;
	},

	_hideTooltip: function() {
		this._tooltip.style.display = 'none';
		this._tooltip.innerHTML = '';
		return 0;
	},

	_defaultFormatData: function(json) {	//default callback for format data to indexed data
		var propName = this.options.propertyName,
			propLoc = this.options.propertyLoc,
			i, jsonret = {};

		if (FMap.Util.isArray(propLoc))
		{
			for (i in json)
				jsonret[this._getPath(json[i], propName)] = FMap.latLng(json[i][propLoc[0]], json[i][propLoc[1]]);
		}
		else
		{
			for (i in json)
				jsonret[this._getPath(json[i], propName)] = FMap.latLng(this._getPath(json[i], propLoc));
		}
		//TODO throw new Error("propertyName '"+propName+"' not found in JSON data");
		return jsonret;
	},

	_recordsFromJsonp: function(text, callAfter) {  //extract searched records from remote jsonp service
		FMap.Control.Search.callJsonp = callAfter;
		var script = FMap.DomUtil.create('script', 'fmap-search-jsonp', document.getElementsByTagName('body')[0]),
			url = FMap.Util.template(this._getUrl(text) + '&' + this.options.jsonpParam + '=FMap.Control.Search.callJsonp', {s: text}); //parsing url
			//rnd = '&_='+Math.floor(Math.random()*10000);
			//TODO add rnd param or randomize callback name! in recordsFromJsonp
		script.type = 'text/javascript';
		script.src = url;
		return {abort: function() {script.parentNode.removeChild(script); }};
	},

	_recordsFromAjax: function(text, callAfter) {	//Ajax request
		if (window.XMLHttpRequest === undefined) {
			window.XMLHttpRequest = function() {
				/*global ActiveXObject:true */
				try {
					return new ActiveXObject('Microsoft.XMLHTTP.6.0');
				}
				catch  (e1) {
					try {
						return new ActiveXObject('Microsoft.XMLHTTP.3.0');
					}
					catch (e2) {
						throw new Error('XMLHttpRequest is not supported');
					}
				}
			};
		}
		var IE8or9 = (FMap.Browser.ie && !window.atob && document.querySelector),
			request = IE8or9 ? new XDomainRequest() : new XMLHttpRequest(),
			url = FMap.Util.template(this._getUrl(text), {s: text});

		//rnd = '&_='+Math.floor(Math.random()*10000);
		// TODO add rnd param or randomize callback name! in recordsFromAjax

		request.open('GET', url);
		//var that = this;

		request.onload = function() {
			callAfter(JSON.parse(request.responseText));
		};
		request.onreadystatechange = function() {
		    if (request.readyState === 4 && request.status === 200) {
					this.onload();
		    }
		};

		request.send();
		return request;
	},

	_recordsFromLayer: function() {	//return table: key,value from layer
		var that = this,
			retRecords = {},
			propName = this.options.propertyName,
			loc;

		this._layer.eachLayer(function(layer) {

			if (layer instanceof FMap.Control.Search.Marker) {
				return;
			}

			if (layer instanceof FMap.Marker || layer instanceof FMap.CircleMarker)
			{
				if (that._getPath(layer.options, propName))
				{
					loc = layer.getLatLng();
					loc.layer = layer;
					retRecords[that._getPath(layer.options, propName)] = loc;
				}
				else if (that._getPath(layer.feature.properties, propName)) {

					loc = layer.getLatLng();
					loc.layer = layer;
					retRecords[that._getPath(layer.feature.properties, propName)] = loc;
				}
				else
				{
					throw new Error('propertyName \'' + propName + '\' not found in marker');
				}
			}
            else if (layer.hasOwnProperty('feature'))//GeoJSON
			{
				if (layer.feature.properties.hasOwnProperty(propName))
				{
					loc = layer.getBounds().getCenter();
					loc.layer = layer;
					retRecords[layer.feature.properties[propName]] = loc;
				}
				else
				{
					throw new Error('propertyName \'' + propName + '\' not found in feature');
				}
			}
			else if (layer instanceof FMap.LayerGroup)
            {
                //TODO: Optimize
                layer.eachLayer(function(m) {
                    loc = m.getLatLng();
                    loc.layer = m;
                    retRecords[m.feature.properties[propName]] = loc;
                });
            }

		}, this);

		return retRecords;
	},

	_autoType: function() {

		//TODO implements autype without selection(useful for mobile device)

		var start = this._input.value.length,
			firstRecord = this._tooltip.firstChild._text,
			end = firstRecord.length;

		if (firstRecord.indexOf(this._input.value) === 0) { // If prefix match
			this._input.value = firstRecord;
			this._handleAutoresize();

			if (this._input.createTextRange) {
				var selRange = this._input.createTextRange();
				selRange.collapse(true);
				selRange.moveStart('character', start);
				selRange.moveEnd('character', end);
				selRange.select();
			}
			else if (this._input.setSelectionRange) {
				this._input.setSelectionRange(start, end);
			}
			else if (this._input.selectionStart) {
				this._input.selectionStart = start;
				this._input.selectionEnd = end;
			}
		}
	},

	_hideAutoType: function() {	// deselect text:

		var sel;
		if ((sel = this._input.selection) && sel.empty) {
			sel.empty();
		}
		else if (this._input.createTextRange) {
			sel = this._input.createTextRange();
			sel.collapse(true);
			var end = this._input.value.length;
			sel.moveStart('character', end);
			sel.moveEnd('character', end);
			sel.select();
		}
		else {
			if (this._input.getSelection) {
				this._input.getSelection().removeAllRanges();
			}
			this._input.selectionStart = this._input.selectionEnd;
		}
	},

	_handleKeypress: function (e) {	//run _input keyup event

		switch (e.keyCode)
		{
			case 27: //Esc
				this.collapse();
			break;
			case 13: //Enter
				if (this._countertips === 1)
				{
					this._handleArrowSelect(1);
				}
				this._handleSubmit();	//do search
			break;
			case 38://Up
				this._handleArrowSelect(-1);
			break;
			case 40://Down
				this._handleArrowSelect(1);
			break;
			case 37://Left
			case 39://Right
			case 16://Shift
			case 17://Ctrl
			//case 32://Space
			break;
			case 8://backspace
			case 46://delete
				this._autoTypeTmp = false;//disable temporarily autoType
			break;
			default://All keys

				if (this._input.value.length)
				{
					this._cancel.style.display = 'block';
				}
				else
				{
					this._cancel.style.display = 'none';
				}

				if (this._input.value.length >= this.options.minLength)
				{
					var that = this;

					clearTimeout(this.timerKeypress);	//cancel last search request while type in
					this.timerKeypress = setTimeout(function() {	//delay before request, for limit jsonp/ajax request
						that._fillRecordsCache();
					}, this.options.delayType);
				}
				else
				{
					this._hideTooltip();
				}
		}
	},

	searchText: function(text) {
		var code = text.charCodeAt(text.length);

		this._input.value = text;

		this._input.style.display = 'block';
		FMap.DomUtil.addClass(this._container, 'search-exp');

		this._autoTypeTmp = false;

		this._handleKeypress({keyCode: code});
	},

	_fillRecordsCache: function() {
//TODO important optimization!!! always append data in this._recordsCache
//  now _recordsCache content is emptied and replaced with new data founded
//  always appending data on _recordsCache give the possibility of caching ajax, jsonp and layersearch!
//
//TODO here insert function that search inputText FIRST in _recordsCache keys and if not find results..
//  run one of callbacks search(sourceData,jsonpUrl or options.layer) and run this.showTooltip
//
//TODO change structure of _recordsCache
//	like this: _recordsCache = {"text-key1": {loc:[lat,lng], ..other attributes.. }, {"text-key2": {loc:[lat,lng]}...}, ...}
//	in this way every record can have a free structure of attributes, only 'loc' is required

		var inputText = this._input.value,
			that = this, records;

		if (this._curReq && this._curReq.abort)
		{
			this._curReq.abort();
		}
		//abort previous requests
		FMap.DomUtil.addClass(this._container, 'search-load');

		if (this.options.layer)
		{
			//TODO _recordsFromLayer must return array of objects, formatted from _formatData
			this._recordsCache = this._recordsFromLayer();

			records = this._filterData(this._input.value, this._recordsCache);

			this.showTooltip(records);

			FMap.DomUtil.removeClass(this._container, 'search-load');
		}
		else
		{
			if (this.options.sourceData)
			{
				this._retrieveData = this.options.sourceData;
			}
			else if (this.options.url)	//jsonp or ajax
			{
				this._retrieveData = this.options.jsonpParam ? this._recordsFromJsonp : this._recordsFromAjax;
			}

			this._curReq = this._retrieveData.call(this, inputText, function(data) {
				that._recordsCache = that._formatData(data);

				//TODO refact!
				if (that.options.sourceData)
				{
					records = that._filterData(that._input.value, that._recordsCache);
				}
				else
				{
					records = that._recordsCache;
				}
				that.showTooltip(records);

				FMap.DomUtil.removeClass(that._container, 'search-load');
			});
		}
	},

	_handleAutoresize: function() {	//autoresize this._input
	    //TODO refact _handleAutoresize now is not accurate
	    if (this._input.style.maxWidth !== this._map._container.offsetWidth) //If maxWidth isn't the same as when first set, reset to current Map width
		{
			this._input.style.maxWidth = FMap.DomUtil.getStyle(this._map._container, 'width');
		}

		if (this.options.autoResize && (this._container.offsetWidth + 45 < this._map._container.offsetWidth))
		{
			this._input.size = this._input.value.length < this._inputMinSize ? this._inputMinSize : this._input.value.length;
		}
	},

	_handleArrowSelect: function(velocity) {
		var searchTips = this._tooltip.hasChildNodes() ? this._tooltip.childNodes : [];

		for (var i = 0; i < searchTips.length; i++)
		{
			FMap.DomUtil.removeClass(searchTips[i], 'search-tip-select');
		}

		if ((velocity === 1) && (this._tooltip.currentSelection >= (searchTips.length - 1))) {// If at end of list.
			FMap.DomUtil.addClass(searchTips[this._tooltip.currentSelection], 'search-tip-select');
		}
		else if ((velocity === -1) && (this._tooltip.currentSelection <= 0)) { // Going back up to the search box.
			this._tooltip.currentSelection = -1;
		}
		else if (this._tooltip.style.display !== 'none') {
			this._tooltip.currentSelection += velocity;

			FMap.DomUtil.addClass(searchTips[this._tooltip.currentSelection], 'search-tip-select');

			this._input.value = searchTips[this._tooltip.currentSelection]._text;

			// scroll:
			var tipOffsetTop = searchTips[this._tooltip.currentSelection].offsetTop;
			if (tipOffsetTop + searchTips[this._tooltip.currentSelection].clientHeight >= this._tooltip.scrollTop + this._tooltip.clientHeight) {
				this._tooltip.scrollTop = tipOffsetTop - this._tooltip.clientHeight + searchTips[this._tooltip.currentSelection].clientHeight;
			}
			else if (tipOffsetTop <= this._tooltip.scrollTop) {
				this._tooltip.scrollTop = tipOffsetTop;
			}
		}
	},

	_handleSubmit: function() {	//button and tooltip click and enter submit

		this._hideAutoType();

		this.hideAlert();
		this._hideTooltip();

		if (this._input.style.display !== 'none')//on first click show _input only
		{
			//hide _input only
			if (this._input.value === '') {
				this.collapse();
			} else {
				var loc = this._getLocation(this._input.value);
				if (loc === false) {
					this.showAlert();
				} else {
					this.showLocation(loc, this._input.value);
					this.fire('search_locationfound', {
						latlng: loc,
						text: this._input.value,
						layer: loc.layer ? loc.layer : null
					});
				}
				//this.collapse();
				//FIXME if collapse in _handleSubmit hide _markerLoc!
			}
		} else {
			this.expand();
		}
	},

	_getLocation: function(key) {	//extract latlng from _recordsCache

		if (this._recordsCache.hasOwnProperty(key))
		{
			return this._recordsCache[key];
		}//then after use .loc attribute
		else
		{
			return false;
		}
	},

	showLocation: function(latlng, title) {	//set location on map from _recordsCache

		if (this.options.zoom)
		{
			this._map.setView(latlng, this.options.zoom);
		}
		else
		{
			this._map.panTo(latlng);
		}

		if (this._markerLoc)
		{
			this._markerLoc.setLatLng(latlng);  //show circle/marker in location found
			this._markerLoc.setTitle(title);
			this._markerLoc.show();
			if (this.options.animateLocation)
			{
				this._markerLoc.animate();
			}
			//TODO showLocation: start animation after setView or panTo, maybe with map.on('moveend')...
		}
		//FIXME autoCollapse option hide this._markerLoc before that visualized!!
		if (this.options.autoCollapse)
		{
			this.collapse();
		}
		return this;
	}
});

FMap.Control.Search.Marker = FMap.Marker.extend({

	includes: FMap.Mixin.Events,

	options: {
		radius: 10,
		weight: 3,
		color: '#e03',
		stroke: true,
		fill: false,
		title: '',
		icon: new FMap.Icon.Default(),
		showCircle: true,
		showMarker: false	//show icon optional, show only circleLoc
	},

	initialize: function (latlng, options) {
		FMap.setOptions(this, options);
		FMap.Marker.prototype.initialize.call(this, latlng, options);
		if (this.options.showCircle)
		{
			this._circleLoc =  new FMap.CircleMarker(latlng, this.options);
		}
	},

	onAdd: function (map) {
		FMap.Marker.prototype.onAdd.call(this, map);
		if (this._circleLoc)
		{
			map.addLayer(this._circleLoc);
		}
		this.hide();
	},

	onRemove: function (map) {
		FMap.Marker.prototype.onRemove.call(this, map);
		if (this._circleLoc)
		{
			map.removeLayer(this._circleLoc);
		}
	},
	setLatLng: function (latlng) {
		FMap.Marker.prototype.setLatLng.call(this, latlng);
		if (this._circleLoc) {
			this._circleLoc.setLatLng(latlng);
		}
		return this;
	},

	setTitle: function(title) {
		title = title || '';
		this.options.title = title;
		if (this._icon)
		{
			this._icon.title = title;
		}
		return this;
	},

	show: function() {
		if (this.options.showMarker)
		{
			if (this._icon)
			{
				this._icon.style.display = 'block';
			}
			if (this._shadow)
			{
				this._shadow.style.display = 'block';
			}
			//this._bringToFront();
		}
		if (this._circleLoc)
		{
			this._circleLoc.setStyle({fill: this.options.fill, stroke: this.options.stroke});
			//this._circleLoc.bringToFront();
		}
		return this;
	},

	hide: function() {
		if (this._icon) {
			this._icon.style.display = 'none';
		}
		if (this._shadow)	{
			this._shadow.style.display = 'none';
		}
		if (this._circleLoc)	{
			this._circleLoc.setStyle({fill: false, stroke: false});
		}
		return this;
	},

	animate: function() {
	//TODO refact animate() more smooth! like this: http://goo.gl/DDlRs
		if (this._circleLoc)
		{
			var circle = this._circleLoc,
				tInt = 200,	//time interval
				ss = 10,	//frames
				mr = parseInt(circle._radius / ss),
				oldrad = this.options.radius,
				newrad = circle._radius * 2.5,
				acc = 0;

			circle._timerAnimLoc = setInterval(function() {
				acc += 0.5;
				mr += acc;	//adding acceleration
				newrad -= mr;
				circle.setRadius(newrad);

				if (newrad < oldrad)
				{
					clearInterval(circle._timerAnimLoc);
					circle.setRadius(oldrad);//reset radius
					//if (typeof afterAnimCall == 'function')
						//afterAnimCall();
						//TODO use create event 'animateEnd' in FMap.Control.Search.Marker
				}
			}, tInt);
		}
		return this;
	}
});

FMap.Map.addInitHook(function () {
    if (this.options.searchControl) {
        this.searchControl = FMap.control.search(this.options.searchControl);
        this.addControl(this.searchControl);
    }
});

FMap.control.search = function (options) {
    return new FMap.Control.Search(options);
};



/*
 * FMap.PosAnimation powers Fmap pan animations internally.
 */

FMap.PosAnimation = FMap.Evented.extend({

	run: function (el, newPos, duration, easeLinearity) { // (HTMLElement, Point[, Number, Number])
		this.stop();

		this._el = el;
		this._inProgress = true;
		this._duration = duration || 0.25;
		this._easeOutPower = 1 / Math.max(easeLinearity || 0.5, 0.2);

		this._startPos = FMap.DomUtil.getPosition(el);
		this._offset = newPos.subtract(this._startPos);
		this._startTime = +new Date();

		this.fire('start');

		this._animate();
	},

	stop: function () {
		if (!this._inProgress) { return; }

		this._step(true);
		this._complete();
	},

	_animate: function () {
		// animation loop
		this._animId = FMap.Util.requestAnimFrame(this._animate, this);
		this._step();
	},

	_step: function (round) {
		var elapsed = (+new Date()) - this._startTime,
		    duration = this._duration * 1000;

		if (elapsed < duration) {
			this._runFrame(this._easeOut(elapsed / duration), round);
		} else {
			this._runFrame(1);
			this._complete();
		}
	},

	_runFrame: function (progress, round) {
		var pos = this._startPos.add(this._offset.multiplyBy(progress));
		if (round) {
			pos._round();
		}
		FMap.DomUtil.setPosition(this._el, pos);

		this.fire('step');
	},

	_complete: function () {
		FMap.Util.cancelAnimFrame(this._animId);

		this._inProgress = false;
		this.fire('end');
	},

	_easeOut: function (t) {
		return 1 - Math.pow(1 - t, this._easeOutPower);
	}
});



/*
 * Extends FMap.Map to handle panning animations.
 */

FMap.Map.include({

	setView: function (center, zoom, options) {

		zoom = zoom === undefined ? this._zoom : this._limitZoom(zoom);
		center = this._limitCenter(FMap.latLng(center), zoom, this.options.maxBounds);
		options = options || {};

		this.stop();

		if (this._loaded && !options.reset && options !== true) {

			if (options.animate !== undefined) {
				options.zoom = FMap.extend({animate: options.animate}, options.zoom);
				options.pan = FMap.extend({animate: options.animate}, options.pan);
			}

			// try animating pan or zoom
			var animated = (this._zoom !== zoom) ?
				this._tryAnimatedZoom && this._tryAnimatedZoom(center, zoom, options.zoom) :
				this._tryAnimatedPan(center, options.pan);

			if (animated) {
				// prevent resize handler call, the view will refresh after animation anyway
				clearTimeout(this._sizeTimer);
				return this;
			}
		}

		// animation didn't start, just reset the map view
		this._resetView(center, zoom);

		return this;
	},

	panBy: function (offset, options) {
		offset = FMap.point(offset).round();
		options = options || {};

		if (!offset.x && !offset.y) {
			return this;
		}
		//If we pan too far then chrome gets issues with tiles
		// and makes them disappear or appear in the wrong place (slightly offset) #2602
		if (options.animate !== true && !this.getSize().contains(offset)) {
			this._resetView(this.unproject(this.project(this.getCenter()).add(offset)), this.getZoom());
			return this;
		}

		if (!this._panAnim) {
			this._panAnim = new FMap.PosAnimation();

			this._panAnim.on({
				'step': this._onPanTransitionStep,
				'end': this._onPanTransitionEnd
			}, this);
		}

		// don't fire movestart if animating inertia
		if (!options.noMoveStart) {
			this.fire('movestart');
		}

		// animate pan unless animate: false specified
		if (options.animate !== false) {
			FMap.DomUtil.addClass(this._mapPane, 'fmap-pan-anim');

			var newPos = this._getMapPanePos().subtract(offset);
			this._panAnim.run(this._mapPane, newPos, options.duration || 0.25, options.easeLinearity);
		} else {
			this._rawPanBy(offset);
			this.fire('move').fire('moveend');
		}

		return this;
	},

	_onPanTransitionStep: function () {
		this.fire('move');
	},

	_onPanTransitionEnd: function () {
		FMap.DomUtil.removeClass(this._mapPane, 'fmap-pan-anim');
		this.fire('moveend');
	},

	_tryAnimatedPan: function (center, options) {
		// difference between the new and current centers in pixels
		var offset = this._getCenterOffset(center)._floor();

		// don't animate too far unless animate: true specified in options
		if ((options && options.animate) !== true && !this.getSize().contains(offset)) { return false; }

		this.panBy(offset, options);

		return (options && options.animate) !== false;
	}
});



/*
 * Extends FMap.Map to handle zoom animations.
 */

FMap.Map.mergeOptions({
	zoomAnimation: true,
	zoomAnimationThreshold: 4
});

var zoomAnimated = FMap.DomUtil.TRANSITION && FMap.Browser.any3d && !FMap.Browser.mobileOpera;

if (zoomAnimated) {

	FMap.Map.addInitHook(function () {
		// don't animate on browsers without hardware-accelerated transitions or old Android/Opera
		this._zoomAnimated = this.options.zoomAnimation;

		// zoom transitions run with the same duration for all layers, so if one of transitionend events
		// happens after starting zoom animation (propagating to the map pane), we know that it ended globally
		if (this._zoomAnimated) {

			this._createAnimProxy();

			FMap.DomEvent.on(this._proxy, FMap.DomUtil.TRANSITION_END, this._catchTransitionEnd, this);
		}
	});
}

FMap.Map.include(!zoomAnimated ? {} : {

	_createAnimProxy: function () {

		var proxy = this._proxy = FMap.DomUtil.create('div', 'fmap-proxy fmap-zoom-animated');
		this._panes.mapPane.appendChild(proxy);

		this.on('zoomanim', function (e) {
			var prop = FMap.DomUtil.TRANSFORM,
				transform = proxy.style[prop];

			FMap.DomUtil.setTransform(proxy, this.project(e.center, e.zoom), this.getZoomScale(e.zoom, 1));

			// workaround for case when transform is the same and so transitionend event is not fired
			if (transform === proxy.style[prop] && this._animatingZoom) {
				this._onZoomTransitionEnd();
			}
		}, this);

		this.on('load moveend', function () {
			var c = this.getCenter(),
				z = this.getZoom();
			FMap.DomUtil.setTransform(proxy, this.project(c, z), this.getZoomScale(z, 1));
		}, this);
	},

	_catchTransitionEnd: function (e) {
		if (this._animatingZoom && e.propertyName.indexOf('transform') >= 0) {
			this._onZoomTransitionEnd();
		}
	},

	_nothingToAnimate: function () {
		return !this._container.getElementsByClassName('fmap-zoom-animated').length;
	},

	_tryAnimatedZoom: function (center, zoom, options) {

		if (this._animatingZoom) { return true; }

		options = options || {};

		// don't animate if disabled, not supported or zoom difference is too large
		if (!this._zoomAnimated || options.animate === false || this._nothingToAnimate() ||
		        Math.abs(zoom - this._zoom) > this.options.zoomAnimationThreshold) { return false; }

		// offset is the pixel coords of the zoom origin relative to the current center
		var scale = this.getZoomScale(zoom),
		    offset = this._getCenterOffset(center)._divideBy(1 - 1 / scale);

		// don't animate if the zoom origin isn't within one screen from the current center, unless forced
		if (options.animate !== true && !this.getSize().contains(offset)) { return false; }

		FMap.Util.requestAnimFrame(function () {
			this
			    .fire('movestart')
			    .fire('zoomstart')
			    ._animateZoom(center, zoom, true);
		}, this);

		return true;
	},

	_animateZoom: function (center, zoom, startAnim, noUpdate) {
		if (startAnim) {
			this._animatingZoom = true;

			// remember what center/zoom to set after animation
			this._animateToCenter = center;
			this._animateToZoom = zoom;

			FMap.DomUtil.addClass(this._mapPane, 'fmap-zoom-anim');
		}

		this.fire('zoomanim', {
			center: center,
			zoom: zoom,
			scale: this.getZoomScale(zoom),
			origin: this.latLngToLayerPoint(center),
			offset: this._getCenterOffset(center).multiplyBy(-1),
			noUpdate: noUpdate
		});
	},

	_onZoomTransitionEnd: function () {

		this._animatingZoom = false;

		FMap.DomUtil.removeClass(this._mapPane, 'fmap-zoom-anim');

		this._resetView(this._animateToCenter, this._animateToZoom, true, true);
	}
});




FMap.Map.include({
	flyTo: function (targetCenter, targetZoom, options) {

		options = options || {};
		if (options.animate === false || !FMap.Browser.any3d) {
			return this.setView(targetCenter, targetZoom, options);
		}

		this.stop();

		var from = this.project(this.getCenter()),
		    to = this.project(targetCenter),
		    size = this.getSize(),
		    startZoom = this._zoom;

		targetCenter = FMap.latLng(targetCenter);
		targetZoom = targetZoom === undefined ? startZoom : targetZoom;

		var w0 = Math.max(size.x, size.y),
		    w1 = w0 * this.getZoomScale(startZoom, targetZoom),
		    u1 = to.distanceTo(from),
		    rho = 1.42,
		    rho2 = rho * rho;

		function r(i) {
			var b = (w1 * w1 - w0 * w0 + (i ? -1 : 1) * rho2 * rho2 * u1 * u1) / (2 * (i ? w1 : w0) * rho2 * u1);
			return Math.log(Math.sqrt(b * b + 1) - b);
		}

		function sinh(n) { return (Math.exp(n) - Math.exp(-n)) / 2; }
		function cosh(n) { return (Math.exp(n) + Math.exp(-n)) / 2; }
		function tanh(n) { return sinh(n) / cosh(n); }

		var r0 = r(0);

		function w(s) { return w0 * (cosh(r0) / cosh(r0 + rho * s)); }
		function u(s) { return w0 * (cosh(r0) * tanh(r0 + rho * s) - sinh(r0)) / rho2; }

		function easeOut(t) { return 1 - Math.pow(1 - t, 1.5); }

		var start = Date.now(),
		    S = (r(1) - r0) / rho,
		    duration = options.duration ? 1000 * options.duration : 1000 * S * 0.8;

		function frame() {
			var t = (Date.now() - start) / duration,
			    s = easeOut(t) * S;

			if (t <= 1) {
				this._flyToFrame = FMap.Util.requestAnimFrame(frame, this);

				this._resetView(
					this.unproject(from.add(to.subtract(from).multiplyBy(u(s) / u1)), startZoom),
					this.getScaleZoom(w0 / w(s), startZoom), true, true);

			} else {
				this._resetView(targetCenter, targetZoom, true, true);
			}
		}

		this.fire('zoomstart');
		frame.call(this);
		return this;
	},

	flyToBounds: function(bounds, options) {
		var target = this._getBoundsCenterZoom(bounds, options);
		return this.flyTo(target.center, target.zoom, options);
	}
});



/*
 * Provides FMap.Map with convenient shortcuts for using browser geolocation features.
 */

FMap.Map.include({
	_defaultLocateOptions: {
		timeout: 10000,
		watch: false
		// setView: false
		// maxZoom: <Number>
		// maximumAge: 0
		// enableHighAccuracy: false
	},

	locate: function (/*Object*/ options) {

		options = this._locateOptions = FMap.extend({}, this._defaultLocateOptions, options);

		if (!('geolocation' in navigator)) {
			this._handleGeolocationError({
				code: 0,
				message: 'Geolocation not supported.'
			});
			return this;
		}

		var onResponse = FMap.bind(this._handleGeolocationResponse, this),
			onError = FMap.bind(this._handleGeolocationError, this);

		if (options.watch) {
			this._locationWatchId =
			        navigator.geolocation.watchPosition(onResponse, onError, options);
		} else {
			navigator.geolocation.getCurrentPosition(onResponse, onError, options);
		}
		return this;
	},

	stopLocate: function () {
		if (navigator.geolocation) {
			navigator.geolocation.clearWatch(this._locationWatchId);
		}
		if (this._locateOptions) {
			this._locateOptions.setView = false;
		}
		return this;
	},

	_handleGeolocationError: function (error) {
		var c = error.code,
		    message = error.message ||
		            (c === 1 ? 'permission denied' :
		            (c === 2 ? 'position unavailable' : 'timeout'));

		if (this._locateOptions.setView && !this._loaded) {
			this.fitWorld();
		}

		this.fire('locationerror', {
			code: c,
			message: 'Geolocation error: ' + message + '.'
		});
	},

	_handleGeolocationResponse: function (pos) {
		var lat = pos.coords.latitude,
		    lng = pos.coords.longitude,
		    latlng = new FMap.LatLng(lat, lng),
		    bounds = latlng.toBounds(pos.coords.accuracy),
		    options = this._locateOptions;

		if (options.setView) {
			var zoom = this.getBoundsZoom(bounds);
			this.setView(latlng, options.maxZoom ? Math.min(zoom, options.maxZoom) : zoom);
		}

		var data = {
			latlng: latlng,
			bounds: bounds,
			timestamp: pos.timestamp
		};

		for (var i in pos.coords) {
			if (typeof pos.coords[i] === 'number') {
				data[i] = pos.coords[i];
			}
		}

		this.fire('locationfound', data);
	}
});



/**
 * Created by CHENWENBIN on 2015/8/21.
 */
FMap.LocalSearch = FMap.Class.extend({
    options:{},
    _searchOptions:{},
    initialize:function(options) {
        if (typeof options === 'object' && options instanceof FMap.LocalSearchOptions) {
            options = FMap.setOptions(this, options);
            this._request = {};
        } else {
            throw new Error('Invalid LocalSearchOptions object');
        }
    },

    searchInCity:function(options, region, type) {
        this._type = type;
        if (type === 1) {
            return this._searchInSea(options, region);
        } else {
            return this._searchInLand(options, region);
        }
    },

    searchInBounds:function(options, bounds, type) {
        if (typeof options === 'object' && options instanceof FMap.LocalSearchSetting &&
            typeof bounds === 'object' && bounds instanceof  FMap.LatLngBounds) {
            var baseUrl = this.options.url + 'v1/poi?{query}&page_{size}&page_{num}&{bounds}&{type}';
            var boundsStr = [bounds.getSouth(), bounds.getWest(), bounds.getNorth(), bounds.getEast()].join(',');
            var requestUrl = FMap.Util.serviceUrlTemplate(baseUrl, FMap.Util.extend({
                query:options.keyword,
                size:options.pageSize,
                num:options.pageIndex,
                bounds:boundsStr,
                type:type
            }));
            //查找当前请求是否在请求队列中
            if (this._request[requestUrl]) {
                return true;
            }
            this._searchOptions = options;
            this._bounds = bounds;
            this._type = type;
            //添加到请求列表中
            this._request[requestUrl] = 'searchInBounds';
            this._searchType = 'searchInBounds';
            var self = this;
            FMap.Util.ajax(encodeURI(requestUrl), function(data) {
                //删除
                delete self._request[requestUrl];
                //处理检索结果
                if (data !== 'error') {
                    self._result = FMap.localReslut(false, options, data);
                } else {
                    self._result = FMap.localReslut(false, options, {status:-1, message:'Network Error'});
                }
                self.options.onSearchComplete(self._result);
            });
            return true;
        } else {
            return false;
        }
    },

    searchNearby:function(options, center, radius, type) {
        if (typeof center === 'object' && center instanceof FMap.LatLng &&
            typeof radius === 'number' && typeof options === 'object' && options instanceof FMap.LocalSearchSetting) {
            var baseUrl = this.options.url + 'v1/poi?{query}&page_{size}&page_{num}&{location}&{radius}&{type}';
            var locationStr = [center.lat, center.lng].join(',');
            var requestUrl = FMap.Util.serviceUrlTemplate(baseUrl, FMap.Util.extend({
                query:options.keyword,
                size:options.pageSize,
                num:options.pageIndex,
                location:locationStr,
                radius:radius,
                type:type
            }));
            //查找当前请求是否在请求队列中
            if (this._request[requestUrl]) {
                return true;
            }
            this._searchOptions = options;
            this._center = center;
            this._radius = radius;
            this._type = type;
            //添加到请求列表中
            this._request[requestUrl] = 'searchNearby';
            this._searchType = 'searchNearby';
            var self = this;
            FMap.Util.ajax(encodeURI(requestUrl), function(data) {
                //删除
                delete self._request[requestUrl];
                //处理检索结果
                if (data !== 'error') {
                    self._result = FMap.localReslut(false, options, data);
                } else {
                    self._result = FMap.localReslut(false, options, {status:-1, message:'Network Error'});
                }
                self.options.onSearchComplete(self._result);
            });
            return true;
        } else {
            return false;
        }
    },

    _searchInSea:function(options, region) {
        if (typeof options === 'object' && options instanceof FMap.LocalSearchSetting) {
            if (region !== '全国' && region !== '中华人民共和国' && region !== '中国') {
                this._result = FMap.localReslut(false, options, {status:-1, message:'Parameter Error'});
                this.options.onSearchComplete(this._result);
                return true;
            }
            //由于编码规范要求，不能命名变量为page_size形式，所以只对_以后的变量进行处理
            var baseUrl = this.options.url + 'v1/poi?{query}&page_{size}&page_{num}&{region}&{type}';
            var requestUrl = FMap.Util.serviceUrlTemplate(baseUrl, FMap.Util.extend({
                query:options.keyword,
                size:options.pageSize,
                num:options.pageIndex,
                region:"中华人民共和国",
                type:1
            }));
            //查找当前请求是否在请求队列中
            if (this._request[requestUrl]) {
                return true;
            }
            this._searchOptions = options;
            this._region = region;
            //添加到请求列表中
            this._request[requestUrl] = 'searchInCity';
            this._searchType = 'searchInCity';
            //检索海图POI
            var self = this;
            FMap.Util.ajax(encodeURI(requestUrl), function(data) {
                delete self._request[requestUrl];
                //处理检索结果
                if (data !== 'error') {
                    self._result = FMap.localReslut(false, options, data);
                } else {
                    self._result = FMap.localReslut(false, options, {status:-1, message:'Network Error'});
                }
                self.options.onSearchComplete(self._result);
            });
            return true;
        } else {
            return false;
        }
    },

    _searchInLand:function(options, region) {
        if (typeof options === 'object' && options instanceof FMap.LocalSearchSetting && typeof region === 'string') {
            //由于编码规范要求，不能命名变量为page_size形式，所以只对_以后的变量进行处理
            var baseUrl = this.options.url + 'v1/poi?{query}&page_{size}&page_{num}&{region}';
            var requestUrl = FMap.Util.serviceUrlTemplate(baseUrl, FMap.Util.extend({
                query:options.keyword,
                size:options.pageSize,
                num:options.pageIndex,
                region:region,
                type:0
            }));
            //查找当前请求是否在请求队列中
            if (this._request[requestUrl]) {
                return true;
            }
            this._searchOptions = options;
            this._region = region;
            //添加到请求列表中
            this._request[requestUrl] = 'searchInCity';
            this._searchType = 'searchInCity';
            var self = this;
            FMap.Util.ajax(encodeURI(requestUrl), function(data) {
                var isProvince = false;
                //判断是否为省份
                for (var i in data.results) {
                    if (data.results[i].num) {
                        isProvince = true;
                    }
                }
                //使用城市名称的URL进行删除
                delete self._request[requestUrl];
                //处理检索结果
                if (data !== 'error') {
                    self._result = FMap.localReslut(isProvince, options, data);
                } else {
                    self._result = FMap.localReslut(isProvince, options, {status:-1, message:'Network Error'});
                }
                self.options.onSearchComplete(self._result);
            });
            return true;
        } else {
            return false;
        }
    },

    getResults:function() {
        return this._result;
    },

    clearResults:function() {
        delete this._result;
    },

    setSearchCompleteCallback:function(callback) {
        this.options.onSearchComplete = callback;
    },

    gotoPage:function(pageIndex) {
        if (this._result === undefined) {
            return;
        }
        this._searchOptions.pageIndex = pageIndex;
        if (this._searchOptions.pageIndex >= this._result.getTotalPageNum()) {
            return;
        }
        switch (this._searchType) {
            case 'searchInCity':
                this.searchInCity(this._searchOptions, this._region, this._type);
                break;
            case 'searchInBounds':
                this.searchInBounds(this._searchOptions, this._bounds, this._type);
                break;
            case 'searchNearby':
                this.searchNearby(this._searchOptions, this._center, this._radius, this._type);
                break;
            default :
                break;
        }
    }
});



/**
 * Created by CHENWENBIN on 2015/8/21.
 */
FMap.LocalSearchOptions = function (url, onSearchComplete) {
    //�жϲ����Ƿ���Ч
    if ((typeof url) !== 'string' || (typeof onSearchComplete) !== 'function') {
        throw new Error('Invalid LocalSearchOptions object: (' + url + ', ' + onSearchComplete + ')');
    }
    this.url = url;
    this.onSearchComplete = onSearchComplete;
};

FMap.LocalSearchSetting = function (keyword, pageIndex, pageSize) {
    //�жϲ����Ƿ���Ч
    if (typeof keyword !== 'string' || typeof pageIndex !== 'number' || typeof pageSize !== 'number') {
        throw new Error('Invalid LocalSearchSetting object: (' + keyword + ', ' + pageIndex + ',' + pageSize + ',' + ')');
    }
    this.keyword = keyword;
    this.pageIndex = pageIndex;
    this.pageSize = pageSize;
};



/**
 * Created by CHENWENBIN on 2015/8/25.
 */
FMap.LocalResultPoi = function(name, point, address, telephone, id, type, detailInfo) {
    this.name = name;
    this.point = point;
    this.address = address;
    this.telephone = telephone;
    this.uId = id;
    this.poiType = type;
    this.detailInfo = detailInfo;
};

FMap.LocalResultCity = function(cityName, poiNum) {
    this.cityName = cityName;
    this.poiNum = poiNum;
};

FMap.LocalResult = function(isProvince, queryOptions, data) {
    this._status = data.status;
    this._message = data.message;
    this._total = data.total;
    this._poiList = [];
    this._cityList = [];
    this._queryOptions = queryOptions;
    var i = 0;
    if (isProvince) {
        //省份
        for (i in data.results) {
            this._cityList.push(new FMap.LocalResultCity(data.results[i].name, data.results[i].num));
        }
    } else {
        //城市
        for (i in data.results) {
            this._poiList.push(new FMap.LocalResultPoi(
                data.results[i].name,
                FMap.latLng(data.results[i].location.lat, data.results[i].location.lon),
                data.results[i].address,
                data.results[i].telephone,
                data.results[i].uid,
                data.results[i].poitype,
                data.results[i].detail_info
            ));
        }
    }
};

FMap.LocalResult.prototype = {
    getPoiList : function () {
        return this._poiList;
    },

    getCityList : function () {
        return this._cityList;
    },

    getTotalPoiNum : function () {
        return this._total;
    },

    getCurrentPageIndex : function () {
        return this._queryOptions.pageIndex;
    },

    getPageSize : function () {
        return this._queryOptions.pageSize;
    },

    getTotalPageNum : function () {
        if (this._queryOptions.pageSize > 0) {
            return  Math.ceil(this._total / this._queryOptions.pageSize);
        } else {
            return 1;
        }
    }
};

FMap.localReslut = function(isProvince, queryOptions, data) {
    return new FMap.LocalResult(isProvince, queryOptions, data);
};



/**
 * Created by suntao on 2015/8/26.
 */
FMap.DistrictSearch = FMap.Class.extend({
    options: {},

    initialize: function (options) {
        if (typeof options === 'object' && options instanceof FMap.DistrictSearchOptions) {
            options = FMap.setOptions(this, options);
            this._request = {};
        } else {
            throw new Error('Invalid DistrictSearchOptions object');
        }
    },

    searchInfoByLocation: function(location) {
        if (location instanceof FMap.LatLng) {
            //由于编码规范要求，不能命名变量为page_size形式，所以只对_以后的变量进行处理
            var baseUrl = this.options.url + 'v1/district/info?{location}';
            var latLonStr = [location.lat, location.lng].join(',');
            var infoRequestUrl = FMap.Util.serviceUrlTemplate(baseUrl, FMap.Util.extend({
                location: latLonStr
            }));
            //查找当前请求是否在请求队列中
            if (this._request[infoRequestUrl]) {
                return true;
            }
            this._location = location;
            //添加到请求列表中
            this._request[infoRequestUrl] = 'searchInfoByLocation';
            this._searchType = 'searchInfoByLocation';
            var self = this;
            FMap.Util.ajax(encodeURI(infoRequestUrl), function (data) {
                //从请求队列中删除消息
                delete self._request[infoRequestUrl];
                //处理搜索结果
                if (data !== 'error') {
                    self._result = FMap.districtResult(data);
                } else {
                    self._result = FMap.districtResult({status : -1, message : 'Network Error'});
                }
                self.options.onSearchComplete(self._result);
            });
            return true;
        } else {
            return false;
        }
    },

    searchBoundaryByRegion: function(region) {
        if (typeof region === 'number') {
            //由于编码规范要求，不能命名变量为page_size形式，所以只对_以后的变量进行处理
            var baseUrl = this.options.url + 'v1/district/boundary?{region}';
            var infoRequestUrl = FMap.Util.serviceUrlTemplate(baseUrl, FMap.Util.extend({
                region: region
            }));
            //查找当前请求是否在请求队列中
            if (this._request[infoRequestUrl]) {
                return true;
            }
            this._region = region;
            //添加到请求列表中
            this._request[infoRequestUrl] = 'searchBoundaryByRegion';
            this._searchType = 'searchBoundaryByRegion';
            var self = this;
            FMap.Util.ajax(encodeURI(infoRequestUrl), function (data) {
                //从请求队列中删除消息
                delete self._request[infoRequestUrl];
                //处理搜索结果
                if (data !== 'error') {
                    self._result = FMap.districtResult(data);
                } else {
                    self._result = FMap.districtResult({status : -1, message : 'Network Error'});
                }
                self.options.onSearchComplete(self._result);
            });
            return true;
        } else {
            return false;
        }
    },

    searchInfoByName: function(distname) {
        if (typeof distname === 'string') {
            //由于编码规范要求，不能命名变量为page_size形式，所以只对_以后的变量进行处理
            var baseUrl = this.options.url + 'v1/district/code?{districtname}';
            var infoRequestUrl = FMap.Util.serviceUrlTemplate(baseUrl, FMap.Util.extend({
                districtname: distname
            }));
            //查找当前请求是否在请求队列中
            if (this._request[infoRequestUrl]) {
                return true;
            }
            this._districtname = distname;
            //添加到请求列表中
            this._request[infoRequestUrl] = 'searchInfoByName';
            this._searchType = 'searchInfoByName';
            var self = this;
            FMap.Util.ajax(encodeURI(infoRequestUrl), function (data) {
                //从请求队列中删除消息
                delete self._request[infoRequestUrl];
                //处理搜索结果
                if (data !== 'error') {
                    self._result = FMap.districtResult(data);
                } else {
                    self._result = FMap.districtResult({status : -1, message : 'Network Error'});
                }
                self.options.onSearchComplete(self._result);
            });
            return true;
        } else {
            return false;
        }
    },

    searchCenterByRegion:function(region){
        if (typeof region === 'string') {
            //由于编码规范要求，不能命名变量为page_size形式，所以只对_以后的变量进行处理
            var baseUrl = this.options.url + 'v1/district/center?{region}';
            var infoRequestUrl = FMap.Util.serviceUrlTemplate(baseUrl, FMap.Util.extend({
                region: region
            }));
            //查找当前请求是否在请求队列中
            if (this._request[infoRequestUrl]) {
                return true;
            }
            this._region = region;
            //添加到请求列表中
            this._request[infoRequestUrl] = 'searchCenterByRegion';
            this._searchType = 'searchCenterByRegion';
            var self = this;
            FMap.Util.ajax(encodeURI(infoRequestUrl), function (data) {
                //从请求队列中删除消息
                delete self._request[infoRequestUrl];
                //处理搜索结果
                if (data !== 'error') {
                    self._result = FMap.districtResult(data);
                } else {
                    self._result = FMap.districtResult({status : -1, message : 'Network Error'});
                }
                self.options.onSearchComplete(self._result);
            });
            return true;
        } else {
            return false;
        }
    }
});



/**
 * Created by suntao on 2015/8/26.
 */
FMap.DistrictSearchOptions = function (url, onSearchComplete) {
    //�жϲ����Ƿ���Ч
    if ((typeof url) !== 'string' || (typeof onSearchComplete) !== 'function') {
        throw new Error('Invalid DistrictSearchOptions object: (' + url + ', ' + onSearchComplete + ')');
    }
    this.url = url;
    this.onSearchComplete = onSearchComplete;
};



/**
 * Created by suntao on 2015/8/26.
 */
FMap.DistrictResultInfo = function(districtname, districtcode, districtclass) {
    this.districtname = districtname;
    this.districtcode = districtcode;
    this.districtclass = districtclass;
};

FMap.DistrictResult = function(data) {
    this.status = data.status;
    this.message = data.message;
    this._infolist = [];
    if (this.status === 0) {
        if (data.results instanceof Array) {
            //��ȡ����������Ϣ
            for (var i in data.results) {
                if (data.results[i] instanceof Array) {
                    //�������ƻ�ȡ��������������Ϣ
                    var tempList = [];
                    for (var j in data.results[i]) {
                        tempList.push(new FMap.DistrictResultInfo(data.results[i][j].district_name, data.results[i][j].district_code, data.results[i][j].district_class));
                    }
                    this._infolist.push(tempList);
                } else {
                    //���ݵ���λ�û�ȡ����������Ϣ
                    this._infolist.push(new FMap.DistrictResultInfo(data.results[i].district_name, data.results[i].district_code, data.results[i].district_class));
                }
            }
        } else {
            //��ȡ������������
            if(data.results.geometry.coordinates instanceof Array){
                this._infolist.push(data.results.geometry.coordinates);
            }
            //��ȡ��������������Χ
            if (data.results instanceof Object) {
                this.geoJson = data.results;
            }
        }
    }
};

FMap.DistrictResult.prototype = {
    getStatus : function () {
        return this.status;
    },

    getMessage : function () {
        return this.message;
    },

    getInfoList: function() {
        return this._infolist;
    }
};

FMap.districtResult = function(data) {
    return new FMap.DistrictResult(data);
};



/**
 * Created by suntao on 2015/8/27.
 */
FMap.GeocoderSearch = FMap.Class.extend({
    options: {},

    initialize: function (options) {
        if (typeof options === 'object' && options instanceof FMap.GeocoderSearchOptions) {
            options = FMap.setOptions(this, options);
            this._request = {};
        } else {
            throw new Error('Invalid GeocoderSearchOptions object');
        }
    },

    geoEncode:function(address, region) {
        if (typeof address === 'string' && typeof region === 'string') {
            //�ȸ��ݳ���������������������
            var baseUrl = this.options.url;
            var districtUrl = this.options.url + 'v1/geocoder?{address}&{region}';
            var districtRequestUrl = FMap.Util.serviceUrlTemplate(districtUrl, FMap.Util.extend({
                address:address,
                region:region
            }));
            var self = this;
            FMap.Util.ajax(encodeURI(districtRequestUrl), function(data) {
                //��������������������
                if (data !== 'error') {
                    self._result = FMap.geocoderResult(true, data);
                } else {
                    self._result = FMap.geocoderResult(true, {status:-1, message:'Network Error'});
                }
                self.options.onSearchComplete(self._result);
            });
            return true;
        } else {
            return false;
        }
    },

    geoDecode: function(location) {
        if (location instanceof FMap.LatLng) {
            //���ڱ����淶Ҫ�󣬲�����������Ϊpage_size��ʽ������ֻ��_�Ժ��ı������д���
            var baseUrl = this.options.url + 'v1/geocoder?{location}';
            var latLonStr = [location.lat, location.lng].join(',');
            var infoRequestUrl = FMap.Util.serviceUrlTemplate(baseUrl, FMap.Util.extend({
                location: latLonStr
            }));
            //���ҵ�ǰ�����Ƿ�������������
            if (this._request[infoRequestUrl]) {
                return true;
            }
            this._location = location;
            //���ӵ������б���
            this._request[infoRequestUrl] = 'geoDecode';
            this._searchType = 'geoDecode';
            var self = this;
            FMap.Util.ajax(encodeURI(infoRequestUrl), function (data) {
                //������������ɾ����Ϣ
                delete self._request[infoRequestUrl];
                //������������
                if (data !== 'error') {
                    self._result = FMap.geocoderResult(false, data);
                } else {
                    self._result = FMap.geocoderResult(false, {status : -1, message : 'Network Error'});
                }
                self.options.onSearchComplete(self._result);
            });
            return true;
        } else {
            return false;
        }
    }
});



/**
 * Created by suntao on 2015/8/27.
 */
FMap.GeocoderSearchOptions = function (url, onSearchComplete) {
    //�жϲ����Ƿ���Ч
    if ((typeof url) !== 'string' || (typeof onSearchComplete) !== 'function') {
        throw new Error('Invalid GeocoderSearchOptions object: (' + url + ', ' + onSearchComplete + ')');
    }
    this.url = url;
    this.onSearchComplete = onSearchComplete;
};



/**
 * Created by suntao on 2015/8/27.
 */
FMap.GeocoderEncodeInfo = function(addrname, location) {
    this.addrname = addrname;
    this.location = location;
};

FMap.GeocoderDecodeInfo = function(address, location, telephone, districtCode, poiName) {
    this.address = address;
    this.location = location;
    this.telephone = telephone;
    this.districtCode = districtCode;
    this.poiName = poiName;
};

FMap.GeocoderResult = function(isEncode, data) {
    this.status = data.status;
    this.message = data.message;
    this._infolist = [];

    if (this.status === 0) {
        if (data.results instanceof Array) {
            if (isEncode) {
                for (var i in data.results) {
                    this._infolist.push(new FMap.GeocoderEncodeInfo(data.results[i].fulladdrname, data.results[i].location));
                }
            } else {
                for (var j in data.results) {
                    this._infolist.push(new FMap.GeocoderDecodeInfo(data.results[j].address, data.results[j].location,
                        data.results[j].telephone, data.results[j].district_code, data.results[j].poi_name));
                }
            }
        }
    }
};

FMap.GeocoderResult.prototype = {
    getStatus : function () {
        return this.status;
    },

    getMessage : function () {
        return this.message;
    },

    getInfoList: function() {
        return this._infolist;
    }
};

FMap.geocoderResult = function(isEncode, data) {
    return new FMap.GeocoderResult(isEncode, data);
};


}(window, document));
//# sourceMappingURL=fmap-src.map