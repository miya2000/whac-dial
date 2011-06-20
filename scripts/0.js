/** @private */
var _debug_mode = true;
/**
 * print debug message.
 * @param msg message.
 */
function debug(msg){
    if (_debug_mode) opera.postError(msg);
}

/**
 * shortcut of querySelector.
 * @param {String} query css selector query.
 * @return {HTMLElement} selected element.
 */
function $q(query) {
    return document.querySelector(query);
}
/**
 * shortcut of querySelectorAll.
 * @param {String} query css selector query.
 * @return {HTMLElement[]} selected elements.
 */
function $qa(query) {
    return document.querySelectorAll(query);
}
// very simple version of $X
// $X(exp);
// $X(exp, context, resolver, XPathResult.NUMBER_TYPE).numberValue;
// @source http://gist.github.com/29681.txt
function $X (exp, context, resolver, result_type) {
    context || (context = document);
    var Doc = context.ownerDocument || context;
    var result = Doc.evaluate(exp, context, resolver, result_type || XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    if (result_type) return result;
    for (var i = 0, len = result.snapshotLength, res = new Array(len); i < len; i++) {
        res[i] = result.snapshotItem(i);
    }
    return res;
}
/**
 * escape query
 * @param {String} s string.
 * @return {String} escaped string for css selector query .
 */
function escQuery(query) {
    return query.replace(/[#;&,.+*~':"!^$\[\]()=>|/\\]/g,"\\$&");
}

/** @private */
var escapeRules = { "&": "&amp;", '"': "&quot;", "'": "&#39;", "<": "&lt;", ">": "&gt;" };
/**
 * escape html
 * @param {String} s string.
 * @return {String} HTML escaped string.
 */
function escHtml(s) {
    return s.replace(/[&"'<>]/g, function(c) {
        return escapeRules[c];
    });
}
/**
 * trim string
 * @param {String} s string.
 * @return {String} trimmed string.
 */
function trim(s) {
    return String(s).replace(/^[\s]+|[\s]+$/g, '');
}
/**
 * clone object.
 * @param obj object.
 * @return clone object.
 */
function cloneObject(obj) {
    return JSON.parse(JSON.stringify(obj));
}
/**
 * copy properties to target.
 * @param {Object} target target
 * @param {Object} prop properties
 */
function applyProperty(target, prop) {
    for (var k in prop) {
        if (prop.hasOwnProperty(k)) {
            target[k] = prop[k];
        }
    }
}
/**
 * set attributes.
 * @param {HTMLElement} element element.
 * @param {Object} attrs attributes.
 */
function applyAttribute(element, attrs) {
    for (var k in attrs) {
        if (attrs.hasOwnProperty(k)) {
            element.setAttribute(k, attrs[k]);
        }
    }
}
/**
 * set styles.
 * @param {CSSStyleDeclaration} style stylesheet.
 * @param {Object} prop css properties.
 */
function applyStyle(style, prop) {
    for (var k in prop) {
        if (k in style) {
            style[k] = prop[k];
        }
        else {
            var kk = k.charAt(0).toUpperCase() + k.slice(1);
                 if (     'O' + kk in style) style['O'      + kk] = prop[k];
            else if (   'Moz' + kk in style) style['Moz'    + kk] = prop[k];
            else if ('Webkit' + kk in style) style['Webkit' + kk] = prop[k];
        }
    }
}
/**
 * add style element to document.
 * @param {String} styleStr stylesheet expression.
 */
function addStyle(styleStr) {
    var style = document.createElement('style');
    style.type = 'text/css';
    styleStr = '\n' + styleStr.replace(/(^\s*|\s*$)/, '') + '\n';
    if (style.styleSheet) { style.styleSheet.cssText = styleStr; } else { style.textContent = styleStr; }
    var container = document.getElementsByTagName('head')[0];
    if (!container) container = document.body || document.documentElement;
    container.appendChild(style);
    return style;
}

/**
 * show element.
 * @param {HTMLElement} ele DOM element.
 */
function show(ele) {
    if (ele && ele.style) {
        ele.style.display = 'block';
    }
}
/**
 * hide element.
 * @param {HTMLElement} ele DOM element.
 */
function hide(ele) {
    if (ele && ele.style) {
        ele.style.display = 'none';
    }
}
/**
 * toggle display (block or none)
 * @param {HTMLElement} ele DOM element.
 */
function toggle(ele) {
    if (!ele) return;
    if (ele.offsetHeight == 0) {
        ele.style.display = 'block';
    }
    else {
        ele.style.display = 'none';
    }
}

/**
 * parse http GET query string to key-value parameter map.
 * @param {String} query query string. (url or location.search)
 * @return {Object} key-value parameter map.
 */
function parseQuery(query) {
    var result = {};
    var q = query.slice(query.indexOf('?') + 1);
    var params = q.split('&');
    for (var i = 0; i < params.length; i++) {
        var param = params[i];
        var pair  = param.split('=');
        var name  = decodeURIComponent(pair.shift().replace(/\+/g, ' '));
        var value = decodeURIComponent(pair.join('').replace(/\+/g, ' '));
        if (!result[name]) {
            result[name] = value;
        }
        else {
            if (result[name] instanceof Array) result[name].push(value);
            else                               result[name] = [result[name], value];
        }
    }
    return result;
}
/**
 * convert key-value parameter map to http GET query string.
 * @param {Object} params key-value parameter map.
 * @return {String} query string.
 */
function toQuery(params) {
    var pp = [];
    for (var key in params) {
        var value = params[key];
        if (value instanceof Array) {
            for (var i = 0, len = value.length; i < len; ++i) {
                pp.push(key + "=" + encodeURIComponent(value[i]));
            }
        }
        else {
            pp.push(key + "=" + encodeURIComponent(value));
        }
    }
    return pp.join('&');
}

/**
 * append query string to url.
 * @param {String} url url.
 * @param {String|Object} query http GET query string or query parameters.
 * @return {String} new url.
 */
function appendQuery(url, query) {
    if (query == null) return url;
    query = query.valueOf();
    if (typeof query == 'object') {
        query = toQuery(query);
    }
    if (query == '') return url;
    var loc = url, hash = '';
    var hashIndex = loc.indexOf('#');
    if (hashIndex >= 0) {
        hash = loc.substring(hashIndex);
        loc = loc.substring(0, hashIndex);
    }
    if (loc.indexOf('?') < 0) {
        loc += '?' + query;
    }
    else {
        loc += '&' + query;
    }
    return loc + hash;
}

/**
 * class TimerManager.
 */
function TimerManager(win) {
    this.win = win || window;
    this.timeouts = {};
    this.intervals = {};
}
(function() {
    var proto = TimerManager.prototype;
    //== API ==//
    proto.constructor = TimerManager;
    proto.setTimeout = setTimeout;
    proto.setInterval = setInterval;
    proto.clear = clear;
    //== implementation ==//
    function setTimeout(name, func, delay) {
        this.clear(name);
        var self = this;
        this.timeouts[name] = this.win.setTimeout(function() {
            delete self.timeouts[name];
            func();
        }, delay);
    }
    function setInterval(name, func, delay) {
        this.clear(name);
        this.intervals[name] = this.win.setInterval(func, delay);
    }
    function clear(name) {
        if (this.timeouts[name]) {
            this.win.clearTimeout(this.timeouts[name]);
            delete this.timeouts[name];
        }
        if (this.intervals[name]) {
            this.win.clearInterval(this.intervals[name]);
            delete this.intervals[name];
        }
    }
})();
