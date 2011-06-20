if (window == window.top && window.history.length == 0) {
    opera.extension.postMessage({type:'open', url: window.location.href});
}
